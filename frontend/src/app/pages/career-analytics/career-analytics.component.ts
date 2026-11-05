import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService, CareerAnalyticsData } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-career-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="analytics-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge badge-primary text-xs">CAREER TELEMETRY</span>
              <span class="badge badge-emerald text-xs">Real-Time Aggregation</span>
            </div>
            <h1 class="text-3xl font-extrabold">
              Career & Skill <span class="text-gradient">Analytics</span>
            </h1>
            <p class="text-secondary text-sm mt-1 max-w-xl">
              Holistic historical telemetry tracking your verified competency growth, application outcomes, interview readiness trends, and ATS progression.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <a routerLink="/student/dashboard" class="btn btn-outline btn-sm">← Back to Dashboard</a>
            <a routerLink="/career-explorer" class="btn btn-primary btn-sm">Explore Careers →</a>
          </div>
        </div>

        <div *ngIf="isLoading" class="grid grid-3 gap-6">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="sb-card p-6 h-48 skeleton-box"></div>
        </div>

        <div *ngIf="!isLoading && data" class="flex flex-col gap-8">
          <!-- Summary Metric Highlights -->
          <div class="grid grid-4 gap-4">
            <div class="sb-card p-4">
              <span class="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Profile Strength</span>
              <div class="text-3xl font-black text-cyan">{{ data.profileStrength }}%</div>
              <div class="progress-bar-container mt-2">
                <div class="progress-bar-fill" [style.width.%]="data.profileStrength"></div>
              </div>
            </div>

            <div class="sb-card p-4">
              <span class="text-xs text-muted uppercase font-bold tracking-wider block mb-1">ATS Resume Score</span>
              <div class="text-3xl font-black text-emerald">{{ data.resumeScore }}/100</div>
              <div class="text-xs text-secondary mt-2">Keywords & formatting rating</div>
            </div>

            <div class="sb-card p-4">
              <span class="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Total Learning Hours</span>
              <div class="text-3xl font-black text-violet">{{ data.learningMetrics.totalHours }} hrs</div>
              <div class="text-xs text-secondary mt-2">Across {{ data.learningMetrics.activeRoadmaps }} roadmap tracks</div>
            </div>

            <div class="sb-card p-4">
              <span class="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Applications Active</span>
              <div class="text-3xl font-black text-amber">{{ data.applicationStats.total }}</div>
              <div class="text-xs text-secondary mt-2">{{ data.applicationStats.interview }} in interview stage</div>
            </div>
          </div>

          <!-- Section 1 & 2: Application Pipeline Funnel & ATS Breakdown -->
          <div class="grid grid-2 gap-6">
            <!-- Application Pipeline Funnel -->
            <div class="sb-card p-6">
              <h3 class="text-lg font-bold mb-4 flex items-center justify-between">
                <span>Application Pipeline Breakdown</span>
                <span class="badge badge-neutral text-xs">Total: {{ data.applicationStats.total }}</span>
              </h3>

              <div class="flex flex-col gap-3">
                <div class="funnel-row">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Applied</span> <span>{{ data.applicationStats.applied }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill bg-indigo" [style.width.%]="calcPct(data.applicationStats.applied)"></div>
                  </div>
                </div>

                <div class="funnel-row">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Under Review</span> <span>{{ data.applicationStats.underReview }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill bg-blue" [style.width.%]="calcPct(data.applicationStats.underReview)"></div>
                  </div>
                </div>

                <div class="funnel-row">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Shortlisted</span> <span>{{ data.applicationStats.shortlisted }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill bg-cyan" [style.width.%]="calcPct(data.applicationStats.shortlisted)"></div>
                  </div>
                </div>

                <div class="funnel-row">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Interview Scheduled</span> <span class="text-emerald font-bold">{{ data.applicationStats.interview }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill bg-emerald" [style.width.%]="calcPct(data.applicationStats.interview)"></div>
                  </div>
                </div>

                <div class="funnel-row">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>Selected / Offers</span> <span class="text-amber font-bold">{{ data.applicationStats.selected }}</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill bg-amber" [style.width.%]="calcPct(data.applicationStats.selected)"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ATS Score Matrix Breakdown -->
            <div class="sb-card p-6">
              <h3 class="text-lg font-bold mb-4">ATS Resume Score Breakdown</h3>
              <div class="grid grid-2 gap-4 mb-4">
                <div class="p-3 bg-secondary rounded-lg">
                  <div class="text-xs text-muted mb-1">Skills Alignment</div>
                  <div class="text-xl font-bold">{{ data.atsBreakdown.skillsScore ?? 75 }}%</div>
                </div>
                <div class="p-3 bg-secondary rounded-lg">
                  <div class="text-xs text-muted mb-1">Project Impact & Metrics</div>
                  <div class="text-xl font-bold">{{ data.atsBreakdown.projectsScore ?? 70 }}%</div>
                </div>
                <div class="p-3 bg-secondary rounded-lg">
                  <div class="text-xs text-muted mb-1">Experience Relevance</div>
                  <div class="text-xl font-bold">{{ data.atsBreakdown.experienceScore ?? 65 }}%</div>
                </div>
                <div class="p-3 bg-secondary rounded-lg">
                  <div class="text-xs text-muted mb-1">Role Keyword Density</div>
                  <div class="text-xl font-bold">{{ data.atsBreakdown.keywordsScore ?? 80 }}%</div>
                </div>
              </div>
              <a routerLink="/resume-analyzer" class="btn btn-secondary btn-sm w-full text-center">
                Re-scan Resume with ATS Analyzer →
              </a>
            </div>
          </div>

          <!-- Section 3: Interview Performance & Assessment History Trends -->
          <div class="grid grid-2 gap-6">
            <!-- Interview Trends -->
            <div class="sb-card p-6">
              <h3 class="text-lg font-bold mb-4">AI Mock Interview Trends</h3>
              <div *ngIf="data.interviewScoreTrends.length === 0" class="text-center p-6 text-xs text-secondary">
                No mock interviews recorded yet. Take an AI practice session to populate score telemetry.
              </div>
              <div *ngIf="data.interviewScoreTrends.length > 0" class="flex flex-col gap-3">
                <div *ngFor="let it of data.interviewScoreTrends" class="p-3 bg-secondary rounded-lg flex items-center justify-between">
                  <div>
                    <span class="badge badge-neutral text-xs">{{ it.category }}</span>
                    <h5 class="text-sm font-bold mt-1">{{ it.targetRole }}</h5>
                    <span class="text-xs text-muted">{{ it.date | date:'shortDate' }}</span>
                  </div>
                  <div class="text-xl font-bold text-emerald">{{ it.score }}%</div>
                </div>
              </div>
            </div>

            <!-- Assessment Trends -->
            <div class="sb-card p-6">
              <h3 class="text-lg font-bold mb-4">Skill Assessment History</h3>
              <div *ngIf="data.assessmentTrends.length === 0" class="text-center p-6 text-xs text-secondary">
                No interactive assessments taken yet.
              </div>
              <div *ngIf="data.assessmentTrends.length > 0" class="flex flex-col gap-3">
                <div *ngFor="let at of data.assessmentTrends" class="p-3 bg-secondary rounded-lg flex items-center justify-between">
                  <div>
                    <span class="badge badge-primary text-xs">{{ at.category }}</span>
                    <h5 class="text-sm font-bold mt-1">{{ at.title }}</h5>
                    <span class="text-xs text-muted">{{ at.date | date:'shortDate' }}</span>
                  </div>
                  <div class="text-xl font-bold text-cyan">{{ at.percentage }}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-page { min-height: 85vh; }
    .bg-indigo { background: var(--primary-500); }
    .bg-blue { background: #3b82f6; }
    .bg-cyan { background: var(--accent-cyan); }
    .bg-emerald { background: var(--accent-emerald); }
    .bg-amber { background: var(--accent-amber); }
    .text-emerald { color: var(--accent-emerald); }
    .text-violet { color: var(--accent-violet); }
  `]
})
export class CareerAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  authService = inject(AuthService);

  isLoading = true;
  data: CareerAnalyticsData | null = null;

  ngOnInit() {
    this.analyticsService.getStudentCareerAnalytics().subscribe({
      next: (res) => {
        this.data = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  calcPct(val: number): number {
    const total = this.data?.applicationStats?.total || 1;
    return Math.min(100, Math.round((val / total) * 100));
  }
}

