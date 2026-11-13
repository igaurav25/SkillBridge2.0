import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Job } from '../../models/job.model';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { getDirectApplyUrl } from '../../utils/direct-apply.util';

@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sb-card sb-card-interactive job-card" [class.new-arrival-glow]="job.isNewArrival" [class.job-expired]="isExpired">
      <!-- Platform Origin & Source Bar -->
      <div class="platform-bar flex items-center justify-between mb-3 pb-2 border-bottom flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Real-Time Incoming Arrival Badge or Expired Badge -->
          <span *ngIf="isExpired" class="badge badge-danger font-bold text-xs">
            ⚠️ CLOSED / EXPIRED
          </span>
          <span *ngIf="!isExpired && job.isNewArrival" class="new-arrival-pill font-black text-xs">
            🔥 NEW ARRIVAL (Just Now)
          </span>

          <span class="platform-icon-pill" [ngClass]="getPlatformClass(job.platform)">
            <span>{{ job.platform || 'SkillBridge Network' }}</span>
          </span>

          <!-- Stream Eligibility Tag -->
          <span *ngIf="job.stream" class="stream-pill" [ngClass]="getStreamClass(job.stream)">
            {{ getStreamLabel(job.stream) }}
          </span>

          <span class="source-tag text-[11px] text-muted">
            Source: {{ job.platform ? job.platform : 'Direct Recruiter' }}
          </span>

          <span *ngIf="!isExpired" class="live-dot" title="Active Opportunity"></span>
          <span class="text-xs text-muted font-medium">{{ job.postedAt || 'Recent' }}</span>
        </div>

        <!-- Direct Apply Button (Clicks directly to external platform job apply page) -->
        <div class="flex items-center gap-2">
          <a
            *ngIf="!isExpired && directApplyUrl"
            [href]="directApplyUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="direct-apply-pill text-xs font-bold"
            (click)="$event.stopPropagation()"
            title="Direct Apply on {{ job.platform || 'Official Portal' }} (Opens Web Application Page)"
          >
            Apply on {{ job.platform || 'Official Portal' }} ↗
          </a>
          <span *ngIf="isExpired" class="text-xs text-danger font-semibold">
            Applications Closed
          </span>
        </div>
      </div>

      <div class="card-header flex items-start justify-between gap-4 mb-3">
        <div class="flex items-center gap-3 min-w-0">
          <img
            [src]="(job.companyLogo || job.company?.logo) && ((job.companyLogo || job.company?.logo || '').startsWith('/uploads/') || (job.companyLogo || job.company?.logo || '').startsWith('data:image/')) ? (job.companyLogo || job.company?.logo) : 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2241%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%20fill%3D%22%23818cf8%22%20font-family%3D%22system-ui%2Csans-serif%22%3ESB%3C%2Ftext%3E%3C%2Fsvg%3E'"
            alt="{{ job.companyName }} logo"
            class="company-logo flex-shrink-0"
            (error)="onImgError($event)"
          />
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="company-name text-xs font-semibold text-secondary">{{ job.companyName }}</span>
              <span *ngIf="job.company?.isVerified" class="verified-icon text-xs text-emerald font-bold" title="Verified by SkillBridge">✓ Verified</span>
              <span *ngIf="job.platformBadge" class="badge badge-neutral text-xs py-0 px-2 font-medium">
                {{ job.platformBadge }}
              </span>
            </div>
            <h3 class="job-title text-base font-bold truncate">{{ job.title }}</h3>
          </div>
        </div>

        <!-- Card Top Actions: Scam Report + Bookmark button -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="btn-flag text-xs text-muted hover:text-danger"
            (click)="onReportClick($event)"
            title="Report fake job or scam"
            aria-label="Report listing"
          >
            🚩
          </button>

          <button
            *ngIf="authService.isStudent()"
            type="button"
            class="bookmark-btn"
            [class.saved]="isSaved"
            (click)="onToggleSave($event)"
            title="{{ isSaved ? 'Remove bookmark' : 'Bookmark job' }}"
            aria-label="Bookmark job"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" [attr.fill]="isSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Badges Row -->
      <div class="badges-row flex items-center gap-2 flex-wrap mb-3">
        <span class="badge" [ngClass]="getWorkTypeClass(job.workType || job.workMode)">
          {{ (job.workType || job.workMode || 'onsite') | uppercase }}
        </span>
        <span class="badge badge-primary">
          {{ (job.jobType || job.type || 'Full-time') | titlecase }}
        </span>
        <span class="badge badge-neutral">
          {{ (job.experienceLevel || 'Entry') | titlecase }}
        </span>
        <span *ngIf="computedMatch" class="badge badge-cyan font-bold" [title]="computedMatch.matched.length + ' matching skills'">
          ⚡ {{ computedMatch.score }}% Match
        </span>
        <span *ngIf="job.deadline" class="badge text-xs" [class.badge-danger]="isExpired" [class.badge-neutral]="!isExpired">
          🕒 {{ isExpired ? 'Closed' : 'Deadline: ' + (job.deadline | date:'mediumDate') }}
        </span>
      </div>

      <!-- Skills Preview with Highlighted Matches -->
      <div class="skills-preview flex items-center gap-1.5 flex-wrap mb-4">
        <span
          *ngFor="let skill of (job.requiredSkills || job.skillsRequired || []).slice(0, 5)"
          class="skill-pill text-xs"
          [class.skill-matched]="isSkillMatched(skill)"
        >
          {{ skill }}
          <span *ngIf="isSkillMatched(skill)" class="match-check text-emerald font-bold">✓</span>
        </span>
        <span *ngIf="((job.requiredSkills || job.skillsRequired)?.length || 0) > 5" class="text-xs text-muted">
          +{{ ((job.requiredSkills || job.skillsRequired)?.length || 0) - 5 }} more
        </span>
      </div>

      <!-- Card Footer -->
      <div class="card-footer flex items-center justify-between pt-3 border-top flex-wrap gap-2">
        <div class="salary-text text-sm font-bold text-gradient">
          <ng-container *ngIf="job.salary?.raw">
            {{ job.salary.raw }}
          </ng-container>
          <ng-container *ngIf="!job.salary?.raw && job.salary?.isDisclosed && job.salary?.min">
            {{ formatSalary(job.salary) }}
          </ng-container>
          <ng-container *ngIf="!job.salary?.raw && (!job.salary?.isDisclosed || !job.salary?.min)">
            Competitive Market Pay
          </ng-container>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs text-muted">📍 {{ job.location }}</span>

          <!-- View Details CTA -->
          <button type="button" class="btn btn-outline btn-xs" (click)="onDetailsClick($event)">
            Details ℹ️
          </button>

          <!-- Direct Apply CTA -->
          <ng-container *ngIf="!isExpired">
            <a
              *ngIf="directApplyUrl"
              [href]="directApplyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-xs font-bold flex items-center gap-1 direct-apply-btn"
              (click)="$event.stopPropagation()"
              title="Direct Apply on {{ job.platform || 'Official Portal' }} (Opens Web Application Page)"
            >
              <span>Direct Apply</span>
              <span class="text-xs">↗</span>
            </a>
            <button
              *ngIf="!directApplyUrl"
              type="button"
              class="btn btn-primary btn-xs font-bold"
              (click)="onDetailsClick($event)"
            >
              Apply Now
            </button>
          </ng-container>

          <span *ngIf="isExpired" class="btn btn-xs btn-neutral opacity-50 cursor-not-allowed">
            Closed
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .job-card {
        padding: 1.25rem;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .job-card:hover {
        transform: translateY(-2px);
        border-color: var(--primary-500, #3b82f6);
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
      }
      .job-expired {
        opacity: 0.78;
        border-color: rgba(239, 68, 68, 0.25);
      }
      .platform-bar {
        border-bottom: 1px solid var(--border-subtle);
      }
      .platform-icon-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .platform-linkedin {
        background: rgba(10, 102, 194, 0.22);
        color: #93c5fd;
        border: 1px solid rgba(96, 165, 250, 0.45);
      }
      .platform-indeed {
        background: rgba(33, 100, 244, 0.22);
        color: #93c5fd;
        border: 1px solid rgba(96, 165, 250, 0.45);
      }
      .platform-internshala {
        background: rgba(0, 175, 239, 0.22);
        color: #7dd3fc;
        border: 1px solid rgba(56, 189, 248, 0.45);
      }
      .platform-remotive {
        background: rgba(16, 185, 129, 0.22);
        color: #6ee7b7;
        border: 1px solid rgba(52, 211, 153, 0.45);
      }
      .platform-gov {
        background: rgba(245, 158, 11, 0.22);
        color: #fcd34d;
        border: 1px solid rgba(251, 191, 36, 0.45);
      }
      .platform-tech {
        background: rgba(139, 92, 246, 0.22);
        color: #ddd6fe;
        border: 1px solid rgba(167, 139, 250, 0.45);
      }
      .platform-finance {
        background: rgba(16, 185, 129, 0.22);
        color: #6ee7b7;
        border: 1px solid rgba(52, 211, 153, 0.45);
      }
      .platform-default {
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        border: 1px solid var(--border-subtle);
      }
      .stream-pill {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .stream-btech {
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
        border: 1px solid rgba(96, 165, 250, 0.4);
      }
      .stream-government {
        background: rgba(234, 88, 12, 0.22);
        color: #fdba74;
        border: 1px solid rgba(251, 146, 60, 0.45);
      }
      .stream-bcom {
        background: rgba(16, 185, 129, 0.2);
        color: #6ee7b7;
        border: 1px solid rgba(52, 211, 153, 0.4);
      }
      .stream-bba {
        background: rgba(168, 85, 247, 0.22);
        color: #e9d5ff;
        border: 1px solid rgba(192, 132, 252, 0.45);
      }
      .stream-internship {
        background: rgba(6, 182, 212, 0.2);
        color: #67e8f9;
        border: 1px solid rgba(34, 211, 238, 0.4);
      }
      .stream-default {
        background: var(--bg-tertiary);
        color: var(--text-secondary);
      }
      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: var(--accent-emerald, #10b981);
        display: inline-block;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
      }
      .direct-apply-pill {
        background: transparent;
        border: none;
        color: var(--primary-400, #3b82f6);
        text-decoration: underline;
        cursor: pointer;
        padding: 0;
        transition: color 0.15s ease;
      }
      .direct-apply-pill:hover {
        color: var(--primary-300, #60a5fa);
      }
      .btn-xs {
        padding: 4px 10px;
        font-size: 0.75rem;
      }
      .btn-flag {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: transform 0.15s ease;
      }
      .btn-flag:hover {
        transform: scale(1.15);
      }
      .company-logo {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        object-fit: cover;
        background: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
      }
      .verified-icon {
        color: var(--accent-emerald, #10b981);
        font-weight: 800;
      }
      .bookmark-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      .bookmark-btn:hover {
        color: var(--primary-400);
        transform: scale(1.15);
      }
      .bookmark-btn.saved {
        color: var(--accent-amber);
      }
      .skill-pill {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-subtle);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        color: var(--text-secondary);
      }
      .skill-matched {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.4);
        color: var(--accent-emerald, #10b981);
        font-weight: 600;
      }
      .match-check {
        margin-left: 2px;
      }
      .border-top {
        border-top: 1px solid var(--border-subtle);
      }
      .new-arrival-glow {
        border: 1.5px solid var(--accent-emerald, #10b981) !important;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        animation: slideDownPulse 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .new-arrival-pill {
        background: linear-gradient(135deg, #047857, #065f46);
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 9999px;
        letter-spacing: 0.03em;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
        animation: pulseBadge 2s infinite ease-in-out;
      }
      @keyframes slideDownPulse {
        from {
          opacity: 0;
          transform: translateY(-16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulseBadge {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.85;
          transform: scale(1.05);
        }
      }
    `,
  ],
})
export class JobCardComponent {
  @Input({ required: true }) job!: Job;
  @Input() candidateSkills: string[] = [];
  @Output() viewDetails = new EventEmitter<Job>();
  @Output() savedChanged = new EventEmitter<boolean>();
  @Output() reportJob = new EventEmitter<Job>();

  authService = inject(AuthService);
  private jobService = inject(JobService);
  private toast = inject(ToastService);
  private router = inject(Router);

  get isSaved(): boolean {
    return !!this.job.isSaved;
  }

  get isExpired(): boolean {
    if (this.job.status === 'closed') return true;
    if (this.job.deadline) {
      return new Date(this.job.deadline).getTime() < Date.now();
    }
    return false;
  }

  get computedMatch(): { score: number; matched: string[]; missing: string[] } | null {
    if (this.job.matchAnalysis && this.job.matchAnalysis.matchScore) {
      return {
        score: this.job.matchAnalysis.matchScore,
        matched: this.job.matchAnalysis.matchedSkills || [],
        missing: this.job.matchAnalysis.missingSkills || [],
      };
    }
    const reqSkills = (this.job.requiredSkills || this.job.skillsRequired || []).map((s: string) => s.trim());
    if (!reqSkills.length || !this.candidateSkills || !this.candidateSkills.length) return null;
    const candLower = this.candidateSkills.map((s) => s.toLowerCase());
    const matched = reqSkills.filter((s: string) => candLower.includes(s.toLowerCase()));
    const missing = reqSkills.filter((s: string) => !candLower.includes(s.toLowerCase()));
    const score = Math.min(100, Math.max(10, Math.round((matched.length / reqSkills.length) * 100)));
    return { score, matched, missing };
  }

  isSkillMatched(skill: string): boolean {
    if (!this.computedMatch) return false;
    const skillLower = skill.toLowerCase();
    return this.computedMatch.matched.some((s) => s.toLowerCase() === skillLower);
  }

  get directApplyUrl(): string {
    return getDirectApplyUrl(this.job);
  }

  getWorkTypeClass(type?: string): string {
    if (type === 'remote') return 'badge-cyan';
    if (type === 'hybrid') return 'badge-purple';
    return 'badge-neutral';
  }

  getPlatformClass(platform?: string): string {
    if (!platform) return 'platform-default';
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return 'platform-linkedin';
    if (p.includes('indeed')) return 'platform-indeed';
    if (p.includes('internshala')) return 'platform-internshala';
    if (p.includes('remotive')) return 'platform-remotive';
    if (p.includes('upsc') || p.includes('ssc') || p.includes('rrb') || p.includes('drdo') || p.includes('isro')) return 'platform-gov';
    if (p.includes('tcs') || p.includes('infosys') || p.includes('wipro') || p.includes('google') || p.includes('microsoft')) return 'platform-tech';
    if (p.includes('sbi') || p.includes('rbi') || p.includes('icai') || p.includes('deloitte') || p.includes('goldman')) return 'platform-finance';
    return 'platform-default';
  }

  getStreamLabel(stream?: string): string {
    switch (stream?.toLowerCase()) {
      case 'btech': return '💻 B.Tech / IT';
      case 'bba': return '📊 BBA / MBA';
      case 'bcom': return '📈 B.Com / Finance';
      case 'government': return '🏛️ Sarkari / Govt';
      case 'internship': return '🚀 Internship';
      case 'remote': return '🌐 Remote';
      case 'creative': return '🎨 Design';
      case 'healthcare': return '🩺 Medical';
      case 'teaching': return '📚 Teaching';
      case 'law': return '⚖️ Law';
      default: return stream?.toUpperCase() || 'GENERAL';
    }
  }

  getStreamClass(stream?: string): string {
    switch (stream?.toLowerCase()) {
      case 'btech': return 'stream-btech';
      case 'government': return 'stream-government';
      case 'bcom': return 'stream-bcom';
      case 'bba': return 'stream-bba';
      case 'internship': return 'stream-internship';
      default: return 'stream-default';
    }
  }

  formatSalary(salary: any): string {
    if (!salary) return 'Competitive Market Pay';
    const sym = salary.currency === 'INR' ? '₹' : '$';
    const minStr = salary.min ? Number(salary.min).toLocaleString() : '0';
    const maxStr = salary.max ? Number(salary.max).toLocaleString() : '0';
    const periodStr = salary.period ? ` / ${salary.period}` : '';
    return `${sym}${minStr} - ${sym}${maxStr}${periodStr}`;
  }

  onImgError(event: any) {
    event.target.src = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2241%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%20fill%3D%22%23818cf8%22%20font-family%3D%22system-ui%2Csans-serif%22%3ESB%3C%2Ftext%3E%3C%2Fsvg%3E';
  }

  onCardClick() {
    this.viewDetails.emit(this.job);
  }

  onDetailsClick(event: Event) {
    event.stopPropagation();
    this.viewDetails.emit(this.job);
  }

  onReportClick(event: Event) {
    event.stopPropagation();
    this.reportJob.emit(this.job);
  }

  onApplyClick(event: Event) {
    event.stopPropagation();
    const url = this.directApplyUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      this.router.navigate(['/jobs', this.job._id]);
    }
  }

  onToggleSave(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    this.jobService.toggleSaveJob(this.job._id).subscribe({
      next: (res) => {
        this.job.isSaved = !this.job.isSaved;
        this.toast.success(res.message || 'Bookmark updated');
        this.savedChanged.emit(this.job.isSaved);
      },
    });
  }
}