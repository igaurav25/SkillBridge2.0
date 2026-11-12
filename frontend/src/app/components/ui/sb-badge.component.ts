import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SbBadgeVariant = 'primary' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'neutral';

@Component({
  selector: 'app-sb-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [ngClass]="'badge-' + variant">
      <ng-content></ng-content>
    </span>
  `,
})
export class SbBadgeComponent {
  @Input() variant: SbBadgeVariant = 'neutral';
}

