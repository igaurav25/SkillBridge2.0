import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProjectRecommendation {
  _id: string;
  title: string;
  targetRole: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  requiredTechnologies: string[];
  features: string[];
  expectedOutcome: string;
  learningBenefits: string;
  estimatedDuration: string;
  architectureHighlights?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/projects';

  getRecommendedProjects(filters: { targetRole?: string; difficulty?: string } = {}): Observable<{ success: boolean; count: number; data: ProjectRecommendation[] }> {
    let params = new HttpParams();
    if (filters.targetRole) params = params.set('targetRole', filters.targetRole);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    return this.http.get<{ success: boolean; count: number; data: ProjectRecommendation[] }>(`${this.apiUrl}/recommendations`, { params });
  }

  getProjectById(id: string): Observable<{ success: boolean; data: ProjectRecommendation }> {
    return this.http.get<{ success: boolean; data: ProjectRecommendation }>(`${this.apiUrl}/${id}`);
  }
}

