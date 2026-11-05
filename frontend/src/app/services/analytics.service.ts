import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CareerAnalyticsData {
  profileStrength: number;
  resumeScore: number;
  atsBreakdown: {
    skillsScore?: number;
    projectsScore?: number;
    experienceScore?: number;
    keywordsScore?: number;
  };
  applicationStats: {
    total: number;
    applied: number;
    underReview: number;
    shortlisted: number;
    interview: number;
    selected: number;
    rejected: number;
  };
  interviewScoreTrends: Array<{
    date: string;
    targetRole: string;
    category: string;
    score: number;
  }>;
  assessmentTrends: Array<{
    date: string;
    title: string;
    category: string;
    percentage: number;
  }>;
  careerPredictionHistory: Array<{
    predictedRole: string;
    suitabilityScore: number;
    readinessScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    createdAt: string;
  }>;
  learningMetrics: {
    totalHours: number;
    currentStreak: number;
    activeRoadmaps: number;
  };
  skillDistribution: Array<{
    category: string;
    count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/analytics';

  getStudentCareerAnalytics(): Observable<{ success: boolean; data: CareerAnalyticsData }> {
    return this.http.get<{ success: boolean; data: CareerAnalyticsData }>(`${this.apiUrl}/career`);
  }
}

