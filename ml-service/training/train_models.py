"""
SkillBridge 2.0 - Machine Learning Model Training & Evaluation Pipeline
Algorithms:
1. Career Recommendation: Random Forest Classifier (Multi-class across 11 tech roles)
2. Job Matching Engine: TF-IDF Vectorizer + Nearest Neighbors (KNN)
3. Student Skill Clustering: K-Means Clustering (k=5 student archetypes)
4. Career Readiness Predictor: Random Forest Regressor (Continuous readiness 0-100)
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    root_mean_squared_error,
    classification_report
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
MODELS_DIR = os.path.join(BASE_DIR, "trained_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Load taxonomy
taxonomy_path = os.path.join(DATASETS_DIR, "skill_taxonomy.json")
with open(taxonomy_path, "r", encoding="utf-8") as f:
    TAXONOMY = json.load(f)["roles"]

CAREER_ROLES = list(TAXONOMY.keys())

ALL_SKILLS = sorted(list({
    skill
    for role_info in TAXONOMY.values()
    for skill in (role_info["core_skills"] + role_info["secondary_skills"])
}))

print(f"[Init] Total unique skills catalogued: {len(ALL_SKILLS)}")
print(f"[Init] Total target career roles: {len(CAREER_ROLES)}")

def generate_synthetic_profiles(n_samples_per_role=150, seed=42):
    """
    Generates realistic, representative candidate profiles mapped to target roles
    with authentic variations in skill sets, education, experience, and assessments.
    """
    np.random.seed(seed)
    records = []

    education_levels = ["B.Tech / B.E. Computer Science", "B.Sc Information Technology", "B.Tech Electrical", "MCA", "Self-Taught / Bootcamp"]
    domains = [
        "Web Development", "Backend Development", "Full Stack Development",
        "Software Engineering", "Data Analytics", "Data Science",
        "Artificial Intelligence", "Cloud Computing", "Cybersecurity",
        "Mobile Development", "DevOps & Infrastructure"
    ]

    for role_idx, role in enumerate(CAREER_ROLES):
        core = TAXONOMY[role]["core_skills"]
        secondary = TAXONOMY[role]["secondary_skills"]
        other_skills = [s for s in ALL_SKILLS if s not in core and s not in secondary]

        for _ in range(n_samples_per_role):
            # Select 70%-100% of core skills
            num_core = np.random.randint(max(2, int(len(core) * 0.6)), len(core) + 1)
            selected_core = list(np.random.choice(core, size=num_core, replace=False))

            # Select some secondary skills
            num_sec = np.random.randint(1, min(len(secondary), 4))
            selected_sec = list(np.random.choice(secondary, size=num_sec, replace=False))

            # Noise: 0 to 2 random cross-domain skills
            num_noise = np.random.choice([0, 1, 2], p=[0.5, 0.35, 0.15])
            selected_noise = list(np.random.choice(other_skills, size=num_noise, replace=False))

            student_skills = list(set(selected_core + selected_sec + selected_noise))
            years_exp = float(np.random.choice([0, 0.5, 1.0, 1.5, 2.0, 3.0], p=[0.4, 0.25, 0.15, 0.1, 0.05, 0.05]))
            projects_count = int(np.random.poisson(lam=2.5) + 1)
            assessment_score = float(np.clip(np.random.normal(loc=72, scale=14), 30, 99))
            resume_quality_score = float(np.clip(np.random.normal(loc=70, scale=12), 40, 98))
            interview_score = float(np.clip(np.random.normal(loc=68, scale=15), 35, 98))
            problem_solving_score = float(np.clip(np.random.normal(loc=74, scale=12), 40, 100))
            communication_score = float(np.clip(np.random.normal(loc=76, scale=11), 45, 100))

            education = np.random.choice(education_levels)
            preferred_domain = TAXONOMY[role]["domain"]

            # Calculate realistic ground-truth readiness (0 - 100)
            skill_coverage = len(selected_core) / max(len(core), 1)
            readiness = (
                (skill_coverage * 35.0) +
                (min(projects_count, 5) / 5.0 * 20.0) +
                (resume_quality_score * 0.15) +
                (assessment_score * 0.15) +
                (interview_score * 0.15)
            )
            readiness = float(np.clip(readiness + np.random.normal(0, 3), 15, 98))

            records.append({
                "target_role": role,
                "skills": student_skills,
                "education": education,
                "years_experience": years_exp,
                "projects_count": projects_count,
                "assessment_score": round(assessment_score, 1),
                "resume_score": round(resume_quality_score, 1),
                "interview_score": round(interview_score, 1),
                "problem_solving_score": round(problem_solving_score, 1),
                "communication_score": round(communication_score, 1),
                "preferred_domain": preferred_domain,
                "career_readiness": round(readiness, 1)
            })

    df = pd.DataFrame(records)
    return df

def train_career_recommender(df):
    """
    Trains a Random Forest Classifier to recommend the best matching career path
    based on student skills, education, and domain interests.
    """
    print("\n--- Training Career Recommendation Model (Random Forest) ---")
    mlb = MultiLabelBinarizer(classes=ALL_SKILLS)
    skill_matrix = mlb.fit_transform(df["skills"])
    
    # Feature engineering: skills multi-hot + numerical metrics
    X_num = df[["years_experience", "projects_count", "assessment_score"]].values
    X = np.hstack([skill_matrix, X_num])
    y = df["target_role"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=120, max_depth=16, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    print(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")

    # Serialize artifacts
    model_payload = {
        "model": clf,
        "mlb": mlb,
        "classes": list(clf.classes_),
        "skills_catalog": ALL_SKILLS,
        "metrics": {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1}
    }
    joblib.dump(model_payload, os.path.join(MODELS_DIR, "career_recommender.joblib"))
    print("[Saved] career_recommender.joblib")
    return model_payload["metrics"]

def train_career_readiness_model(df):
    """
    Trains a Random Forest Regressor to predict career readiness (0-100%).
    """
    print("\n--- Training Career Readiness Model (Random Forest Regressor) ---")
    features = [
        "years_experience", "projects_count", "assessment_score",
        "resume_score", "interview_score", "problem_solving_score", "communication_score"
    ]
    X = df[features].values
    y = df["career_readiness"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    reg = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    reg.fit(X_train, y_train)

    y_pred = reg.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)

    print(f"MAE: {mae:.2f}% | RMSE: {rmse:.2f}%")

    readiness_payload = {
        "model": reg,
        "feature_names": features,
        "metrics": {"mae": round(mae, 2), "rmse": round(rmse, 2)}
    }
    joblib.dump(readiness_payload, os.path.join(MODELS_DIR, "career_readiness.joblib"))
    print("[Saved] career_readiness.joblib")
    return readiness_payload["metrics"]

def train_student_clustering(df):
    """
    Trains K-Means Clustering to group students into 5 behavioral and skill archetypes.
    """
    print("\n--- Training Student Clustering Model (K-Means k=5) ---")
    mlb = MultiLabelBinarizer(classes=ALL_SKILLS)
    skill_matrix = mlb.fit_transform(df["skills"])

    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(skill_matrix)

    cluster_names = [
        "Beginner Developers",
        "Frontend-Oriented Students",
        "Backend-Oriented Students",
        "Data-Oriented Students",
        "Advanced Full-Stack Developers"
    ]

    cluster_payload = {
        "kmeans": kmeans,
        "mlb": mlb,
        "cluster_names": cluster_names,
        "inertia": float(kmeans.inertia_)
    }
    joblib.dump(cluster_payload, os.path.join(MODELS_DIR, "student_clusterer.joblib"))
    print(f"[Saved] student_clusterer.joblib (Inertia: {kmeans.inertia_:.2f})")
    return {"inertia": float(kmeans.inertia_), "clusters": cluster_names}

def train_job_recommender():
    """
    Trains TF-IDF + NearestNeighbors for intelligent job profile matching.
    """
    print("\n--- Training Job Recommender Model (TF-IDF + KNN) ---")
    
    # Load or create reference job postings
    job_templates = []
    companies = ["Google", "Microsoft", "Stripe", "Amazon", "Netflix", "Databricks", "Uber", "Airbnb", "Razorpay", "Postman", "Zerodha"]
    types = ["full-time", "internship"]

    for role, info in TAXONOMY.items():
        for comp in companies[:6]:
            for jtype in types:
                skills_str = ", ".join(info["core_skills"] + info["secondary_skills"][:3])
                desc = f"{jtype.capitalize()} {role} opportunity at {comp}. Looking for candidates skilled in {skills_str}. Experience building robust software and applications."
                job_templates.append({
                    "title": f"{jtype.capitalize()} {role}",
                    "role": role,
                    "company": comp,
                    "type": jtype,
                    "domain": info["domain"],
                    "skills": info["core_skills"] + info["secondary_skills"][:3],
                    "text_corpus": f"{role} {skills_str} {info['domain']} {desc}"
                })

    df_jobs = pd.DataFrame(job_templates)
    
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(df_jobs["text_corpus"])

    nn_model = NearestNeighbors(n_neighbors=5, metric="cosine")
    nn_model.fit(tfidf_matrix)

    job_payload = {
        "vectorizer": vectorizer,
        "nn_model": nn_model,
        "jobs_db": df_jobs.to_dict(orient="records"),
        "total_jobs_indexed": len(df_jobs)
    }
    joblib.dump(job_payload, os.path.join(MODELS_DIR, "job_matcher.joblib"))
    print(f"[Saved] job_matcher.joblib ({len(df_jobs)} jobs indexed)")
    return {"jobs_indexed": len(df_jobs)}

def main():
    print("=" * 60)
    print("SkillBridge 2.0 ML Training Pipeline Starting...")
    print("=" * 60)

    df_synthetic = generate_synthetic_profiles(n_samples_per_role=150)
    csv_path = os.path.join(DATASETS_DIR, "career_profiles_dataset.csv")
    df_synthetic.to_csv(csv_path, index=False)
    print(f"[Dataset] Generated {len(df_synthetic)} student profile records -> {csv_path}")

    # Train all models
    career_metrics = train_career_recommender(df_synthetic)
    readiness_metrics = train_career_readiness_model(df_synthetic)
    clustering_metrics = train_student_clustering(df_synthetic)
    job_metrics = train_job_recommender()

    # Model metadata
    metadata = {
        "version": "2.0.0",
        "trained_at": datetime.utcnow().isoformat(),
        "algorithms": {
            "career_recommender": "RandomForestClassifier (120 trees, max_depth=16)",
            "career_readiness": "RandomForestRegressor (100 trees, max_depth=10)",
            "student_clustering": "KMeans (k=5)",
            "job_matcher": "TfidfVectorizer + NearestNeighbors (Cosine)"
        },
        "evaluation_metrics": {
            "career_recommender": career_metrics,
            "career_readiness": readiness_metrics,
            "student_clustering": clustering_metrics,
            "job_matcher": job_metrics
        },
        "target_roles": CAREER_ROLES,
        "taxonomy_file": "skill_taxonomy.json"
    }

    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[Complete] All models trained and saved to {MODELS_DIR}")
    print(f"[Metadata] Written to {meta_path}")

if __name__ == "__main__":
    main()

