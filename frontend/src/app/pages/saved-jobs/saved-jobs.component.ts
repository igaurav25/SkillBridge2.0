import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { getDirectApplyUrl } from '../../utils/direct-apply.util';

@Component({
  selector: 'app-saved-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="saved-jobs-page py-8">
      <div class="container">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <span class="badge badge-amber text-xs mb-1">BOOKMARKS</span>
            <h1 class="text-2xl font-bold">Saved Jobs & Collections</h1>
            <p class="text-xs text-secondary">Organize and bookmark opportunities by stack or career focus</p>
          </div>

          <!-- Quick Search -->
          <div class="flex items-center gap-2 bg-secondary p-2 rounded-lg">
            <span>🔍</span>
            <input
              type="text"
              class="header-input text-xs"
              placeholder="Search saved jobs..."
              [(ngModel)]="searchQuery"
            />
          </div>
        </div>

        <!-- Category Tabs Bar -->
        <div class="category-tabs-bar sb-card p-3 mb-6 flex items-center gap-2 flex-wrap">
          <button
            *ngFor="let cat of categories"
            type="button"
            class="badge cat-tab-btn"
            [class.active]="selectedCategory === cat"
            (click)="selectCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Loading Skeleton -->
        <div *ngIf="isLoading" class="grid grid-2 gap-4">
          <div class="sb-card skeleton" style="height: 180px;"></div>
          <div class="sb-card skeleton" style="height: 180px;"></div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && displayedSavedJobs.length === 0" class="empty-state text-center p-8 sb-card">
          <div class="empty-state-icon text-4xl mb-3">🔖</div>
          <h3 class="text-lg font-bold mb-2">No saved jobs in this category</h3>
          <p class="text-sm text-secondary mb-4">
            Browse the marketplace and click the bookmark star to save opportunities here.
          </p>
          <a routerLink="/jobs" class="btn btn-primary btn-sm">Explore Open Positions →</a>
        </div>

        <!-- Saved Jobs Grid -->
        <div *ngIf="!isLoading && displayedSavedJobs.length > 0" class="grid grid-2 gap-4">
          <div *ngFor="let item of displayedSavedJobs" class="sb-card saved-job-card p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  [src]="item.job?.companyLogo || item.job?.company?.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80'"
                  alt="Company"
                  class="company-logo flex-shrink-0"
                />
                <div class="min-w-0">
                  <h3 class="text-base font-bold truncate">{{ item.job?.title }}</h3>
                  <div class="text-xs text-secondary truncate">
                    {{ item.job?.companyName }} • {{ item.job?.location }}
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="btn-remove"
                (click)="removeSaved(item.job?._id)"
                title="Remove bookmark"
                aria-label="Remove bookmark"
              >
                ★
              </button>
            </div>

            <!-- Badges and Category Tag -->
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              <span class="badge badge-amber text-xs">Folder: {{ item.category }}</span>
              <span class="badge badge-neutral text-xs">{{ (item.job?.workType || item.job?.workMode || 'onsite') | uppercase }}</span>
              <span class="badge badge-primary text-xs">{{ (item.job?.jobType || 'Full-time') | titlecase }}</span>
              <span *ngIf="item.job?.platform" class="badge badge-cyan text-xs">
                {{ item.job?.platform }}
              </span>
            </div>

            <!-- Notes Section with Inline Edit -->
            <div class="notes-box bg-secondary p-2.5 rounded mb-3 text-xs text-secondary">
              <div class="flex items-center justify-between mb-1">
                <strong>My Notes:</strong>
                <button
                  type="button"
                  class="btn-link text-[11px] text-primary"
                  (click)="editNotes(item)"
                >
                  ✏️ {{ item.notes ? 'Edit Note' : 'Add Note' }}
                </button>
              </div>
              <p class="whitespace-pre-line text-muted">
                {{ item.notes || 'No personal notes added yet. Click edit to write interview thoughts or salary targets.' }}
              </p>
            </div>

            <!-- Card Footer: Direct Apply or View -->
            <div class="flex items-center justify-between pt-3 border-top flex-wrap gap-2">
              <span class="text-xs text-muted">Saved on {{ item.createdAt | date:'mediumDate' }}</span>

              <div class="flex items-center gap-2">
                <a
                  *ngIf="getDirectApply(item.job)"
                  [href]="getDirectApply(item.job)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-primary btn-xs font-bold"
                >
                  Direct Apply ↗
                </a>

                <a [routerLink]="['/jobs', item.job?._id]" class="btn btn-outline btn-xs">
                  View Details →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .saved-jobs-page {
        min-height: calc(100vh - 160px);
      }
      .cat-tab-btn {
        background: var(--bg-secondary);
        border: 1px solid var(--border-card);
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.4rem 0.85rem;
        transition: all 0.15s ease;
      }
      .cat-tab-btn:hover {
        border-color: var(--primary-400);
        color: var(--text-primary);
      }
      .cat-tab-btn.active {
        background: var(--accent-amber);
        color: var(--text-inverse, #000);
        border-color: var(--accent-amber);
        font-weight: bold;
      }
      .company-logo {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        object-fit: cover;
      }
      .btn-remove {
        background: transparent;
        border: none;
        color: var(--accent-amber);
        font-size: 1.3rem;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .btn-remove:hover {
        transform: scale(1.15);
      }
      .border-top {
        border-top: 1px solid var(--border-subtle);
      }
    `,
  ],
})
export class SavedJobsComponent implements OnInit {
  private jobService = inject(JobService);
  private toast = inject(ToastService);

  savedJobs: any[] = [];
  isLoading = true;
  selectedCategory = 'All';
  searchQuery = '';

  categories = ['All', 'Frontend', 'Backend', 'Full Stack', 'AI', 'Internship', 'High Priority', 'General'];

  ngOnInit() {
    this.fetchSavedJobs();
  }

  fetchSavedJobs() {
    this.isLoading = true;
    const cat = this.selectedCategory === 'All' ? undefined : this.selectedCategory;

    this.jobService.getMySavedJobs(cat).subscribe({
      next: (res) => {
        this.savedJobs = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  get displayedSavedJobs(): any[] {
    if (!this.searchQuery.trim()) return this.savedJobs;
    const q = this.searchQuery.toLowerCase().trim();
    return this.savedJobs.filter(
      (item) =>
        (item.job?.title || '').toLowerCase().includes(q) ||
        (item.job?.companyName || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
    );
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.fetchSavedJobs();
  }

  getDirectApply(job: any): string {
    return getDirectApplyUrl(job);
  }

  removeSaved(jobId: string) {
    this.jobService.toggleSaveJob(jobId).subscribe({
      next: () => {
        this.toast.info('Job removed from bookmarks');
        this.fetchSavedJobs();
      },
    });
  }

  editNotes(item: any) {
    const newNotes = prompt('Add or update your notes for this bookmark:', item.notes || '');
    if (newNotes !== null) {
      this.jobService.updateSavedJob(item._id, { notes: newNotes }).subscribe({
        next: () => {
          item.notes = newNotes;
          this.toast.success('Notes saved');
        },
        error: () => {
          this.toast.error('Failed to update notes');
        },
      });
    }
  }
}