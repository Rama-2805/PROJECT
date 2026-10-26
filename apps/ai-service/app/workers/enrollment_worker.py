"""SmartCampus AI — Celery Enrollment & Offline Processing Worker.

Processes heavy video enrollment, facial vector index rebuilds, and model jobs asynchronously via Celery.
"""

from celery import Celery
from ..config.settings import settings

celery_app = Celery(
    "smartcampus_ai_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
)

@celery_app.task(name="enrollment.ping")
def ping_worker():
    """Health ping task for the enrollment worker."""
    return {"status": "ok", "worker": "smartcampus_ai_worker"}
