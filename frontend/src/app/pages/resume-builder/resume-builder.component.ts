import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeService } from '../../services/resume.service';
import { ProfileService } from '../../services/profile.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { Resume } from '../../models/resume.model';

export interface QualitySuggestion {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

@Component({
  selector: 'app-resume-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-builder.component.html',
  styleUrls: ['./resume-builder.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeBuilderComponent implements OnInit {
  private resumeService = inject(ResumeService);
  private profileService = inject(ProfileService);
  private jobService = inject(JobService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  userResumes: Resume[] = [];
  activeResume: Partial<Resume> = {
    title: 'Software Developer Resume',
    templateId: 'modern',
    personalDetails: { fullName: '', email: '', phone: '', location: '', github: '', linkedin: '', portfolio: '' },
    summary: '',
    education: [],
    skills: [],
    experience: [],
    projects: [],
  };

  selectedTemplate: 'modern' | 'executive' | 'tech' | 'minimal' = 'modern';
  skillsInput = '';
  isSaving = false;
  isParsingPdf = false;
  isTailoring = false;
  showTailorModal = false;
  availableJobs: any[] = [];
  selectedJobId = '';
  tailoredResult: any = null;

  // New item draft states
  newEdu = { degree: '', institution: '', graduationYear: new Date().getFullYear(), gpa: '' };
  newExp = { title: '', company: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' };
  newProject = { title: '', description: '', technologies: '', liveUrl: '', githubUrl: '' };

  ngOnInit() {
    this.fetchResumes();
  }

  get qualitySuggestions(): QualitySuggestion[] {
    const summary = (this.activeResume.summary || '').trim();
    const skills = this.getSkillsArray();
    const contact = this.activeResume.personalDetails || { fullName: '', email: '' };
    const hasPhone = !!contact.phone && contact.phone.trim().length > 5;
    const hasEmail = !!contact.email && contact.email.includes('@');
    const hasProjects = (this.activeResume.projects || []).length > 0;
    const hasEducation = (this.activeResume.education || []).length > 0;

    const actionVerbRegex = /\b(developed|built|designed|implemented|optimized|created|led|engineered|integrated|architected|delivered|reduced|improved|managed)\b/i;
    const allText = `${summary} ${(this.activeResume.experience || []).map(e => e.description || '').join(' ')} ${(this.activeResume.projects || []).map(p => p.description || '').join(' ')}`;
    const hasActionVerbs = actionVerbRegex.test(allText);

    return [
      {
        id: 'contact',
        label: 'Direct Contact Details',
        passed: hasEmail && hasPhone,
        hint: hasEmail && hasPhone ? 'Email and phone number provided.' : 'Add both a verified email and phone number for recruiter outreach.',
      },
      {
        id: 'summary',
        label: 'Professional Summary',
        passed: summary.length >= 60,
        hint: summary.length >= 60 ? `Comprehensive summary (${summary.length} chars).` : 'Write a 2-3 sentence summary highlighting your core tech stack and goals.',
      },
      {
        id: 'skills',
        label: 'Key Technical Skills',
        passed: skills.length >= 5,
        hint: skills.length >= 5 ? `${skills.length} skills indexed.` : 'Include at least 5 relevant technical skills to pass ATS keyword scans.',
      },
      {
        id: 'projects',
        label: 'Projects / Experience Proof',
        passed: hasProjects || (this.activeResume.experience || []).length > 0,
        hint: (hasProjects || (this.activeResume.experience || []).length > 0) ? 'Hands-on project or work experience documented.' : 'List at least one tangible project with tech stack or experience role.',
      },
      {
        id: 'education',
        label: 'Education Record',
        passed: hasEducation,
        hint: hasEducation ? 'Academic credentials provided.' : 'Add your degree and university/institution credentials.',
      },
      {
        id: 'action-verbs',
        label: 'Action-Driven Language',
        passed: hasActionVerbs,
        hint: hasActionVerbs ? 'Strong action verbs detected (built, optimized, designed, etc.).' : 'Use strong action verbs like "engineered", "built", "optimized", "implemented".',
      },
    ];
  }

  get qualityScore(): number {
    const suggestions = this.qualitySuggestions;
    const passed = suggestions.filter(s => s.passed).length;
    return Math.round((passed / suggestions.length) * 100);
  }

  fetchResumes() {
    this.resumeService.getMyResumes().subscribe({
      next: (res) => {
        this.userResumes = res.data || [];
        if (this.userResumes.length > 0) {
          // If active resume is not in list, load the first one or primary
          const primary = this.userResumes.find(r => r.isPrimary) || this.userResumes[0];
          this.loadResume(primary);
        } else {
          this.populateFromProfile();
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  populateFromProfile() {
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data) {
          const p = res.data;
          this.activeResume = {
            title: `${p.preferredRole || 'Developer'} Resume`,
            templateId: 'modern',
            personalDetails: {
              fullName: p.user?.name || '',
              email: p.user?.email || '',
              phone: p.phone || '',
              location: p.location || '',
              github: p.github || '',
              linkedin: p.linkedin || '',
              portfolio: p.portfolio || '',
            },
            summary: p.about || '',
            education: p.education || [],
            skills: (p.skills || []).map((s) => ({ name: s.name, category: s.category })),
            experience: p.experience || [],
            projects: p.projects || [],
          };
          this.skillsInput = (this.activeResume.skills || []).map((s) => s.name).join(', ');
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  loadResume(resume: Resume) {
    this.activeResume = JSON.parse(JSON.stringify(resume));
    this.selectedTemplate = resume.templateId || 'modern';
    this.skillsInput = (this.activeResume.skills || []).map((s) => s.name).join(', ');
    this.cdr.markForCheck();
  }

  getSkillsArray(): string[] {
    if (!this.skillsInput) return [];
    return this.skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  saveResume() {
    this.isSaving = true;

    const skills = this.getSkillsArray();
    this.activeResume.skills = skills.map((name) => ({
      name,
      category: 'General',
    }));

    this.activeResume.templateId = this.selectedTemplate;

    if (this.activeResume._id) {
      this.resumeService.updateResume(this.activeResume._id, this.activeResume).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toast.success('Resume updated successfully!');
          this.fetchResumes();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.toast.error('Failed to update resume.');
          this.cdr.markForCheck();
        },
      });
    } else {
      this.resumeService.createResume(this.activeResume).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.toast.success('New resume saved!');
          this.fetchResumes();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.toast.error('Failed to create resume.');
          this.cdr.markForCheck();
        },
      });
    }
  }

  markPrimary(resume: Partial<Resume>) {
    if (!resume._id) return;
    this.resumeService.updateResume(resume._id, { isPrimary: true }).subscribe({
      next: () => {
        this.toast.success(`Marked "${resume.title}" as primary resume.`);
        this.fetchResumes();
      },
      error: () => this.toast.error('Could not set primary resume.'),
    });
  }

  duplicateResume(resume: Partial<Resume>) {
    const copy: Partial<Resume> = {
      title: `${resume.title || 'Resume'} (Copy)`,
      templateId: resume.templateId || 'modern',
      personalDetails: {
        fullName: resume.personalDetails?.fullName || '',
        email: resume.personalDetails?.email || '',
        ...resume.personalDetails,
      },
      summary: resume.summary || '',
      education: [...(resume.education || [])],
      experience: [...(resume.experience || [])],
      skills: [...(resume.skills || [])],
      projects: [...(resume.projects || [])],
      certifications: [...(resume.certifications || [])],
      achievements: [...(resume.achievements || [])],
      isPrimary: false,
    };
    this.resumeService.createResume(copy).subscribe({
      next: (res) => {
        this.toast.success('Resume duplicated!');
        this.fetchResumes();
        if (res.data) this.loadResume(res.data);
      },
      error: () => this.toast.error('Could not duplicate resume.'),
    });
  }

  deleteResume(resume: Partial<Resume>) {
    if (!resume._id) return;
    if (confirm(`Are you sure you want to delete "${resume.title}"?`)) {
      this.resumeService.deleteResume(resume._id).subscribe({
        next: () => {
          this.toast.success('Resume deleted.');
          this.fetchResumes();
        },
        error: () => this.toast.error('Could not delete resume.'),
      });
    }
  }

  printResume() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  createNewBlank() {
    this.activeResume = {
      title: `Resume ${this.userResumes.length + 1}`,
      templateId: this.selectedTemplate,
      personalDetails: { fullName: '', email: '', phone: '', location: '', github: '', linkedin: '', portfolio: '' },
      summary: '',
      education: [],
      skills: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
    };
    this.skillsInput = '';
    this.cdr.markForCheck();
  }

  addEducation() {
    if (!this.newEdu.institution || !this.newEdu.degree) return;
    if (!this.activeResume.education) this.activeResume.education = [];
    this.activeResume.education.push({ ...this.newEdu });
    this.newEdu = { degree: '', institution: '', graduationYear: new Date().getFullYear(), gpa: '' };
    this.cdr.markForCheck();
  }

  removeEducation(idx: number) {
    this.activeResume.education?.splice(idx, 1);
    this.cdr.markForCheck();
  }

  addExperience() {
    if (!this.newExp.title || !this.newExp.company) return;
    if (!this.activeResume.experience) this.activeResume.experience = [];
    this.activeResume.experience.push({ ...this.newExp });
    this.newExp = { title: '', company: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' };
    this.cdr.markForCheck();
  }

  removeExperience(idx: number) {
    this.activeResume.experience?.splice(idx, 1);
    this.cdr.markForCheck();
  }

  addProject() {
    if (!this.newProject.title) return;
    if (!this.activeResume.projects) this.activeResume.projects = [];
    const techArray = this.newProject.technologies ? this.newProject.technologies.split(',').map(t => t.trim()) : [];
    this.activeResume.projects.push({
      title: this.newProject.title,
      description: this.newProject.description,
      technologies: techArray,
      liveUrl: this.newProject.liveUrl,
      githubUrl: this.newProject.githubUrl,
    });
    this.newProject = { title: '', description: '', technologies: '', liveUrl: '', githubUrl: '' };
    this.cdr.markForCheck();
  }

  removeProject(idx: number) {
    this.activeResume.projects?.splice(idx, 1);
    this.cdr.markForCheck();
  }

  onPdfUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.toast.error('Please select a valid PDF file.');
      return;
    }

    this.isParsingPdf = true;
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('resume', file);

    this.resumeService.parseUploadedPdf(formData).subscribe({
      next: (res) => {
        this.isParsingPdf = false;
        input.value = '';
        if (res.data) {
          const d = res.data;
          if (d.personalDetails) {
            this.activeResume.personalDetails = {
              ...this.activeResume.personalDetails,
              fullName: d.personalDetails.fullName || this.activeResume.personalDetails?.fullName || '',
              email: d.personalDetails.email || this.activeResume.personalDetails?.email || '',
              phone: d.personalDetails.phone || this.activeResume.personalDetails?.phone || '',
              github: d.personalDetails.github || this.activeResume.personalDetails?.github || '',
              linkedin: d.personalDetails.linkedin || this.activeResume.personalDetails?.linkedin || '',
              portfolio: d.personalDetails.portfolio || this.activeResume.personalDetails?.portfolio || '',
            };
          }
          if (d.summary) {
            this.activeResume.summary = d.summary;
          }
          if (d.skills && d.skills.length > 0) {
            const existingSkills = this.getSkillsArray();
            const merged = Array.from(new Set([...existingSkills, ...d.skills]));
            this.skillsInput = merged.join(', ');
            this.activeResume.skills = merged.map(name => ({ name, category: 'General' }));
          }
          if (d.education && d.education.length > 0) {
            this.activeResume.education = [...(this.activeResume.education || []), ...d.education];
          }
          this.toast.success('Resume parsed and auto-filled from PDF successfully!');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isParsingPdf = false;
        input.value = '';
        this.toast.error(err?.error?.message || 'Failed to parse resume from PDF.');
        this.cdr.markForCheck();
      },
    });
  }

  openTailorModal() {
    this.showTailorModal = true;
    if (this.availableJobs.length === 0) {
      this.jobService.getJobs({ limit: 30 }).subscribe({
        next: (res) => {
          this.availableJobs = res.data || [];
          if (this.availableJobs.length > 0 && !this.selectedJobId) {
            this.selectedJobId = this.availableJobs[0]._id;
          }
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck(),
      });
    }
    this.cdr.markForCheck();
  }

  closeTailorModal() {
    this.showTailorModal = false;
    this.tailoredResult = null;
    this.cdr.markForCheck();
  }

  runTailoring() {
    if (!this.selectedJobId) {
      this.toast.warning('Please select a target job position to tailor against.');
      return;
    }
    this.isTailoring = true;
    this.tailoredResult = null;
    this.cdr.markForCheck();

    const skills = this.getSkillsArray();
    const payload = {
      jobId: this.selectedJobId,
      resumeId: this.activeResume._id,
      resumeData: {
        ...this.activeResume,
        skills: skills.map(name => ({ name, category: 'General' })),
      },
    };

    this.resumeService.tailorToJob(payload).subscribe({
      next: (res) => {
        this.isTailoring = false;
        this.tailoredResult = res.data;
        this.toast.success('Tailoring recommendations ready!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isTailoring = false;
        this.toast.error(err?.error?.message || 'Failed to tailor resume to target job.');
        this.cdr.markForCheck();
      },
    });
  }

  applyTailoredSummary(summary: string) {
    if (!summary) return;
    this.activeResume.summary = summary;
    this.toast.success('Professional summary updated with tailored version!');
    this.cdr.markForCheck();
  }

  applyMissingSkill(skill: string) {
    if (!skill) return;
    const current = this.getSkillsArray();
    if (!current.some(s => s.toLowerCase() === skill.toLowerCase())) {
      current.push(skill);
      this.skillsInput = current.join(', ');
      this.activeResume.skills = current.map(name => ({ name, category: 'General' }));
      this.toast.success(`Added "${skill}" to skills!`);
      this.cdr.markForCheck();
    }
  }

  applyTailoredBullet(bullet: string) {
    if (!bullet) return;
    if (!this.activeResume.experience || this.activeResume.experience.length === 0) {
      if (!this.activeResume.projects || this.activeResume.projects.length === 0) {
        this.activeResume.summary = `${this.activeResume.summary ? this.activeResume.summary + '\n\n' : ''}Achievement: ${bullet}`;
        this.toast.success('Appended achievement bullet to summary!');
      } else {
        const p = this.activeResume.projects[0];
        p.description = p.description ? `${p.description}\n• ${bullet}` : bullet;
        this.toast.success(`Appended tailored bullet to project "${p.title}"!`);
      }
    } else {
      const exp = this.activeResume.experience[0];
      exp.description = exp.description ? `${exp.description}\n• ${bullet}` : bullet;
      this.toast.success(`Appended tailored bullet to "${exp.title}" experience!`);
    }
    this.cdr.markForCheck();
  }
}
