import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Bottom Navigation (Hidden on Tablet and Desktop >= 768px) -->
    <nav class="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border shadow-2xl safe-bottom select-none"
         role="navigation"
         aria-label="Mobile Bottom Navigation">
      <div class="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        
        <!-- 1. Home / Dashboard -->
        <a [routerLink]="authService.currentUser() ? '/dashboard' : '/'"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: !authService.currentUser() }"
           class="nav-tab flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95">
          <span class="tab-icon text-xl transition-transform">🏠</span>
          <span class="tab-label text-[10px] font-semibold tracking-tight mt-0.5">Home</span>
        </a>

        <!-- 2. Jobs Marketplace -->
        <a routerLink="/jobs"
           routerLinkActive="active"
           class="nav-tab flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95">
          <span class="tab-icon text-xl transition-transform">💼</span>
          <span class="tab-label text-[10px] font-semibold tracking-tight mt-0.5">Jobs</span>
        </a>

        <!-- 3. Learning Roadmaps -->
        <a routerLink="/learning-roadmap"
           routerLinkActive="active"
           class="nav-tab flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95">
          <span class="tab-icon text-xl transition-transform">🗺️</span>
          <span class="tab-label text-[10px] font-semibold tracking-tight mt-0.5">Roadmap</span>
        </a>

        <!-- 4. Skill Assessments -->
        <a routerLink="/assessments"
           routerLinkActive="active"
           class="nav-tab flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95">
          <span class="tab-icon text-xl transition-transform">📝</span>
          <span class="tab-label text-[10px] font-semibold tracking-tight mt-0.5">Tests</span>
        </a>

        <!-- 5. Profile / Account -->
        <a [routerLink]="authService.currentUser() ? '/profile' : '/login'"
           routerLinkActive="active"
           class="nav-tab flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95">
          <span class="tab-icon text-xl transition-transform">{{ authService.currentUser() ? '👤' : '🔑' }}</span>
          <span class="tab-label text-[10px] font-semibold tracking-tight mt-0.5">{{ authService.currentUser() ? 'Profile' : 'Sign In' }}</span>
        </a>

      </div>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      padding-bottom: max(0.4rem, env(safe-area-inset-bottom, 0px));
      padding-left: max(0.5rem, env(safe-area-inset-left, 0px));
      padding-right: max(0.5rem, env(safe-area-inset-right, 0px));
    }
    .nav-tab.active {
      color: #6366F1;
      background: rgba(99, 102, 241, 0.12);
    }
    .nav-tab.active .tab-icon {
      transform: translateY(-1px) scale(1.1);
    }
    .nav-tab.active .tab-label {
      color: #6366F1;
      font-weight: 700;
    }
  `]
})
export class BottomNavComponent {
  authService = inject(AuthService);
}
