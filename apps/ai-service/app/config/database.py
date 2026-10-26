"""SmartCampus AI — Database Connection Setup.

Initializes SQLAlchemy engine and session makers.
Supports PostgreSQL with an automatic SQLite fallback for local development/testing.
"""

import os
import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from .settings import settings

logger = logging.getLogger("smartcampus.database")

Base = declarative_base()

# Attempt to create the engine
db_url = settings.database_url
engine = None
SessionLocal = None

is_prod = (
    os.environ.get("ENVIRONMENT", "").lower() == "production"
    or os.environ.get("NODE_ENV", "").lower() == "production"
)

# If database_url indicates sqlite, use it directly
if db_url.startswith("sqlite"):
    logger.info(f"Using SQLite database: {db_url}")
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
elif is_prod:
    # In production, strict PostgreSQL connection is enforced with retry loop to avoid split-brain states
    masked_url = db_url.split('@')[-1] if '@' in db_url else db_url
    max_retries = 5
    connected = False
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[Attempt {attempt}/{max_retries}] Connecting to PostgreSQL database at {masked_url}...")
            candidate_engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            with candidate_engine.connect() as conn:
                pass
            engine = candidate_engine
            connected = True
            logger.info("Successfully connected to PostgreSQL database.")
            break
        except Exception as conn_err:
            last_error = conn_err
            logger.warning(f"PostgreSQL connection attempt {attempt} failed: {conn_err}. Retrying in 2s...")
            time.sleep(2)

    if not connected:
        raise RuntimeError(
            f"FATAL: SmartCampus AI Service could not connect to PostgreSQL in production mode after {max_retries} attempts: {last_error}. "
            "Refusing to silently fallback to SQLite to prevent split-brain data divergence with the API."
        )
else:
    # In development/test mode, attempt PostgreSQL and gracefully fallback to local SQLite if offline
    try:
        masked_url = db_url.split('@')[-1] if '@' in db_url else db_url
        logger.info(f"Connecting to PostgreSQL database at {masked_url}")
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        with engine.connect() as conn:
            pass
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.warning(
            f"Failed to connect to PostgreSQL ({e}). Falling back to SQLite local database: sqlite:///./smartcampus_dev.db"
        )
        fallback_url = "sqlite:///./smartcampus_dev.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency generator to retrieve database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
