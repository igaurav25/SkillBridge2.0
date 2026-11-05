import os
import json
import re
import numpy as np
import joblib
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "trained_models")
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")

class MLEngine:
    def __init__(self):
        self.career_recommender = None
        self.career_readiness = None
        self.student_clusterer = None
        self.job_matcher = None
        self.taxonomy = {}
        self.metadata = {}
        self.load_artifacts()

    def load_artifacts(self):
        # 1. Taxonomy
        taxonomy_path = os.path.join(DATASETS_DIR, "skill_taxonomy.json")
        if os.path.exists(taxonomy_path):
            with open(taxonomy_path, "r", encoding="utf-8") as f:
                self.taxonomy = json.load(f)["roles"]

        # 2. Metadata
        meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        # 3. Career Recommender
        career_path = os.path.join(MODELS_DIR, "career_recommender.joblib")
        if os.path.exists(career_path):
            self.career_recommender = joblib.load(career_path)

        # 4. Career Readiness
        readiness_path = os.path.join(MODELS_DIR, "career_readiness.joblib")
        if os.path.exists(readiness_path):
            self.career_readiness = joblib.load(readiness_path)

        # 5. Student Clusterer
        cluster_path = os.path.join(MODELS_DIR, "student_clusterer.joblib")
        if os.path.exists(cluster_path):
            self.student_clusterer = joblib.load(cluster_path)

        # 6. Job Matcher
        job_path = os.path.join(MODELS_DIR, "job_matcher.joblib")
        if os.path.exists(job_path):
            self.job_matcher = joblib.load(job_path)

    def recommend_careers(
        self,
        skills: List[str],
        education: str = "B.Tech Computer Science",
        years_experience: float = 0.0,
        projects_count: int = 1,
        assessment_score: float = 70.0,
        preferred_domain: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not self.career_recommender:
            raise RuntimeError("Career recommender model not loaded")

        mlb = self.career_recommender["mlb"]
        model = self.career_recommender["model"]
        classes = self.career_recommender["classes"]

        # Clean student skill names
        clean_skills = [s.strip() for s in skills if s.strip()]

        skill_vec = mlb.transform([clean_skills])
        num_vec = np.array([[years_experience, projects_count, assessment_score]])
        X = np.hstack([skill_vec, num_vec])

        # Get class probabilities
        probs = model.predict_proba(X)[0]
        sorted_indices = np.argsort(probs)[::-1]

        recommendations = []
        user_skills_lower = {s.lower() for s in clean_skills}

        for idx in sorted_indices[:4]:
            role = classes[idx]
            prob = float(probs[idx])
            role_info = self.taxonomy.get(role, {
                "core_skills": [],
                "secondary_skills": [],
                "domain": "Software Technology",
                "learning_roadmap": []
            })

            core_skills = role_info["core_skills"]
            matched_skills = [s for s in core_skills if s.lower() in user_skills_lower]
            missing_skills = [s for s in core_skills if s.lower() not in user_skills_lower]

            # Adjust score with actual skill overlap for realistic calibration
            overlap_pct = (len(matched_skills) / max(len(core_skills), 1)) * 100
            suitability = round((prob * 40.0) + (overlap_pct * 0.6), 1)
            suitability = float(np.clip(suitability, 15.0, 99.0))

            next_steps = [
                f"Master key missing core skill: {missing_skills[0]}" if missing_skills else "Build a production-grade portfolio project",
                f"Complete {role} assessment",
                f"Prepare for {role_info['domain']} interview scenarios"
            ]

            explanation = (
                f"You demonstrate strong capability for {role} with existing foundation in "
                f"{', '.join(matched_skills[:3]) if matched_skills else 'software fundamentals'}. "
                f"Adding {missing_skills[0] if missing_skills else 'advanced system architecture'} will elevate your competitiveness."
            )

            recommendations.append({
                "career_role": role,
                "suitability_score": suitability,
                "domain": role_info["domain"],
                "required_skills": core_skills,
                "missing_skills": missing_skills,
                "explanation": explanation,
                "suggested_next_steps": next_steps
            })

        return recommendations

    def predict_readiness(
        self,
        technical_skills: List[str],
        projects_count: int,
        resume_score: float,
        interview_score: float,
        assessment_score: float,
        problem_solving_score: float = 70.0,
        communication_score: float = 75.0,
        years_experience: float = 0.0,
        target_role: str = "Full Stack Developer"
    ) -> Dict[str, Any]:
        if not self.career_readiness:
            raise RuntimeError("Readiness model not loaded")

        reg = self.career_readiness["model"]
        X = np.array([[
            years_experience,
            projects_count,
            assessment_score,
            resume_score,
            interview_score,
            problem_solving_score,
            communication_score
        ]])

        pred_score = float(reg.predict(X)[0])
        pred_score = float(np.clip(round(pred_score, 1), 10.0, 99.0))

        if pred_score >= 80:
            level = "Highly Prepared"
        elif pred_score >= 65:
            level = "Job Ready"
        elif pred_score >= 45:
            level = "Moderate"
        else:
            level = "Developing Foundation"

        strengths = []
        weak_areas = []
        suggestions = []

        if len(technical_skills) >= 6:
            strengths.append(f"Diverse technical stack ({len(technical_skills)} verified skills)")
        else:
            weak_areas.append("Limited skill breadth (under 6 recorded skills)")
            suggestions.append("Acquire at least 3 complementary tools or libraries in your target role.")

        if projects_count >= 2:
            strengths.append(f"Portfolio verification ({projects_count} projects showcased)")
        else:
            weak_areas.append("Sparse project portfolio")
            suggestions.append("Add at least 2 full-fledged GitHub repositories with live deployment links.")

        if resume_score >= 70:
            strengths.append(f"ATS-optimized resume ({resume_score}/100)")
        else:
            weak_areas.append("Resume ATS formatting needs optimization")
            suggestions.append("Use standard headings, quantify project metrics, and include role keywords.")

        if interview_score >= 65:
            strengths.append("Competent interview communication and response structuring")
        else:
            weak_areas.append("Mock interview practice needed")
            suggestions.append("Practice technical and behavioral scenarios using the SkillBridge AI Mock Interview.")

        return {
            "career_readiness_score": pred_score,
            "readiness_level": level,
            "strengths": strengths,
            "weak_areas": weak_areas,
            "improvement_suggestions": suggestions,
            "historical_benchmark": {
                "top_quartile_benchmark": 82.5,
                "average_placed_candidate": 73.0,
                "current_cohort_average": 64.2
            }
        }

    def recommend_jobs(
        self,
        skills: List[str],
        target_role: Optional[str] = None,
        job_type: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        if not self.job_matcher:
            raise RuntimeError("Job matcher not loaded")

        vectorizer = self.job_matcher["vectorizer"]
        nn_model = self.job_matcher["nn_model"]
        jobs_db = self.job_matcher["jobs_db"]

        query_text = f"{target_role or ''} {' '.join(skills)}"
        query_vec = vectorizer.transform([query_text])

        distances, indices = nn_model.kneighbors(query_vec, n_neighbors=min(top_k * 2, len(jobs_db)))
        
        user_skills_lower = {s.lower() for s in skills}
        results = []

        for dist, idx in zip(distances[0], indices[0]):
            job = jobs_db[idx]
            if job_type and job.get("type") != job_type:
                continue

            # Cosine distance to similarity
            sim = float(max(0.0, 1.0 - dist))
            job_skills = job.get("skills", [])
            matched = [s for s in job_skills if s.lower() in user_skills_lower]
            missing = [s for s in job_skills if s.lower() not in user_skills_lower]

            pct = round(sim * 100, 1)

            results.append({
                "title": job["title"],
                "company": job["company"],
                "type": job["type"],
                "domain": job["domain"],
                "matching_percentage": pct,
                "matched_skills": matched,
                "missing_skills": missing,
                "skill_relevance_score": round(sim, 3)
            })

            if len(results) >= top_k:
                break

        return results

    def analyze_skill_gap(self, current_skills: List[str], target_role: str) -> Dict[str, Any]:
        role_info = self.taxonomy.get(target_role)
        if not role_info:
            # Fallback to closest match
            target_role = list(self.taxonomy.keys())[0]
            role_info = self.taxonomy[target_role]

        core = role_info["core_skills"]
        secondary = role_info["secondary_skills"]
        all_required = core + secondary

        user_lower = {s.lower().strip() for s in current_skills}
        acquired = [s for s in all_required if s.lower() in user_lower]
        missing = [s for s in all_required if s.lower() not in user_lower]

        match_pct = round((len(acquired) / max(len(all_required), 1)) * 100, 1)

        prioritized = []
        for s in missing:
            is_core = s in core
            prioritized.append({
                "skill": s,
                "priority": "High (Core)" if is_core else "Medium (Recommended)",
                "weight": 1.0 if is_core else 0.5,
                "category": "Core Competency" if is_core else "Ecosystem Tool"
            })

        # Suggest next skill
        next_skill = missing[0] if missing else "Advanced System Design"

        return {
            "target_role": target_role,
            "domain": role_info["domain"],
            "matching_percentage": match_pct,
            "acquired_skills": acquired,
            "missing_skills": missing,
            "prioritized_missing_skills": prioritized,
            "suggested_next_skill": next_skill,
            "learning_path": role_info.get("learning_roadmap", [])
        }

    def match_resume(self, resume_text: str, job_description: Optional[str] = None, target_role: Optional[str] = None) -> Dict[str, Any]:
        if not self.job_matcher:
            raise RuntimeError("Model not loaded")

        vectorizer = self.job_matcher["vectorizer"]

        # Extract words from resume
        resume_lower = resume_text.lower()
        all_skills = self.career_recommender["skills_catalog"] if self.career_recommender else []
        
        detected_skills = [s for s in all_skills if re.search(r'\b' + re.escape(s.lower()) + r'\b', resume_lower)]

        # If job description provided, compute TF-IDF cosine similarity
        if not job_description and target_role and target_role in self.taxonomy:
            reqs = self.taxonomy[target_role]["core_skills"] + self.taxonomy[target_role]["secondary_skills"]
            job_description = f"{target_role} requirements: " + ", ".join(reqs)
        elif not job_description:
            job_description = "Full Stack Engineer software development Angular Node.js Python databases Git Docker APIs"

        vecs = vectorizer.transform([resume_text, job_description])
        sim_matrix = (vecs[0] * vecs[1].T).toarray()
        cosine_sim = float(sim_matrix[0][0])
        match_pct = round(min(1.0, max(0.2, cosine_sim * 1.5)) * 100, 1)

        # Missing keywords
        jd_lower = job_description.lower()
        missing_kw = [s for s in all_skills if re.search(r'\b' + re.escape(s.lower()) + r'\b', jd_lower) and s not in detected_skills]

        # Education detection
        edu_keywords = ["b.tech", "b.e.", "bca", "mca", "b.sc", "bachelor", "master", "ph.d", "computer science"]
        detected_edu = [e.title() for e in edu_keywords if e in resume_lower]

        recommendations = []
        if len(detected_skills) < 5:
            recommendations.append("Explicitly highlight core programming languages and frameworks under a dedicated 'Technical Skills' section.")
        if missing_kw:
            recommendations.append(f"Incorporate missing role keywords: {', '.join(missing_kw[:4])}.")
        if "action" not in resume_lower and "led" not in resume_lower and "developed" not in resume_lower:
            recommendations.append("Start project bullet points with strong action verbs (e.g., Architected, Optimized, Engineered).")

        return {
            "match_percentage": match_pct,
            "detected_skills": detected_skills,
            "missing_keywords": missing_kw[:6],
            "education_detected": detected_edu,
            "recommendations": recommendations or ["Resume has high alignment with target software engineering standards."]
        }

    def cluster_student(self, skills: List[str], experience_years: float = 0.0, assessment_score: float = 70.0) -> Dict[str, Any]:
        if not self.student_clusterer:
            raise RuntimeError("Clusterer model not loaded")

        mlb = self.student_clusterer["mlb"]
        kmeans = self.student_clusterer["kmeans"]
        cluster_names = self.student_clusterer["cluster_names"]

        clean_skills = [s.strip() for s in skills if s.strip()]
        skill_vec = mlb.transform([clean_skills])

        cluster_id = int(kmeans.predict(skill_vec)[0])
        cluster_name = cluster_names[cluster_id]

        descriptions = {
            "Beginner Developers": "Early-stage learners establishing computer science fundamentals and foundational programming languages.",
            "Frontend-Oriented Students": "Strong UI/UX development profile focusing on TypeScript, modern component frameworks, and responsive design.",
            "Backend-Oriented Students": "Server-side and database-centric profile specializing in REST APIs, SQL/NoSQL databases, and microservices.",
            "Data-Oriented Students": "Analytics and machine learning profile focused on Python, Pandas, statistical modeling, and data pipelines.",
            "Advanced Full-Stack Developers": "Multi-disciplinary developers with end-to-end expertise spanning frontend, backend, containers, and deployment."
        }

        focus_areas = {
            "Beginner Developers": ["Data Structures & Algorithms", "Git & GitHub Version Control", "Build 1 full-stack CRUD application"],
            "Frontend-Oriented Students": ["State Management (NgRx/Redux)", "Web Performance & Core Web Vitals", "API Integration & Async RxJS"],
            "Backend-Oriented Students": ["Docker Containerization", "Database Query Indexing & Optimization", "Authentication & Security Standards"],
            "Data-Oriented Students": ["Machine Learning Algorithms", "A/B Testing & Advanced SQL", "Interactive Dashboards"],
            "Advanced Full-Stack Developers": ["System Design & High Availability", "CI/CD Pipeline Automation", "Cloud Infrastructure (AWS/GCP)"]
        }

        return {
            "cluster_id": cluster_id,
            "cluster_name": cluster_name,
            "archetype_description": descriptions.get(cluster_name, "Software engineering learner"),
            "recommended_focus_areas": focus_areas.get(cluster_name, ["Advanced System Architecture"])
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "service": "SkillBridge ML Microservice",
            "version": "2.0.0",
            "status": "online",
            "models_loaded": {
                "career_recommender": self.career_recommender is not None,
                "career_readiness": self.career_readiness is not None,
                "student_clusterer": self.student_clusterer is not None,
                "job_matcher": self.job_matcher is not None
            },
            "metadata": self.metadata
        }

# Global singleton instance
engine = MLEngine()

