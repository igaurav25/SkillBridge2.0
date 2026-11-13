import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobileNativeService } from '../../services/mobile-native.service';

@Component({
  selector: 'app-pull-to-refresh',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pull-refresh-container" [class.refreshing]="isRefreshing()">
      <div
        class="pull-indicator"
        [style.transform]="'translateY(' + pullDistance() + 'px)'"
        [style.opacity]="pullDistance() > 10 ? 1 : 0"
        aria-live="polite"
      >
        <div class="spinner-box" [class.spin]="isRefreshing()">
          <span *ngIf="!isRefreshing() && pullDistance() < threshold">↓</span>
          <span *ngIf="!isRefreshing() && pullDistance() >= threshold">↑</span>
          <span *ngIf="isRefreshing()" class="loading-spin">🔄</span>
        </div>
        <span class="pull-text">
          {{ isRefreshing() ? 'Refreshing...' : pullDistance() >= threshold ? 'Release to refresh' : 'Pull down to refresh' }}
        </span>
      </div>

      <div
        class="pull-content"
        [style.transform]="'translateY(' + pullDistance() + 'px)'"
      >
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .pull-refresh-container {
      position: relative;
      width: 100%;
      overflow: hidden;
      touch-action: pan-y;
    }

    .pull-indicator {
      position: absolute;
      top: -50px;
      left: 0;
      right: 0;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary, #94a3b8);
      pointer-events: none;
      transition: opacity 0.15s ease;
      z-index: 10;
    }

    .spinner-box {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-surface, #121826);
      border: 1px solid var(--border-card, rgba(255, 255, 255, 0.15));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .loading-spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .pull-content {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .refreshing .pull-content {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `],
})
export class PullToRefreshComponent {
  private mobileNative = inject(MobileNativeService);

  @Input() threshold = 65;
  @Input() maxPull = 100;
  @Output() refresh = new EventEmitter<() => void>();

  readonly pullDistance = signal<number>(0);
  readonly isRefreshing = signal<boolean>(false);

  private startY = 0;
  private isPulling = false;

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (window.scrollY === 0 && !this.isRefreshing()) {
      this.startY = e.touches[0].clientY;
      this.isPulling = true;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (!this.isPulling || this.isRefreshing()) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - this.startY;

    if (diff > 0 && window.scrollY === 0) {
      // Damped pull distance
      const distance = Math.min(this.maxPull, diff * 0.45);
      this.pullDistance.set(distance);

      if (distance >= this.threshold && this.pullDistance() < this.threshold) {
        this.mobileNative.triggerHapticLight();
      }
    } else {
      this.pullDistance.set(0);
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    if (!this.isPulling) return;
    this.isPulling = false;

    if (this.pullDistance() >= this.threshold && !this.isRefreshing()) {
      this.isRefreshing.set(true);
      this.pullDistance.set(45);
      this.mobileNative.triggerHapticSuccess();

      const complete = () => {
        this.isRefreshing.set(false);
        this.pullDistance.set(0);
      };

      if (this.refresh.observed) {
        this.refresh.emit(complete);
      } else {
        setTimeout(complete, 1000);
      }
    } else {
      this.pullDistance.set(0);
    }
  }
}

