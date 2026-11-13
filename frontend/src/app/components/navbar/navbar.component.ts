import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { LanguageService } from '../../services/language.service';
import { SbBadgeComponent } from '../ui';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, SbBadgeComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  notificationService = inject(NotificationService);
  langService = inject(LanguageService);
  private router = inject(Router);

  isMobileMenuOpen = false;
  isNotificationsOpen = false;
  isUserMenuOpen = false;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.notificationService.getMyNotifications().subscribe();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMobileMenu();
    this.closeDropdowns();
  }

  triggerCommandPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotificationsOpen = false;
  }

  closeDropdowns() {
    this.isNotificationsOpen = false;
    this.isUserMenuOpen = false;
  }

  markAsRead(id: string, link?: string) {
    this.notificationService.markAsRead(id).subscribe();
    if (link) {
      this.closeDropdowns();
      this.router.navigateByUrl(link);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  logout() {
    this.closeDropdowns();
    this.authService.logout();
  }

  get userAvatar(): string {
    const user = this.authService.currentUser();
    if (user?.avatar && (user.avatar.startsWith('/uploads/') || user.avatar.startsWith('data:image/'))) {
      return user.avatar;
    }
    const initials = (user?.name || 'SB')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#4f46e5"/><text x="32" y="40" font-size="24" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
