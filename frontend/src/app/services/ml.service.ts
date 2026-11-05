import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CareerRecommendationItem {
  career_role: string;
  suitability_score: number;
  domain: string;
  required_skills: string[];
  missing_skills: string[];
  explanation: string;
  suggested_next_steps: string[];
}

export interface CareerRecommendResponse {
  success: boolean;
  top_recommendations: CareerRecommendationItem[];
  model_version: string;
}

export interface CareerReadinessResponse {
  success: boolean;
  career_readiness_score: number;
  readiness_level: string;
  strengths: string[];
  weak_areas: string[];
  improvement_suggestions: string[];
  historical_benchmark: {
    top_quartile_benchmark: number;
    average_placed_candidate: number;
    current_cohort_average: number;
  };
  disclaimer: string;
}

export interface SkillGapResponse {
  success: boolean;
  target_role: string;
  domain: string;
  matching_percentage: number;
  acquired_skills: string[];
  missing_skills: string[];
  prioritized_missing_skills: Array<{ skill: string; priority: string; weight: number }>;
  suggested_next_skill: string;
  learning_path: any[];
}

@Injectable({
  providedIn: 'root'
})
export class MlService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/ml';

  recommendCareers(data: any = {}): Observable<CareerRecommendResponse> {
    return this.http.post<CareerRecommendResponse>(`${this.apiUrl}/career/recommend`, data);
  }

  predictReadiness(data: any = {}): Observable<CareerReadinessResponse> {
    return this.http.post<CareerReadinessResponse>(`${this.apiUrl}/career/readiness`, data);
  }

  recommendJobs(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/jobs/recommend`, data);
  }

  analyzeSkillGap(data: { currentSkills: string[]; targetRole: string }): Observable<SkillGapResponse> {
    return this.http.post<SkillGapResponse>(`${this.apiUrl}/skills/gap-analysis`, data);
  }

  matchResume(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/resume/match`, data);
  }

  clusterStudent(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/students/cluster`, data);
  }

  getModelStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/models/status`);
  }

  getPredictionHistory(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/predictions/history`);
  }
}

