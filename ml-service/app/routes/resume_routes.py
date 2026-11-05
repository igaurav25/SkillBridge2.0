from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import io
from app.schemas.schemas import ResumeMatchRequest, ResumeMatchResponse
from app.services.ml_engine import engine

router = APIRouter(prefix="/resume", tags=["Resume Intelligence"])

@router.post("/match", response_model=ResumeMatchResponse)
async def match_resume(payload: ResumeMatchRequest):
    try:
        res = engine.match_resume(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            target_role=payload.target_role
        )
        return ResumeMatchResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-pdf")
async def extract_pdf_and_match(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form(None),
    job_description: Optional[str] = Form(None)
):
    try:
        from pypdf import PdfReader
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"

        match_res = engine.match_resume(
            resume_text=text,
            job_description=job_description,
            target_role=target_role
        )
        return {
            "success": True,
            "extracted_text_preview": text[:500] + ("..." if len(text) > 500 else ""),
            "character_count": len(text),
            **match_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF resume: {str(e)}")

