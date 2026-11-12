import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../services/toast.service';
import { SbBadgeComponent } from '../../components/ui';
import { NotificationItem } from '../../models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, SbBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit {
  notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  filter = signal<'all' | 'unread' | 'read'>('all');
  isLoading = signal<boolean>(true);

  readonly filteredNotifications = computed<NotificationItem[]>(() => {
    const list = this.notificationService.notifications();
    const f = this.filter();
    if (f === 'unread') return list.filter((n) => !n.read);
    if (f === 'read') return list.filter((n) => n.read);
    return list;
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Unable to fetch notifications at this time.');
      },
    });
  }

  setFilter(tab: 'all' | 'unread' | 'read'): void {
    this.filter.set(tab);
  }

  markAsRead(item: NotificationItem, ev?: Event): void {
    ev?.stopPropagation();
    if (item.read) return;
    this.notificationService.markAsRead(item._id).subscribe({
      next: () => this.toast.success('Notification marked as read'),
      error: () => this.toast.error('Could not update notification'),
    });
  }

  markAllAsRead(): void {
    if (this.notificationService.unreadCount() === 0) return;
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.toast.success('All notifications marked as read'),
      error: () => this.toast.error('Could not mark all as read'),
    });
  }

  deleteNotification(item: NotificationItem, ev: Event): void {
    ev.stopPropagation();
    this.notificationService.deleteNotification(item._id).subscribe({
      next: () => this.toast.info('Notification removed'),
      error: () => this.toast.error('Could not delete notification'),
    });
  }

  onItemClick(item: NotificationItem): void {
    if (!item.read) {
      this.notificationService.markAsRead(item._id).subscribe();
    }
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  getTypeBadgeVariant(type: NotificationItem['type']): 'primary' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'neutral' {
    switch (type) {
      case 'application_status':
        return 'emerald';
      case 'job_match':
        return 'cyan';
      case 'interview':
        return 'primary';
      case 'recruiter_message':
        return 'purple';
      default:
        return 'neutral';
    }
  }

  getTypeLabel(type: NotificationItem['type']): string {
    switch (type) {
      case 'application_status':
        return 'Application';
      case 'job_match':
        return 'Job Match';
      case 'interview':
        return 'Interview';
      case 'recruiter_message':
        return 'Message';
      default:
        return 'System';
    }
  }
}

