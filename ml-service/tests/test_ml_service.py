import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ml_engine import engine

def test_health_and_models():
    status = engine.get_status()
    assert status["status"] == "online"
    assert status["models_loaded"]["career_recommender"] is True
    assert status["models_loaded"]["career_readiness"] is True
    assert status["models_loaded"]["student_clusterer"] is True
    assert status["models_loaded"]["job_matcher"] is True
    print("[PASS] ML Engine Models Loaded and Online")

def test_career_recommendation():
    skills = ["JavaScript", "TypeScript", "Angular", "HTML5", "CSS3"]
    recs = engine.recommend_careers(
        skills=skills,
        education="B.Tech Computer Science",
        years_experience=0.5,
        projects_count=2,
        assessment_score=85.0
    )
    assert len(recs) > 0
    top = recs[0]
    assert "career_role" in top
    assert top["suitability_score"] > 0
    assert len(top["required_skills"]) > 0
    print(f"[PASS] Career Recommendation: Top role = {top['career_role']} ({top['suitability_score']}%)")

def test_career_readiness():
    res = engine.predict_readiness(
        technical_skills=["Node.js", "Express.js", "MongoDB", "SQL", "Git"],
        projects_count=3,
        resume_score=80.0,
        interview_score=75.0,
        assessment_score=82.0,
        problem_solving_score=75.0,
        communication_score=80.0,
        years_experience=0.5,
        target_role="Backend Developer"
    )
    assert 10 <= res["career_readiness_score"] <= 100
    assert res["readiness_level"] in ["Low", "Moderate", "Job Ready", "Highly Prepared", "Developing Foundation"]
    assert len(res["strengths"]) > 0
    print(f"[PASS] Career Readiness: Score = {res['career_readiness_score']}% ({res['readiness_level']})")

def test_job_matching():
    matches = engine.recommend_jobs(
        skills=["Python", "Pandas", "Scikit-learn", "Machine Learning"],
        target_role="Machine Learning Engineer",
        top_k=3
    )
    assert len(matches) > 0
    top_match = matches[0]
    assert "title" in top_match
    assert top_match["matching_percentage"] > 0
    print(f"[PASS] Job Matching: Top match = {top_match['title']} at {top_match['company']} ({top_match['matching_percentage']}%)")

def test_skill_gap_analysis():
    res = engine.analyze_skill_gap(
        current_skills=["HTML5", "CSS3", "JavaScript"],
        target_role="Frontend Developer"
    )
    assert res["target_role"] == "Frontend Developer"
    assert "suggested_next_skill" in res
    assert len(res["prioritized_missing_skills"]) > 0
    print(f"[PASS] Skill Gap Analysis: Next skill = {res['suggested_next_skill']}, Match = {res['matching_percentage']}%")

def test_student_clustering():
    res = engine.cluster_student(
        skills=["HTML5", "CSS3", "React", "TypeScript"],
        experience_years=1.0,
        assessment_score=80.0
    )
    assert "cluster_name" in res
    assert "cluster_id" in res
    print(f"[PASS] Student Clustering: Cluster = {res['cluster_name']}")

def test_resume_matching():
    sample_resume = "Full Stack Engineer with 2 years building React and Node.js applications with PostgreSQL, MongoDB, Docker and Git."
    res = engine.match_resume(
        resume_text=sample_resume,
        target_role="Full Stack Developer"
    )
    assert res["match_percentage"] > 0
    assert len(res["detected_skills"]) > 0
    print(f"[PASS] Resume Intelligence: Match = {res['match_percentage']}%, Detected = {res['detected_skills']}")

if __name__ == "__main__":
    test_health_and_models()
    test_career_recommendation()
    test_career_readiness()
    test_job_matching()
    test_skill_gap_analysis()
    test_student_clustering()
    test_resume_matching()
    print("\n==============================================")
    print(">>> ALL 7 ML MICROSERVICE MODULES VERIFIED! <<<")
    print("==============================================")
