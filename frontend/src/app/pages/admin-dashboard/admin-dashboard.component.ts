import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { CompanyService } from '../../services/company.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { User } from '../../models/user.model';
import { Company } from '../../models/company.model';
import { ReportItem } from '../../models/skill.model';
import { AuditLog } from '../../models/audit-log.model';

export interface AdminUser extends User {
  loginEmail?: string;
  loginPhone?: string;
  authProvider?: string;
  passwordStatus?: string;
  preferredRole?: string;
  preferredStream?: string;
  preferredLocation?: string;
  expectedSalary?: string;
  targetSkills?: string[];
  education?: string;
  resumeScore?: number;
  applicationsCount?: number;
  savedJobsCount?: number;
  companyName?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  totalJobsPosted?: number;
  isVerified?: boolean;
}

export type AdminTab =
  | 'overview'
  | 'users'
  | 'jobs'
  | 'companies'
  | 'reports'
  | 'applications'
  | 'audit'
  | 'ml_monitoring'
  | 'settings';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private companyService = inject(CompanyService);
  private jobService = inject(JobService);
  private toast = inject(ToastService);
  authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab: AdminTab = 'overview';

  // Platform Metrics & Analytics
  stats: any = {
    totalUsers: 0,
    totalStudents: 0,
    totalRecruiters: 0,
    totalCompanies: 0,
    verifiedCompanies: 0,
    totalJobs: 0,
    activeJobs: 0,
    reportedJobs: 0,
    totalApplications: 0,
    pendingReports: 0,
    roleStats: [],
    recentApplications: [],
    funnelStages: {
      Applied: 0,
      'Under Review': 0,
      Shortlisted: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      Withdrawn: 0,
    },
    workTypes: { remote: 0, hybrid: 0, onsite: 0 },
    reportsByCategory: {},
    userTrend: [],
    recentAuditLogs: [],
  };

  // Datasets
  users: AdminUser[] = [];
  jobs: any[] = [];
  companies: any[] = [];
  reports: ReportItem[] = [];
  applications: any[] = [];
  auditLogs: AuditLog[] = [];
  mlMonitoringData: any = null;

  // Loading States
  isLoading = true;
  isLoadingUsers = false;
  isLoadingJobs = false;
  isLoadingCompanies = false;
  isLoadingReports = false;
  isLoadingApplications = false;
  isLoadingAudit = false;

  // Filter States
  userRoleFilter = 'all';
  userStatusFilter = 'all';
  userSearch = '';

  jobStatusFilter = 'all';
  jobSearch = '';
  jobReportedOnly = false;

  companyVerificationFilter = 'all';
  companySearch = '';

  reportStatusFilter = 'all';
  reportTargetFilter = 'all';

  appStatusFilter = 'all';
  appSearch = '';

  auditActionFilter = 'all';
  auditTargetFilter = 'all';
  auditSearch = '';

  // Modals & Drawers
  selectedUserForDetails: any | null = null;
  showUserDetailsModal = false;

  selectedCompanyForDetails: any | null = null;
  showCompanyDetailsModal = false;

  selectedReport: ReportItem | null = null;
  reportActionChoice = 'resolve';
  reportActionNotes = '';
  showReportModal = false;

  // Deletion Confirmation Modal
  showDeleteModal = false;
  deleteType: 'user' | 'job' = 'user';
  itemToDelete: { id: string; name: string; extra?: string } | null = null;
  isDeleting = false;

  // Admin Profile & Security State
  adminId = '';
  adminName = '';
  isUpdatingAdminName = false;

  adminEmail = '';
  isUpdatingAdminEmail = false;

  adminPhone = '';
  isUpdatingAdminPhone = false;

  adminCurrentPassword = '';
  adminNewPassword = '';
  adminConfirmPassword = '';
  isUpdatingAdminPassword = false;

  isUploadingAdminAvatar = false;

  ngOnInit() {
    this.route.url.subscribe((segments) => {
      const path = segments.map((s) => s.path).join('/');
      if (path.includes('users')) this.activeTab = 'users';
      else if (path.includes('jobs')) this.activeTab = 'jobs';
      else if (path.includes('reports')) this.activeTab = 'reports';
      else if (path.includes('companies')) this.activeTab = 'companies';
      else if (path.includes('applications')) this.activeTab = 'applications';
      else if (path.includes('audit')) this.activeTab = 'audit';
    });

    this.initAdminProfile();
    this.loadAll();
  }

  @HostListener('document:keydown.escape')
  handleEscape() {
    if (this.showUserDetailsModal) this.closeUserDetails();
    if (this.showCompanyDetailsModal) this.closeCompanyDetails();
    if (this.showReportModal) this.closeReportModal();
    if (this.showDeleteModal) this.cancelDelete();
  }

  switchTab(tab: AdminTab) {
    this.activeTab = tab;
    if (tab === 'ml_monitoring' && !this.mlMonitoringData) {
      this.loadMLMonitoring();
    } else if (tab === 'applications' && this.applications.length === 0) {
      this.fetchApplications();
    } else if (tab === 'audit' && this.auditLogs.length === 0) {
      this.fetchAuditLogs();
    }
  }

  initAdminProfile() {
    this.adminService.getProfile().subscribe({
      next: (res) => {
        if (res.data) {
          this.adminId = res.data._id || '';
          this.adminName = res.data.name || '';
          this.adminEmail = res.data.email || '';
          this.adminPhone = res.data.phone || '';
        }
      },
      error: () => {
        const user = this.authService.currentUser();
        if (user) {
          this.adminId = user._id || '';
          this.adminName = user.name || '';
          this.adminEmail = user.email || '';
          this.adminPhone = (user as any).phone || '';
        }
      }
    });
  }

  get adminAvatar(): string {
    const user = this.authService.currentUser();
    if (user?.avatar) return user.avatar;
    const name = encodeURIComponent(user?.name || this.adminName || 'Admin');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff&bold=true`;
  }

  loadAll() {
    this.isLoading = true;
    this.fetchStats();
    this.fetchUsers();
    this.fetchJobs();
    this.fetchCompanies();
    this.fetchReports();
    this.fetchApplications();
    this.fetchAuditLogs();
  }

  fetchStats() {
    this.adminService.getStats().subscribe({
      next: (res) => {
        if (res.data) {
          this.stats = {
            ...this.stats,
            ...res.data,
            funnelStages: res.data.funnelStages || this.stats.funnelStages,
            workTypes: res.data.workTypes || this.stats.workTypes,
            reportsByCategory: res.data.reportsByCategory || this.stats.reportsByCategory,
            userTrend: res.data.userTrend || this.stats.userTrend,
            recentAuditLogs: res.data.recentAuditLogs || [],
          };
        }
      }
    });
  }

  fetchUsers() {
    this.isLoadingUsers = true;
    this.adminService.getUsers({
      role: this.userRoleFilter !== 'all' ? this.userRoleFilter : undefined,
      status: this.userStatusFilter !== 'all' ? this.userStatusFilter : undefined,
      search: this.userSearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.users = res.data || [];
        this.isLoadingUsers = false;
        this.isLoading = false;
      },
      error: () => {
        this.isLoadingUsers = false;
        this.isLoading = false;
      }
    });
  }

  fetchJobs() {
    this.isLoadingJobs = true;
    this.adminService.getAllJobs({
      status: this.jobStatusFilter !== 'all' ? this.jobStatusFilter : undefined,
      reportedOnly: this.jobReportedOnly,
      search: this.jobSearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.jobs = res.data || [];
        this.isLoadingJobs = false;
      },
      error: () => {
        this.isLoadingJobs = false;
      }
    });
  }

  fetchCompanies() {
    this.isLoadingCompanies = true;
    this.adminService.getAdminCompanies({
      isVerified: this.companyVerificationFilter !== 'all' ? this.companyVerificationFilter : undefined,
      search: this.companySearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.companies = res.data || [];
        this.isLoadingCompanies = false;
      },
      error: () => {
        // Fallback to basic company service if needed
        this.companyService.getCompanies().subscribe({
          next: (fallbackRes) => {
            this.companies = fallbackRes.data || [];
            this.isLoadingCompanies = false;
          },
          error: () => {
            this.isLoadingCompanies = false;
          }
        });
      }
    });
  }

  fetchReports() {
    this.isLoadingReports = true;
    this.adminService.getReports(this.reportStatusFilter, this.reportTargetFilter).subscribe({
      next: (res) => {
        this.reports = res.data || [];
        this.isLoadingReports = false;
      },
      error: () => {
        this.isLoadingReports = false;
      }
    });
  }

  fetchApplications() {
    this.isLoadingApplications = true;
    this.adminService.getApplications({
      status: this.appStatusFilter !== 'all' ? this.appStatusFilter : undefined,
      search: this.appSearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.applications = res.data || [];
        this.isLoadingApplications = false;
      },
      error: () => {
        this.isLoadingApplications = false;
      }
    });
  }

  fetchAuditLogs() {
    this.isLoadingAudit = true;
    this.adminService.getAuditLogs({
      action: this.auditActionFilter !== 'all' ? this.auditActionFilter : undefined,
      targetType: this.auditTargetFilter !== 'all' ? this.auditTargetFilter : undefined,
      search: this.auditSearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.auditLogs = res.data || [];
        this.isLoadingAudit = false;
      },
      error: () => {
        this.isLoadingAudit = false;
      }
    });
  }

  loadMLMonitoring() {
    this.adminService.getMLMonitoring().subscribe({
      next: (res) => {
        this.mlMonitoringData = res.data;
      },
      error: () => {
        this.toast.error('Failed to load ML monitoring telemetry.');
      }
    });
  }

  // User Actions
  toggleUserStatus(user: User) {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    this.adminService.updateUserStatus(user._id, nextStatus).subscribe({
      next: () => {
        this.toast.success(`User ${user.name} is now ${nextStatus}!`);
        user.status = nextStatus;
        if (this.selectedUserForDetails && this.selectedUserForDetails._id === user._id) {
          this.selectedUserForDetails.status = nextStatus;
        }
        this.fetchAuditLogs();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to update user status.')
    });
  }

  confirmDeleteUser(user: User) {
    this.deleteType = 'user';
    this.itemToDelete = {
      id: user._id,
      name: user.name,
      extra: `${user.email} (${user.role})`
    };
    this.showDeleteModal = true;
  }

  // Job Actions
  toggleJobFeatured(job: any) {
    const nextFeatured = !job.isFeatured;
    this.adminService.updateJobStatus(job._id, { isFeatured: nextFeatured }).subscribe({
      next: () => {
        job.isFeatured = nextFeatured;
        this.toast.success(`Job "${job.title}" ${nextFeatured ? 'is now Featured' : 'unfeatured'}.`);
        this.fetchAuditLogs();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to update job.')
    });
  }

  toggleJobStatus(job: any) {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    this.adminService.updateJobStatus(job._id, { status: nextStatus }).subscribe({
      next: () => {
        job.status = nextStatus;
        this.toast.success(`Job marked as ${nextStatus}.`);
        this.fetchStats();
        this.fetchAuditLogs();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to toggle job status.')
    });
  }

  confirmDeleteJob(job: any) {
    this.deleteType = 'job';
    this.itemToDelete = {
      id: job._id,
      name: job.title,
      extra: `Posting by ${job.companyName || 'Enterprise'}`
    };
    this.showDeleteModal = true;
  }

  // Unified Deletion Execution
  executeDelete() {
    if (!this.itemToDelete) return;
    this.isDeleting = true;

    if (this.deleteType === 'user') {
      this.adminService.deleteUser(this.itemToDelete.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.toast.success('User account removed permanently.');
          this.fetchUsers();
          this.fetchStats();
          this.fetchAuditLogs();
        },
        error: (err) => {
          this.isDeleting = false;
          this.toast.error(err.error?.message || 'Failed to delete user.');
        }
      });
    } else if (this.deleteType === 'job') {
      this.adminService.deleteJob(this.itemToDelete.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.toast.success('Job listing deleted permanently.');
          this.fetchJobs();
          this.fetchStats();
          this.fetchAuditLogs();
        },
        error: (err) => {
          this.isDeleting = false;
          this.toast.error(err.error?.message || 'Failed to remove job posting.');
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
    this.isDeleting = false;
  }

  // Company Verification Actions
  toggleCompanyVerification(company: any) {
    this.adminService.toggleCompanyVerification(company._id).subscribe({
      next: () => {
        company.isVerified = !company.isVerified;
        this.toast.success(`Company ${company.name} ${company.isVerified ? 'verified' : 'unverified'}!`);
        this.fetchStats();
        this.fetchAuditLogs();
      },
      error: (err) => this.toast.error(err.error?.message || 'Could not update company verification.')
    });
  }

  openCompanyDetails(company: any) {
    this.selectedCompanyForDetails = company;
    this.showCompanyDetailsModal = true;
  }

  closeCompanyDetails() {
    this.selectedCompanyForDetails = null;
    this.showCompanyDetailsModal = false;
  }

  // User Dossier Modal
  openUserDetails(user: any) {
    this.selectedUserForDetails = user;
    this.showUserDetailsModal = true;
  }

  closeUserDetails() {
    this.selectedUserForDetails = null;
    this.showUserDetailsModal = false;
  }

  // Scam Report Resolution Workflow
  openReportModal(report: ReportItem) {
    this.selectedReport = report;
    this.reportActionChoice = 'resolve';
    this.reportActionNotes = report.adminNotes || '';
    this.showReportModal = true;
  }

  closeReportModal() {
    this.selectedReport = null;
    this.showReportModal = false;
  }

  submitReportAction() {
    if (!this.selectedReport) return;

    this.adminService.actionReport(this.selectedReport._id, {
      action: this.reportActionChoice,
      adminNotes: this.reportActionNotes.trim(),
    }).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Report action completed successfully.');
        this.showReportModal = false;
        this.fetchReports();
        this.fetchStats();
        this.fetchAuditLogs();
        if (this.reportActionChoice === 'delete_job') this.fetchJobs();
        if (this.reportActionChoice === 'suspend_user') this.fetchUsers();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to process report action.')
    });
  }

  // Admin Profile & Password Updates
  saveAdminName() {
    if (!this.adminName.trim()) {
      this.toast.warning('Please enter a valid administrator name.');
      return;
    }
    this.isUpdatingAdminName = true;
    this.adminService.updateProfile({ name: this.adminName.trim() }).subscribe({
      next: (res) => {
        this.isUpdatingAdminName = false;
        if (res.data) {
          const current = this.authService.currentUser();
          if (current) this.authService.setCurrentUser({ ...current, name: res.data.name });
        }
        this.toast.success('Admin name updated successfully!');
        this.fetchAuditLogs();
      },
      error: (err) => {
        this.isUpdatingAdminName = false;
        this.toast.error(err.error?.message || 'Failed to update admin name.');
      }
    });
  }

  saveAdminEmail() {
    if (!this.adminEmail.trim()) {
      this.toast.warning('Please enter a valid email address.');
      return;
    }
    this.isUpdatingAdminEmail = true;
    this.adminService.updateProfile({ email: this.adminEmail.trim().toLowerCase() }).subscribe({
      next: (res) => {
        this.isUpdatingAdminEmail = false;
        if (res.data) {
          const current = this.authService.currentUser();
          if (current) this.authService.setCurrentUser({ ...current, email: res.data.email });
        }
        this.toast.success('Admin email updated successfully!');
        this.fetchAuditLogs();
      },
      error: (err) => {
        this.isUpdatingAdminEmail = false;
        this.toast.error(err.error?.message || 'Failed to update email.');
      }
    });
  }

  saveAdminPhone() {
    this.isUpdatingAdminPhone = true;
    this.adminService.updateProfile({ phone: this.adminPhone.trim() }).subscribe({
      next: (res) => {
        this.isUpdatingAdminPhone = false;
        if (res.data) {
          const current = this.authService.currentUser();
          if (current) this.authService.setCurrentUser({ ...current, phone: res.data.phone });
        }
        this.toast.success('Admin mobile phone updated successfully!');
        this.fetchAuditLogs();
      },
      error: (err) => {
        this.isUpdatingAdminPhone = false;
        this.toast.error(err.error?.message || 'Failed to update phone number.');
      }
    });
  }

  saveFullAdminProfile() {
    if (!this.adminName.trim() || !this.adminEmail.trim()) {
      this.toast.warning('Please enter valid administrator name and email.');
      return;
    }
    this.isUpdatingAdminName = true;
    this.adminService.updateProfile({
      name: this.adminName.trim(),
      email: this.adminEmail.trim().toLowerCase(),
      phone: this.adminPhone.trim(),
    }).subscribe({
      next: (res) => {
        this.isUpdatingAdminName = false;
        if (res.data) {
          const current = this.authService.currentUser();
          if (current) {
            this.authService.setCurrentUser({
              ...current,
              name: res.data.name,
              email: res.data.email,
              phone: res.data.phone,
            });
          }
        }
        this.toast.success('Admin profile saved successfully!');
        this.fetchAuditLogs();
      },
      error: (err) => {
        this.isUpdatingAdminName = false;
        this.toast.error(err.error?.message || 'Failed to update profile.');
      }
    });
  }

  saveAdminPassword() {
    if (!this.adminCurrentPassword || !this.adminNewPassword) {
      this.toast.warning('Please enter your current and new password.');
      return;
    }
    if (this.adminNewPassword.length < 6) {
      this.toast.warning('New password must be at least 6 characters long.');
      return;
    }
    if (this.adminNewPassword !== this.adminConfirmPassword) {
      this.toast.warning('New password and confirmation do not match.');
      return;
    }
    this.isUpdatingAdminPassword = true;
    this.adminService.updatePassword({
      currentPassword: this.adminCurrentPassword,
      newPassword: this.adminNewPassword
    }).subscribe({
      next: () => {
        this.isUpdatingAdminPassword = false;
        this.adminCurrentPassword = '';
        this.adminNewPassword = '';
        this.adminConfirmPassword = '';
        this.toast.success('Admin password rotated successfully! Keep it secure.');
        this.fetchAuditLogs();
      },
      error: (err) => {
        this.isUpdatingAdminPassword = false;
        this.toast.error(err.error?.message || 'Failed to update password.');
      }
    });
  }

  onAdminAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.warning('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toast.warning('Avatar file must be under 5MB.');
      return;
    }

    this.isUploadingAdminAvatar = true;
    const formData = new FormData();
    formData.append('avatar', file);

    this.profileService.uploadAvatar(formData).subscribe({
      next: (res: any) => {
        this.isUploadingAdminAvatar = false;
        if (res.data?.avatar) {
          this.authService.setAvatar(res.data.avatar);
        }
        this.toast.success('Admin avatar updated!');
      },
      error: () => {
        this.isUploadingAdminAvatar = false;
        this.toast.error('Failed to upload avatar.');
      }
    });
  }

  // Analytics Helpers for Charts
  get userTrendMax(): number {
    if (!this.stats.userTrend || this.stats.userTrend.length === 0) return 5;
    const max = Math.max(...this.stats.userTrend.map((t: any) => t.count));
    return max > 0 ? max : 5;
  }

  getUserTrendHeight(count: number): number {
    const max = this.userTrendMax;
    return Math.max(8, Math.round((count / max) * 100));
  }

  get funnelTotal(): number {
    const f = this.stats.funnelStages || {};
    return (
      (f.Applied || 0) +
      (f['Under Review'] || 0) +
      (f.Shortlisted || 0) +
      (f.Interview || 0) +
      (f.Selected || 0) +
      (f.Rejected || 0)
    ) || 1;
  }

  getFunnelPercent(stage: string): number {
    const f = this.stats.funnelStages || {};
    const val = f[stage] || 0;
    return Math.round((val / this.funnelTotal) * 100);
  }

  getRolePercent(count: number): number {
    const total = this.stats.totalUsers || 1;
    return Math.round((count / total) * 100);
  }

  get unverifiedCompaniesCount(): number {
    return this.companies.filter((c) => !c.isVerified).length;
  }

  get pendingReportsCount(): number {
    return this.reports.filter((r) => r.status === 'Pending').length;
  }

  get reportCategoryKeys(): string[] {
    return Object.keys(this.stats.reportsByCategory || {});
  }
}
