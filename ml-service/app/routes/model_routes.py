from fastapi import APIRouter
from app.services.ml_engine import engine

router = APIRouter(prefix="/models", tags=["Model Status"])

@router.get("/status")
async def get_models_status():
    return engine.get_status()

