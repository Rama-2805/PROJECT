"""SmartCampus AI — Face Enrollment & Real-Time Attendance Microservice.

A FastAPI-based AI service providing face enrollment, real-time attendance,
and classroom monitoring capabilities.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import settings
from .api.routes import router as enrollment_router
from .attendance.routes import router as attendance_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    from pathlib import Path
    import logging

    logging.basicConfig(level=logging.INFO)

    # Ensure data directories exist
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.face_data_dir).mkdir(parents=True, exist_ok=True)

    print(f"[{settings.app_name}] Starting up...")
    print(f"[{settings.app_name}] Upload directory: {settings.upload_dir}")
    print(f"[{settings.app_name}] Face data directory: {settings.face_data_dir}")
    print(f"[{settings.app_name}] Redis: {settings.redis_url}")
    print(f"[{settings.app_name}] Camera Manager ready")
    print(f"[{settings.app_name}] Attendance Engine ready")

    yield

    print(f"[{settings.app_name}] Shutting down...")


app = FastAPI(
    title="SmartCampus AI — AI Microservice",
    description="AI-powered face enrollment, real-time attendance, and classroom monitoring",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(enrollment_router)
app.include_router(attendance_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "2.0.0",
        "modules": [
            "enrollment",
            "attendance",
            "camera",
            "recognition",
            "streaming",
        ],
    }
