from fastapi import APIRouter, HTTPException
from app.schemas.schemas import (
    CareerRecommendRequest,
    CareerRecommendResponse,
    CareerReadinessRequest,
    CareerReadinessResponse
)
from app.services.ml_engine import engine

router = APIRouter(prefix="/career", tags=["Career ML"])

@router.post("/recommend", response_model=CareerRecommendResponse)
async def recommend_careers(payload: CareerRecommendRequest):
    try:
        recs = engine.recommend_careers(
            skills=payload.skills,
            education=payload.education or "B.Tech Computer Science",
            years_experience=payload.years_experience or 0.0,
            projects_count=payload.projects_count or 1,
            assessment_score=payload.assessment_score or 70.0,
            preferred_domain=payload.preferred_domain
        )
        return CareerRecommendResponse(top_recommendations=recs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/readiness", response_model=CareerReadinessResponse)
async def predict_career_readiness(payload: CareerReadinessRequest):
    try:
        res = engine.predict_readiness(
            technical_skills=payload.technical_skills,
            projects_count=payload.projects_count,
            resume_score=payload.resume_score,
            interview_score=payload.interview_score,
            assessment_score=payload.assessment_score,
            problem_solving_score=payload.problem_solving_score or 70.0,
            communication_score=payload.communication_score or 75.0,
            years_experience=payload.years_experience or 0.0,
            target_role=payload.target_role or "Full Stack Developer"
        )
        return CareerReadinessResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

