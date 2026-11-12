import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mobile Bottom Navigation (Hidden on Tablet and Desktop >= 768px) -->
    <nav class="mobile-bottom-nav"
         aria-label="Mobile Bottom Navigation">
      <div class="bottom-nav-row">
        
        <!-- 1. Home / Dashboard -->
        <a [routerLink]="authService.currentUser() ? '/dashboard' : '/'"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: !authService.currentUser() }"
           class="nav-tab">
          <span class="tab-icon" aria-hidden="true">🏠</span>
          <span class="tab-label">Home</span>
        </a>

        <!-- 2. Jobs Marketplace -->
        <a routerLink="/jobs"
           routerLinkActive="active"
           class="nav-tab">
          <span class="tab-icon" aria-hidden="true">💼</span>
          <span class="tab-label">Jobs</span>
        </a>

        <!-- 3. Learning Roadmaps -->
        <a routerLink="/learning-roadmap"
           routerLinkActive="active"
           class="nav-tab">
          <span class="tab-icon" aria-hidden="true">🗺️</span>
          <span class="tab-label">Roadmap</span>
        </a>

        <!-- 4. Skill Assessments -->
        <a routerLink="/assessments"
           routerLinkActive="active"
           class="nav-tab">
          <span class="tab-icon" aria-hidden="true">📝</span>
          <span class="tab-label">Tests</span>
        </a>

        <!-- 5. Profile / Account -->
        <a [routerLink]="authService.currentUser() ? '/profile' : '/login'"
           routerLinkActive="active"
           class="nav-tab">
          <span class="tab-icon" aria-hidden="true">{{ authService.currentUser() ? '👤' : '🔑' }}</span>
          <span class="tab-label">{{ authService.currentUser() ? 'Profile' : 'Sign In' }}</span>
        </a>

      </div>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      min-height: var(--bottom-nav-height);
      z-index: var(--z-bottom-nav);
      background: var(--bg-glass);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-top: 1px solid var(--border-card);
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.25);
      padding-top: 0.25rem;
      padding-bottom: max(0.4rem, var(--sab));
      padding-left: max(0.5rem, var(--sal));
      padding-right: max(0.5rem, var(--sar));
      user-select: none;
    }
    @media (min-width: 768px) {
      .mobile-bottom-nav {
        display: none !important;
      }
    }
    .bottom-nav-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
      max-width: 32rem;
      margin: 0 auto;
      gap: 0.25rem;
    }
    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      min-height: 48px;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      color: var(--text-muted);
      text-decoration: none;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }
    .nav-tab:hover {
      color: var(--text-primary);
    }
    .tab-icon {
      font-size: 1.15rem;
      line-height: 1.2;
      transition: transform 0.2s ease;
    }
    .tab-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-top: 2px;
      line-height: 1.1;
    }
    .nav-tab.active {
      color: var(--text-primary);
      background: rgba(99, 102, 241, 0.16);
      border: 1px solid var(--border-active);
    }
    .nav-tab.active .tab-icon {
      transform: translateY(-1px) scale(1.08);
    }
    .nav-tab.active .tab-label {
      color: var(--text-primary);
      font-weight: 700;
    }
  `]
})
export class BottomNavComponent {
  authService = inject(AuthService);
}

