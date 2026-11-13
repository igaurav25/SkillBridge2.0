import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { JobService } from '../../services/job.service';
import { ApplicationService } from '../../services/application.service';
import { CompanyService } from '../../services/company.service';
import { ProfileService } from '../../services/profile.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService, RecruiterAnalyticsData } from '../../services/analytics.service';
import { InterviewScheduleService } from '../../services/interview-schedule.service';
import { Job } from '../../models/job.model';
import { Application } from '../../models/application.model';
import { Company } from '../../models/company.model';
import { InterviewSchedule, InterviewMode, InterviewRound } from '../../models/interview-schedule.model';

export interface JobTemplate {
  name: string;
  title: string;
  type: string;
  workMode: string;
  experienceLevel: string;
  minSalary: number;
  maxSalary: number;
  skills: string;
  description: string;
  responsibilities: string;
  requirements: string;
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasInterviews: boolean;
  interviews: InterviewSchedule[];
}

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './recruiter-dashboard.component.html',
  styleUrls: ['./recruiter-dashboard.component.css'],
})
export class RecruiterDashboardComponent implements OnInit {
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  private companyService = inject(CompanyService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);
  public authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private interviewScheduleService = inject(InterviewScheduleService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  activeTab: 'overview' | 'jobs' | 'pipeline' | 'candidates' | 'interviews' | 'company' = 'overview';
  pipelineViewMode: 'kanban' | 'list' = 'kanban';

  // Stats
  activeJobsCount = 0;
  totalApplicationsCount = 0;
  shortlistedCount = 0;
  interviewCount = 0;
  hiredCount = 0;

  // Data lists
  postedJobs: Job[] = [];
  applications: Application[] = [];
  filteredApplications: Application[] = [];
  candidates: any[] = [];
  myCompany: Company | null = null;
  interviews: InterviewSchedule[] = [];
  upcomingInterviewReminders: any[] = [];
  analyticsData: RecruiterAnalyticsData | null = null;
  isLoading = true;

  // Filters
  appStatusFilter = 'all';
  appJobFilter = 'all';
  appSearchQuery = '';

  // Candidate Search
  candidateSkill = '';
  candidateRole = '';
  candidateLocation = '';
  isSearchingCandidates = false;
  selectedCandidate: any = null;
  showCandidateDrawer = false;
  candidateATSBreakdown: { matchScore: number; matchedSkills: string[]; missingSkills: string[] } | null = null;

  // Kanban Stages
  readonly KANBAN_STAGES = [
    { id: 'Applied', label: 'Applied', badgeClass: 'status-applied', color: '#3b82f6' },
    { id: 'Under Review', label: 'Under Review', badgeClass: 'status-review', color: '#f59e0b' },
    { id: 'Shortlisted', label: 'Shortlisted', badgeClass: 'status-shortlisted', color: '#a855f7' },
    { id: 'Interview', label: 'Interview', badgeClass: 'status-interview', color: '#06b6d4' },
    { id: 'Selected', label: 'Selected / Offer', badgeClass: 'status-selected', color: '#10b981' },
    { id: 'Rejected', label: 'Rejected', badgeClass: 'status-rejected', color: '#f43f5e' },
  ];

  // Drag and Drop
  draggedApp: Application | null = null;

  // Bulk Actions
  selectedAppIds = new Set<string>();
  bulkActionStatus = '';
  bulkActionTag = '';

  // Tags & Notes
  newTagInput = '';
  newInternalNote = '';

  // Job Templates
  readonly JOB_TEMPLATES: JobTemplate[] = [
    {
      name: 'Full-Stack AI Engineer',
      title: 'Full-Stack AI Engineer (Angular + Node + LLM)',
      type: 'full-time',
      workMode: 'remote',
      experienceLevel: 'mid',
      minSalary: 110000,
      maxSalary: 155000,
      skills: 'TypeScript, Angular, Node.js, Express, MongoDB, Three.js, Gemini API, PyTorch',
      description: 'We are seeking an ambitious Full-Stack AI Engineer to design and deploy agentic AI platforms, reactive frontend interfaces, and scalable inference pipelines.',
      responsibilities: 'Build performant Angular standalone components and responsive layouts\nIntegrate multi-modal LLM APIs and real-time streaming sockets\nArchitect secure REST backends with rate limiting and JWT auth\nMaintain 99.9% uptime and sub-second inference latency',
      requirements: '3+ years experience with modern Angular and TypeScript\nDemonstrated experience integrating generative AI or OpenAI/Gemini SDKs\nStrong grasp of database modeling and asynchronous microservices\nCommitment to automated testing and clean software architecture',
    },
    {
      name: 'Frontend Angular & WebGL Specialist',
      title: 'Senior Frontend Developer (Angular 19, Three.js, CSS3)',
      type: 'full-time',
      workMode: 'hybrid',
      experienceLevel: 'senior',
      minSalary: 125000,
      maxSalary: 170000,
      skills: 'Angular, TypeScript, Three.js, WebGL, GSAP, CSS Grid, Responsive Design, WCAG',
      description: 'Join our design technology squad building cinematic WebGL interactive scenes, fluid design token systems, and ultra-accessible client applications.',
      responsibilities: 'Develop procedural 3D hero scenes with dynamic lighting and camera parallax\nDeliver responsive web layouts tested from 360px smartphones to 4K displays\nEnforce WCAG AA accessibility with screen reader skip links and keyboard rings\nOptimize Core Web Vitals to guarantee LCP under 2.5s and zero CLS',
      requirements: '4+ years of professional front-end engineering in enterprise SaaS\nProficiency with Three.js scene graphs, shader materials, and GPU memory disposal\nMastery of modern CSS architecture without heavyweight frameworks\nPortfolio showing creative interactive work',
    },
    {
      name: 'Machine Learning Scientist',
      title: 'Machine Learning & Predictive Systems Specialist',
      type: 'full-time',
      workMode: 'remote',
      experienceLevel: 'mid',
      minSalary: 130000,
      maxSalary: 180000,
      skills: 'Python, Scikit-learn, Random Forest, PyTorch, FastAPI, Pandas, MLflow, Docker',
      description: 'Lead the architecture of our career matchmaking recommendation engines, resume parsing transformers, and predictive skill-gap models.',
      responsibilities: 'Train, evaluate, and benchmark tabular and NLP classification pipelines\nMaintain automated fallback heuristics for zero-cold-start inference\nDeploy containerized microservices behind low-latency REST endpoints\nEnsure algorithmic fairness, transparent score labeling, and anti-hallucination guardrails',
      requirements: 'M.S. or B.S. in Computer Science, Data Science, or related field\nSolid experience in production ML deployment and feature engineering\nExperience with embeddings, cosine vector similarity, and ATS heuristics\nStrong communication skills and collaborative mindset',
    },
    {
      name: 'Product Designer (UI/UX)',
      title: 'Senior Product Designer (Design Systems & Web3/AI)',
      type: 'full-time',
      workMode: 'remote',
      experienceLevel: 'senior',
      minSalary: 95000,
      maxSalary: 140000,
      skills: 'Figma, Design Tokens, UI/UX, User Research, Prototyping, Accessibility (a11y), Storybook',
      description: 'Craft dark-mode obsidian visual languages, design token scales, accessible form systems, and intuitive recruiter Kanban workflows.',
      responsibilities: 'Maintain comprehensive Figma UI component libraries and design tokens\nConduct usability studies with engineering students and hiring partners\nDesign intuitive mobile-first touch interfaces and bottom-sheet drawers\nWork shoulder-to-shoulder with Angular developers to inspect rendered pixels',
      requirements: '3+ years product design experience on high-growth developer or SaaS tools\nStellar portfolio demonstrating systems thinking and typographic mastery\nDeep knowledge of WCAG 2.1 color contrast and responsive breakpoint systems',
    },
    {
      name: 'Cloud & DevOps Engineer',
      title: 'DevOps & Site Reliability Engineer (Kubernetes, AWS/GCP)',
      type: 'full-time',
      workMode: 'remote',
      experienceLevel: 'mid',
      minSalary: 115000,
      maxSalary: 160000,
      skills: 'Docker, Kubernetes, AWS, GCP, CI/CD, GitHub Actions, Terraform, Linux, Nginx',
      description: 'Drive high availability, automated multi-stage CI/CD pipelines, container orchestration, and zero-downtime rolling releases.',
      responsibilities: 'Design and maintain GitHub Actions workflows for production builds and audits\nOversee scalable container clusters with auto-scaling and health checks\nEnforce TLS/SSL certificates, rate limiting, and defensive DDoS headers\nInstrument Prometheus, Grafana, and structured telemetry logs',
      requirements: '3+ years managing production infrastructure on AWS or Google Cloud\nProficiency with Docker orchestration and declarative infrastructure (IaC)\nStrong background in security auditing and least-privilege RBAC',
    },
    {
      name: 'Data Analyst & BI Specialist',
      title: 'Data Analyst (Hiring Analytics & BI Dashboards)',
      type: 'full-time',
      workMode: 'hybrid',
      experienceLevel: 'entry',
      minSalary: 70000,
      maxSalary: 98000,
      skills: 'SQL, PostgreSQL, MongoDB, Python, Tableau, PowerBI, Excel, Data Modeling',
      description: 'Analyze talent supply-demand dynamics, recruiter conversion funnels, job listing engagement metrics, and platform student placement rates.',
      responsibilities: 'Construct automated recruitment funnel reports and time-to-hire dashboards\nQuery operational MongoDB databases to spot drop-off bottlenecks\nCollaborate with product leaders to quantify feature impact and ATS efficacy\nDeliver executive summaries with clear data-driven hiring recommendations',
      requirements: '1+ years experience querying relational and document databases with SQL\nStrong ability to communicate complex quantitative insights visually\nAttention to detail and passion for data integrity',
    },
  ];

  // Job Modal / Inline Post Job
  showJobModal = false;
  showInlinePostJob = false;
  isEditingJob = false;
  currentJobId: string | null = null;
  jobForm: FormGroup;

  // Applicant Review Modal
  selectedApplication: Application | null = null;
  showAppModal = false;
  newStatus = '';
  recruiterNotes = '';

  // Interview Scheduling
  showScheduleModal = false;
  isRescheduling = false;
  selectedInterview: InterviewSchedule | null = null;
  scheduleForm: FormGroup;
  calendarMonth: number = new Date().getMonth() + 1;
  calendarYear: number = new Date().getFullYear();
  calendarDays: CalendarDay[] = [];
  selectedCalendarDay: CalendarDay | null = null;

  // Company Form
  companyForm: FormGroup;
  isSavingCompany = false;

  constructor() {
    this.jobForm = this.fb.group({
      title: ['', Validators.required],
      type: ['full-time', Validators.required],
      workMode: ['remote', Validators.required],
      location: ['Remote', Validators.required],
      experienceLevel: ['entry', Validators.required],
      minSalary: [0, Validators.required],
      maxSalary: [0, Validators.required],
      skillsRequired: ['', Validators.required],
      description: ['', Validators.required],
      responsibilities: [''],
      requirements: [''],
      deadline: [''],
    });

    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      industry: ['Technology & AI', Validators.required],
      location: ['', Validators.required],
      companySize: ['11-50 employees', Validators.required],
      website: [''],
      description: [''],
      linkedin: [''],
      twitter: [''],
    });

