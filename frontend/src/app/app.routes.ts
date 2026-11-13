import { Routes } from '@angular/router';
import { authGuard, guestGuard, recruiterGuard, adminGuard } from './guards/auth.guard';
import { LandingComponent } from './pages/landing/landing.component';

export const routes: Routes = [
  // Public
  { path: '', component: LandingComponent },
  { path: 'login', loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'jobs', loadComponent: () => import('./pages/jobs/job-list.component').then(m => m.JobListComponent) },
  { path: 'jobs/:id', loadComponent: () => import('./pages/jobs/job-details.component').then(m => m.JobDetailsComponent) },
  { path: 'companies', loadComponent: () => import('./pages/companies/companies.component').then(m => m.CompaniesComponent) },
  { path: 'companies/:id', loadComponent: () => import('./pages/companies/company-details.component').then(m => m.CompanyDetailsComponent) },
  { path: 'portfolio/:id', loadComponent: () => import('./pages/portfolio/public-portfolio.component').then(m => m.PublicPortfolioComponent) },

  // Student & Candidate Protected
  { path: 'dashboard', loadComponent: () => import('./pages/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent), canActivate: [authGuard] },
  { path: 'student/dashboard', loadComponent: () => import('./pages/student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'resume-builder', loadComponent: () => import('./pages/resume-builder/resume-builder.component').then(m => m.ResumeBuilderComponent), canActivate: [authGuard] },
  { path: 'resume-analyzer', loadComponent: () => import('./pages/resume-analyzer/resume-analyzer.component').then(m => m.ResumeAnalyzerComponent), canActivate: [authGuard] },
  { path: 'applications', loadComponent: () => import('./pages/applications/applications.component').then(m => m.ApplicationsComponent), canActivate: [authGuard] },
  { path: 'saved-jobs', loadComponent: () => import('./pages/saved-jobs/saved-jobs.component').then(m => m.SavedJobsComponent), canActivate: [authGuard] },
  { path: 'skill-gap', loadComponent: () => import('./pages/skill-gap/skill-gap.component').then(m => m.SkillGapComponent), canActivate: [authGuard] },
  { path: 'career-assistant', loadComponent: () => import('./pages/career-assistant/career-assistant.component').then(m => m.CareerAssistantComponent), canActivate: [authGuard] },
  { path: 'interview-prep', loadComponent: () => import('./pages/interview-prep/interview-prep.component').then(m => m.InterviewPrepComponent), canActivate: [authGuard] },
  { path: 'career-explorer', loadComponent: () => import('./pages/career-explorer/career-explorer.component').then(m => m.CareerExplorerComponent) },
  { path: 'assessments', loadComponent: () => import('./pages/skill-assessment/skill-assessment.component').then(m => m.SkillAssessmentComponent), canActivate: [authGuard] },
  { path: 'assessments/:id', loadComponent: () => import('./pages/skill-assessment/skill-assessment.component').then(m => m.SkillAssessmentComponent), canActivate: [authGuard] },
  { path: 'learning-roadmap', loadComponent: () => import('./pages/learning-roadmap/learning-roadmap.component').then(m => m.LearningRoadmapComponent), canActivate: [authGuard] },
  { path: 'projects', loadComponent: () => import('./pages/project-recommendations/project-recommendations.component').then(m => m.ProjectRecommendationsComponent), canActivate: [authGuard] },
  { path: 'github-analyzer', loadComponent: () => import('./pages/github-analyzer/github-analyzer.component').then(m => m.GithubAnalyzerComponent), canActivate: [authGuard] },
  { path: 'career-analytics', loadComponent: () => import('./pages/career-analytics/career-analytics.component').then(m => m.CareerAnalyticsComponent), canActivate: [authGuard] },
  { path: 'achievements', loadComponent: () => import('./pages/achievements/achievements.component').then(m => m.AchievementsComponent), canActivate: [authGuard] },
  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [authGuard] },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent), canActivate: [authGuard] },

  // Recruiter Protected
  { path: 'recruiter', loadComponent: () => import('./pages/recruiter-dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent), canActivate: [authGuard, recruiterGuard] },
  { path: 'recruiter/dashboard', loadComponent: () => import('./pages/recruiter-dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent), canActivate: [authGuard, recruiterGuard] },
  { path: 'recruiter/post-job', loadComponent: () => import('./pages/recruiter-dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent), canActivate: [authGuard, recruiterGuard] },
  { path: 'recruiter/applications', loadComponent: () => import('./pages/recruiter-dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent), canActivate: [authGuard, recruiterGuard] },
  { path: 'recruiter/candidates', loadComponent: () => import('./pages/recruiter-dashboard/recruiter-dashboard.component').then(m => m.RecruiterDashboardComponent), canActivate: [authGuard, recruiterGuard] },

  // Admin Protected (Strictly restricted to Admin role only)
  { path: 'admin', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/dashboard', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/users', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/jobs', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/companies', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/reports', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/applications', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin/audit', loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },

  // Catch-all
  { path: '**', redirectTo: '' }
];
