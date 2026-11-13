import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterviewService } from '../../services/interview.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { InterviewQuestionItem, MockInterviewSession, MockAnswerEvaluation } from '../../models/notification.model';

@Component({
  selector: 'app-interview-prep',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-prep.component.html',
  styleUrls: ['./interview-prep.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewPrepComponent implements OnInit, OnDestroy {
  private interviewService = inject(InterviewService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  authService = inject(AuthService);

  activeView: 'bank' | 'mock' = 'bank';

  // Bank filters
  categories = [
    'All',
    'JavaScript',
    'Angular',
    'Node.js',
    'MongoDB',
    'DSA',
    'DBMS',
    'OOP',
    'HR',
    'Aptitude',
  ];
  selectedCategory = 'All';
  selectedDifficulty = 'All';
  searchTerm = '';
  questions: InterviewQuestionItem[] = [];
  openQuestionId: string | null = null;
  isLoading = true;

  // Mock Session state
  mockCategory = 'JavaScript';
  mockRole = 'Full Stack Developer';
  mockDifficulty = 'Intermediate';
  mockQuestionCount = 3;
  activeMockSession: MockInterviewSession | null = null;
  currentQIndex = 0;
  userAnswerText = '';
  isEvaluatingAnswer = false;
  latestEvaluation: MockAnswerEvaluation | null = null;
  pastSessions: MockInterviewSession[] = [];
  isSessionFinished = false;
  showModelAnswer = false;

  // Timer state
  timerSeconds = 120;
  isTimerRunning = false;
  private timerInterval: any = null;

  // Speech Recognition state
  isListening = false;
  speechSupported = false;
  private recognition: any = null;

  ngOnInit() {
    this.fetchQuestions();
    this.fetchPastMockSessions();
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.stopSpeech();
  }

  // 1. Question Bank Logic
  fetchQuestions() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.interviewService
      .getQuestions({
        category: this.selectedCategory !== 'All' ? this.selectedCategory : undefined,
        difficulty: this.selectedDifficulty !== 'All' ? this.selectedDifficulty : undefined,
        search: this.searchTerm || undefined,
      })
      .subscribe({
        next: (res) => {
          this.questions = res.data || [];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleAnswer(id: string) {
    this.openQuestionId = this.openQuestionId === id ? null : id;
  }

  // 2. Timer Management
  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
      } else {
        this.stopTimer();
        this.toast.info('Time is up! You can still submit your answer or revise.');
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  pauseTimer() {
    this.stopTimer();
  }

  resetTimer(seconds: number = 120) {
    this.stopTimer();
    this.timerSeconds = seconds;
    this.cdr.markForCheck();
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
    this.cdr.markForCheck();
  }

  get formattedTimer(): string {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // 3. Speech Recognition / Dictation
  private initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            this.userAnswerText = (this.userAnswerText ? this.userAnswerText + ' ' : '') + transcript;
            this.cdr.markForCheck();
          }
        };

        this.recognition.onerror = () => {
          this.stopSpeech();
          this.toast.warning('Microphone input paused or unavailable.');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.cdr.markForCheck();
        };
      }
    }
  }

  toggleSpeech() {
    if (!this.speechSupported) {
      this.toast.info('Speech recognition not supported in this browser. Please type your response.');
      return;
    }

    if (this.isListening) {
      this.stopSpeech();
    } else {
      try {
        this.recognition.start();
        this.isListening = true;
        this.toast.info('Microphone active — speak your answer clearly.');
      } catch {
        this.stopSpeech();
      }
    }
    this.cdr.markForCheck();
  }

  private stopSpeech() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
    this.cdr.markForCheck();
  }

  // 4. AI Mock Interview Flow
  startMockInterview() {
    this.interviewService
      .startMockSession({
        category: this.mockCategory,
        targetRole: this.mockRole,
        difficulty: this.mockDifficulty,
        questionCount: this.mockQuestionCount,
      })
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.activeMockSession = res.data;
            this.currentQIndex = 0;
            this.userAnswerText = '';
            this.latestEvaluation = null;
            this.isSessionFinished = false;
            this.showModelAnswer = false;
            this.resetTimer(120);
            this.startTimer();
            this.toast.success('AI Mock Interview started!');
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.toast.error('Failed to initialize mock session.');
          this.cdr.markForCheck();
        },
      });
  }

  submitMockAnswer() {
    if (!this.activeMockSession || !this.userAnswerText.trim()) return;

    this.stopTimer();
    this.stopSpeech();
    this.isEvaluatingAnswer = true;
    this.cdr.markForCheck();

    this.interviewService
      .submitMockAnswer(this.activeMockSession._id, {
        questionIndex: this.currentQIndex,
        userAnswer: this.userAnswerText,
      })
      .subscribe({
        next: (res) => {
          this.isEvaluatingAnswer = false;
          if (res.data) {
            this.activeMockSession = res.data.session;
            this.latestEvaluation = res.data.evaluation;
            this.showModelAnswer = false;
            this.toast.success(`Answer scored: ${res.data.evaluation.score}%!`);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.isEvaluatingAnswer = false;
          this.toast.error('Evaluation service encountered an error.');
          this.cdr.markForCheck();
        },
      });
  }

  nextQuestion() {
    if (!this.activeMockSession) return;
    this.currentQIndex++;
    this.userAnswerText = '';
    this.latestEvaluation = null;
    this.showModelAnswer = false;
    this.resetTimer(120);
    this.startTimer();
    this.cdr.markForCheck();
  }

  finishSession() {
    this.stopTimer();
    this.stopSpeech();
    this.isSessionFinished = true;
    this.fetchPastMockSessions();
    this.cdr.markForCheck();
  }

  quitSession() {
    this.stopTimer();
    this.stopSpeech();
    this.activeMockSession = null;
    this.isSessionFinished = false;
    this.latestEvaluation = null;
    this.cdr.markForCheck();
  }

  fetchPastMockSessions() {
    this.interviewService.getMyMockSessions().subscribe({
      next: (res) => {
        this.pastSessions = res.data || [];
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  // 5. Download Session Transcript
  downloadTranscript() {
    if (!this.activeMockSession) return;

    const user = this.authService.currentUser();
    const dateStr = new Date().toLocaleDateString();
    let transcript = `=======================================================\n`;
    transcript += `SKILLBRIDGE 2.0 — AI MOCK INTERVIEW TRANSCRIPT\n`;
    transcript += `Candidate: ${user?.name || 'Student Candidate'}\n`;
    transcript += `Track: ${this.activeMockSession.category} | Target Role: ${this.activeMockSession.targetRole}\n`;
    transcript += `Difficulty: ${this.activeMockSession.difficulty} | Date: ${dateStr}\n`;
    transcript += `Overall Score: ${this.activeMockSession.totalScore || 0}%\n`;
    transcript += `=======================================================\n\n`;

    this.activeMockSession.questions.forEach((q, idx) => {
      transcript += `QUESTION ${idx + 1}: ${q.question}\n`;
      transcript += `-------------------------------------------------------\n`;
      transcript += `CANDIDATE ANSWER:\n${q.userAnswer || '[No response provided]'}\n\n`;
      transcript += `AI SCORE: ${q.score ?? 0}%\n`;
      transcript += `FEEDBACK: ${q.feedback || 'N/A'}\n\n`;
      transcript += `IDEAL MODEL ANSWER:\n${q.suggestedAnswer || 'N/A'}\n\n`;
      transcript += `=======================================================\n\n`;
    });

    transcript += `Generated via SkillBridge AI Career Intelligence Platform.\n`;

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-transcript-${this.activeMockSession.category.toLowerCase()}-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toast.success('Interview transcript downloaded!');
  }
}
