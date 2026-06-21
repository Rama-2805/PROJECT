"""SmartCampus AI — Unknown Face Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from ..config.database import Base


class UnknownFace(Base):
    __tablename__ = "unknown_faces"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(String(100), index=True, nullable=True)
    image_path = Column(String(512), nullable=False)
    quality_score = Column(Float, nullable=False)
    embedding_path = Column(String(512), nullable=False)
    camera_id = Column(String(100), nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

