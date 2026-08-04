"""SmartCampus AI — Face Enrollment & Real-Time Attendance Microservice.

A FastAPI-based AI service providing face enrollment, real-time attendance,
and classroom monitoring capabilities.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import settings
from .config.database import Base, engine
from .api.health import router as cctv_health_router
from .api.unknown_faces import router as unknown_faces_router
from .api.clusters import router as clusters_router
from .api.enrollment import router as cctv_enrollment_router
from .api.video_enrollment import router as video_enrollment_router
from .api.attendance import router as cctv_attendance_router
from .api.optimizer import router as optimizer_router
from .api.analytics import router as analytics_router
from .behavior.routes import router as behavior_router
from .grounding.routes import router as grounding_router
from .api.camera import router as camera_router
from .dashboard.routes import router as dashboard_router
from .api.learning import router as learning_router
from .api.session_enrollment import router as session_enrollment_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    from pathlib import Path
    import logging
    import threading
    import time
    from datetime import datetime
    from .services.weekly_optimizer import weekly_face_optimizer
    from .config.database import SessionLocal

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("smartcampus.main")
    
    # Force smartcampus loggers to output to stdout/stderr
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    sc_logger = logging.getLogger("smartcampus")
    sc_logger.setLevel(logging.INFO)
    if not sc_logger.handlers:
        sc_logger.addHandler(handler)

    # Create all database tables on startup
    print(f"[{settings.app_name}] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Safely perform column migrations
    from sqlalchemy import text, inspect
    try:
        inspector = inspect(engine)
        if "candidate_images" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("candidate_images")]
            with engine.begin() as conn:
                if "status" not in columns:
                    print(f"[{settings.app_name}] Adding status column to candidate_images table...")
                    conn.execute(text("ALTER TABLE candidate_images ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';"))
                if "similarity_score" not in columns:
                    print(f"[{settings.app_name}] Adding similarity_score column to candidate_images table...")
                    conn.execute(text("ALTER TABLE candidate_images ADD COLUMN similarity_score DOUBLE PRECISION;"))
    except Exception as db_err:
        logger.error(f"Failed to migrate candidate_images table columns: {db_err}")

    # Verify and auto-download InsightFace models
    from .services.face_detector import check_and_download_models
    try:
        check_and_download_models()
    except Exception as e:
        logger.error(f"Failed during InsightFace model startup check: {e}")

    # Ensure data directories exist
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.face_data_dir).mkdir(parents=True, exist_ok=True)

    # Ensure enrollment storage directory exists
    enrollment_storage = Path(os.getcwd()) / "storage" / "enrollment"
    enrollment_storage.mkdir(parents=True, exist_ok=True)
    logger.info(f"Enrollment storage directory: {enrollment_storage}")

    # Background scheduler function for Weekly Face Optimizer
    def start_optimizer_scheduler():
        logger_sched = logging.getLogger("smartcampus.scheduler")
        logger_sched.info("Weekly optimizer background scheduler thread started.")
        while True:
            now = datetime.now()
            # Sunday (weekday 6) at 2:00 AM (hour 2)
            if now.weekday() == settings.optimizer_schedule_weekday and now.hour == settings.optimizer_schedule_hour:
                logger_sched.info("Scheduled trigger: Running Weekly Face Optimizer...")
                db_session = SessionLocal()
                try:
                    report = weekly_face_optimizer.run_optimization(db_session)
                    logger_sched.info(f"Scheduled Weekly Face Optimizer completed: {report}")
                except Exception as sched_err:
                    logger_sched.error(f"Scheduled Weekly Face Optimizer failed: {sched_err}")
                finally:
                    db_session.close()
                time.sleep(7200)  # Avoid double trigger during 2:00-3:00 AM hour window
            time.sleep(1800)  # Check every 30 minutes

    scheduler_thread = threading.Thread(
        target=start_optimizer_scheduler,
        daemon=True,
        name="WeeklyOptimizerScheduler"
    )
    scheduler_thread.start()
    logger.info("Weekly face optimizer scheduler spawned.")

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
app.include_router(cctv_health_router)
app.include_router(unknown_faces_router)
app.include_router(clusters_router)
app.include_router(cctv_enrollment_router)
app.include_router(video_enrollment_router)
app.include_router(cctv_attendance_router)
app.include_router(optimizer_router)
app.include_router(analytics_router)
app.include_router(behavior_router)
app.include_router(grounding_router)
app.include_router(camera_router)
app.include_router(dashboard_router)
app.include_router(learning_router)
app.include_router(session_enrollment_router)

# Serve storage folder statically
from fastapi.staticfiles import StaticFiles
app.mount("/storage", StaticFiles(directory="storage"), name="storage")



# Global WebSocket event connection
from fastapi import WebSocket
from .api.websocket import websocket_manager


@app.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Global WebSocket endpoint for real-time enrollment updates."""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        websocket_manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    """Fallback legacy health check endpoint."""
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
