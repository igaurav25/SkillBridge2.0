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
         class="pwa-banner animate-slide-down"
         role="region"
         aria-label="Install SkillBridge App"
         aria-live="polite">
      
      <div class="pwa-banner-info">
        <div class="pwa-icon-box" aria-hidden="true">🌉</div>
        <div>
          <div class="pwa-banner-title">
            <span>Install SkillBridge App</span>
            <span class="pwa-badge">PWA</span>
          </div>
          <p class="pwa-banner-sub">
            {{ isIosDevice() ? 'Tap Share then "Add to Home Screen"' : 'Install for offline access and faster launch' }}
          </p>
        </div>
      </div>

      <div class="pwa-banner-actions">
        <button
          *ngIf="!isIosDevice() && deferredPrompt"
          type="button"
          (click)="installPwa()"
          class="btn btn-primary btn-sm">
          Install
        </button>
        <button
          type="button"
          (click)="dismissBanner()"
          aria-label="Dismiss install banner"
          class="pwa-close-btn">
          ✕
        </button>
      </div>

    </div>
  `,
  styles: [`
    .pwa-banner {
      position: fixed;
      top: 0.75rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 950;
      width: min(94vw, 28rem);
      padding: 0.85rem 1rem;
      border-radius: 16px;
      border: 1px solid var(--border-active);
      background: var(--bg-glass);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .pwa-banner-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .pwa-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--gradient-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .pwa-banner-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .pwa-badge {
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.18);
      color: var(--text-primary);
      font-family: monospace;
    }
    .pwa-banner-sub {
      color: var(--text-secondary);
      font-size: 0.72rem;
      line-height: 1.3;
    }
    .pwa-banner-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .pwa-close-btn {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-weight: 700;
    }
    .pwa-close-btn:hover {
      color: var(--text-primary);
      background: var(--bg-glass-hover);
    }
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