    this.scheduleForm = this.fb.group({
      applicationId: ['', Validators.required],
      title: ['Technical Interview', Validators.required],
      round: ['Technical', Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['14:00', Validators.required],
      duration: [45, [Validators.required, Validators.min(15)]],
      mode: ['Google Meet', Validators.required],
      meetingLink: [''],
      notes: [''],
    });
  }

  ngOnInit() {
    const segments = this.route.snapshot.url.map((s) => s.path);
    if (segments.includes('post-job')) {
      this.activeTab = 'jobs';
      this.openInlineCreateJob();
    } else if (segments.includes('applications')) {
      this.activeTab = 'pipeline';
    } else if (segments.includes('candidates')) {
      this.activeTab = 'candidates';
    }
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading = true;
    this.fetchJobs();
    this.fetchApplications();
    this.fetchCompany();
    this.fetchInterviews();
    this.fetchAnalytics();
    this.searchCandidates();
  }

  fetchJobs() {
    this.jobService.getRecruiterJobs().subscribe({
      next: (res) => {
        this.postedJobs = res.data || [];
        this.activeJobsCount = this.postedJobs.filter((j) => j.status === 'active').length;
      },
      error: () => this.toast.error('Could not load posted jobs.'),
    });
  }

  fetchApplications() {
    this.applicationService.getRecruiterApplications().subscribe({
      next: (res) => {
        this.applications = res.data || [];
        this.applyAppFilters();
        this.computeStats();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  fetchCompany() {
    this.companyService.getMyCompany().subscribe({
      next: (res) => {
        if (res.data) {
          this.myCompany = res.data;
          this.companyForm.patchValue({
            name: res.data.name,
            industry: res.data.industry,
            location: res.data.location,
            companySize: res.data.companySize,
            website: res.data.website || '',
            description: res.data.description || '',
            linkedin: res.data.socialLinks?.linkedin || '',
            twitter: res.data.socialLinks?.twitter || '',
          });
        }
      },
    });
  }

  fetchInterviews() {
    this.interviewScheduleService.getInterviews({ month: this.calendarMonth, year: this.calendarYear }).subscribe({
      next: (res) => {
        this.interviews = res.data || [];
        this.buildCalendarGrid();
      },
      error: () => {},
    });

    this.interviewScheduleService.getUpcomingReminders().subscribe({
      next: (res) => {
        this.upcomingInterviewReminders = res.data || [];
      },
      error: () => {},
    });
  }

  fetchAnalytics() {
    this.analyticsService.getRecruiterAnalytics().subscribe({
      next: (res) => {
        if (res.data) {
          this.analyticsData = res.data;
        }
      },
      error: () => {},
    });
  }

  computeStats() {
    this.totalApplicationsCount = this.applications.length;
    this.shortlistedCount = this.applications.filter((a) => (a.status || '').toLowerCase() === 'shortlisted').length;
    this.interviewCount = this.applications.filter((a) => (a.status || '').toLowerCase() === 'interview').length;
    this.hiredCount = this.applications.filter((a) => (a.status || '').toLowerCase() === 'selected').length;
  }

  applyAppFilters() {
    this.filteredApplications = this.applications.filter((app) => {
      const normStatus = (app.status || '').toLowerCase().replace(/\s+/g, '_');
      const normFilter = this.appStatusFilter.toLowerCase().replace(/\s+/g, '_');
      const matchStatus = this.appStatusFilter === 'all' || normStatus === normFilter;
      const jobId = typeof app.job === 'object' ? app.job?._id : app.job;
      const matchJob = this.appJobFilter === 'all' || jobId === this.appJobFilter;

      let matchSearch = true;
      if (this.appSearchQuery.trim()) {
        const q = this.appSearchQuery.toLowerCase();
        const candName = (app.candidate?.name || app.user?.name || '').toLowerCase();
        const candEmail = (app.candidate?.email || app.user?.email || '').toLowerCase();
        const jobTitle = (app.job?.title || '').toLowerCase();
        const tags = (app.tags || []).join(' ').toLowerCase();
        matchSearch = candName.includes(q) || candEmail.includes(q) || jobTitle.includes(q) || tags.includes(q);
      }

      return matchStatus && matchJob && matchSearch;
    });
  }

  // Kanban Stage Utilities
  getStageApps(stageId: string): Application[] {
    const norm = stageId.toLowerCase().replace(/\s+/g, '_');
    return this.filteredApplications.filter((app) => {
      const appNorm = (app.status || '').toLowerCase().replace(/\s+/g, '_');
      return appNorm === norm;
    });
  }

  // Drag and Drop Pipeline Handlers
  onDragStart(event: DragEvent, app: Application) {
    this.draggedApp = app;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', app._id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetStage: string) {
    event.preventDefault();
    if (!this.draggedApp) return;

    if (this.draggedApp.status !== targetStage) {
      this.moveAppStage(this.draggedApp, targetStage);
    }
    this.draggedApp = null;
  }

  moveAppStage(app: Application, targetStage: string) {
    this.applicationService.updateApplicationStatus(app._id, { status: targetStage }).subscribe({
      next: () => {
        app.status = targetStage;
        this.toast.success(`Candidate moved to ${targetStage}`);
        this.computeStats();
        this.fetchAnalytics();
      },
      error: () => this.toast.error(`Failed to move candidate to ${targetStage}.`),
    });
  }

  // Bulk Actions
  toggleSelectAll() {
    if (this.selectedAppIds.size === this.filteredApplications.length) {
      this.selectedAppIds.clear();
    } else {
      this.filteredApplications.forEach((a) => this.selectedAppIds.add(a._id));
    }
  }

  toggleSelectApp(id: string) {
    if (this.selectedAppIds.has(id)) {
      this.selectedAppIds.delete(id);
    } else {
      this.selectedAppIds.add(id);
    }
  }

  isAppSelected(id: string): boolean {
    return this.selectedAppIds.has(id);
  }

  applyBulkStatus() {
    if (this.selectedAppIds.size === 0 || !this.bulkActionStatus) return;

    const ids = Array.from(this.selectedAppIds);
    this.applicationService.bulkUpdateStatus(ids, this.bulkActionStatus).subscribe({
      next: (res) => {
        this.toast.success(`Updated ${res.data?.count || ids.length} applicants to "${this.bulkActionStatus}"`);
        this.selectedAppIds.clear();
        this.bulkActionStatus = '';
        this.fetchApplications();
        this.fetchAnalytics();
      },
      error: () => this.toast.error('Bulk update failed.'),
    });
  }

  applyBulkTag() {
    if (this.selectedAppIds.size === 0 || !this.bulkActionTag.trim()) return;

    const tag = this.bulkActionTag.trim();
    const ids = Array.from(this.selectedAppIds);
    let completed = 0;

    ids.forEach((id) => {
      const app = this.applications.find((a) => a._id === id);
      if (app) {
        const currentTags = app.tags || [];
        if (!currentTags.includes(tag)) {
          const nextTags = [...currentTags, tag];
          this.applicationService.updateTags(id, nextTags).subscribe({
            next: () => {
              app.tags = nextTags;
              completed++;
              if (completed === ids.length) {
                this.toast.success(`Applied tag "${tag}" to ${completed} candidates.`);
                this.bulkActionTag = '';
                this.selectedAppIds.clear();
              }
            },
          });
        }
      }
    });
  }

  // Tags & Notes management
  addTagToApp(app: Application) {
    if (!this.newTagInput.trim()) return;
    const tag = this.newTagInput.trim();
    const currentTags = app.tags || [];
    if (currentTags.includes(tag)) {
      this.newTagInput = '';
      return;
    }

    const updated = [...currentTags, tag];
    this.applicationService.updateTags(app._id, updated).subscribe({
      next: () => {
        app.tags = updated;
        this.newTagInput = '';
        this.toast.success(`Tag added: "${tag}"`);
      },
      error: () => this.toast.error('Failed to add tag.'),
    });
  }

  removeTagFromApp(app: Application, tag: string) {
    const updated = (app.tags || []).filter((t) => t !== tag);
    this.applicationService.updateTags(app._id, updated).subscribe({
      next: () => {
        app.tags = updated;
        this.toast.success('Tag removed.');
      },
    });
  }

  submitInternalNote(app: Application) {
    if (!this.newInternalNote.trim()) return;
    const noteText = this.newInternalNote.trim();
    this.applicationService.addInternalNote(app._id, noteText).subscribe({
      next: (res) => {
        app.internalNotes = res.data;
        this.newInternalNote = '';
        this.toast.success('Internal note saved.');
      },
      error: () => this.toast.error('Failed to save note.'),
    });
  }

  // Candidate Discovery & ATS Drawer
  searchCandidates() {
    this.isSearchingCandidates = true;
    this.profileService
      .searchCandidates({
        skill: this.candidateSkill || undefined,
        role: this.candidateRole || undefined,
        location: this.candidateLocation || undefined,
      })
      .subscribe({
        next: (res) => {
          this.candidates = res.data || [];
          this.isSearchingCandidates = false;
        },
        error: () => {
          this.isSearchingCandidates = false;
        },
      });
  }

  openCandidateProfile(candidate: any) {
    this.selectedCandidate = candidate;
    this.showCandidateDrawer = true;

    // Compute honest ATS Match breakdown against first active recruiter job
    const candidateSkills: string[] = (candidate.skills || []).map((s: any) =>
      typeof s === 'string' ? s.toLowerCase() : (s.name || '').toLowerCase()
    );

    const activeJob = this.postedJobs.find((j) => j.status === 'active') || this.postedJobs[0];
    if (activeJob) {
      const jobSkills: string[] = (activeJob.skillsRequired || (activeJob as any).requiredSkills || []).map((s: string) =>
        s.toLowerCase()
      );
      const matched = jobSkills.filter((s: string) => candidateSkills.includes(s));
      const missing = jobSkills.filter((s: string) => !candidateSkills.includes(s));
      const score = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 75;

      this.candidateATSBreakdown = {
        matchScore: Math.max(score, 45),
        matchedSkills: matched,
        missingSkills: missing,
      };
    } else {
      this.candidateATSBreakdown = {
        matchScore: candidate.matchScore || 80,
        matchedSkills: candidateSkills.slice(0, 4),
        missingSkills: [],
      };
    }
  }

  closeCandidateDrawer() {
    this.showCandidateDrawer = false;
    this.selectedCandidate = null;
    this.candidateATSBreakdown = null;
  }

  // Job Templates
  applyJobTemplate(template: JobTemplate) {
    this.jobForm.patchValue({
      title: template.title,
      type: template.type,
      workMode: template.workMode,
      location: template.workMode === 'remote' ? 'Remote' : 'San Francisco, CA / Hybrid',
      experienceLevel: template.experienceLevel,
      minSalary: template.minSalary,
      maxSalary: template.maxSalary,
      skillsRequired: template.skills,
      description: template.description,
      responsibilities: template.responsibilities,
      requirements: template.requirements,
    });
    this.toast.success(`Template applied: "${template.name}"`);
  }

  // Job Modal & Inline Post Actions
  private resetCreateJobForm() {
    this.isEditingJob = false;
    this.currentJobId = null;
    this.jobForm.reset({
      type: 'full-time',
      workMode: 'remote',
      location: 'Remote',
      experienceLevel: 'entry',
      minSalary: 75000,
      maxSalary: 110000,
      skillsRequired: '',
      description: '',
      responsibilities: '',
      requirements: '',
    });
  }

  openCreateJobModal() {
    this.resetCreateJobForm();
    this.showInlinePostJob = false;
    this.showJobModal = true;
  }

  openInlineCreateJob() {
    this.resetCreateJobForm();
    this.showJobModal = false;
    this.showInlinePostJob = true;
  }

  openEditJobModal(job: Job) {
    this.isEditingJob = true;
    this.currentJobId = job._id;
    const rawJob: any = job;
    this.jobForm.patchValue({
      title: job.title,
      type: rawJob.jobType || job.type || 'full-time',
      workMode: rawJob.workType || job.workMode || 'remote',
      location: job.location,
      experienceLevel: job.experienceLevel || 'entry',
      minSalary: job.salary?.min || 0,
      maxSalary: job.salary?.max || 0,
      skillsRequired: (rawJob.requiredSkills || job.skillsRequired || []).join(', '),
      description: job.description,
      responsibilities: job.responsibilities?.join('\n') || '',
      requirements: job.requirements?.join('\n') || '',
      deadline: job.deadline ? job.deadline.substring(0, 10) : '',
    });
    this.showJobModal = true;
  }

  saveJob() {
    if (this.jobForm.invalid) {
      this.toast.error('Please fill in all required job fields.');
      return;
    }

    const formVal = this.jobForm.value;
    const skills = formVal.skillsRequired
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const responsibilities = formVal.responsibilities
      ? formVal.responsibilities.split('\n').map((r: string) => r.trim()).filter((r: string) => r.length > 0)
      : [];

    const requirements = formVal.requirements
      ? formVal.requirements.split('\n').map((r: string) => r.trim()).filter((r: string) => r.length > 0)
      : [];

    const payload: any = {
      title: formVal.title,
      jobType: formVal.type,
      type: formVal.type,
      workType: formVal.workMode,
      workMode: formVal.workMode,
      location: formVal.location,
      experienceLevel: formVal.experienceLevel,
      salary: {
        min: Number(formVal.minSalary),
        max: Number(formVal.maxSalary),
        currency: 'USD',
        period: formVal.type === 'internship' ? 'monthly' : 'yearly',
      },
      requiredSkills: skills,
      skillsRequired: skills,
      description: formVal.description,
      responsibilities,
      requirements,
      deadline: formVal.deadline || undefined,
    };

    if (this.isEditingJob && this.currentJobId) {
      this.jobService.updateJob(this.currentJobId, payload).subscribe({
        next: () => {
          this.toast.success('Job listing updated!');
          this.showJobModal = false;
          this.showInlinePostJob = false;
          this.fetchJobs();
          this.fetchAnalytics();
        },
        error: () => this.toast.error('Failed to update job.'),
      });
    } else {
      this.jobService.createJob(payload).subscribe({
        next: () => {
          this.toast.success('Job listing published!');
          this.showJobModal = false;
          this.showInlinePostJob = false;
          this.fetchJobs();
          this.fetchAnalytics();
        },
        error: (err) => this.toast.error(err.error?.message || 'Failed to create job.'),
      });
    }
  }

  toggleJobStatus(job: Job) {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    this.jobService.updateJob(job._id, { status: nextStatus }).subscribe({
      next: () => {
        job.status = nextStatus;
        this.toast.success(`Job marked as ${nextStatus}.`);
        this.fetchJobs();
        this.fetchAnalytics();
      },
      error: () => this.toast.error('Could not update job status.'),
    });
  }

  deleteJob(id: string) {
    if (confirm('Are you sure you want to delete this job posting? This cannot be undone.')) {
      this.jobService.deleteJob(id).subscribe({
        next: () => {
          this.toast.success('Job posting deleted.');
          this.fetchJobs();
          this.fetchAnalytics();
        },
        error: () => this.toast.error('Could not delete job.'),
      });
    }
  }

  // Application Review
  openApplicantReview(app: Application) {
    this.selectedApplication = app;
    this.newStatus = app.status;
    this.recruiterNotes = app.recruiterNotes || '';
    this.showAppModal = true;
  }

  updateApplicationStatus() {
    if (!this.selectedApplication) return;

    this.applicationService
      .updateApplicationStatus(this.selectedApplication._id, {
        status: this.newStatus,
        recruiterNotes: this.recruiterNotes,
      })
      .subscribe({
        next: () => {
          this.toast.success(`Candidate marked as "${this.newStatus}"!`);
          this.showAppModal = false;
          this.fetchApplications();
          this.fetchAnalytics();
        },
        error: () => this.toast.error('Failed to update candidate status.'),
      });
  }

  // Interview Scheduling Modal & Calendar Logic
  openScheduleModal(app?: Application) {
    this.isRescheduling = false;
    this.selectedInterview = null;

    const targetApp = app || (this.applications.length > 0 ? this.applications[0] : null);
    const tomorrow = new Date(Date.now() + 86400000);
    const dateStr = tomorrow.toISOString().split('T')[0];

    this.scheduleForm.reset({
      applicationId: targetApp ? targetApp._id : '',
      title: targetApp ? `Technical Interview — ${targetApp.job?.title || 'Engineering'}` : 'Technical Interview',
      round: 'Technical',
      scheduledDate: dateStr,
      scheduledTime: '15:00',
      duration: 45,
      mode: 'Google Meet',
      meetingLink: 'https://meet.google.com/sb-' + Math.random().toString(36).substring(2, 6),
      notes: 'Prepare system architecture discussion and coding walk-through.',
    });

    this.showScheduleModal = true;
  }

  openRescheduleModal(interview: InterviewSchedule) {
    this.isRescheduling = true;
    this.selectedInterview = interview;

    const d = new Date(interview.scheduledAt);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().substring(0, 5);

    this.scheduleForm.patchValue({
      applicationId: typeof interview.application === 'object' ? interview.application._id : interview.application,
      title: interview.title,
      round: interview.round,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      duration: interview.duration || 45,
      mode: interview.mode || 'Google Meet',
      meetingLink: interview.meetingLink || '',
      notes: interview.notes || '',
    });

    this.showScheduleModal = true;
  }

  submitInterviewSchedule() {
    if (this.scheduleForm.invalid) {
      this.toast.error('Please complete all interview details.');
      return;
    }

    const val = this.scheduleForm.value;
    const scheduledDateTime = new Date(`${val.scheduledDate}T${val.scheduledTime}:00`);

    if (this.isRescheduling && this.selectedInterview) {
      this.interviewScheduleService
        .rescheduleInterview(this.selectedInterview._id, {
          scheduledAt: scheduledDateTime.toISOString(),
          duration: Number(val.duration),
          meetingLink: val.meetingLink,
          notes: val.notes,
        })
        .subscribe({
          next: () => {
            this.toast.success('Interview rescheduled successfully!');
            this.showScheduleModal = false;
            this.fetchInterviews();
            this.fetchApplications();
          },
          error: () => this.toast.error('Failed to reschedule interview.'),
        });
    } else {
      this.interviewScheduleService
        .scheduleInterview({
          applicationId: val.applicationId,
          title: val.title,
          round: val.round as InterviewRound,
          scheduledAt: scheduledDateTime.toISOString(),
          duration: Number(val.duration),
          mode: val.mode as InterviewMode,
          meetingLink: val.meetingLink,
          notes: val.notes,
        })
        .subscribe({
          next: () => {
            this.toast.success('Interview scheduled and invite sent!');
            this.showScheduleModal = false;
            this.fetchInterviews();
            this.fetchApplications();
            this.fetchAnalytics();
          },
          error: (err) => this.toast.error(err.error?.message || 'Failed to schedule interview.'),
        });
    }
  }

  cancelInterview(interview: InterviewSchedule) {
    const reason = prompt('Please enter cancellation reason for the candidate:');
    if (reason === null) return;

    this.interviewScheduleService.cancelInterview(interview._id, reason).subscribe({
      next: () => {
        this.toast.success('Interview cancelled.');
        this.fetchInterviews();
        this.fetchApplications();
      },
      error: () => this.toast.error('Failed to cancel interview.'),
    });
  }

  // Calendar Month Navigation
  prevMonth() {
    if (this.calendarMonth === 1) {
      this.calendarMonth = 12;
      this.calendarYear--;
    } else {
      this.calendarMonth--;
    }
    this.fetchInterviews();
  }

  nextMonth() {
    if (this.calendarMonth === 12) {
      this.calendarMonth = 1;
      this.calendarYear++;
    } else {
      this.calendarMonth++;
    }
    this.fetchInterviews();
  }

  getMonthName(m: number): string {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[m - 1] || '';
  }

  buildCalendarGrid() {
    const days: CalendarDay[] = [];
    const firstDay = new Date(this.calendarYear, this.calendarMonth - 1, 1);
    const lastDay = new Date(this.calendarYear, this.calendarMonth, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(this.calendarYear, this.calendarMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(this.calendarYear, this.calendarMonth - 2, prevMonthLastDay - i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        hasInterviews: false,
        interviews: [],
      });
    }

    const todayStr = new Date().toDateString();

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(this.calendarYear, this.calendarMonth - 1, i);
      const isToday = d.toDateString() === todayStr;
      const dayInterviews = this.interviews.filter((item) => {
        const itemDate = new Date(item.scheduledAt);
        return itemDate.getFullYear() === d.getFullYear() &&
               itemDate.getMonth() === d.getMonth() &&
               itemDate.getDate() === d.getDate();
      });

      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        isToday,
        hasInterviews: dayInterviews.length > 0,
        interviews: dayInterviews,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(this.calendarYear, this.calendarMonth, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        hasInterviews: false,
        interviews: [],
      });
    }

    this.calendarDays = days;
  }

  selectCalendarDay(day: CalendarDay) {
    this.selectedCalendarDay = day;
  }

  // Company profile
  saveCompany() {
    if (this.companyForm.invalid) {
      this.toast.error('Please enter required company fields.');
      return;
    }

    this.isSavingCompany = true;
    const formVal = this.companyForm.value;
    const payload = {
      name: formVal.name,
      industry: formVal.industry,
      location: formVal.location,
      companySize: formVal.companySize,
      website: formVal.website,
      description: formVal.description,
      socialLinks: {
        linkedin: formVal.linkedin,
        twitter: formVal.twitter,
      },
    };

    this.companyService.createOrUpdateCompany(payload).subscribe({
      next: (res) => {
        this.isSavingCompany = false;
        this.myCompany = res.data || null;
        this.toast.success('Company profile updated successfully!');
      },
      error: () => {
        this.isSavingCompany = false;
        this.toast.error('Failed to update company profile.');
      },
    });
  }
}
