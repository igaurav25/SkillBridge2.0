import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

export interface UserPreferencesPayload {
  notificationPreferences?: {
    jobAlerts?: boolean;
    interviewReminders?: boolean;
    applicationUpdates?: boolean;
    weeklyDigest?: boolean;
  };
  themePreference?: 'dark' | 'light' | 'system';
  preferred3DMode?: 'auto' | 'force-3d' | 'force-2d';
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/users`;

  updateProfileBasic(payload: { name?: string; headline?: string; phone?: string }): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/me`, payload).pipe(
      tap((res) => {
        if (res.data) {
          this.syncCurrentUser(res.data);
        }
      })
    );
  }

  updatePassword(payload: { currentPassword: string; newPassword: string }): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.API_URL}/password`, payload);
  }

  updatePreferences(payload: UserPreferencesPayload): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/preferences`, payload).pipe(
      tap((res) => {
        if (res.data) {
          this.syncCurrentUser(res.data);
        }
      })
    );
  }

  exportMyData(): Observable<{ success: boolean; exportedAt: string; data: unknown }> {
    return this.http.get<{ success: boolean; exportedAt: string; data: unknown }>(`${this.API_URL}/export-data`);
  }

  deleteMyAccount(password: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API_URL}/me`, { body: { password } });
  }

  private syncCurrentUser(updated: User): void {
    const existing = this.authService.currentUser();
    const merged = { ...existing, ...updated } as User;
    this.authService.currentUser.set(merged);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_user', JSON.stringify(merged));
    }
  }
}

