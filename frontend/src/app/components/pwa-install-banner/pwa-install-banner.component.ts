import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceCapabilityService } from '../../services/device-capability.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- PWA Install Prompt Banner -->
    <div *ngIf="showBanner()"
         class="pwa-banner fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md p-3.5 rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-xl shadow-2xl animate-slide-down flex items-center justify-between gap-3 text-xs"
         role="alert"
         aria-live="polite">
      
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
          🌉
        </div>
        <div>
          <div class="font-bold text-foreground text-sm flex items-center gap-1.5">
            <span>Install SkillBridge App</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono">PWA</span>
          </div>
          <p class="text-muted-foreground text-[11px] leading-tight">
            {{ isIosDevice() ? 'Tap Share ⎙ then "Add to Home Screen" ⊞' : 'Install for offline access, 3D orbit & notifications' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          *ngIf="!isIosDevice() && deferredPrompt"
          type="button"
          (click)="installPwa()"
          class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-transform active:scale-95 shadow-sm min-h-[36px]">
          Install
        </button>
        <button
          type="button"
          (click)="dismissBanner()"
          class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center text-sm font-bold">
          ✕
        </button>
      </div>

    </div>
  `,
  styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translate(-50%, -20px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .animate-slide-down {
      animation: slideDown 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class PwaInstallBannerComponent implements OnInit {
  deviceService = inject(DeviceCapabilityService);

  readonly showBanner = signal<boolean>(false);
  deferredPrompt: any = null;

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    // Check if user already dismissed banner this session
    const dismissed = sessionStorage.getItem('skillbridge_pwa_dismissed');
    if (dismissed) return;

    // Standard Chromium / Android / Windows PWA prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showBanner.set(true);
    });

    // Detect iOS standalone mode
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && this.isIosDevice()) {
      // Show gentle iOS hint after 4 seconds
      setTimeout(() => {
        if (!sessionStorage.getItem('skillbridge_pwa_dismissed')) {
          this.showBanner.set(true);
        }
      }, 4000);
    }
  }

  isIosDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA Install Outcome]', outcome);
    this.deferredPrompt = null;
    this.showBanner.set(false);
  }

  dismissBanner(): void {
    this.showBanner.set(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('skillbridge_pwa_dismissed', 'true');
    }
  }
}

