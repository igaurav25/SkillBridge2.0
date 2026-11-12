import { Component, EventEmitter, HostListener, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sb-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      *ngIf="open"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title || 'Dialog'"
      (click)="onBackdropClick()"
    >
      <div class="modal-card" [style.max-width]="maxWidth" (click)="$event.stopPropagation()">
        <div class="modal-header" *ngIf="title || showClose">
          <h3 class="font-bold text-lg">{{ title }}</h3>
          <button
            *ngIf="showClose"
            type="button"
            class="btn btn-outline btn-sm"
            aria-label="Close dialog"
            (click)="close.emit()"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class SbModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() maxWidth = '640px';
  @Input() showClose = true;
  @Input() closeOnBackdrop = true;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open) {
      this.close.emit();
    }
  }

  onBackdropClick() {
    if (this.closeOnBackdrop) {
      this.close.emit();
    }
  }
}

