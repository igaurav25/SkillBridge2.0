from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CareerRecommendRequest(BaseModel):
    skills: List[str] = Field(..., description="List of technical and soft skills possessed by the student")
    education: Optional[str] = Field("B.Tech / B.E. Computer Science", description="Educational degree or background")
    years_experience: Optional[float] = Field(0.0, description="Years of professional or internship experience")
    projects_count: Optional[int] = Field(1, description="Number of completed portfolio or academic projects")
    assessment_score: Optional[float] = Field(70.0, description="Overall skill assessment score (0-100)")
    interests: Optional[List[str]] = Field(default_factory=list, description="Career or technology interests")
    preferred_domain: Optional[str] = Field(None, description="Preferred industry domain")

class CareerRecommendationItem(BaseModel):
    career_role: str
    suitability_score: float = Field(..., description="Estimated suitability percentage (0-100)")
    domain: str
    required_skills: List[str]
    missing_skills: List[str]
    explanation: str
    suggested_next_steps: List[str]

class CareerRecommendResponse(BaseModel):
    success: bool = True
    top_recommendations: List[CareerRecommendationItem]
    model_version: str = "2.0.0"

class CareerReadinessRequest(BaseModel):
    technical_skills: List[str] = Field(..., description="Candidate technical skills")
    projects_count: int = Field(0, description="Number of projects")
    resume_score: float = Field(0.0, description="Resume ATS score (0-100)")
    interview_score: float = Field(0.0, description="Mock interview performance score (0-100)")
    assessment_score: float = Field(0.0, description="Skill assessment score (0-100)")
    problem_solving_score: Optional[float] = Field(70.0, description="Coding / algorithmic score")
    communication_score: Optional[float] = Field(75.0, description="Communication score")
    years_experience: Optional[float] = Field(0.0, description="Years of experience")
    target_role: Optional[str] = Field("Full Stack Developer", description="Target job role")

class CareerReadinessResponse(BaseModel):
    success: bool = True
    career_readiness_score: float = Field(..., description="Estimated readiness score percentage (0-100)")
    readiness_level: str = Field(..., description="Low, Moderate, Job Ready, or Highly Prepared")
    strengths: List[str]
    weak_areas: List[str]
    improvement_suggestions: List[str]
    historical_benchmark: Dict[str, Any]
    disclaimer: str = "Career readiness is an objective statistical estimate based on student profile metrics, not a guarantee of employment."

class JobRecommendRequest(BaseModel):
    student_skills: List[str]
    target_role: Optional[str] = None
    preferred_location: Optional[str] = None
    preferred_job_type: Optional[str] = None # full-time, internship
    experience_level: Optional[str] = None
    top_k: Optional[int] = 5

class JobMatchItem(BaseModel):
    title: str
    company: str
    type: str
    domain: str
    matching_percentage: float
    matched_skills: List[str]
    missing_skills: List[str]
    skill_relevance_score: float

class JobRecommendResponse(BaseModel):
    success: bool = True
    matches: List[JobMatchItem]
    total_evaluated: int

class SkillGapAnalysisRequest(BaseModel):
    current_skills: List[str]
    target_role: str

class SkillGapAnalysisResponse(BaseModel):
    success: bool = True
    target_role: str
    domain: str
    matching_percentage: float
    acquired_skills: List[str]
    missing_skills: List[str]
    prioritized_missing_skills: List[Dict[str, Any]]
    suggested_next_skill: str
    learning_path: List[Dict[str, Any]]

class ResumeMatchRequest(BaseModel):
    resume_text: str = Field(..., description="Extracted resume text content")
    job_description: Optional[str] = Field(None, description="Target job description")
    target_role: Optional[str] = Field(None, description="Target role name if JD is omitted")

class ResumeMatchResponse(BaseModel):
    success: bool = True
    match_percentage: float
    detected_skills: List[str]
    missing_keywords: List[str]
    education_detected: List[str]
    recommendations: List[str]
    ats_disclaimer: str = "TF-IDF & cosine similarity estimate; individual employer ATS scoring may vary."

class StudentClusterRequest(BaseModel):
    skills: List[str]
    experience_years: Optional[float] = 0.0
    assessment_score: Optional[float] = 70.0

class StudentClusterResponse(BaseModel):
    success: bool = True
    cluster_id: int
    cluster_name: str
    archetype_description: str
    recommended_focus_areas: List[str]

