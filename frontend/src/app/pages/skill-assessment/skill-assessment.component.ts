import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssessmentService, Assessment, AssessmentResult } from '../../services/assessment.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-skill-assessment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="assessment-page py-8">
      <div class="container">
        <!-- 1. Catalog & Active Assessment Header -->
        <div *ngIf="!activeAssessment && !activeResult" class="catalog-view">
          <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="badge badge-primary text-xs">SKILL EVALUATION ENGINE</span>
                <span class="badge badge-emerald text-xs">Verified Certification</span>
              </div>
              <h1 class="text-3xl font-extrabold">
                Interactive Skill <span class="text-gradient">Assessments</span>
              </h1>
              <p class="text-secondary text-sm mt-1 max-w-xl">
                Test your practical competencies across 7 computer science and soft skill domains. Real-time timed evaluations with skill breakdown analytics.
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button
                class="btn btn-outline btn-sm"
                (click)="activeView = activeView === 'catalog' ? 'history' : 'catalog'"
              >
                {{ activeView === 'catalog' ? '📜 View Assessment History' : '📚 Available Assessments' }}
              </button>
            </div>
          </div>

          <!-- History View -->
          <div *ngIf="activeView === 'history'" class="mb-10">
            <h2 class="text-xl font-bold mb-4">My Past Assessment Attempts</h2>
            <div *ngIf="myHistory.length === 0" class="sb-card p-8 text-center text-secondary text-sm">
              You haven't completed any skill assessments yet. Pick an assessment below to benchmark your skills!
            </div>
            <div *ngIf="myHistory.length > 0" class="grid grid-2 gap-4">
              <div *ngFor="let h of myHistory" class="sb-card p-4 flex items-center justify-between">
                <div>
                  <span class="badge badge-neutral text-xs mb-1">{{ h.category }}</span>
                  <h4 class="font-bold text-base">{{ h.assessmentTitle }}</h4>
                  <div class="text-xs text-muted mt-1">
                    Completed {{ h.completedAt | date:'medium' }} • {{ h.score }}/{{ h.totalQuestions }} questions correct
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black" [class.text-emerald]="h.isPassed" [class.text-amber]="!h.isPassed">
                    {{ h.percentage }}%
                  </div>
                  <span class="badge text-xs" [class.badge-emerald]="h.isPassed" [class.badge-neutral]="!h.isPassed">
                    {{ h.isPassed ? 'Passed' : 'Needs Practice' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Catalog Filter Pills -->
          <div *ngIf="activeView === 'catalog'">
            <div class="flex items-center gap-2 flex-wrap mb-6">
              <button
                *ngFor="let cat of categories"
                class="filter-pill text-xs font-semibold"
                [class.active]="selectedCategory === cat"
                (click)="filterByCategory(cat)"
              >
                {{ cat }}
              </button>
            </div>

            <!-- Assessments Cards Grid -->
            <div *ngIf="isLoading" class="grid grid-3 gap-6">
              <div *ngFor="let i of [1,2,3,4,5,6]" class="sb-card p-6 h-48 skeleton-box"></div>
            </div>

            <div *ngIf="!isLoading" class="grid grid-3 gap-6">
              <div *ngFor="let a of assessments" class="sb-card flex flex-col justify-between hover-card">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="badge badge-primary text-xs">{{ a.category }}</span>
                    <span class="badge text-xs" [class.badge-neutral]="a.difficulty === 'Beginner'" [class.badge-cyan]="a.difficulty === 'Intermediate'" [class.badge-accent]="a.difficulty === 'Advanced'">
                      {{ a.difficulty }}
                    </span>
                  </div>

                  <h3 class="text-lg font-bold mb-2">{{ a.title }}</h3>
                  <p class="text-xs text-secondary mb-4">{{ a.description }}</p>

                  <div class="meta-row flex items-center gap-4 text-xs text-muted mb-4">
                    <span>⏱️ {{ a.durationMinutes }} mins</span>
                    <span>📝 {{ a.questions?.length || a.totalQuestions || 5 }} Questions</span>
                    <span>🎯 {{ a.passingPercentage }}% to pass</span>
                  </div>
                </div>

                <button class="btn btn-primary btn-sm w-full" (click)="startAssessment(a)">
                  Start Assessment 🚀
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Active Quiz Player -->
        <div *ngIf="activeAssessment && !activeResult" class="quiz-player-view max-w-3xl mx-auto">
          <div class="sb-card p-6">
            <!-- Quiz Header & Timer -->
            <div class="flex items-center justify-between border-b border-subtle pb-4 mb-6 flex-wrap gap-3">
              <div>
                <span class="badge badge-primary text-xs">{{ activeAssessment.category }}</span>
                <h2 class="text-xl font-bold mt-1">{{ activeAssessment.title }}</h2>
              </div>
              <div class="flex items-center gap-3">
                <div class="timer-box flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg font-mono text-sm font-bold text-amber">
                  <span>⏱️</span>
                  <span>{{ formatTime(timeRemainingSeconds) }}</span>
                </div>
                <button class="btn btn-outline btn-sm" (click)="cancelAssessment()">Quit</button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-6">
              <div class="flex justify-between text-xs text-muted mb-1">
                <span>Question {{ currentQuestionIndex + 1 }} of {{ currentQuestions.length }}</span>
                <span>{{ answeredCount }} Answered</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" [style.width.%]="((currentQuestionIndex + 1) / currentQuestions.length) * 100"></div>
              </div>
            </div>

            <!-- Current Question Content -->
            <div class="question-container mb-6">
              <span class="badge badge-neutral text-xs mb-2">Skill: {{ currentQuestion.skill }}</span>
              <h3 class="text-lg font-semibold mb-4 leading-relaxed">
                {{ currentQuestion.questionText }}
              </h3>

              <!-- Options -->
              <div class="flex flex-col gap-3">
                <button
                  *ngFor="let opt of currentQuestion.options; let optIdx = index"
                  type="button"
                  class="option-btn text-left p-4 rounded-lg flex items-center justify-between text-sm transition-all"
                  [class.selected]="userAnswers[currentQuestionIndex] === optIdx"
                  (click)="selectOption(optIdx)"
                >
                  <div class="flex items-center gap-3">
                    <span class="option-letter font-bold">{{ getOptionLetter(optIdx) }}.</span>
                    <span>{{ opt }}</span>
                  </div>
                  <span *ngIf="userAnswers[currentQuestionIndex] === optIdx" class="text-primary font-bold">✓</span>
                </button>
              </div>
            </div>

            <!-- Navigation Controls -->
            <div class="flex items-center justify-between pt-4 border-t border-subtle">
              <button
                class="btn btn-outline btn-sm"
                [disabled]="currentQuestionIndex === 0"
                (click)="prevQuestion()"
              >
                ← Previous
              </button>

              <div class="flex items-center gap-2">
                <button
                  *ngIf="currentQuestionIndex < currentQuestions.length - 1"
                  class="btn btn-secondary btn-sm"
                  (click)="nextQuestion()"
                >
                  Next →
                </button>
                <button
                  *ngIf="currentQuestionIndex === currentQuestions.length - 1"
                  class="btn btn-primary btn-sm px-6"
                  (click)="submitQuiz()"
                  [disabled]="isSubmitting"
                >
                  {{ isSubmitting ? 'Evaluating...' : 'Submit Assessment 🏁' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Assessment Result View -->
        <div *ngIf="activeResult" class="result-view max-w-3xl mx-auto">
          <div class="sb-card p-8 mb-6 text-center">
            <div class="text-5xl mb-3">{{ activeResult.isPassed ? '🎉' : '📈' }}</div>
            <h2 class="text-2xl font-black mb-1">
              {{ activeResult.isPassed ? 'Congratulations! Assessment Passed' : 'Assessment Completed' }}
            </h2>
            <p class="text-xs text-secondary mb-6">
              {{ activeResult.isPassed ? 'You have demonstrated verified competency in this subject matter.' : 'Review your incorrect responses and study the explanations below to improve.' }}
            </p>

            <!-- Score Circular / Big Display -->
            <div class="inline-flex items-center justify-center p-6 bg-secondary rounded-2xl mb-6">
              <div class="text-center">
                <div class="text-4xl font-extrabold" [class.text-emerald]="activeResult.isPassed" [class.text-amber]="!activeResult.isPassed">
                  {{ activeResult.percentage }}%
                </div>
                <div class="text-xs text-muted uppercase tracking-wider font-bold mt-1">
                  {{ activeResult.score }} of {{ activeResult.totalQuestions }} Correct
                </div>
              </div>
            </div>

            <!-- Skill Breakdown Grid -->
            <div class="text-left mb-6">
              <h4 class="text-sm font-bold uppercase tracking-wider text-muted mb-3">Competency Breakdown</h4>
              <div class="grid grid-2 gap-3">
                <div *ngFor="let s of activeResult.skillBreakdown" class="p-3 bg-secondary rounded-lg">
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span>{{ s.skill }}</span>
                    <span>{{ s.percentage }}%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill" [style.width.%]="s.percentage"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-center gap-3">
              <button class="btn btn-primary btn-sm" (click)="resetToCatalog()">
                Back to All Assessments
              </button>
              <a routerLink="/student/dashboard" class="btn btn-outline btn-sm">
                View On Dashboard →
              </a>
            </div>
          </div>

          <!-- Question-by-Question Review with Explanations -->
          <div class="sb-card p-6">
            <h3 class="text-lg font-bold mb-4">Detailed Answer Explanations</h3>
            <div class="flex flex-col gap-4">
              <div
                *ngFor="let q of activeResult.questionsWithFeedback; let i = index"
                class="p-4 rounded-lg border"
                [class.border-emerald-500]="q.isCorrect"
                [class.border-rose-500]="!q.isCorrect"
                [class.bg-secondary]="true"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-muted">Question {{ i + 1 }} • {{ q.skill }}</span>
                  <span class="badge text-xs" [class.badge-emerald]="q.isCorrect" [class.badge-danger]="!q.isCorrect">
                    {{ q.isCorrect ? 'Correct ✓' : 'Incorrect ✗' }}
                  </span>
                </div>
                <div class="text-sm font-semibold mb-2">{{ q.questionText }}</div>
                <div class="text-xs text-secondary mb-2">
                  <span class="text-muted">Your Answer:</span>
                  <strong> {{ q.options[q.userSelectedOptionIndex] || 'None' }}</strong>
                </div>
                <div *ngIf="!q.isCorrect" class="text-xs text-emerald mb-2">
                  <span>Correct Answer:</span>
                  <strong> {{ q.options[q.correctOptionIndex] }}</strong>
                </div>
                <div class="p-2 bg-tertiary rounded text-xs text-secondary mt-2">
                  💡 <strong>Explanation:</strong> {{ q.explanation }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .assessment-page { min-height: 85vh; }
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
    .hover-card {
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .hover-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-active);
    }
    .option-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      cursor: pointer;
    }
    .option-btn:hover {
      border-color: var(--border-active);
      background: var(--bg-tertiary);
    }
    .option-btn.selected {
      border-color: var(--primary-500);
      background: rgba(99, 102, 241, 0.15);
    }
    .option-letter {
      color: var(--primary-400);
      width: 20px;
    }
    .border-emerald-500 { border-color: rgba(16, 185, 129, 0.4); }
    .border-rose-500 { border-color: rgba(244, 63, 94, 0.4); }
    .text-emerald { color: var(--accent-emerald); }
  `]
})
export class SkillAssessmentComponent implements OnInit, OnDestroy {
  private assessmentService = inject(AssessmentService);
  private toast = inject(ToastService);

  activeView: 'catalog' | 'history' = 'catalog';
  isLoading = true;
  isSubmitting = false;

  assessments: Assessment[] = [];
  myHistory: any[] = [];
  categories = [
    'All',
    'Programming',
    'Web Development',
    'Database Management',
    'Data Structures',
    'Computer Science Fundamentals',
    'Problem Solving',
    'Communication Skills'
  ];
  selectedCategory = 'All';

  // Active Quiz State
  activeAssessment: Assessment | null = null;
  currentQuestions: any[] = [];
  currentQuestionIndex = 0;
  userAnswers: { [qIdx: number]: number } = {};
  timeRemainingSeconds = 900;
  timerInterval: any = null;
  activeResult: AssessmentResult | null = null;

  ngOnInit() {
    this.loadAssessments();
    this.loadHistory();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadAssessments() {
    this.isLoading = true;
    const filter = this.selectedCategory === 'All' ? {} : { category: this.selectedCategory };
    this.assessmentService.getAssessments(filter).subscribe({
      next: (res) => {
        this.assessments = res.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadHistory() {
    this.assessmentService.getMyAssessmentHistory().subscribe({
      next: (res) => {
        this.myHistory = res.data || [];
      }
    });
  }

  filterByCategory(cat: string) {
    this.selectedCategory = cat;
    this.loadAssessments();
  }

  startAssessment(a: Assessment) {
    this.assessmentService.getAssessmentById(a._id).subscribe({
      next: (res) => {
        this.activeAssessment = res.data;
        this.currentQuestions = res.data.questions || [];
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.activeResult = null;
        this.timeRemainingSeconds = (this.activeAssessment.durationMinutes || 15) * 60;
        this.startTimer();
      },
      error: (err) => {
        this.toast.error('Failed to load assessment questions: ' + err.message);
      }
    });
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.timeRemainingSeconds > 0) {
        this.timeRemainingSeconds--;
      } else {
        this.stopTimer();
        this.toast.warning('Time has expired! Submitting assessment automatically.');
        this.submitQuiz();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(totalSecs: number): string {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  get currentQuestion(): any {
    return this.currentQuestions[this.currentQuestionIndex] || {};
  }

  get answeredCount(): number {
    return Object.keys(this.userAnswers).length;
  }

  selectOption(optIdx: number) {
    this.userAnswers[this.currentQuestionIndex] = optIdx;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  getOptionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  cancelAssessment() {
    if (confirm('Are you sure you want to exit this assessment? Your progress will not be saved.')) {
      this.stopTimer();
      this.activeAssessment = null;
      this.activeResult = null;
    }
  }

  submitQuiz() {
    this.stopTimer();
    this.isSubmitting = true;

    const answersPayload = this.currentQuestions.map((_, idx) => ({
      questionIndex: idx,
      selectedOptionIndex: this.userAnswers[idx] !== undefined ? this.userAnswers[idx] : -1
    }));

    const totalSecondsSpent = ((this.activeAssessment?.durationMinutes || 15) * 60) - this.timeRemainingSeconds;

    this.assessmentService.submitAssessment(this.activeAssessment!._id, {
      answers: answersPayload,
      timeSpentSeconds: totalSecondsSpent
    }).subscribe({
      next: (res) => {
        this.activeResult = res.data;
        this.isSubmitting = false;
        this.loadHistory(); // refresh attempts
        if (res.data.isPassed) {
          this.toast.success(`Passed with ${res.data.percentage}% score! Badge unlocked!`);
        } else {
          this.toast.info(`Assessment completed. Score: ${res.data.percentage}%.`);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error('Failed to submit assessment: ' + err.message);
      }
    });
  }

  resetToCatalog() {
    this.activeAssessment = null;
    this.activeResult = null;
    this.activeView = 'catalog';
  }
}

