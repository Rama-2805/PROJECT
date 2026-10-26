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


def test_internal_api_key_protection(client):
    """Verify that internal FastAPI endpoints reject unauthenticated requests with 401."""
    # 1. Calling session reset without API key
    unauth_resp = client.post("/api/v1/sessions/reset-all-enrollments")
    assert unauth_resp.status_code == 401
    assert "Unauthorized" in unauth_resp.json()["detail"]

    # 2. Calling attendance start without API key
    att_unauth = client.post("/api/v1/attendance/start", json={"class_id": "CSE_7A"})
    assert att_unauth.status_code == 401
    assert "Unauthorized" in att_unauth.json()["detail"]

    # 3. Calling with invalid API key
    invalid_resp = client.post(
        "/api/v1/sessions/reset-all-enrollments",
        headers={"x-api-key": "completely-wrong-key"},
    )
    assert invalid_resp.status_code == 401

    # 4. Calling with valid API key
    auth_resp = client.post(
        "/api/v1/sessions/reset-all-enrollments",
        headers={"x-api-key": "sc-internal-service-key-dev-only"},
    )
    assert auth_resp.status_code == 200

    # 5. Accessing raw vector/cluster json without internal API key is blocked with 403 (SEC-10)
    raw_storage_resp = client.get("/storage/enrollment/test_session/clusters.json")
    assert raw_storage_resp.status_code == 403
    assert "Direct access" in raw_storage_resp.json()["detail"]


def test_production_insecure_key_rejection(client, monkeypatch):
    """Verify that production refuses requests when using the default or weak internal API key."""
    import os
    from app.config.settings import settings

    monkeypatch.setenv("ENVIRONMENT", "production")
    # Using default dev key in production must return 500
    prod_resp = client.post(
        "/api/v1/sessions/reset-all-enrollments",
        headers={"x-api-key": "sc-internal-service-key-dev-only"},
    )
    assert prod_resp.status_code == 500
    assert "Insecure internal service configuration in production" in prod_resp.json()["detail"]

    # When a strong key is set, it works
    monkeypatch.setattr(settings, "internal_api_key", "prod-secure-random-token-minimum-32-chars!")
    prod_success = client.post(
        "/api/v1/sessions/reset-all-enrollments",
        headers={"x-api-key": "prod-secure-random-token-minimum-32-chars!"},
    )
    assert prod_success.status_code == 200
