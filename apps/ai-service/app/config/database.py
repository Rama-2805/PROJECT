"""SmartCampus AI — Database Connection Setup.

Initializes SQLAlchemy engine and session makers.
Supports PostgreSQL with an automatic SQLite fallback for local development/testing.
"""

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

# If database_url indicates sqlite, use it directly
if db_url.startswith("sqlite"):
    logger.info(f"Using SQLite database: {db_url}")
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        # Check if we can instantiate postgres engine
        logger.info(f"Connecting to PostgreSQL database at {db_url.split('@')[-1] if '@' in db_url else db_url}")
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        # Verify connection immediately
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
