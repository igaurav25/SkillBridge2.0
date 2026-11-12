import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SbSkeletonKind = 'text' | 'title' | 'avatar' | 'card';

@Component({
  selector: 'app-sb-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2" aria-hidden="true">
      <div
        *ngFor="let item of items"
        class="skeleton"
        [ngClass]="'skeleton-' + kind"
        [style.height]="height || null"
      ></div>
    </div>
  `,
})
export class SbSkeletonComponent {
  @Input() kind: SbSkeletonKind = 'text';
  @Input() count = 1;
  @Input() height = '';

  get items(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }
}

