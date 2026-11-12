import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BadgeItem {
  badgeId: string;
  title: string;
  description: string;
  category: 'learning' | 'skill' | 'assessment' | 'project' | 'interview';
  icon: string;
  points: number;
  isEarned: boolean;
  earnedAt?: string | null;
}

export interface AchievementsData {
  totalPoints: number;
  earnedCount: number;
  totalAvailable: number;
  badges: BadgeItem[];
}

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/achievements`;

  getMyAchievements(): Observable<{ success: boolean; data: AchievementsData }> {
    return this.http.get<{ success: boolean; data: AchievementsData }>(`${this.apiUrl}/me`);
  }
}

