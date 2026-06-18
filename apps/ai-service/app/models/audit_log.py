"""SmartCampus AI — Audit Log Database Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from ..config.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(200), nullable=False)
    details = Column(String(1000), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
