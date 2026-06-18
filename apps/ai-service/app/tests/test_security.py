"""SmartCampus AI — Security Service Unit Tests."""

import pytest
from app.services.security_service import security_service
from app.models.audit_log import AuditLog


def test_encryption_decryption():
    """Verify that encryption of face vector bytes is reversible and shifts bytes."""
    data = b"numpy_embedding_vector_data_bytes_12345"
    
    # Encrypt
    encrypted = security_service.encrypt_data(data)
    assert encrypted != data  # Obfuscated
    
    # Decrypt
    decrypted = security_service.decrypt_data(encrypted)
    assert decrypted == data  # Recovered


def test_audit_logging(db_session):
    """Verify that security logs are written to the database AuditLog table."""
    action = "TEST_SECURITY_ACTION"
    details = "Teacher approved student USN 1VI23CS001"

    security_service.log_audit(db_session, action, details)
    
    # Query database
    log = db_session.query(AuditLog).filter(AuditLog.action == action).first()
    assert log is not None
    assert log.details == details
    assert log.timestamp is not None
