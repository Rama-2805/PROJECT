"""SmartCampus AI — Grounding and Visual Localization API Routes.

Exposes REST endpoints calling the LocateAnything model (currently mocked for low-RAM).
"""

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image

from ..config.settings import settings
from .mock_worker import LocateAnythingWorker

router = APIRouter(prefix=f"{settings.api_prefix}/grounding", tags=["Grounding"])

# Initialize the mock worker
worker = LocateAnythingWorker("nvidia/LocateAnything-3B")


@router.post("/detect")
async def detect_objects(
    image: UploadFile = File(...),
    classes: str = Form(..., description="Comma-separated list of target classes to detect")
):
    """Detect classes in the image using open-vocabulary detection."""
    try:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    class_list = [c.strip() for c in classes.split(",") if c.strip()]
    if not class_list:
        raise HTTPException(status_code=400, detail="Classes parameter cannot be empty")

    results = worker.detect(img, class_list)
    return results


@router.post("/phrase")
async def ground_phrase(
    image: UploadFile = File(...),
    query: str = Form(..., description="Natural language phrase to locate in the image")
):
    """Locate objects matching a natural language phrase (Referring Expression Grounding)."""
    try:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    if not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter cannot be empty")

    results = worker.ground_multi(img, query)
    return results


@router.post("/point")
async def point_object(
    image: UploadFile = File(...),
    query: str = Form(..., description="Object query to point to in the image")
):
    """Find the coordinates of a single point corresponding to the query object."""
    try:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    if not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter cannot be empty")

    results = worker.point(img, query)
    return results


@router.post("/gui")
async def ground_gui_element(
    image: UploadFile = File(...),
    query: str = Form(..., description="UI/GUI element description"),
    output_type: str = Form("point", description="Type of output: 'point' or 'box'")
):
    """Locate GUI elements on screen (point coordinates or bounding boxes)."""
    try:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    if output_type not in ["point", "box"]:
        raise HTTPException(status_code=400, detail="output_type must be 'point' or 'box'")

    results = worker.ground_gui(img, query, output_type)
    return results


@router.post("/ocr")
async def detect_scene_text(
    image: UploadFile = File(...)
):
    """Localize text in the image and parse bounding boxes."""
    try:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    results = worker.detect_text(img)
    return results
