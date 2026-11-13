import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { JobService } from '../../services/job.service';
import { ApplicationService } from '../../services/application.service';
import { ToastService } from '../../services/toast.service';
import { MlService, CareerRecommendationItem } from '../../services/ml.service';
import { RoadmapService, LearningProgress } from '../../services/roadmap.service';
import { AssessmentService } from '../../services/assessment.service';
import { ProjectService, ProjectRecommendation } from '../../services/project.service';
import { InterviewScheduleService } from '../../services/interview-schedule.service';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { Career3dVisualizerComponent } from '../../components/career-3d-visualizer/career-3d-visualizer.component';
import { Profile } from '../../models/profile.model';
import { Job } from '../../models/job.model';
import { Application } from '../../models/application.model';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, JobCardComponent, Career3dVisualizerComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
})
export class StudentDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  private mlService = inject(MlService);
  private roadmapService = inject(RoadmapService);
  private assessmentService = inject(AssessmentService);
  private projectService = inject(ProjectService);
  private interviewScheduleService = inject(InterviewScheduleService);
  private toast = inject(ToastService);

  profile: Profile | null = null;
  recommendedJobs: Job[] = [];
  livePlatformJobs: Job[] = [];
  recentApplications: Application[] = [];
  savedJobsCount = 0;
  upcomingInterviews: Application[] = [];
  upcomingInterviewReminders: any[] = [];
  recommendedProjects: ProjectRecommendation[] = [];

  // ML & Telemetry Data
  mlTopCareers: CareerRecommendationItem[] = [];
  careerReadinessScore = 0;
  careerReadinessLevel = 'Getting Started';
  readinessStrengths: string[] = [];
  readinessWeaknesses: string[] = [];
  userRoadmapProgress: LearningProgress | null = null;
  assessmentAttemptsCount = 0;
  avgInterviewScore = 0;

  isLoading = true;
  isSearchingLive = false;
  isLoadingMl = false;

  // Real-Time Salary & Criteria Finder model
  criteriaRole = 'Full Stack';
  criteriaLocation = 'Remote';
  criteriaMinSalary: number | null = null;
  criteriaMaxSalary: number | null = null;
  criteriaPlatform = 'all';

  activeTab: 'live_platforms' | 'internal' = 'live_platforms';

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;

    // 1. Fetch Profile
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data) {
          this.profile = res.data;
          if (this.profile.preferredRole) {
            this.criteriaRole = this.profile.preferredRole;
          }
          this.fetchMlTelemetry();
          this.fetchRoadmapProgress();
          this.fetchProjects();
        }
      },
    });

    // 2. Fetch Live Real-Time Multi-Platform Jobs
    this.fetchLiveJobs();

    // 3. Fetch Internal Recommended Jobs
    this.jobService.getJobs({ limit: 4, sort: 'recent' }).subscribe({
      next: (res) => {
        this.recommendedJobs = res.data || [];
      },
    });

    // 4. Fetch Candidate Applications & Interviews
    this.applicationService.getMyApplications().subscribe({
      next: (res) => {
        this.recentApplications = res.data || [];
        this.upcomingInterviews = this.recentApplications.filter(
          (a) => a.status === 'Interview' && a.interviewDetails?.scheduledDate
        );
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });

    // 5. Fetch Saved jobs count
    this.jobService.getMySavedJobs().subscribe({
      next: (res) => {
        this.savedJobsCount = res.count || 0;
      },
    });

    // 6. Fetch Upcoming Interview Schedule Reminders (Phase 10)
    this.interviewScheduleService.getUpcomingReminders().subscribe({
      next: (res) => {
        this.upcomingInterviewReminders = res.data || [];
      },
      error: () => {},
    });

    // 6. Fetch Assessment History
    this.assessmentService.getMyAssessmentHistory().subscribe({
      next: (res) => {
        this.assessmentAttemptsCount = res.count || 0;
      }
    });
  }

  fetchMlTelemetry() {
    this.isLoadingMl = true;
    const skills = (this.profile?.skills || []).map(s => s.name);
    const projectsCount = this.profile?.projects?.length || 1;
    const resumeScore = this.profile?.resumeScore || 0;

    // Call ML career recommender
    this.mlService.recommendCareers({
      skills,
      projects_count: projectsCount,
      assessment_score: 75
    }).subscribe({
      next: (res) => {
        this.mlTopCareers = res.top_recommendations || [];
        this.isLoadingMl = false;
      },
      error: () => {
        this.isLoadingMl = false;
      }
    });

    // Call ML career readiness
    this.mlService.predictReadiness({
      technicalSkills: skills,
      projectsCount,
      resumeScore,
      interviewScore: 0,
      assessmentScore: 0,
      targetRole: this.profile?.preferredRole || 'Full Stack Developer'
    }).subscribe({
      next: (res) => {
        this.careerReadinessScore = res.career_readiness_score || 72;
        this.careerReadinessLevel = res.readiness_level || 'Job Ready';
        this.readinessStrengths = res.strengths || [];
        this.readinessWeaknesses = res.weak_areas || [];
      }
    });
  }

  fetchRoadmapProgress() {
    const role = this.profile?.preferredRole || 'Frontend Developer';
    this.roadmapService.getMyProgress(role).subscribe({
      next: (res) => {
        this.userRoadmapProgress = res.data;
      }
    });
  }

  fetchProjects() {
    const role = this.profile?.preferredRole || 'Full Stack Developer';
    this.projectService.getRecommendedProjects({ targetRole: role }).subscribe({
      next: (res) => {
        this.recommendedProjects = res.data?.slice(0, 3) || [];
      }
    });
  }

  fetchLiveJobs() {
    this.isSearchingLive = true;
    this.jobService
      .searchJobsByCriteria({
        role: this.criteriaRole,
        location: this.criteriaLocation,
        platform: this.criteriaPlatform,
        minSalary: this.criteriaMinSalary || 0,
        maxSalary: this.criteriaMaxSalary || 0,
      })
      .subscribe({
        next: (res: any) => {
          this.livePlatformJobs = res.data || [];
          this.isSearchingLive = false;
        },
        error: () => {
          this.isSearchingLive = false;
        },
      });
  }

  onCriteriaSubmit() {
    this.fetchLiveJobs();
    this.toast.info(`Searching live jobs matching criteria for ${this.criteriaRole}...`);
  }

  applySalaryPreset(min: number, max: number) {
    this.criteriaMinSalary = min;
    this.criteriaMaxSalary = max;
    this.fetchLiveJobs();
  }

  setTab(tab: 'live_platforms' | 'internal') {
    this.activeTab = tab;
  }

  get hasResumeScanned(): boolean {
    return !!(this.profile?.resumeScore && this.profile.resumeScore > 0);
  }

  get userSkills(): string[] {
    return (this.profile?.skills || []).map((s) => s.name);
  }

  get recommendedMissingSkills(): string[] {
    if (this.mlTopCareers[0]?.missing_skills?.length) {
      return this.mlTopCareers[0].missing_skills.slice(0, 4);
    }
    const common = ['Git', 'Docker', 'REST API', 'Cloud / AWS', 'Testing'];
    const current = new Set(this.userSkills.map((s) => s.toLowerCase()));
    return common.filter((s) => !current.has(s.toLowerCase())).slice(0, 3);
  }
}
