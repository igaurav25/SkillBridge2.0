import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjectRecommendation } from '../../services/project.service';

@Component({
  selector: 'app-project-recommendations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="projects-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="header-section mb-8">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge badge-primary text-xs">PORTFOLIO BLUEPRINTS</span>
            <span class="badge badge-emerald text-xs">Industry Aligned</span>
          </div>
          <h1 class="text-3xl font-extrabold mb-2">
            AI Project <span class="text-gradient">Recommendations</span>
          </h1>
          <p class="text-secondary text-sm max-w-2xl">
            Practical, employer-ready engineering projects calibrated to your target career role, current skill tier, and learning progress. Build these to verify your expertise with genuine GitHub repositories.
          </p>
        </div>

        <!-- Filter Row -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div class="flex items-center gap-2 flex-wrap">
            <button
              *ngFor="let diff of difficultyFilters"
              class="filter-pill text-xs font-semibold"
              [class.active]="selectedDifficulty === diff"
              (click)="filterDifficulty(diff)"
            >
              {{ diff }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-muted font-bold">Role Filter:</label>
            <input
              type="text"
              [(ngModel)]="roleSearch"
              placeholder="e.g. Full Stack, Backend, Frontend..."
              class="input-sm text-xs bg-secondary border border-subtle rounded-lg px-3 py-1.5 outline-none"
              (input)="loadProjects()"
            />
          </div>
        </div>

        <!-- Project Cards Grid -->
        <div *ngIf="isLoading" class="grid grid-2 gap-6">
          <div *ngFor="let i of [1,2,3,4]" class="sb-card p-6 h-56 skeleton-box"></div>
        </div>

        <div *ngIf="!isLoading && projects.length === 0" class="sb-card p-12 text-center text-secondary text-sm">
          No projects found matching the filter criteria. Clear filters to see all recommended projects.
        </div>

        <div *ngIf="!isLoading && projects.length > 0" class="grid grid-2 gap-6">
          <div *ngFor="let p of projects" class="sb-card p-6 flex flex-col justify-between hover-card">
            <div>
              <div class="flex items-start justify-between mb-3 gap-2">
                <span class="badge badge-primary text-xs">{{ p.targetRole }}</span>
                <span class="badge text-xs" [class.badge-neutral]="p.difficulty === 'Beginner'" [class.badge-cyan]="p.difficulty === 'Intermediate'" [class.badge-accent]="p.difficulty === 'Advanced'">
                  {{ p.difficulty }}
                </span>
              </div>

              <h3 class="text-xl font-bold mb-2 leading-snug">{{ p.title }}</h3>
              <p class="text-xs text-secondary mb-4">{{ p.description }}</p>

              <!-- Technologies Required -->
              <div class="mb-4">
                <span class="text-xs text-muted block mb-1 font-semibold">Technologies & Tools:</span>
                <div class="flex flex-wrap gap-1.5">
                  <span *ngFor="let tech of p.requiredTechnologies" class="tech-pill">{{ tech }}</span>
                </div>
              </div>

              <!-- Features List -->
              <div class="mb-4 p-3 bg-secondary rounded-lg">
                <span class="text-xs font-bold uppercase tracking-wider text-muted block mb-2">Core Features to Implement:</span>
                <ul class="text-xs text-secondary flex flex-col gap-1.5 pl-4 list-disc">
                  <li *ngFor="let feat of p.features">{{ feat }}</li>
                </ul>
              </div>

              <!-- Expected Outcome & Learning Benefits -->
              <div class="grid grid-2 gap-3 text-xs mb-4">
                <div class="p-2.5 bg-secondary rounded">
                  <strong class="text-cyan block mb-1">Expected Outcome:</strong>
                  <span class="text-secondary">{{ p.expectedOutcome }}</span>
                </div>
                <div class="p-2.5 bg-secondary rounded">
                  <strong class="text-emerald block mb-1">Learning Value:</strong>
                  <span class="text-secondary">{{ p.learningBenefits }}</span>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-subtle flex items-center justify-between gap-3">
              <span class="text-xs text-muted">⏱️ Est. {{ p.estimatedDuration }}</span>
              <a routerLink="/github-analyzer" class="btn btn-primary btn-sm">
                Analyze Repository on GitHub →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .projects-page { min-height: 85vh; }
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
      background: var(--primary-600);
      color: #ffffff;
      border-color: var(--primary-600);
    }
    .tech-pill {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 3px 9px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
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
export class ProjectRecommendationsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);

  projects: ProjectRecommendation[] = [];
  isLoading = true;
  selectedDifficulty = 'All';
  difficultyFilters = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  roleSearch = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['targetRole']) {
        this.roleSearch = params['targetRole'];
      }
      this.loadProjects();
    });
  }

  loadProjects() {
    this.isLoading = true;
    const filters: any = {};
    if (this.selectedDifficulty !== 'All') filters.difficulty = this.selectedDifficulty;
    if (this.roleSearch.trim()) filters.targetRole = this.roleSearch.trim();

    this.projectService.getRecommendedProjects(filters).subscribe({
      next: (res) => {
        this.projects = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  filterDifficulty(diff: string) {
    this.selectedDifficulty = diff;
    this.loadProjects();
  }
}

