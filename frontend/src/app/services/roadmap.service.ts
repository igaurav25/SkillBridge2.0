import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TopicItem {
  topicId: string;
  title: string;
  description: string;
  estimatedHours: number;
  resources?: Array<{ title: string; url: string; type: string }>;
  milestoneBadge?: string;
}

export interface RoadmapLevel {
  levelName: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  topics: TopicItem[];
  projectMilestone?: {
    title: string;
    description: string;
    skills: string[];
  };
}

export interface LearningRoadmap {
  _id: string;
  role: string;
  domain: string;
  description: string;
  levels: RoadmapLevel[];
}

export interface LearningProgress {
  role: string;
  completedTopics: string[];
  currentStreak: number;
  totalHoursSpent: number;
  roadmapCompletionPct: number;
  completedProjects: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoadmapService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roadmaps`;

  getAllRoadmaps(): Observable<{ success: boolean; count: number; data: LearningRoadmap[] }> {
    return this.http.get<{ success: boolean; count: number; data: LearningRoadmap[] }>(this.apiUrl);
  }

  getRoadmapByRole(role: string): Observable<{ success: boolean; data: LearningRoadmap }> {
    return this.http.get<{ success: boolean; data: LearningRoadmap }>(`${this.apiUrl}/role/${encodeURIComponent(role)}`);
  }

  getMyProgress(role: string): Observable<{ success: boolean; data: LearningProgress }> {
    return this.http.get<{ success: boolean; data: LearningProgress }>(`${this.apiUrl}/progress/${encodeURIComponent(role)}`);
  }

  toggleTopic(role: string, topicId: string, hoursSpent: number = 2): Observable<{ success: boolean; isCompleted: boolean; data: LearningProgress }> {
    return this.http.post<{ success: boolean; isCompleted: boolean; data: LearningProgress }>(`${this.apiUrl}/progress/toggle-topic`, {
      role,
      topicId,
      hoursSpent
    });
  }
}

