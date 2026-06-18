"""SmartCampus AI — Camera Database Model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float
from ..config.database import Base


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    ip_address = Column(String(100), nullable=True)  # RTSP URL or camera IP
    status = Column(String(50), default="OFFLINE")  # ONLINE, OFFLINE, ERROR, RECONNECTING
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    fps = Column(Float, default=15.0)
    resolution = Column(String(50), default="640x480")
