import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../services/application.service';
import { ToastService } from '../../services/toast.service';
import { Application, ApplicationStatus } from '../../models/application.model';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.css'],
})
export class ApplicationsComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private toast = inject(ToastService);

  applications: Application[] = [];
  filteredApplications: Application[] = [];
  selectedApplication: Application | null = null;
  activeStatusTab: string = 'All';
  activeView: 'board' | 'list' = 'board';
  searchQuery: string = '';
  isLoading = true;

  stats = {
    total: 0,
    applied: 0,
    underReview: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
  };

  kanbanColumns = [
    { id: 'Applied', label: 'Applied', icon: '📨', countKey: 'applied' as const },
    { id: 'Under Review', label: 'Under Review', icon: '👀', countKey: 'underReview' as const },
    { id: 'Shortlisted', label: 'Shortlisted', icon: '⭐', countKey: 'shortlisted' as const },
    { id: 'Interview', label: 'Interview', icon: '📅', countKey: 'interview' as const },
    { id: 'Selected', label: 'Selected / Offer', icon: '🎉', countKey: 'selected' as const },
    { id: 'Rejected', label: 'Archived', icon: '📁', countKey: 'rejected' as const },
  ];

  statusSteps: ApplicationStatus[] = [
    'Applied',
    'Under Review',
    'Shortlisted',
    'Interview',
    'Selected',
  ];

  ngOnInit() {
    this.fetchApplications();
  }

  fetchApplications() {
    this.isLoading = true;
    this.applicationService.getMyApplications().subscribe({
      next: (res) => {
        this.applications = res.data || [];
        this.stats = res.stats || this.stats;
        this.filterByTab(this.activeStatusTab);
        if (this.applications.length > 0 && !this.selectedApplication) {
          this.selectedApplication = this.applications[0];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  filterByTab(status: string) {
    this.activeStatusTab = status;
    if (status === 'All') {
      this.filteredApplications = this.applications;
    } else {
      this.filteredApplications = this.applications.filter((a) => a.status === status);
    }
  }

  selectApplication(app: Application) {
    this.selectedApplication = app;
  }

  viewApplicationDetails(app: Application) {
    this.selectedApplication = app;
    this.activeView = 'list';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getAppsForColumn(columnId: string): Application[] {
    if (columnId === 'Rejected') {
      return this.applications.filter((a) => a.status === 'Rejected' || a.status === 'Withdrawn');
    }
    return this.applications.filter((a) => a.status === columnId);
  }

  get displayedListApplications(): Application[] {
    if (!this.searchQuery.trim()) return this.filteredApplications;
    const q = this.searchQuery.toLowerCase().trim();
    return this.filteredApplications.filter(
      (a) =>
        (a.job?.title || '').toLowerCase().includes(q) ||
        (a.job?.companyName || '').toLowerCase().includes(q)
    );
  }

  withdraw(app: Application) {
    if (confirm('Are you sure you want to withdraw this application?')) {
      this.applicationService.withdrawApplication(app._id).subscribe({
        next: (res) => {
          this.toast.info('Application withdrawn.');
          this.fetchApplications();
        },
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Applied': return 'status-applied';
      case 'Under Review': return 'status-review';
      case 'Shortlisted': return 'status-shortlisted';
      case 'Interview': return 'status-interview';
      case 'Selected': return 'status-selected';
      case 'Rejected': return 'status-rejected';
      default: return 'status-withdrawn';
    }
  }

  isStepActive(app: Application, step: ApplicationStatus): boolean {
    const order: ApplicationStatus[] = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'];
    const currentIdx = order.indexOf(app.status);
    const stepIdx = order.indexOf(step);
    return currentIdx >= stepIdx;
  }
}
