import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssessmentQuestion {
  questionText: string;
  options: string[];
  skill: string;
  difficulty: string;
}

export interface Assessment {
  _id: string;
  title: string;
  category: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  totalQuestions: number;
  passingPercentage: number;
  questions?: AssessmentQuestion[];
}

export interface AssessmentResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  skillBreakdown: Array<{ skill: string; score: number; total: number; percentage: number }>;
  questionsWithFeedback: Array<{
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    userSelectedOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
    skill: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/assessments';

  getAssessments(filters: { category?: string; difficulty?: string } = {}): Observable<{ success: boolean; count: number; data: Assessment[] }> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    return this.http.get<{ success: boolean; count: number; data: Assessment[] }>(this.apiUrl, { params });
  }

  getAssessmentById(id: string): Observable<{ success: boolean; data: Assessment }> {
    return this.http.get<{ success: boolean; data: Assessment }>(`${this.apiUrl}/${id}`);
  }

  submitAssessment(id: string, payload: { answers: Array<{ questionIndex: number; selectedOptionIndex: number }>; timeSpentSeconds: number }): Observable<{ success: boolean; data: AssessmentResult }> {
    return this.http.post<{ success: boolean; data: AssessmentResult }>(`${this.apiUrl}/${id}/submit`, payload);
  }

  getMyAssessmentHistory(): Observable<{ success: boolean; count: number; data: any[] }> {
    return this.http.get<{ success: boolean; count: number; data: any[] }>(`${this.apiUrl}/history/me`);
  }
}

