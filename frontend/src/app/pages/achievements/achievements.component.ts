import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AchievementService, AchievementsData, BadgeItem } from '../../services/achievement.service';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="achievements-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge badge-primary text-xs">MILESTONE TRACKER</span>
              <span class="badge badge-emerald text-xs">Gamified Progression</span>
            </div>
            <h1 class="text-3xl font-extrabold">
              Achievements & <span class="text-gradient">Badges</span>
            </h1>
            <p class="text-secondary text-sm mt-1 max-w-xl">
              Earn recognition for mastering curriculum topics, demonstrating assessment excellence, and verifying real-world software engineering competencies.
            </p>
          </div>

          <!-- Total Score Card -->
          <div *ngIf="achievements" class="sb-card p-4 flex items-center gap-4">
            <div class="text-3xl">🎖️</div>
            <div>
              <div class="text-xs text-muted font-bold uppercase tracking-wider">Total Achievement XP</div>
              <div class="text-2xl font-black text-amber">{{ achievements.totalPoints }} Points</div>
              <div class="text-xs text-secondary">{{ achievements.earnedCount }} of {{ achievements.totalAvailable }} Unlocked</div>
            </div>
          </div>
        </div>

        <div *ngIf="isLoading" class="grid grid-3 gap-6">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="sb-card p-6 h-40 skeleton-box"></div>
        </div>

        <!-- Badges Grid -->
        <div *ngIf="!isLoading && achievements" class="grid grid-3 gap-6">
          <div
            *ngFor="let b of achievements.badges"
            class="sb-card p-5 flex flex-col justify-between transition-all"
            [class.badge-unlocked]="b.isEarned"
            [class.badge-locked]="!b.isEarned"
          >
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="badge-icon text-3xl">{{ b.icon }}</div>
                <span class="badge text-xs" [class.badge-emerald]="b.isEarned" [class.badge-neutral]="!b.isEarned">
                  {{ b.isEarned ? 'Unlocked ✓' : 'Locked 🔒' }}
                </span>
              </div>

              <span class="text-xs text-muted font-bold uppercase tracking-wider">{{ b.category }}</span>
              <h3 class="text-lg font-bold mt-0.5 mb-1">{{ b.title }}</h3>
              <p class="text-xs text-secondary mb-3">{{ b.description }}</p>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-subtle text-xs">
              <span class="font-bold text-amber">+{{ b.points }} XP</span>
              <span *ngIf="b.isEarned && b.earnedAt" class="text-muted">Earned {{ b.earnedAt | date:'shortDate' }}</span>
              <span *ngIf="!b.isEarned" class="text-muted">In Progress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .achievements-page { min-height: 85vh; }
    .badge-unlocked {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.04);
    }
    .badge-locked {
      opacity: 0.7;
    }
    .badge-icon {
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
    }
  `]
})
export class AchievementsComponent implements OnInit {
  private achievementService = inject(AchievementService);
  achievements: AchievementsData | null = null;
  isLoading = true;

  ngOnInit() {
    this.achievementService.getMyAchievements().subscribe({
      next: (res) => {
        this.achievements = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}

