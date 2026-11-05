import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoadmapService, LearningRoadmap, LearningProgress } from '../../services/roadmap.service';
import { MlService } from '../../services/ml.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-learning-roadmap',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="roadmap-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge badge-primary text-xs">DYNAMIC CURRICULUM</span>
              <span class="badge badge-emerald text-xs">SkillBridge 2.0 Roadmap</span>
            </div>
            <h1 class="text-3xl font-extrabold">
              Personalized Learning <span class="text-gradient">Roadmap</span>
            </h1>
            <p class="text-secondary text-sm mt-1 max-w-xl">
              Step-by-step verified learning path from foundations to advanced production engineering with milestone projects and ML next-topic guidance.
            </p>
          </div>

          <!-- Role Selector -->
          <div class="role-selector flex items-center gap-3">
            <label class="text-xs text-muted font-bold uppercase">Role Track:</label>
            <select
              class="input-sm text-sm font-semibold bg-secondary text-primary border border-subtle rounded-lg px-3 py-2 outline-none"
              [(ngModel)]="selectedRole"
              (change)="onRoleChange()"
            >
              <option *ngFor="let r of availableRoles" [value]="r">{{ r }}</option>
            </select>
          </div>
        </div>

        <!-- Progress Tracker Bar & Metrics -->
        <div class="sb-card sb-card-glow mb-8 p-5">
          <div class="grid grid-4 gap-4 items-center">
            <!-- Metric 1: Completion -->
            <div class="p-3 bg-secondary rounded-lg">
              <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">Curriculum Completed</div>
              <div class="flex items-baseline gap-2">
                <span class="text-2xl font-black text-cyan">{{ userProgress?.roadmapCompletionPct ?? 0 }}%</span>
                <span class="text-xs text-muted">({{ userProgress?.completedTopics?.length || 0 }} topics)</span>
              </div>
              <div class="progress-bar-container mt-2">
                <div class="progress-bar-fill" [style.width.%]="userProgress?.roadmapCompletionPct ?? 0"></div>
              </div>
            </div>

            <!-- Metric 2: Learning Streak -->
            <div class="p-3 bg-secondary rounded-lg">
              <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">Learning Streak</div>
              <div class="text-2xl font-black text-amber flex items-center gap-1.5">
                <span>🔥 {{ userProgress?.currentStreak ?? 1 }}</span>
                <span class="text-xs font-normal text-secondary">Days Active</span>
              </div>
              <div class="text-xs text-muted mt-2">Consistent daily study</div>
            </div>

            <!-- Metric 3: Total Learning Hours -->
            <div class="p-3 bg-secondary rounded-lg">
              <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">Total Hours Logged</div>
              <div class="text-2xl font-black text-emerald flex items-center gap-1.5">
                <span>⏱️ {{ userProgress?.totalHoursSpent ?? 0 }}</span>
                <span class="text-xs font-normal text-secondary">Hours</span>
              </div>
              <div class="text-xs text-muted mt-2">Verified curriculum time</div>
            </div>

            <!-- Metric 4: ML Next Skill Recommendation -->
            <div class="p-3 bg-secondary rounded-lg">
              <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">ML Recommended Next</div>
              <div class="text-base font-bold text-violet flex items-center gap-1">
                <span>✨ {{ mlNextSkill || 'Signals & State' }}</span>
              </div>
              <div class="text-xs text-secondary mt-1">High-impact priority</div>
            </div>
          </div>
        </div>

        <!-- Levels Progression (Beginner -> Intermediate -> Advanced) -->
        <div *ngIf="isLoading" class="flex flex-col gap-6">
          <div *ngFor="let i of [1,2,3]" class="sb-card p-6 h-40 skeleton-box"></div>
        </div>

        <div *ngIf="!isLoading && currentRoadmap" class="roadmap-stages flex flex-col gap-8">
          <div *ngFor="let lvl of currentRoadmap.levels; let lvlIdx = index" class="level-card sb-card p-6">
            <!-- Level Header -->
            <div class="flex items-center justify-between border-b border-subtle pb-4 mb-5 flex-wrap gap-2">
              <div class="flex items-center gap-3">
                <span class="stage-badge font-mono font-bold text-sm px-3 py-1 rounded-full" [class.badge-primary]="lvl.levelName === 'Beginner'" [class.badge-cyan]="lvl.levelName === 'Intermediate'" [class.badge-accent]="lvl.levelName === 'Advanced'">
                  Stage {{ lvlIdx + 1 }}: {{ lvl.levelName }}
                </span>
                <span class="text-xs text-secondary">{{ lvl.description }}</span>
              </div>
              <span class="text-xs font-bold text-muted">
                {{ getLevelCompletedCount(lvl) }} / {{ lvl.topics.length }} Completed
              </span>
            </div>

            <!-- Topics Checklist -->
            <div class="grid grid-3 gap-4 mb-6">
              <div
                *ngFor="let topic of lvl.topics"
                class="topic-card p-4 rounded-lg border transition-all flex flex-col justify-between"
                [class.topic-completed]="isTopicCompleted(topic.topicId)"
              >
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h4 class="font-bold text-sm leading-snug">{{ topic.title }}</h4>
                    <button
                      type="button"
                      class="check-btn flex-shrink-0"
                      [class.checked]="isTopicCompleted(topic.topicId)"
                      (click)="toggleTopic(topic.topicId, topic.estimatedHours)"
                      [attr.aria-label]="isTopicCompleted(topic.topicId) ? 'Mark incomplete' : 'Mark complete'"
                    >
                      {{ isTopicCompleted(topic.topicId) ? '✓' : '' }}
                    </button>
                  </div>
                  <p class="text-xs text-secondary mb-3">{{ topic.description }}</p>
                </div>

                <div class="flex items-center justify-between text-xs text-muted pt-2 border-t border-subtle">
                  <span>⏱️ ~{{ topic.estimatedHours }} hrs</span>
                  <span *ngIf="isTopicCompleted(topic.topicId)" class="text-emerald font-semibold">Done ✓</span>
                  <span *ngIf="!isTopicCompleted(topic.topicId)" class="text-muted">Incomplete</span>
                </div>
              </div>
            </div>

            <!-- Project Milestone for this Level -->
            <div *ngIf="lvl.projectMilestone?.title" class="milestone-box p-4 bg-secondary rounded-xl flex items-center justify-between flex-wrap gap-4 border-l-4 border-indigo-500">
              <div class="flex items-start gap-3">
                <div class="text-3xl">🏆</div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-primary text-xs">Stage Milestone Project</span>
                    <h4 class="font-bold text-sm">{{ lvl.projectMilestone?.title }}</h4>
                  </div>
                  <p class="text-xs text-secondary mt-1">{{ lvl.projectMilestone?.description }}</p>
                  <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span *ngFor="let s of lvl.projectMilestone?.skills" class="skill-pill-xs">{{ s }}</span>
                  </div>
                </div>
              </div>

              <a routerLink="/projects" [queryParams]="{ targetRole: currentRoadmap.role }" class="btn btn-secondary btn-sm">
                Explore Projects →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .roadmap-page { min-height: 85vh; }
    .topic-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
    }
    .topic-card:hover {
      border-color: var(--border-active);
    }
    .topic-card.topic-completed {
      background: rgba(16, 185, 129, 0.06);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .check-btn {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid var(--border-card);
      background: transparent;
      color: white;
      font-weight: bold;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .check-btn:hover {
      border-color: var(--primary-500);
    }
    .check-btn.checked {
      background: var(--accent-emerald);
      border-color: var(--accent-emerald);
    }
    .skill-pill-xs {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .text-violet { color: var(--accent-violet); }
    .text-emerald { color: var(--accent-emerald); }
  `]
})
export class LearningRoadmapComponent implements OnInit {
  private roadmapService = inject(RoadmapService);
  private mlService = inject(MlService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  availableRoles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Software Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Cloud Engineer',
    'DevOps Engineer'
  ];

  selectedRole = 'Frontend Developer';
  currentRoadmap: LearningRoadmap | null = null;
  userProgress: LearningProgress | null = null;
  isLoading = true;
  mlNextSkill = 'Angular Signals';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        const found = this.availableRoles.find(r => r.toLowerCase() === params['role'].toLowerCase());
        if (found) this.selectedRole = found;
      }
      this.loadRoadmapAndProgress();
    });
  }

  loadRoadmapAndProgress() {
    this.isLoading = true;
    this.roadmapService.getRoadmapByRole(this.selectedRole).subscribe({
      next: (res) => {
        this.currentRoadmap = res.data;
        this.loadProgress();
      },
      error: () => {
        // Fallback default
        this.isLoading = false;
      }
    });

    // Query ML for next-skill recommendation
    this.mlService.analyzeSkillGap({
      currentSkills: ['HTML5', 'CSS3', 'JavaScript'],
      targetRole: this.selectedRole
    }).subscribe({
      next: (res) => {
        this.mlNextSkill = res.suggested_next_skill || 'TypeScript';
      }
    });
  }

  loadProgress() {
    this.roadmapService.getMyProgress(this.selectedRole).subscribe({
      next: (res) => {
        this.userProgress = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onRoleChange() {
    this.loadRoadmapAndProgress();
  }

  isTopicCompleted(topicId: string): boolean {
    return !!this.userProgress?.completedTopics?.includes(topicId);
  }

  getLevelCompletedCount(lvl: any): number {
    if (!this.userProgress?.completedTopics) return 0;
    return lvl.topics.filter((t: any) => this.userProgress!.completedTopics.includes(t.topicId)).length;
  }

  toggleTopic(topicId: string, hours: number = 2) {
    this.roadmapService.toggleTopic(this.selectedRole, topicId, hours).subscribe({
      next: (res) => {
        this.userProgress = res.data;
        if (res.isCompleted) {
          this.toast.success('Topic completed! Study hours logged.');
        }
      },
      error: (err) => {
        this.toast.error('Failed to update progress: ' + err.message);
      }
    });
  }
}

