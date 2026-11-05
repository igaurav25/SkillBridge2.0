from fastapi import APIRouter, HTTPException
from app.schemas.schemas import SkillGapAnalysisRequest, SkillGapAnalysisResponse
from app.services.ml_engine import engine

router = APIRouter(prefix="/skills", tags=["Skill Gap Analysis"])

@router.post("/gap-analysis", response_model=SkillGapAnalysisResponse)
async def analyze_skill_gap(payload: SkillGapAnalysisRequest):
    try:
        res = engine.analyze_skill_gap(
            current_skills=payload.current_skills,
            target_role=payload.target_role
        )
        return SkillGapAnalysisResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

