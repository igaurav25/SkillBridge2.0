import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface PublicPlatformStats {
  activeJobs: number;
  companiesCount: number;
  verifiedCompaniesCount: number;
  registeredStudents: number;
  recruitersCount: number;
  assessmentsCount: number;
  roadmapsCount: number;
  applicationsCount: number;
  mockInterviewsCount: number;
  generatedAt: string;
}

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
  private apiUrl = `${environment.apiUrl}/analytics`;
  private publicStats$?: Observable<{ success: boolean; data: PublicPlatformStats }>;

  getPublicStats(forceRefresh = false): Observable<{ success: boolean; data: PublicPlatformStats }> {
    if (!this.publicStats$ || forceRefresh) {
      this.publicStats$ = this.http
        .get<{ success: boolean; data: PublicPlatformStats }>(`${this.apiUrl}/public-stats`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.publicStats$;
  }

  getStudentCareerAnalytics(): Observable<{ success: boolean; data: CareerAnalyticsData }> {
    return this.http.get<{ success: boolean; data: CareerAnalyticsData }>(`${this.apiUrl}/career`);
  }

  getRecruiterAnalytics(): Observable<{ success: boolean; data: RecruiterAnalyticsData }> {
    return this.http.get<{ success: boolean; data: RecruiterAnalyticsData }>(`${this.apiUrl}/recruiter`);
  }
}

export interface RecruiterAnalyticsData {
  summary: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    totalViews: number;
    totalApplications: number;
    shortlistedCandidates: number;
    scheduledInterviews: number;
    totalHires: number;
  };
  funnel: {
    views: number;
    applications: number;
    underReview: number;
    shortlisted: number;
    interview: number;
    selected: number;
    rejected: number;
  };
  conversionRates: {
    viewToApplyRate: number;
    applyToShortlistRate: number;
    interviewToHireRate: number;
  };
  jobPerformance: Array<{
    id: string;
    title: string;
    status: string;
    views: number;
    applications: number;
    shortlisted: number;
    hired: number;
    conversionRate: number;
    createdAt: string;
  }>;
  topSkillsInDemand: Array<{
    name: string;
    count: number;
  }>;
}

