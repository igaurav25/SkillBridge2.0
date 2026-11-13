import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PublicPortfolio {
  id: string;
  name: string;
  headline: string;
  avatar: string;
  about: string;
  location: string;
  preferredRole: string;
  workTypePreference: string;
  github: string;
  linkedin: string;
  portfolio: string;
  skills: Array<{ name: string; category?: string; level?: string; yearsOfExperience?: number }>;
  education: Array<{ college: string; degree: string; graduationYear: number; cgpa?: string }>;
  projects: Array<{ title: string; description: string; liveUrl?: string; githubUrl?: string; technologies?: string[] }>;
  experience: Array<{ title: string; company: string; location?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string }>;
  certifications: Array<{ name: string; issuer: string; issueDate?: string; credentialUrl?: string }>;
  profileCompletion: number;
  streak: { current: number; longest: number };
  isVerified: boolean;
  badges: Array<{ badgeId: string; title: string; icon: string; category: string }>;
}

@Component({
  selector: 'app-public-portfolio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="portfolio-page">
      <div class="sb-container">
        @if (isLoading()) {
          <div class="portfolio-loading">
            <div class="skeleton-header"></div>
            <div class="skeleton-body"></div>
          </div>
        } @else if (error() || !portfolio()) {
          <div class="portfolio-empty sb-card-glass">
            <span class="empty-icon">👤</span>
            <h2>Portfolio Not Found</h2>
            <p>The candidate portfolio link you accessed does not exist or has been made private.</p>
            <a routerLink="/jobs" class="btn btn-primary">Browse Active Jobs</a>
          </div>
        } @else {
          <!-- Candidate Hero Banner -->
          <div class="portfolio-hero sb-card-glass">
            <div class="hero-left">
              <div class="avatar-box">
                @if (portfolio()!.avatar) {
                  <img [src]="portfolio()!.avatar" [alt]="portfolio()!.name" class="avatar-img" />
                } @else {
                  <div class="avatar-initials">
                    {{ getInitials(portfolio()!.name) }}
                  </div>
                }
                @if (portfolio()!.streak && portfolio()!.streak.current > 0) {
                  <span class="streak-badge" title="Active Learning Streak">
                    🔥 {{ portfolio()!.streak.current }}d
                  </span>
                }
              </div>

              <div class="hero-identity">
                <div class="name-row">
                  <h1 class="candidate-name">{{ portfolio()!.name }}</h1>
                  @if (portfolio()!.isVerified) {
                    <span class="verified-pill" title="Verified SkillBridge Candidate">✓ Verified</span>
                  }
                </div>
                <p class="candidate-headline">{{ portfolio()!.headline || 'Software Developer & Tech Specialist' }}</p>

                <div class="meta-row">
                  @if (portfolio()!.location) {
                    <span class="meta-item">📍 {{ portfolio()!.location }}</span>
                  }
                  @if (portfolio()!.preferredRole) {
                    <span class="meta-item">🎯 Targeting {{ portfolio()!.preferredRole }}</span>
                  }
                  <span class="meta-item work-pref">⚡ {{ portfolio()!.workTypePreference | titlecase }}</span>
                </div>
              </div>
            </div>

            <div class="hero-actions">
              <button type="button" class="btn btn-secondary share-btn" (click)="sharePortfolio()">
                @if (copied()) {
                  <span>✓ Copied Link!</span>
                } @else {
                  <span>🔗 Share Portfolio</span>
                }
              </button>
              @if (portfolio()!.github) {
                <a [href]="portfolio()!.github" target="_blank" rel="noopener" class="social-btn" title="GitHub Profile">
                  🐙
                </a>
              }
              @if (portfolio()!.linkedin) {
                <a [href]="portfolio()!.linkedin" target="_blank" rel="noopener" class="social-btn" title="LinkedIn Profile">
                  💼
                </a>
              }
              @if (portfolio()!.portfolio) {
                <a [href]="portfolio()!.portfolio" target="_blank" rel="noopener" class="social-btn" title="Personal Site">
                  🌐
                </a>
              }
            </div>
          </div>

          <!-- Main Grid -->
          <div class="portfolio-grid">
            <!-- Left Column: Biography & Technical Stack -->
            <div class="portfolio-main">
              <!-- About Bio -->
              @if (portfolio()!.about) {
                <div class="section-card sb-card-glass">
                  <h2 class="section-title">About Candidate</h2>
                  <p class="bio-text">{{ portfolio()!.about }}</p>
                </div>
              }

              <!-- Verified Skills -->
              <div class="section-card sb-card-glass">
                <h2 class="section-title">Technical Expertise & Skills</h2>
                @if (portfolio()!.skills.length === 0) {
                  <p class="text-muted">Skills portfolio currently being curated.</p>
                } @else {
                  <div class="skills-wrap">
                    @for (skill of portfolio()!.skills; track skill.name) {
                      <div class="skill-tag">
                        <span class="skill-name">{{ skill.name }}</span>
                        @if (skill.level) {
                          <span class="skill-level">{{ skill.level }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Projects Showcase -->
              @if (portfolio()!.projects.length > 0) {
                <div class="section-card sb-card-glass">
                  <h2 class="section-title">Featured Projects & Blueprints</h2>
                  <div class="projects-list">
                    @for (proj of portfolio()!.projects; track proj.title) {
                      <div class="project-item">
                        <div class="project-header">
                          <h3 class="project-title">{{ proj.title }}</h3>
                          <div class="project-links">
                            @if (proj.liveUrl) {
                              <a [href]="proj.liveUrl" target="_blank" rel="noopener" class="proj-link live">
                                ↗ Live Demo
                              </a>
                            }
                            @if (proj.githubUrl) {
                              <a [href]="proj.githubUrl" target="_blank" rel="noopener" class="proj-link code">
                                🐙 Code
                              </a>
                            }
                          </div>
                        </div>
                        <p class="project-desc">{{ proj.description }}</p>
                        @if (proj.technologies && proj.technologies.length > 0) {
                          <div class="proj-tech-stack">
                            @for (t of proj.technologies; track t) {
                              <span class="tech-pill">{{ t }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Experience -->
              @if (portfolio()!.experience.length > 0) {
                <div class="section-card sb-card-glass">
                  <h2 class="section-title">Professional Experience</h2>
                  <div class="timeline">
                    @for (exp of portfolio()!.experience; track exp.title + exp.company) {
                      <div class="timeline-node">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                          <h3 class="role-title">{{ exp.title }}</h3>
                          <div class="company-row">
                            <span class="company-name">{{ exp.company }}</span>
                            @if (exp.location) {
                              <span class="comp-loc">· {{ exp.location }}</span>
                            }
                          </div>
                          <span class="date-range">
                            {{ exp.startDate }} - {{ exp.isCurrent ? 'Present' : exp.endDate }}
                          </span>
                          @if (exp.description) {
                            <p class="exp-desc">{{ exp.description }}</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Right Sidebar: Badges & Education -->
            <div class="portfolio-sidebar">
              <!-- Achievement Badges -->
              @if (portfolio()!.badges.length > 0) {
                <div class="sidebar-card sb-card-glass">
                  <h3 class="sidebar-title">Milestone Achievements</h3>
                  <div class="badges-flex">
                    @for (b of portfolio()!.badges; track b.badgeId) {
                      <div class="badge-chip" [title]="b.title">
                        <span class="badge-icon">{{ b.icon }}</span>
                        <span class="badge-name">{{ b.title }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Education -->
              @if (portfolio()!.education.length > 0) {
                <div class="sidebar-card sb-card-glass">
                  <h3 class="sidebar-title">Academic Background</h3>
                  <div class="edu-list">
                    @for (edu of portfolio()!.education; track edu.college + edu.degree) {
                      <div class="edu-item">
                        <div class="edu-icon">🎓</div>
                        <div class="edu-info">
                          <h4 class="edu-degree">{{ edu.degree }}</h4>
                          <p class="edu-college">{{ edu.college }}</p>
                          <span class="edu-year">Graduated: {{ edu.graduationYear }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Platform Transparency -->
              <div class="sidebar-card sb-card-glass platform-seal">
                <span class="seal-icon">🛡️</span>
                <h4>Verified SkillBridge Candidate</h4>
                <p>Curated profile with verified skills, deterministic readiness scoring, and authentic project showcases.</p>
                <a routerLink="/register" class="btn btn-outline-full">Create Your Profile</a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .portfolio-page {
      padding: clamp(2rem, 5vw, 4rem) 0 5rem;
      min-height: calc(100dvh - var(--nav-height, 68px));
    }

    .portfolio-loading {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .skeleton-header {
      height: 180px;
      border-radius: var(--radius-xl, 16px);
      background: rgba(255, 255, 255, 0.05);
      animation: pulse 1.5s infinite;
    }

    .skeleton-body {
      height: 400px;
      border-radius: var(--radius-xl, 16px);
      background: rgba(255, 255, 255, 0.05);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }

    .portfolio-empty {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 500px;
      margin: 3rem auto;
      border-radius: var(--radius-xl, 16px);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: block;
    }

    /* Hero Banner */
    .portfolio-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.75rem;
      padding: clamp(1.5rem, 3vw, 2.25rem);
      border-radius: var(--radius-xl, 18px);
      margin-bottom: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85));
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .avatar-box {
      position: relative;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #06b6d4);
      padding: 3px;
      flex-shrink: 0;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-initials {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #0f172a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.8rem;
      letter-spacing: 0.05em;
    }

    .streak-badge {
      position: absolute;
      bottom: -6px;
      right: -6px;
      background: rgba(239, 68, 68, 0.9);
      border: 2px solid #0f172a;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #fff;
      padding: 0.1rem 0.45rem;
    }

    .hero-identity {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .candidate-name {
      font-size: clamp(1.5rem, 3vw, 2.2rem);
      font-weight: 800;
      color: #f8fafc;
      line-height: 1.15;
    }

    .verified-pill {
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.18);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 999px;
      padding: 0.15rem 0.6rem;
    }

    .candidate-headline {
      font-size: 1.05rem;
      color: #cbd5e1;
      font-weight: 500;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    .work-pref {
      color: #38bdf8;
      font-weight: 600;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .share-btn {
      font-weight: 600;
      padding: 0.6rem 1.15rem;
      border-radius: 10px;
    }

    .social-btn {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .social-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    /* Grid Layout */
    .portfolio-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 2rem;
    }

    @media (max-width: 992px) {
      .portfolio-grid {
        grid-template-columns: 1fr;
      }
    }

    .portfolio-main, .portfolio-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .section-card, .sidebar-card {
      padding: 1.5rem 1.75rem;
      border-radius: var(--radius-xl, 16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 1.15rem;
      position: relative;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .bio-text {
      color: #cbd5e1;
      font-size: 0.95rem;
      line-height: 1.65;
    }

    /* Skills */
    .skills-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .skill-tag {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.28);
      font-size: 0.88rem;
      color: #f8fafc;
    }

    .skill-name {
      font-weight: 600;
    }

    .skill-level {
      font-size: 0.7rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }

    /* Projects */
    .projects-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .project-item {
      padding: 1.25rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .project-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }

    .project-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .project-links {
      display: flex;
      gap: 0.65rem;
    }

    .proj-link {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .proj-link.live {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .proj-link.code {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .project-desc {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.55;
      margin-bottom: 0.75rem;
    }

    .proj-tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tech-pill {
      font-size: 0.72rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    /* Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: relative;
      padding-left: 1.5rem;
      border-left: 2px solid rgba(99, 102, 241, 0.25);
    }

    .timeline-node {
      position: relative;
    }

    .timeline-dot {
      position: absolute;
      left: -1.95rem;
      top: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary, #6366f1);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
    }

    .role-title {
      font-size: 1rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .company-row {
      font-size: 0.88rem;
      color: #38bdf8;
      font-weight: 600;
    }

    .date-range {
      font-size: 0.78rem;
      color: #64748b;
      display: block;
      margin: 0.2rem 0 0.5rem;
    }

    .exp-desc {
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Sidebar Badges */
    .sidebar-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 1rem;
    }

    .badges-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .badge-chip {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      font-size: 0.8rem;
      font-weight: 600;
      color: #fbbf24;
    }

    /* Education List */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .edu-item {
      display: flex;
      gap: 0.85rem;
    }

    .edu-icon {
      font-size: 1.5rem;
    }

    .edu-degree {
      font-size: 0.92rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .edu-college {
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .edu-year {
      font-size: 0.75rem;
      color: #64748b;
    }

    .platform-seal {
      text-align: center;
      padding: 2rem 1.5rem;
    }

    .seal-icon {
      font-size: 2.2rem;
      margin-bottom: 0.75rem;
      display: inline-block;
    }

    .platform-seal h4 {
      font-size: 1rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }

    .platform-seal p {
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }

    .btn-outline-full {
      display: block;
      width: 100%;
      padding: 0.65rem;
      border-radius: 8px;
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #f8fafc;
      background: rgba(99, 102, 241, 0.1);
      font-weight: 600;
      font-size: 0.85rem;
      text-align: center;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-outline-full:hover {
      background: rgba(99, 102, 241, 0.25);
    }
  `],
})
export class PublicPortfolioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  readonly portfolio = signal<PublicPortfolio | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);

  ngOnInit(): void {
    const candidateId = this.route.snapshot.paramMap.get('id');
    if (!candidateId) {
      this.error.set('Invalid portfolio identifier');
      this.isLoading.set(false);
      return;
    }
    this.fetchPortfolio(candidateId);
  }

  fetchPortfolio(id: string): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; data: PublicPortfolio }>(`${environment.apiUrl}/profiles/portfolio/${id}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.portfolio.set(res.data);
        } else {
          this.error.set('Portfolio data unavailable');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not load portfolio');
        this.isLoading.set(false);
      },
    });
  }

  sharePortfolio(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${this.portfolio()?.name || 'Candidate'} — SkillBridge Portfolio`,
        text: `Check out ${this.portfolio()?.name}'s verified developer portfolio on SkillBridge.`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      });
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'SB';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}

