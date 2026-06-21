"""SmartCampus AI — Candidate Image Model for Continuous Learning."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..config.database import Base


class CandidateImage(Base):
    __tablename__ = "candidate_images"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    image_path = Column(String(512), nullable=False)
    quality_score = Column(Float, nullable=False)
    embedding_path = Column(String(512), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    similarity_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="candidate_images")
