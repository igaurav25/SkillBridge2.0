from fastapi import APIRouter, HTTPException
from app.schemas.schemas import StudentClusterRequest, StudentClusterResponse
from app.services.ml_engine import engine

router = APIRouter(prefix="/students", tags=["Student Clustering"])

@router.post("/cluster", response_model=StudentClusterResponse)
async def cluster_student(payload: StudentClusterRequest):
    try:
        res = engine.cluster_student(
            skills=payload.skills,
            experience_years=payload.experience_years or 0.0,
            assessment_score=payload.assessment_score or 70.0
        )
        return StudentClusterResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

