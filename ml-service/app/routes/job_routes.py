from fastapi import APIRouter, HTTPException
from app.schemas.schemas import JobRecommendRequest, JobRecommendResponse
from app.services.ml_engine import engine

router = APIRouter(prefix="/jobs", tags=["Job Matching"])

@router.post("/recommend", response_model=JobRecommendResponse)
async def recommend_jobs(payload: JobRecommendRequest):
    try:
        matches = engine.recommend_jobs(
            skills=payload.student_skills,
            target_role=payload.target_role,
            job_type=payload.preferred_job_type,
            top_k=payload.top_k or 5
        )
        return JobRecommendResponse(
            matches=matches,
            total_evaluated=len(matches)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

