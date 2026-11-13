import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SkillService } from '../../services/skill.service';
import { ProfileService } from '../../services/profile.service';
import { ToastService } from '../../services/toast.service';
import { SkillGapAnalysisResult } from '../../models/skill.model';

@Component({
  selector: 'app-skill-gap',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './skill-gap.component.html',
  styleUrls: ['./skill-gap.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillGapComponent implements OnInit {
  private skillService = inject(SkillService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  targetRoles: { title: string; skillsCount: number; skills: string[] }[] = [];
  selectedRole = 'Full Stack Developer';
  isLoading = true;
  isAnalyzing = false;
  hasError = false;
  errorMessage = '';
  gapAnalysis: SkillGapAnalysisResult | null = null;
  userSkills: string[] = [];

  ngOnInit() {
    this.skillService.getTargetRoles().subscribe({
      next: (res) => {
        this.targetRoles = res.data || [
          { title: 'Full Stack Developer', skillsCount: 9, skills: [] },
          { title: 'Frontend Developer', skillsCount: 9, skills: [] },
          { title: 'Backend Developer', skillsCount: 9, skills: [] },
          { title: 'AI/ML Developer', skillsCount: 8, skills: [] },
          { title: 'Cloud Engineer', skillsCount: 9, skills: [] },
          { title: 'Data Analyst', skillsCount: 8, skills: [] },
        ];
        this.runAnalysis();
        this.cdr.markForCheck();
      },
      error: () => {
        this.targetRoles = [
          { title: 'Full Stack Developer', skillsCount: 9, skills: [] },
          { title: 'Frontend Developer', skillsCount: 9, skills: [] },
          { title: 'Backend Developer', skillsCount: 9, skills: [] },
        ];
        this.runAnalysis();
        this.cdr.markForCheck();
      },
    });

    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data?.skills) {
          this.userSkills = res.data.skills.map((s) => s.name);
          this.cdr.markForCheck();
        }
      },
    });
  }

  selectRole(role: string) {
    if (this.selectedRole === role && this.gapAnalysis) return;
    this.selectedRole = role;
    this.runAnalysis();
  }

  runAnalysis() {
    this.isAnalyzing = true;
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.skillService.analyzeMySkillGap(this.selectedRole).subscribe({
      next: (res) => {
        if (res.data) {
          this.gapAnalysis = res.data;
        } else {
          this.hasError = true;
          this.errorMessage = 'Could not retrieve skill gap data.';
        }
        this.isAnalyzing = false;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isAnalyzing = false;
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = err?.error?.message || 'Error communicating with analysis service.';
        this.cdr.markForCheck();
      },
    });
  }

  getPriorityBadgeClass(priority?: string): string {
    switch (priority) {
      case 'Critical':
        return 'badge-danger';
      case 'Recommended':
        return 'badge-primary';
      default:
        return 'badge-neutral';
    }
  }
}
