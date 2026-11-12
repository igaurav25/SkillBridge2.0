import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService, PublicPlatformStats } from '../../services/analytics.service';
import { DeviceCapabilityService } from '../../services/device-capability.service';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { HeroSceneComponent } from '../../components/hero-scene/hero-scene.component';
import { SbBadgeComponent, SbSkeletonComponent } from '../../components/ui';
import { Job } from '../../models/job.model';

interface FaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    JobCardComponent,
    HeroSceneComponent,
    SbBadgeComponent,
    SbSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private jobService = inject(JobService);
  private analyticsService = inject(AnalyticsService);
  private deviceService = inject(DeviceCapabilityService);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private hostRef: ElementRef<HTMLElement> = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  authService = inject(AuthService);

  featuredJobs = signal<Job[]>([]);
  jobsLoading = signal<boolean>(true);
  jobsError = signal<boolean>(false);

  platformStats = signal<PublicPlatformStats | null>(null);
  statsLoading = signal<boolean>(true);
  statsError = signal<boolean>(false);

  openFaqIndex = signal<number | null>(0);

  searchTitle = '';
  searchLocation = '';

  readonly popularSearches = [
    'Angular',
    'Node.js',
    'Full Stack',
    'Remote Internships',
    'TypeScript',
    'MongoDB',
  ];

  readonly workflowSteps = [
    {
      step: '01',
      title: 'Build or Upload Resume',
      desc: 'Start with ATS-friendly single-column or portfolio templates and organize projects, skills, and experience.',
      link: '/resume-builder',
      cta: 'Open Resume Builder',
    },
    {
      step: '02',
      title: 'Check ATS & Skill Gaps',
      desc: 'Inspect profile gaps against target roles and generate a structured learning sequence with curated milestones.',
      link: '/skill-gap',
      cta: 'Run Skill Gap Check',
    },
    {
      step: '03',
      title: 'Apply With Clear Signals',
      desc: 'Filter active roles by mode, stack, or experience and track status timelines from submission to decision.',
      link: '/jobs',
      cta: 'Explore Opportunities',
    },
    {
      step: '04',
      title: 'Practice Mock Interviews',
      desc: 'Rehearse technical and behavioral prompts with timed rounds and transparent rubric-based feedback.',
      link: '/interview-prep',
      cta: 'Start Mock Interview',
    },
  ];

  readonly aiModules = [
    {
      title: 'ML Career Explorer',
      badge: 'ML + Fallback',
      variant: 'primary' as const,
      desc: 'Ranks software roles from your skills and project profile while labeling whether the ML model or rule fallback ran.',
      route: '/career-explorer',
    },
    {
      title: 'AI Career Mentor',
      badge: 'AI / Heuristic',
      variant: 'cyan' as const,
      desc: 'Context-aware technical Q&A for portfolio planning, stack transitions, and interview preparation.',
      route: '/career-assistant',
    },
    {
      title: 'GitHub Analyzer',
      badge: 'Live GitHub API',
      variant: 'emerald' as const,
      desc: 'Evaluates public repository signals, language breadth, and activity to highlight strengths on your profile.',
      route: '/github-analyzer',
    },
    {
      title: 'Skill Assessments',
      badge: 'Interactive Quiz',
      variant: 'purple' as const,
      desc: 'Timed core engineering assessments across algorithms, frontend, and backend systems to verify readiness.',
      route: '/assessments',
    },
  ];

  readonly samplePreviews = [
    {
      role: 'Final-Year CS Student (Sample Scenario)',
      workflow: 'Resume Builder -> ATS Check -> Full-Stack Roadmap',
      note: 'Identified missing testing keywords (Jest) before submitting applications to partner roles.',
    },
    {
      role: 'Junior Frontend Developer (Sample Scenario)',
      workflow: 'Mock Interview -> Career Explorer -> Applications Tracker',
      note: 'Practiced TypeScript & Angular architecture prompts and tracked active shortlist stages in one view.',
    },
    {
      role: 'Campus Hiring Lead (Sample Scenario)',
      workflow: 'Job Templates -> Candidate Match -> Shortlist Pipeline',
      note: 'Reviewed structured skill-matched applicant profiles alongside verified company details.',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      q: 'Does SkillBridge label AI-generated vs. rule-based estimates?',
      a: 'Yes. Whenever an external AI or ML service is unavailable or rate-limited, SkillBridge clearly labels the deterministic rule-based fallback rather than presenting heuristic output as generative AI.',
    },
    {
      q: 'Are job listings and platform metrics real?',
      a: 'Platform counts and opportunity cards on this page read directly from the live backend API and MongoDB records. Illustrative scenarios in the showcase are explicitly marked as Sample Previews.',
    },
    {
      q: 'Does the 3D hero affect mobile battery or slow down loading?',
      a: 'No. Three.js is lazy-loaded only after first paint, uses a simplified mode on mobile GPUs, pauses when the tab is hidden or scrolled away, and automatically switches to a 2D view when reduced motion or low battery is detected.',
    },
    {
      q: 'Can recruiters manage candidates and verify company profiles?',
      a: 'Recruiters have dedicated dashboards for posting roles, searching candidate skills, advancing applicant stages, and submitting companies for platform verification.',
    },
    {
      q: 'Can I use SkillBridge on mobile devices and desktops?',
      a: 'Yes. The responsive PWA shell adapts from 360px smartphones (with bottom navigation and safe-area insets) up to desktop monitors without horizontal overflow.',
    },
  ];

  private io?: IntersectionObserver;
  private revealCleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    this.configureSeo();
    this.loadFeaturedJobs();
    this.loadPlatformStats();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || this.deviceService.prefersReducedMotion()) {
      return;
    }
    this.setupScrollReveals();
  }

  private configureSeo(): void {
    this.titleService.setTitle('SkillBridge — Build Your Skills. Shape Your Future.');
    this.metaService.updateTag({
      name: 'description',
      content:
        'SkillBridge connects students, developers, and recruiters with ATS resume tools, skill gap roadmaps, mock interviews, and verified tech opportunities.',
    });
    this.metaService.updateTag({
      property: 'og:title',
      content: 'SkillBridge — Build Your Skills. Shape Your Future.',
    });
    this.metaService.updateTag({
      property: 'og:description',
      content:
        'ATS resume builder, ML career matching, mock interviews, and verified internships & tech jobs.',
    });
    this.metaService.updateTag({ property: 'og:image', content: '/og-share.png' });
    this.metaService.updateTag({ name: 'twitter:image', content: '/og-share.png' });
  }

  loadFeaturedJobs(): void {
    this.jobsLoading.set(true);
    this.jobsError.set(false);
    this.jobService.getJobs({ limit: 4, sort: 'popular' }).subscribe({
      next: (res) => {
        this.featuredJobs.set(res.data || []);
        this.jobsLoading.set(false);
      },
      error: () => {
        this.jobsError.set(true);
        this.jobsLoading.set(false);
      },
    });
  }

  loadPlatformStats(): void {
    this.statsLoading.set(true);
    this.statsError.set(false);
    this.analyticsService.getPublicStats().subscribe({
      next: (res) => {
        this.platformStats.set(res.data);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsError.set(true);
        this.statsLoading.set(false);
      },
    });
  }

  onSearch(): void {
    this.router.navigate(['/jobs'], {
      queryParams: {
        search: this.searchTitle.trim() || undefined,
        location: this.searchLocation.trim() || undefined,
      },
    });
  }

  quickSearch(term: string): void {
    this.router.navigate(['/jobs'], { queryParams: { search: term } });
  }

  toggleFaq(idx: number): void {
    this.openFaqIndex.update((cur) => (cur === idx ? null : idx));
  }

  get journeyTarget(): string {
    if (!this.authService.isLoggedIn()) return '/register';
    return '/dashboard';
  }

  private setupScrollReveals(): void {
    const els = Array.from(
      this.hostRef.nativeElement.querySelectorAll('[data-reveal]')
    ) as HTMLElement[];
    if (!els.length || !('IntersectionObserver' in window)) return;

    let gsapModule: typeof import('gsap') | null = null;
    const animated = new WeakSet<Element>();

    this.io = new IntersectionObserver(
      async (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && !animated.has(e.target))
          .map((e) => {
            animated.add(e.target);
            this.io?.unobserve(e.target);
            return e.target;
          });
        if (!visible.length) return;

        try {
          if (!gsapModule) {
            gsapModule = await import('gsap');
          }
          if (!this.hostRef.nativeElement.isConnected) return;
          gsapModule.gsap.fromTo(
            visible,
            { y: 14 },
            { y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'transform' }
          );
          this.revealCleanupFns.push(() => gsapModule?.gsap.killTweensOf(visible));
        } catch {
          // Reveal animations are progressive enhancement only
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.06 }
    );

    els.forEach((el) => this.io?.observe(el));
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.revealCleanupFns.forEach((fn) => fn());
    this.revealCleanupFns = [];
  }
}
