import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GitHubAnalysisResult {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  profileUrl: string;
  publicReposCount: number;
  totalStars: number;
  totalForks: number;
  githubHealthScore: number;
  isLiveFetched: boolean;
  languageDistribution: Array<{ language: string; repoCount: number; percentage: number }>;
  topRepositories: Array<{
    name: string;
    language: string;
    stars: number;
    forks: number;
    description: string;
    url: string;
  }>;
  suggestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/github';

  analyzeProfile(payload: { username?: string; githubUrl?: string }): Observable<{ success: boolean; data: GitHubAnalysisResult }> {
    return this.http.post<{ success: boolean; data: GitHubAnalysisResult }>(`${this.apiUrl}/analyze`, payload);
  }
}

