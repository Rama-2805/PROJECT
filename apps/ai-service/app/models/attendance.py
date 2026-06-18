"""SmartCampus AI — Attendance Database Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..config.database import Base


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(String(100), nullable=False)
    date = Column(String(50), nullable=False, index=True)  # YYYY-MM-DD
    time = Column(String(50), nullable=False)  # HH:MM:SS
    confidence = Column(Float, nullable=False)
    status = Column(String(50), default="PRESENT")  # PRESENT, LATE, ABSENT
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="attendances")
