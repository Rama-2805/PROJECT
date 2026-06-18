"""SmartCampus AI — Face Profile Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..config.database import Base


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    quality_score = Column(Float, nullable=False)
    accuracy_estimate = Column(Float, default=95.0)  # Calculated recognition accuracy metric
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="face_profiles")
    embeddings = relationship("Embedding", back_populates="face_profile", cascade="all, delete-orphan")
