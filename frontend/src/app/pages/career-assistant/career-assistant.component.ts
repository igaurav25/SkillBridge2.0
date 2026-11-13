import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ToastService } from '../../services/toast.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayedContent?: string;
  isStreaming?: boolean;
  engine?: 'AI-generated' | 'Rule-based estimate';
  timestamp: Date;
}

export interface PromptCategory {
  title: string;
  icon: string;
  prompts: string[];
}

@Component({
  selector: 'app-career-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './career-assistant.component.html',
  styleUrls: ['./career-assistant.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CareerAssistantComponent implements OnInit, OnDestroy {
  private aiService = inject(AiService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  authService = inject(AuthService);

  messages: ChatMessage[] = [];
  inputMessage = '';
  isLoading = false;
  hasError = false;
  lastFailedMessage = '';
  conversationId: string | null = null;
  targetRole = 'Software Engineer';
  userSkillCount = 0;

  private typingInterval: any = null;

  promptCategories: PromptCategory[] = [
    {
      title: 'Career & Roadmaps',
      icon: '🗺️',
      prompts: [
        'How can I become a full-stack developer in 2026?',
        'What skills should I learn for modern Angular 19?',
        'What should I learn after mastering Node.js & Express?',
      ],
    },
    {
      title: 'Resume & ATS',
      icon: '📄',
      prompts: [
        'Why am I not getting shortlisted for junior developer roles?',
        'How do I rewrite my project bullet points with measurable impact?',
        'What are the most in-demand keywords for backend engineers?',
      ],
    },
    {
      title: 'Technical Interviews',
      icon: '🎙️',
      prompts: [
        'Explain the JavaScript Event Loop, Microtasks and Call Stack.',
        'How do I answer "Tell me about a challenging technical bug you resolved"?',
        'What are essential system design concepts for mid-level engineers?',
      ],
    },
  ];

  selectedCategory = 'Career & Roadmaps';

  ngOnInit() {
    this.fetchContext();
    this.startInitialChat();
  }

  ngOnDestroy() {
    this.stopTyping();
  }

  fetchContext() {
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.data) {
          this.targetRole = res.data.preferredRole || 'Software Engineer';
          this.userSkillCount = (res.data.skills || []).length;
          this.cdr.markForCheck();
        }
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  startInitialChat() {
    const userName = this.authService.currentUser()?.name || 'Developer';
    this.hasError = false;
    this.messages = [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `👋 Hello **${userName}**! I am your **SkillBridge AI Career Assistant & Technical Mentor**.\n\nI can help you plan personalized learning roadmaps, optimize your resume for ATS screening, simulate technical interview answers, and guide software architecture decisions.\n\nAsk me anything or select a guided prompt below!`,
        displayedContent: `👋 Hello **${userName}**! I am your **SkillBridge AI Career Assistant & Technical Mentor**.\n\nI can help you plan personalized learning roadmaps, optimize your resume for ATS screening, simulate technical interview answers, and guide software architecture decisions.\n\nAsk me anything or select a guided prompt below!`,
        isStreaming: false,
        engine: 'AI-generated',
        timestamp: new Date(),
      },
    ];
    this.cdr.markForCheck();
  }

  sendMessage(text?: string) {
    const msgToSend = (text || this.inputMessage).trim();
    if (!msgToSend || this.isLoading) return;

    this.stopTyping();
    this.hasError = false;
    this.lastFailedMessage = '';

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msgToSend,
      displayedContent: msgToSend,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.inputMessage = '';
    this.isLoading = true;
    this.cdr.markForCheck();

    this.aiService.chat(msgToSend, this.conversationId || undefined).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data?.reply) {
          this.conversationId = res.data.conversationId || this.conversationId;
          const engineLabel = (res.data as any).engine || 'Rule-based estimate';
          this.streamMessage(res.data.reply, engineLabel);
        } else {
          this.handleChatError(msgToSend, 'Empty response received.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.handleChatError(msgToSend, err?.error?.message || 'Network connectivity error.');
      },
    });
  }

  retryMessage() {
    if (this.lastFailedMessage) {
      this.sendMessage(this.lastFailedMessage);
    }
  }

  private handleChatError(originalMsg: string, errorReason: string) {
    this.hasError = true;
    this.lastFailedMessage = originalMsg;
    this.messages.push({
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `⚠️ **Service Notice**: We encountered a temporary connectivity issue while processing your question (${errorReason}).\n\nTap **Retry Message** below or ask another question.`,
      displayedContent: `⚠️ **Service Notice**: We encountered a temporary connectivity issue while processing your question (${errorReason}).\n\nTap **Retry Message** below or ask another question.`,
      isStreaming: false,
      engine: 'Rule-based estimate',
      timestamp: new Date(),
    });
    this.cdr.markForCheck();
  }

  private streamMessage(fullContent: string, engine: 'AI-generated' | 'Rule-based estimate') {
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: fullContent,
      displayedContent: '',
      isStreaming: true,
      engine,
      timestamp: new Date(),
    };
    this.messages.push(assistantMsg);
    this.cdr.markForCheck();

    let currentIndex = 0;
    const chunkSize = 4; // Reveal 4 characters per tick for smooth streaming effect
    const intervalMs = 15;

    this.typingInterval = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= fullContent.length) {
        assistantMsg.displayedContent = fullContent;
        assistantMsg.isStreaming = false;
        this.stopTyping();
      } else {
        assistantMsg.displayedContent = fullContent.slice(0, currentIndex);
      }
      this.cdr.markForCheck();
    }, intervalMs);
  }

  skipTyping(msg: ChatMessage) {
    this.stopTyping();
    msg.displayedContent = msg.content;
    msg.isStreaming = false;
    this.cdr.markForCheck();
  }

  private stopTyping() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
    // Complete any currently streaming message
    const streaming = this.messages.find(m => m.isStreaming);
    if (streaming) {
      streaming.displayedContent = streaming.content;
      streaming.isStreaming = false;
    }
  }

  clearChat() {
    this.stopTyping();
    this.conversationId = null;
    this.startInitialChat();
  }

  copyCode(code: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.toast.success('Code copied to clipboard!');
      }).catch(() => {
        this.toast.info('Copied text.');
      });
    }
  }

  formatMarkdown(content?: string): string {
    if (!content) return '';
    const safe = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return safe
      .replace(/### (.*?)\n/g, '<h4 class="font-bold text-sm mt-3 mb-1 text-primary">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 class="font-bold text-base mt-3 mb-1 text-primary">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-primary">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre class="code-block bg-primary p-3 rounded font-mono text-xs my-2 overflow-x-auto border border-subtle relative">${code.trim()}</pre>`;
      })
      .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono text-cyan">$1</code>')
      .replace(/^[•\-\*] (.*?)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }
}
