from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.career_routes import router as career_router
from app.routes.job_routes import router as job_router
from app.routes.skill_routes import router as skill_router
from app.routes.resume_routes import router as resume_router
from app.routes.student_routes import router as student_router
from app.routes.model_routes import router as model_router
from app.services.ml_engine import engine

app = FastAPI(
    title="SkillBridge 2.0 ML Microservice",
    description="Production-grade Machine Learning engine for career recommendation, job matching, skill gap analysis, and career readiness prediction.",
    version="2.0.0"
)

# Permissive internal CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health & Root check
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SkillBridge ML Service",
        "version": "2.0.0",
        "models_ready": engine.career_recommender is not None
    }

@app.get("/")
def root():
    return {
        "message": "SkillBridge 2.0 Machine Learning Microservice is running.",
        "documentation": "/docs",
        "endpoints": [
            "/api/ml/career/recommend",
            "/api/ml/career/readiness",
            "/api/ml/jobs/recommend",
            "/api/ml/skills/gap-analysis",
            "/api/ml/resume/match",
            "/api/ml/students/cluster",
            "/api/ml/models/status"
        ]
    }

# Mount sub-routers under /api/ml and direct root prefixes for maximum flexibility
for prefix in ["/api/ml", ""]:
    app.include_router(career_router, prefix=prefix)
    app.include_router(job_router, prefix=prefix)
    app.include_router(skill_router, prefix=prefix)
    app.include_router(resume_router, prefix=prefix)
    app.include_router(student_router, prefix=prefix)
    app.include_router(model_router, prefix=prefix)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

