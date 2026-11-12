import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GithubService, GitHubAnalysisResult } from '../../services/github.service';
import { ProfileService } from '../../services/profile.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-github-analyzer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="github-analyzer-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="header-section mb-8 max-w-2xl">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge badge-primary text-xs">PORTFOLIO INTELLIGENCE</span>
            <span class="badge badge-emerald text-xs">Public Profiling</span>
          </div>
          <h1 class="text-3xl font-extrabold mb-2">
            GitHub Profile <span class="text-gradient">Analyzer</span>
          </h1>
          <p class="text-secondary text-sm">
            Analyze accessible public GitHub repositories, programming language usage distribution, commit frequency, repository documentation quality, and receive actionable suggestions to impress recruiters.
          </p>
        </div>

        <!-- Input Form Card -->
        <div class="sb-card p-6 mb-8 max-w-2xl">
          <form (ngSubmit)="analyzeProfile()" class="flex flex-col gap-4">
            <div>
              <label for="github-input" class="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                GitHub Username or Profile URL:
              </label>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="prefix-box px-3 py-2 bg-secondary rounded-lg text-sm text-muted font-mono border border-subtle">
                  github.com/
                </div>
                <input
                  id="github-input"
                  type="text"
                  [(ngModel)]="githubInput"
                  name="githubInput"
                  placeholder="e.g. torvalds or your-username"
                  class="flex-1 input-sm text-sm font-semibold bg-secondary text-primary border border-subtle rounded-lg px-3 py-2 outline-none focus:border-indigo-500 min-w-0"
                  required
                />
                <button
                  type="submit"
                  class="btn btn-primary btn-sm px-6"
                  [disabled]="isAnalyzing || !githubInput.trim()"
                >
                  <span *ngIf="isAnalyzing" class="spinner-sm"></span>
                  {{ isAnalyzing ? 'Analyzing...' : 'Scan GitHub 🔍' }}
                </button>
              </div>
            </div>
            <p class="text-xs text-secondary">
              🔒 We only read public metadata via official API. No private repository access or passwords required.
            </p>
          </form>
        </div>

        <!-- Analysis Results -->
        <div *ngIf="analysisResult" class="results-container">
          <!-- Top Overview Card -->
          <div class="sb-card sb-card-glow p-6 mb-8">
            <div class="flex items-center justify-between flex-wrap gap-4 border-b border-subtle pb-6 mb-6">
              <div class="flex items-center gap-4 min-w-0 flex-wrap">
                <img
                  [src]="analysisResult.avatarUrl"
                  alt="Avatar"
                  class="w-16 h-16 rounded-full border-2 border-indigo-500 shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <h2 class="text-2xl font-bold flex items-center gap-2 flex-wrap github-profile-title">
                    <span class="github-profile-name">{{ analysisResult.name }}</span>
                    <a [href]="analysisResult.profileUrl" target="_blank" class="text-muted text-xs hover:text-primary">
                      🔗 &#64;{{ analysisResult.username }}
                    </a>
                  </h2>
                  <p class="text-xs text-secondary mt-1 max-w-lg">{{ analysisResult.bio || 'Public GitHub Developer' }}</p>
                </div>
              </div>

              <!-- Score Badge -->
              <div class="text-center p-3 bg-secondary rounded-xl">
                <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">GitHub Portfolio Score</div>
                <div class="text-3xl font-black text-emerald">{{ analysisResult.githubHealthScore }}/100</div>
              </div>
            </div>

            <!-- Stats Row -->
            <div class="grid grid-3 gap-4 text-center mb-6">
              <div class="p-3 bg-secondary rounded-lg">
                <div class="text-2xl font-bold">{{ analysisResult.publicReposCount }}</div>
                <div class="text-xs text-muted">Public Repositories</div>
              </div>
              <div class="p-3 bg-secondary rounded-lg">
                <div class="text-2xl font-bold text-amber">⭐ {{ analysisResult.totalStars }}</div>
                <div class="text-xs text-muted">Total Stars Earned</div>
              </div>
              <div class="p-3 bg-secondary rounded-lg">
                <div class="text-2xl font-bold text-cyan">🍴 {{ analysisResult.totalForks }}</div>
                <div class="text-xs text-muted">Forks</div>
              </div>
            </div>

            <!-- Language Breakdown -->
            <div class="mb-6">
              <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-3">Programming Language Distribution</h3>
              <div class="grid grid-4 gap-3">
                <div *ngFor="let lang of analysisResult.languageDistribution" class="p-3 bg-secondary rounded-lg">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>{{ lang.language }}</span>
                    <span>{{ lang.percentage }}%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill" [style.width.%]="lang.percentage"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actionable Recommendations -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-3">Recruiter Recommendations</h3>
              <div class="flex flex-col gap-2">
                <div *ngFor="let sug of analysisResult.suggestions" class="p-3 bg-secondary rounded-lg flex items-start gap-2.5 text-xs text-secondary">
                  <span class="text-amber">💡</span>
                  <span>{{ sug }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Repositories Grid -->
          <h3 class="text-xl font-bold mb-4">Analyzed Repositories</h3>
          <div class="grid grid-2 gap-4">
            <div *ngFor="let repo of analysisResult.topRepositories" class="sb-card p-4 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-bold text-base">
                    <a [href]="repo.url" target="_blank" class="hover:underline text-primary">
                      {{ repo.name }}
                    </a>
                  </h4>
                  <span class="badge badge-neutral text-xs">{{ repo.language }}</span>
                </div>
                <p class="text-xs text-secondary mb-3">{{ repo.description }}</p>
              </div>

              <div class="flex items-center justify-between text-xs text-muted pt-2 border-t border-subtle">
                <div class="flex items-center gap-3">
                  <span>⭐ {{ repo.stars }}</span>
                  <span>🍴 {{ repo.forks }}</span>
                </div>
                <a [href]="repo.url" target="_blank" class="text-xs text-cyan hover:underline">
                  Inspect Code ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .github-analyzer-page { min-height: 85vh; }
    .text-emerald { color: var(--accent-emerald); }
    .github-profile-title,
    .github-profile-name {
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  `]
})
export class GithubAnalyzerComponent implements OnInit {
  private githubService = inject(GithubService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);

  githubInput = '';
  isAnalyzing = false;
  analysisResult: GitHubAnalysisResult | null = null;

  ngOnInit() {
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data?.github) {
          this.githubInput = res.data.github;
          this.analyzeProfile();
        } else {
          // Pre-fill a sample profile
          this.githubInput = 'octocat';
        }
      }
    });
  }

  analyzeProfile() {
    if (!this.githubInput.trim()) return;
    this.isAnalyzing = true;

    this.githubService.analyzeProfile({
      username: this.githubInput.trim()
    }).subscribe({
      next: (res) => {
        this.analysisResult = res.data;
        this.isAnalyzing = false;
        this.toast.success(`GitHub profile @${res.data.username} analyzed! Score: ${res.data.githubHealthScore}/100`);
      },
      error: (err) => {
        this.isAnalyzing = false;
        this.toast.error('Failed to analyze GitHub profile: ' + err.message);
      }
    });
  }
}

