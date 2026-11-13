import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MobileNativeService } from '../../services/mobile-native.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mobile Bottom Navigation (Hidden on Tablet and Desktop >= 768px) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div class="bottom-nav-row">
        <a
          *ngFor="let tab of navTabs()"
          [routerLink]="tab.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: tab.exact || false }"
          class="nav-tab"
          [attr.aria-label]="tab.label"
          (click)="onTabClick()"
        >
          <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
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
      min-height: var(--bottom-nav-height, 60px);
      z-index: var(--z-bottom-nav, 80);
      background: var(--bg-glass, rgba(11, 16, 32, 0.88));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid var(--border-card, rgba(255, 255, 255, 0.08));
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
      padding-top: 0.25rem;
      padding-bottom: max(0.4rem, env(safe-area-inset-bottom, 0px));
      padding-left: max(0.5rem, env(safe-area-inset-left, 0px));
      padding-right: max(0.5rem, env(safe-area-inset-right, 0px));
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
      max-width: 36rem;
      margin: 0 auto;
      gap: 0.125rem;
    }

    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px; /* Strict 44px+ touch target */
      padding: 0.25rem 0.375rem;
      border-radius: var(--radius-md, 0.5rem);
      color: var(--text-muted, #94a3b8);
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
      touch-action: manipulation;
    }

    .nav-tab:hover {
      color: var(--text-primary, #ffffff);
    }

    .tab-icon {
      font-size: 1.25rem;
      line-height: 1.2;
      transition: transform 0.15s ease;
    }

    .tab-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-top: 2px;
      line-height: 1.1;
      white-space: nowrap;
    }

    .nav-tab.active {
      color: var(--text-primary, #ffffff);
      background: rgba(99, 102, 241, 0.16);
      border: 1px solid var(--border-active, rgba(99, 102, 241, 0.4));
    }

    .nav-tab.active .tab-icon {
      transform: translateY(-1px) scale(1.1);
    }

    .nav-tab.active .tab-label {
      color: var(--text-primary, #ffffff);
      font-weight: 700;
    }
  `]
})
export class BottomNavComponent {
  authService = inject(AuthService);
  private mobileNative = inject(MobileNativeService);

  readonly navTabs = computed<NavItem[]>(() => {
    const user = this.authService.currentUser();
    const role = user?.role;

    if (role === 'recruiter') {
      return [
        { label: 'Pipeline', icon: '📋', route: '/recruiter/applications' },
        { label: 'Post Job', icon: '➕', route: '/recruiter/post-job' },
        { label: 'Overview', icon: '🏢', route: '/recruiter/dashboard', exact: true },
        { label: 'Talent', icon: '🔍', route: '/recruiter/candidates' },
        { label: 'Profile', icon: '👤', route: '/profile' },
      ];
    }

    if (role === 'admin') {
      return [
        { label: 'Control', icon: '📊', route: '/admin/dashboard', exact: true },
        { label: 'Users', icon: '👥', route: '/admin/users' },
        { label: 'Jobs', icon: '💼', route: '/admin/jobs' },
        { label: 'Reports', icon: '🚩', route: '/admin/reports' },
        { label: 'Security', icon: '⚙️', route: '/admin/dashboard' },
      ];
    }

    if (role === 'student') {
      return [
        { label: 'Home', icon: '🏠', route: '/student/dashboard', exact: true },
        { label: 'Jobs', icon: '💼', route: '/jobs' },
        { label: 'Roadmap', icon: '🗺️', route: '/learning-roadmap' },
        { label: 'Tests', icon: '📝', route: '/assessments' },
        { label: 'Profile', icon: '👤', route: '/profile' },
      ];
    }

    // Guest / Unauthenticated
    return [
      { label: 'Home', icon: '🏠', route: '/', exact: true },
      { label: 'Jobs', icon: '💼', route: '/jobs' },
      { label: 'Explore', icon: '🚀', route: '/career-explorer' },
      { label: 'Roadmaps', icon: '🗺️', route: '/learning-roadmap' },
      { label: 'Sign In', icon: '🔑', route: '/login' },
    ];
  });

  onTabClick(): void {
    this.mobileNative.triggerHapticLight();
  }
}
