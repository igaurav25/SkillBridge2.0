import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MlService, CareerRecommendationItem } from '../../services/ml.service';
import { ProfileService } from '../../services/profile.service';
import { ToastService } from '../../services/toast.service';

interface CareerCard {
  role: string;
  domain: string;
  description: string;
  avgSalary: string;
  coreSkills: string[];
  secondarySkills: string[];
  growthRate: string;
  icon: string;
}

@Component({
  selector: 'app-career-explorer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="career-explorer-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="header-section mb-8">
          <div class="flex items-center gap-2 mb-2">
            <span class="badge badge-primary text-xs">SKILLBRIDGE 2.0 ML</span>
            <span class="badge badge-emerald text-xs">Random Forest Verified</span>
          </div>
          <h1 class="text-3xl font-extrabold mb-2">
            Tech Career <span class="text-gradient">Explorer</span>
          </h1>
          <p class="text-secondary max-w-2xl text-sm">
            Explore 11 modern high-demand technology career tracks. Compare required competencies, salary trajectories, and receive machine learning-predicted suitability rankings calibrated to your real skill portfolio.
          </p>

          <!-- ML Prediction Trigger Banner -->
          <div class="sb-card sb-card-glow mt-6 p-5 flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div class="text-3xl">🤖</div>
              <div>
                <h2 class="text-base font-bold">Personalized ML Career Recommendation</h2>
                <p class="text-xs text-secondary">
                  Our Random Forest model evaluates your profile skills, projects, and assessments to compute your top career tracks.
                </p>
              </div>
            </div>
            <button
              class="btn btn-primary btn-sm flex items-center gap-2"
              (click)="runMlRecommendation()"
              [disabled]="isLoadingMl"
            >
              <span *ngIf="isLoadingMl" class="spinner-sm"></span>
              {{ isLoadingMl ? 'Analyzing With ML...' : '⚡ Predict My Best Careers' }}
            </button>
          </div>
        </div>

        <!-- ML Recommendations Result Banner (if loaded) -->
        <div *ngIf="mlRecommendations.length > 0" class="mb-10">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold flex items-center gap-2">
              🎯 Top Recommended Career Paths For You
              <span class="badge badge-cyan text-xs">Algorithm: Random Forest (120 Trees)</span>
            </h3>
            <button class="btn-link text-xs" (click)="mlRecommendations = []">Dismiss</button>
          </div>

          <div class="grid grid-2 gap-4">
            <div *ngFor="let rec of mlRecommendations; let i = index" class="sb-card p-5 border-l-4" [class.border-indigo-500]="i === 0">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-muted">{{ rec.domain }}</span>
                  <h4 class="text-lg font-bold">{{ rec.career_role }}</h4>
                </div>
                <div class="badge badge-primary font-bold text-sm">
                  {{ rec.suitability_score }}% Match
                </div>
              </div>

              <p class="text-xs text-secondary mb-3">{{ rec.explanation }}</p>

              <!-- Required Skills tags -->
              <div class="mb-3">
                <span class="text-xs text-muted block mb-1">Key Core Skills:</span>
                <div class="flex flex-wrap gap-1">
                  <span *ngFor="let s of rec.required_skills" class="skill-pill-sm">{{ s }}</span>
                </div>
              </div>

              <!-- Missing Skills (Skill Gap Alert) -->
              <div *ngIf="rec.missing_skills?.length" class="p-2.5 bg-secondary rounded text-xs mb-3">
                <strong class="text-amber">⚠️ Skills To Acquire:</strong>
                <span class="text-secondary ml-1">{{ rec.missing_skills.join(', ') }}</span>
              </div>

              <!-- Next Steps -->
              <div class="text-xs text-muted mb-4">
                <strong>Next Milestone:</strong> {{ rec.suggested_next_steps[0] }}
              </div>

              <div class="flex items-center gap-2">
                <a [routerLink]="['/learning-roadmap']" [queryParams]="{ role: rec.career_role }" class="btn btn-secondary btn-sm flex-1 text-center">
                  View Roadmap →
                </a>
                <a [routerLink]="['/jobs']" [queryParams]="{ search: rec.career_role }" class="btn btn-outline btn-sm">
                  Find Jobs 💼
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div class="flex items-center gap-2 flex-wrap">
            <button
              *ngFor="let filter of domainFilters"
              class="filter-pill text-xs font-semibold"
              [class.active]="selectedDomain === filter"
              (click)="selectedDomain = filter"
            >
              {{ filter }}
            </button>
          </div>

          <div class="search-box">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search roles or skills (e.g. Python, Angular)..."
              class="input-sm w-64 text-xs"
            />
          </div>
        </div>

        <!-- Career Tracks Grid -->
        <div class="grid grid-3 gap-6">
          <div *ngFor="let c of filteredCareers" class="sb-card flex flex-col justify-between hover-card">
            <div>
              <div class="flex items-start justify-between mb-3">
                <div class="role-icon text-3xl p-2 bg-secondary rounded-lg">{{ c.icon }}</div>
                <span class="badge badge-neutral text-xs">{{ c.growthRate }}</span>
              </div>

              <span class="text-xs text-muted font-bold uppercase tracking-wider">{{ c.domain }}</span>
              <h3 class="text-xl font-bold mt-0.5 mb-2">{{ c.role }}</h3>
              <p class="text-xs text-secondary mb-4 line-clamp-3">{{ c.description }}</p>

              <div class="salary-badge mb-4 p-2 bg-secondary rounded flex items-center justify-between text-xs">
                <span class="text-muted">Market Compensation:</span>
                <span class="font-bold text-emerald">{{ c.avgSalary }}</span>
              </div>

              <!-- Core Skills -->
              <div class="mb-4">
                <span class="text-xs text-muted block mb-1.5 font-semibold">Core Competencies:</span>
                <div class="flex flex-wrap gap-1.5">
                  <span *ngFor="let s of c.coreSkills" class="skill-pill-sm">{{ s }}</span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-subtle flex items-center justify-between gap-2">
              <a [routerLink]="['/learning-roadmap']" [queryParams]="{ role: c.role }" class="btn btn-secondary btn-sm flex-1 text-center">
                Roadmap
              </a>
              <a [routerLink]="['/skill-gap']" [queryParams]="{ targetRole: c.role }" class="btn btn-outline btn-sm">
                Skill Gap ✨
              </a>
              <a [routerLink]="['/jobs']" [queryParams]="{ search: c.role }" class="btn btn-outline btn-sm">
                Jobs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .career-explorer-page { min-height: 80vh; }
    .skill-pill-sm {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 500;
    }
    .filter-pill {
      padding: 6px 14px;
      border-radius: 20px;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-pill.active {
      background: var(--primary-500);
      color: #ffffff;
      border-color: var(--primary-500);
    }
    .hover-card {
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .hover-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-active);
    }
    .text-emerald { color: var(--accent-emerald); }
  `]
})
export class CareerExplorerComponent implements OnInit {
  private mlService = inject(MlService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);

  searchQuery = '';
  selectedDomain = 'All';
  isLoadingMl = false;
  mlRecommendations: CareerRecommendationItem[] = [];

  domainFilters = ['All', 'Web & Mobile', 'Backend & Cloud', 'Data & AI', 'Systems & Security'];

  allCareers: CareerCard[] = [
    {
      role: 'Frontend Developer',
      domain: 'Web Development',
      description: 'Crafts responsive, performant user interfaces using modern JavaScript/TypeScript, Angular, React, CSS Grid and accessibility standards.',
      avgSalary: '$75k - $125k',
      coreSkills: ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'Angular', 'React', 'Git'],
      secondarySkills: ['Tailwind CSS', 'Redux', 'REST APIs', 'Jest'],
      growthRate: '+16% YoY',
      icon: '🎨'
    },
    {
      role: 'Backend Developer',
      domain: 'Backend Development',
      description: 'Architects robust server backends, microservices, REST APIs, database schemas, authentication systems, and cache layers.',
      avgSalary: '$85k - $140k',
      coreSkills: ['Node.js', 'Express.js', 'Python', 'REST APIs', 'MongoDB', 'PostgreSQL', 'SQL', 'Git'],
      secondarySkills: ['Docker', 'Redis', 'JWT', 'Microservices'],
      growthRate: '+18% YoY',
      icon: '⚙️'
    },
    {
      role: 'Full Stack Developer',
      domain: 'Full Stack Development',
      description: 'Bridges frontend experiences with scalable backend services, owning full application lifecycle from database to interactive UI.',
      avgSalary: '$90k - $150k',
      coreSkills: ['JavaScript', 'TypeScript', 'Angular', 'React', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'Git'],
      secondarySkills: ['Docker', 'REST APIs', 'CI/CD', 'AWS'],
      growthRate: '+22% YoY',
      icon: '🚀'
    },
    {
      role: 'Software Engineer',
      domain: 'Software Engineering',
      description: 'Solves complex computational problems, applies object-oriented principles, design patterns, algorithmic optimization, and system design.',
      avgSalary: '$95k - $160k',
      coreSkills: ['Data Structures', 'Algorithms', 'Java', 'C++', 'Python', 'OOP', 'Git', 'SQL'],
      secondarySkills: ['System Design', 'Design Patterns', 'Concurrency'],
      growthRate: '+15% YoY',
      icon: '💻'
    },
    {
      role: 'Data Analyst',
      domain: 'Data Analytics',
      description: 'Extracts actionable business insights from data through SQL querying, statistical data wrangling with Pandas, and interactive dashboards.',
      avgSalary: '$65k - $110k',
      coreSkills: ['Python', 'SQL', 'Pandas', 'NumPy', 'Data Visualization', 'Excel', 'Power BI'],
      secondarySkills: ['Tableau', 'Seaborn', 'A/B Testing', 'EDA'],
      growthRate: '+19% YoY',
      icon: '📊'
    },
    {
      role: 'Data Scientist',
      domain: 'Data Science',
      description: 'Develops predictive statistical models, machine learning pipelines, feature engineering, and cross-validated data experiments.',
      avgSalary: '$100k - $165k',
      coreSkills: ['Python', 'Machine Learning', 'Scikit-learn', 'Pandas', 'NumPy', 'SQL', 'Statistics'],
      secondarySkills: ['Deep Learning', 'TensorFlow', 'Model Evaluation'],
      growthRate: '+24% YoY',
      icon: '🔬'
    },
    {
      role: 'Machine Learning Engineer',
      domain: 'Artificial Intelligence',
      description: 'Deploys production neural networks and ML models at scale, managing model serving endpoints, containerization, and MLOps pipelines.',
      avgSalary: '$115k - $180k',
      coreSkills: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'Docker', 'MLOps'],
      secondarySkills: ['FastAPI', 'NLP', 'Computer Vision', 'Kubernetes'],
      growthRate: '+31% YoY',
      icon: '🧠'
    },
    {
      role: 'Cloud Engineer',
      domain: 'Cloud Computing',
      description: 'Designs and automates resilient cloud infrastructure on AWS/GCP with Terraform, virtual networking, IAM policies, and serverless compute.',
      avgSalary: '$100k - $155k',
      coreSkills: ['Linux', 'AWS', 'Google Cloud Platform', 'Docker', 'Terraform', 'Networking', 'Python'],
      secondarySkills: ['Kubernetes', 'CI/CD', 'Serverless', 'Monitoring'],
      growthRate: '+20% YoY',
      icon: '☁️'
    },
    {
      role: 'Cybersecurity Analyst',
      domain: 'Cybersecurity',
      description: 'Protects enterprise networks and applications from vulnerabilities, analyzes SIEM logs, executes penetration testing and threat audits.',
      avgSalary: '$90k - $145k',
      coreSkills: ['Network Security', 'Linux', 'Ethical Hacking', 'Vulnerability Assessment', 'Python', 'SIEM', 'Cryptography'],
      secondarySkills: ['Wireshark', 'OWASP Top 10', 'Incident Response'],
      growthRate: '+26% YoY',
      icon: '🛡️'
    },
    {
      role: 'Android Developer',
      domain: 'Mobile Development',
      description: 'Builds native mobile experiences using Kotlin, Jetpack Compose, MVVM architecture, background coroutines, and Google Play deployments.',
      avgSalary: '$80k - $135k',
      coreSkills: ['Kotlin', 'Android SDK', 'Jetpack Compose', 'Java', 'Mobile UI', 'REST APIs', 'Git'],
      secondarySkills: ['Coroutines', 'Room DB', 'Retrofit', 'MVVM'],
      growthRate: '+14% YoY',
      icon: '📱'
    },
    {
      role: 'DevOps Engineer',
      domain: 'DevOps & Infrastructure',
      description: 'Automates deployment pipelines with CI/CD, orchestrates container clusters with Kubernetes, and enforces infrastructure as code.',
      avgSalary: '$105k - $160k',
      coreSkills: ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'Linux', 'Terraform', 'Git', 'Python / Bash', 'Monitoring'],
      secondarySkills: ['GitHub Actions', 'Prometheus', 'Grafana', 'Ansible'],
      growthRate: '+22% YoY',
      icon: '🔄'
    }
  ];

  ngOnInit() {}

  get filteredCareers(): CareerCard[] {
    return this.allCareers.filter(c => {
      // Domain filter
      if (this.selectedDomain === 'Web & Mobile' && !['Web Development', 'Mobile Development', 'Full Stack Development'].includes(c.domain)) return false;
      if (this.selectedDomain === 'Backend & Cloud' && !['Backend Development', 'Cloud Computing', 'DevOps & Infrastructure'].includes(c.domain)) return false;
      if (this.selectedDomain === 'Data & AI' && !['Data Analytics', 'Data Science', 'Artificial Intelligence'].includes(c.domain)) return false;
      if (this.selectedDomain === 'Systems & Security' && !['Software Engineering', 'Cybersecurity'].includes(c.domain)) return false;

      // Search filter
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesRole = c.role.toLowerCase().includes(q);
        const matchesSkill = c.coreSkills.some(s => s.toLowerCase().includes(q));
        const matchesDesc = c.description.toLowerCase().includes(q);
        return matchesRole || matchesSkill || matchesDesc;
      }
      return true;
    });
  }

  runMlRecommendation() {
    this.isLoadingMl = true;
    this.profileService.getMyProfile().subscribe({
      next: (profileRes) => {
        const skills = (profileRes.data?.skills || []).map(s => s.name);
        const projectsCount = profileRes.data?.projects?.length || 1;
        const assessmentScore = 75;

        this.mlService.recommendCareers({
          skills,
          projects_count: projectsCount,
          assessment_score: assessmentScore
        }).subscribe({
          next: (res) => {
            this.mlRecommendations = res.top_recommendations || [];
            this.isLoadingMl = false;
            this.toast.success(`ML predictions generated! Top career: ${this.mlRecommendations[0]?.career_role}`);
          },
          error: (err) => {
            this.isLoadingMl = false;
            this.toast.error('Failed to generate ML career predictions: ' + err.message);
          }
        });
      },
      error: () => {
        // Fallback for visitors not logged in
        this.mlService.recommendCareers({ skills: ['JavaScript', 'HTML5', 'CSS3'] }).subscribe({
          next: (res) => {
            this.mlRecommendations = res.top_recommendations || [];
            this.isLoadingMl = false;
          },
          error: () => { this.isLoadingMl = false; }
        });
      }
    });
  }
}
