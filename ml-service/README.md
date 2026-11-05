# SkillBridge 2.0 - Machine Learning Microservice

Production-grade Machine Learning engine powering the AI & ML capabilities of the SkillBridge 2.0 Career Development Platform.

## Architecture

SkillBridge employs a dual AI/ML architecture:
- **ML Microservice (FastAPI + Scikit-Learn)**: Powers deterministic predictions, statistical ranking, cosine similarity, clustering, and readiness regressions using trained models.
- **Google Gemini API**: Powers conversational guidance, interview response analysis, nuanced resume feedback, and natural language explanations.
- **Express Backend**: Acts as the secure gateway connecting Angular to both the ML Microservice and Gemini. The ML service is never directly exposed to the public.

## Supported Models & Algorithms

1. **Career Recommendation Model**
   - **Algorithm**: `RandomForestClassifier` (120 estimators, multi-class across 11 target roles)
   - **Inputs**: Multi-hot technical & soft skills, education level, experience, projects, assessment metrics.
   - **Outputs**: Top career matches, calibrated suitability score (0-100%), required vs missing skills, explanations, next steps.

2. **Intelligent Job Matching**
   - **Algorithm**: `TfidfVectorizer` + `NearestNeighbors` (Cosine metric, k=5)
   - **Inputs**: Student profile text, target domain, skills, preferred job type (full-time, internship).
   - **Outputs**: Ranked jobs, match percentage, matched skills, missing qualifications.

3. **Skill Gap Prediction**
   - **Algorithm**: Taxonomy-driven importance weighting & topological skill ordering
   - **Outputs**: Priority-ranked missing competencies, immediate next-skill recommendation, multi-stage learning roadmap.

4. **Career Readiness Estimation**
   - **Algorithm**: `RandomForestRegressor` (100 estimators, MAE ~5.3%)
   - **Inputs**: Technical skills breadth, portfolio project count, ATS resume score, interview performance, assessment score, problem solving, communication.
   - **Outputs**: Comprehensive readiness score (0-100%), readiness tier, strengths, weak areas, personalized action items.

5. **Student Skill Clustering**
   - **Algorithm**: `KMeans` (k=5 clusters)
   - **Archetypes**: Beginner Developers, Frontend-Oriented, Backend-Oriented, Data-Oriented, Advanced Full-Stack Developers.

6. **Resume Intelligence**
   - **Algorithm**: NLP keyword extraction + TF-IDF cosine similarity against target role specifications and job descriptions.

## Setup & Running

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Train models
python training/train_models.py

# 4. Start FastAPI server (Port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 5. Run test suite
pytest tests
```

## API Endpoints

- `GET /health` - Microservice health check
- `POST /api/ml/career/recommend` - ML Career recommendations
- `POST /api/ml/career/readiness` - Career readiness estimation
- `POST /api/ml/jobs/recommend` - Intelligent job matching
- `POST /api/ml/skills/gap-analysis` - Role skill gap prediction
- `POST /api/ml/resume/match` - Resume vs Job description TF-IDF match
- `POST /api/ml/students/cluster` - Student profile clustering
- `GET /api/ml/models/status` - Model registry & training metadata

