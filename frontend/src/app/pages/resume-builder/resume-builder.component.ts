import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeService } from '../../services/resume.service';
import { ProfileService } from '../../services/profile.service';
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
}
