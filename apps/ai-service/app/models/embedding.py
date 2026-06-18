"""SmartCampus AI — Embedding Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..config.database import Base


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    face_profile_id = Column(Integer, ForeignKey("face_profiles.id", ondelete="CASCADE"), nullable=False)
    vector_path = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    face_profile = relationship("FaceProfile", back_populates="embeddings")
