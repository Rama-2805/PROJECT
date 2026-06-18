"""SmartCampus AI — Security & Audit Log Service.

Provides encryption for saved face embeddings on the filesystem and utility functions
for logging security events (consent, enrollment, rollback actions).
"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from ..config.settings import settings
from ..models.audit_log import AuditLog

logger = logging.getLogger("smartcampus.security")


class SecurityService:
    """Handles data encryption of embeddings and system audit logs."""

    def __init__(self):
        self.encrypt_enabled = settings.encrypt_embeddings
        # Ensure key is in bytes
        self.key = settings.encryption_key.encode("utf-8") if isinstance(settings.encryption_key, str) else settings.encryption_key

    def encrypt_data(self, data_bytes: bytes) -> bytes:
        """Obfuscate embedding byte stream using XOR encryption with settings key."""
        if not self.encrypt_enabled or not self.key:
            return data_bytes

        # Simple, fast, zero-dependency byte stream XOR encryption
        encrypted = bytearray(data_bytes)
        key_len = len(self.key)
        for idx in range(len(encrypted)):
            encrypted[idx] ^= self.key[idx % key_len]
        return bytes(encrypted)

    def decrypt_data(self, encrypted_bytes: bytes) -> bytes:
        """Decrypt XOR-obfuscated embedding byte stream."""
        # XOR decryption is identical to encryption
        return self.encrypt_data(encrypted_bytes)

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
