import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  HostListener,
  inject,
  ElementRef,
  ViewChild,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

export interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  title: string;
  subtitle?: string;
  icon: string;
  badge?: string;
  role?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="cmd-backdrop"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Universal Command Palette"
      >
        <div class="cmd-panel" (click)="$event.stopPropagation()">
          <!-- Search Header -->
          <div class="cmd-header">
            <svg class="cmd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              #cmdInput
              type="text"
              class="cmd-input"
              [placeholder]="langService.translate('lbl_command_palette', 'Search navigation, tools, and actions...')"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              (keydown)="onInputKeyDown($event)"
              aria-autocomplete="list"
            />
            <span class="cmd-badge">ESC</span>
          </div>

          <!-- Quick Filters -->
          <div class="cmd-filter-bar">
            @for (tab of ['All', 'Navigation', 'Actions', 'Tools']; track tab) {
              <button
                type="button"
                class="cmd-filter-pill"
                [class.active]="selectedCategory() === tab"
                (click)="selectedCategory.set(tab)"
              >
                {{ tab }}
              </button>
            }
          </div>

          <!-- Command List -->
          <div class="cmd-list" role="listbox">
            @if (filteredCommands().length === 0) {
              <div class="cmd-empty">
                <p>No matching commands or destinations found for "{{ searchQuery() }}"</p>
                <small class="text-muted">Try searching for "jobs", "resume", "theme", or "profile"</small>
              </div>
            } @else {
              @for (item of filteredCommands(); track item.id; let idx = $index) {
                <div
                  class="cmd-item"
                  [class.active]="selectedIndex() === idx"
                  (click)="executeCommand(item)"
                  (mouseenter)="selectedIndex.set(idx)"
                  role="option"
                  [attr.aria-selected]="selectedIndex() === idx"
                >
                  <span class="cmd-item-icon" aria-hidden="true">{{ item.icon }}</span>
                  <div class="cmd-item-body">
                    <div class="cmd-item-title-row">
                      <span class="cmd-item-title">{{ item.title }}</span>
                      @if (item.badge) {
                        <span class="cmd-item-tag">{{ item.badge }}</span>
                      }
                    </div>
                    @if (item.subtitle) {
                      <span class="cmd-item-sub">{{ item.subtitle }}</span>
                    }
                  </div>
                  <span class="cmd-item-arrow" aria-hidden="true">↵</span>
                </div>
              }
            }
          </div>

          <!-- Footer Shortcut Bar -->
          <div class="cmd-footer">
            <span class="shortcut-tip"><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span class="shortcut-tip"><kbd>↵</kbd> to select</span>
            <span class="shortcut-tip"><kbd>esc</kbd> to close</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cmd-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.78);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: var(--z-modal, 500);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: clamp(3rem, 10vh, 6rem) 1rem 2rem;
      animation: fadeInCmd 0.15s ease-out;
    }

    @keyframes fadeInCmd {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .cmd-panel {
      width: 100%;
      max-width: 640px;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-xl, 18px);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(99, 102, 241, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideDownCmd 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDownCmd {
      from { transform: translateY(-16px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .cmd-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }

    .cmd-search-icon {
      width: 20px;
      height: 20px;
      color: var(--primary, #6366f1);
      flex-shrink: 0;
    }

    .cmd-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 1.05rem;
      font-family: inherit;
    }

    .cmd-input::placeholder {
      color: #94a3b8;
    }

    .cmd-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 0.2rem 0.45rem;
      letter-spacing: 0.05em;
    }

    .cmd-filter-bar {
      display: flex;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.01);
      overflow-x: auto;
    }

    .cmd-filter-pill {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cmd-filter-pill:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .cmd-filter-pill.active {
      color: #fff;
      background: rgba(99, 102, 241, 0.22);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .cmd-list {
      max-height: 380px;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .cmd-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s ease;
    }

    .cmd-item:hover,
    .cmd-item.active {
      background: rgba(99, 102, 241, 0.15);
    }

    .cmd-item-icon {
      font-size: 1.2rem;
      width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cmd-item-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .cmd-item-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cmd-item-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cmd-item-tag {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .cmd-item-sub {
      font-size: 0.78rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cmd-item-arrow {
      color: #64748b;
      font-size: 0.85rem;
      padding-left: 0.5rem;
    }

    .cmd-item.active .cmd-item-arrow {
      color: var(--primary, #6366f1);
    }

    .cmd-empty {
      padding: 2.5rem 1rem;
      text-align: center;
      color: #94a3b8;
    }

    .cmd-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1.25rem;
      padding: 0.65rem 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }

    .shortcut-tip {
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    kbd {
      font-family: monospace;
      font-size: 0.72rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 0.1rem 0.35rem;
      color: #cbd5e1;
    }
  `],
})
export class CommandPaletteComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  readonly langService = inject(LanguageService);

  readonly isOpen = signal(false);
  readonly searchQuery = signal('');
  readonly selectedCategory = signal<string>('All');
  readonly selectedIndex = signal(0);

  @ViewChild('cmdInput') cmdInputRef?: ElementRef<HTMLInputElement>;

  // Global Keyboard listener for Ctrl+K / Cmd+K
  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }

  ngOnInit(): void {}

  open(): void {
    this.searchQuery.set('');
    this.selectedIndex.set(0);
    this.isOpen.set(true);
    setTimeout(() => {
      this.cmdInputRef?.nativeElement?.focus();
    }, 50);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.close();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.selectedIndex.set(0);
  }

  onInputKeyDown(event: KeyboardEvent): void {
    const list = this.filteredCommands();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (this.selectedIndex() + 1) % (list.length || 1);
      this.selectedIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (this.selectedIndex() - 1 + list.length) % (list.length || 1);
      this.selectedIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = list[this.selectedIndex()];
      if (item) {
        this.executeCommand(item);
      }
    }
  }

  executeCommand(item: CommandItem): void {
    this.close();
    item.action();
  }

  // All available commands
  readonly allCommands = computed<CommandItem[]>(() => {
    const user = this.authService.currentUser();
    const role = user?.role;
    const isAuthed = !!user;

    const items: CommandItem[] = [
      // Navigation
      {
        id: 'nav-home',
        category: 'Navigation',
        title: 'Home & Cinematic Landing',
        subtitle: 'Go to SkillBridge landing page',
        icon: '🏠',
        action: () => this.router.navigate(['/']),
      },
      {
        id: 'nav-jobs',
        category: 'Navigation',
        title: 'Job Marketplace',
        subtitle: 'Browse 350+ official platforms, full-time & internship postings',
        icon: '💼',
        action: () => this.router.navigate(['/jobs']),
      },
      {
        id: 'nav-companies',
        category: 'Navigation',
        title: 'Verified Companies',
        subtitle: 'Explore corporate tech hiring partners and enterprise directories',
        icon: '🏢',
        action: () => this.router.navigate(['/companies']),
      },
      {
        id: 'nav-career-explorer',
        category: 'Navigation',
        title: 'ML Career Explorer',
        subtitle: 'Analyze 11 target career paths with suitability scoring',
        icon: '🧭',
        action: () => this.router.navigate(['/career-explorer']),
      },
      {
        id: 'nav-assessments',
        category: 'Navigation',
        title: 'Technical Skill Assessments',
        subtitle: 'Timed MCQ evaluations across 7 core software engineering domains',
        icon: '📝',
        action: () => this.router.navigate(['/assessments']),
      },
      {
        id: 'nav-roadmaps',
        category: 'Navigation',
        title: 'Learning Roadmaps',
        subtitle: 'Structured domain curriculum with milestone tracking',
        icon: '🗺️',
        action: () => this.router.navigate(['/learning-roadmap']),
      },
      {
        id: 'nav-projects',
        category: 'Navigation',
        title: 'Project Blueprints',
        subtitle: 'Hands-on project blueprints tailored to your target engineering track',
        icon: '🚀',
        action: () => this.router.navigate(['/projects']),
      },

      // Student tools
      {
        id: 'nav-student-dashboard',
        category: 'Navigation',
        title: 'Student Career Dashboard',
        subtitle: 'Readiness gauge, active pipeline, and 3D visualizer',
        icon: '📊',
        role: 'student',
        action: () => this.router.navigate(['/student/dashboard']),
      },
      {
        id: 'nav-resume-builder',
        category: 'Tools',
        title: 'Resume Builder (4 Templates)',
        subtitle: 'ATS Clean, Technical Serif, Modern Split, Executive Portfolio',
        icon: '📄',
        badge: 'Builder',
        action: () => this.router.navigate(['/resume-builder']),
      },
      {
        id: 'nav-resume-analyzer',
        category: 'Tools',
        title: 'ATS Resume Analyzer',
        subtitle: 'Instant parsing, keyword density check, and Google X-Y-Z rewrites',
        icon: '🔍',
        badge: 'AI',
        action: () => this.router.navigate(['/resume-analyzer']),
      },
      {
        id: 'nav-skill-gap',
        category: 'Tools',
        title: 'Skill Gap Analyzer',
        subtitle: 'Direct comparison against industry requirements with prioritized tasks',
        icon: '⚡',
        action: () => this.router.navigate(['/skill-gap']),
      },
      {
        id: 'nav-mock-interview',
        category: 'Tools',
        title: 'AI Mock Interview Prep',
        subtitle: 'Simulated technical & behavioral interviews with live scoring rubric',
        icon: '🎙️',
        badge: 'Practice',
        action: () => this.router.navigate(['/interview-prep']),
      },
      {
        id: 'nav-applications',
        category: 'Navigation',
        title: 'Application Tracker (Kanban / List)',
        subtitle: 'Monitor submissions, status timeline, and interview invites',
        icon: '📋',
        action: () => this.router.navigate(['/applications']),
      },
      {
        id: 'nav-saved-jobs',
        category: 'Navigation',
        title: 'Saved Job Bookmarks',
        subtitle: 'Categorized saved opportunities and custom notes',
        icon: '🔖',
        action: () => this.router.navigate(['/saved-jobs']),
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        title: 'Account Settings & Preferences',
        subtitle: 'Manage profile, security, 3D mode, and notification toggles',
        icon: '⚙️',
        action: () => this.router.navigate(['/settings']),
      },

      // Recruiter & Admin
      {
        id: 'nav-recruiter',
        category: 'Navigation',
        title: 'Recruiter Command Center',
        subtitle: 'Pipeline Kanban, job templates, interview calendar, and candidate search',
        icon: '💼',
        role: 'recruiter',
        action: () => this.router.navigate(['/recruiter/dashboard']),
      },
      {
        id: 'nav-admin',
        category: 'Navigation',
        title: 'Admin Governance Console',
        subtitle: 'Platform analytics, moderation, company verification, audit timeline',
        icon: '🛡️',
        role: 'admin',
        action: () => this.router.navigate(['/admin/dashboard']),
      },

      // Actions
      {
        id: 'act-toggle-lang',
        category: 'Actions',
        title: this.langService.currentLang() === 'en' ? 'Switch Language to Hindi (हिंदी)' : 'Switch Language to English',
        subtitle: 'Change interface localization between English and Hindi',
        icon: '🌐',
        badge: 'Locale',
        action: () => this.langService.toggleLanguage(),
      },
      {
        id: 'act-view-portfolio',
        category: 'Actions',
        title: 'View My Public Shareable Portfolio',
        subtitle: 'Open candidate portfolio showcase page',
        icon: '🌟',
        action: () => {
          if (user?._id) {
            this.router.navigate(['/portfolio', user._id]);
          } else {
            this.router.navigate(['/login']);
          }
        },
      },
      {
        id: 'act-toggle-theme',
        category: 'Actions',
        title: 'Toggle Theme (Dark / Light)',
        subtitle: 'Switch between Obsidian Midnight and Crisp Modern Light themes',
        icon: '🌓',
        action: () => {
          const root = document.documentElement;
          const current = root.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
          try { localStorage.setItem('theme', next); } catch {}
        },
      },
    ];

    return items;
  });

  // Filtered list based on search and category tab
  readonly filteredCommands = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const items = this.allCommands();

    return items.filter((item) => {
      const matchCat = cat === 'All' || item.category === cat;
      if (!matchCat) return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  });
}
