"""SmartCampus AI — Security & Audit Log Service.

Provides encryption for saved face embeddings on the filesystem and utility functions
for logging security events (consent, enrollment, rollback actions).
"""

import os
import hmac
import hashlib
import logging
from datetime import datetime
from typing import Optional
from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from ..config.settings import settings
from ..models.audit_log import AuditLog

logger = logging.getLogger("smartcampus.security")


def verify_internal_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """Verifies that the incoming request contains the valid internal API key."""
    expected_key = settings.internal_api_key
    is_prod = (
        os.environ.get("ENVIRONMENT", "").lower() == "production"
        or os.environ.get("NODE_ENV", "").lower() == "production"
        or (hasattr(settings, "debug") and not settings.debug and os.environ.get("ENVIRONMENT") is not None)
    )
    if is_prod and (not expected_key or expected_key == "sc-internal-service-key-dev-only" or len(expected_key) < 16):
        logger.critical("Insecure internal API key configured in production environment!")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insecure internal service configuration in production: INTERNAL_API_KEY must be configured with high entropy",
        )
    if not x_api_key or not expected_key or not hmac.compare_digest(x_api_key, expected_key):
        logger.warning("Unauthorized internal API request: missing or invalid x-api-key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing internal API key",
        )
    return x_api_key


class SecurityService:
    """Handles authenticated AES-256-GCM data encryption of embeddings and system audit logs."""

    def __init__(self):
        self.encrypt_enabled = settings.encrypt_embeddings
        raw_key = settings.encryption_key.encode("utf-8") if isinstance(settings.encryption_key, str) else settings.encryption_key
        # Derive uniform 256-bit key using SHA-256
        self.key = hashlib.sha256(raw_key).digest()
        self.aesgcm = AESGCM(self.key)

    def encrypt_data(self, data_bytes: bytes) -> bytes:
        """Encrypts embedding byte stream using AES-256-GCM authenticated encryption.
        
        Returns 12-byte random nonce prepended to the ciphertext and auth tag.
        """
        if not self.encrypt_enabled or not data_bytes:
            return data_bytes

        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, data_bytes, None)
        return nonce + ciphertext

    def decrypt_data(self, encrypted_bytes: bytes) -> bytes:
        """Decrypts AES-256-GCM encrypted byte stream."""
        if not self.encrypt_enabled or not encrypted_bytes or len(encrypted_bytes) < 28:
            return encrypted_bytes

        nonce = encrypted_bytes[:12]
        ciphertext = encrypted_bytes[12:]
        try:
            return self.aesgcm.decrypt(nonce, ciphertext, None)
        except Exception as exc:
            logger.warning(f"Decryption failed or payload unencrypted: {exc}")
            return encrypted_bytes

    def log_audit(self, db: Session, action: str, details: str) -> None:
        """Log a security or system operation in the database AuditLog table."""
        try:
            log_rec = AuditLog(
                action=action,
                details=details,
                timestamp=datetime.utcnow()
            )
            db.add(log_rec)
            db.commit()
            logger.info(f"Audit Log Recorded: [{action}] - {details}")
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")


# Singleton instance
security_service = SecurityService()
