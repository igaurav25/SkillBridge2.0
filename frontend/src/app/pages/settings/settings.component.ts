import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { DeviceCapabilityService } from '../../services/device-capability.service';
import { ToastService } from '../../services/toast.service';
import { SbBadgeComponent, SbModalComponent } from '../../components/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SbBadgeComponent, SbModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  private userService = inject(UserService);
  themeService = inject(ThemeService);
  deviceService = inject(DeviceCapabilityService);
  private toast = inject(ToastService);
  private router = inject(Router);

  activeTab = signal<'profile' | 'security' | 'preferences' | 'privacy'>('profile');

  // Profile Form
  name = signal<string>('');
  headline = signal<string>('');
  phone = signal<string>('');
  isSavingProfile = signal<boolean>(false);

  // Password Form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isSavingPassword = signal<boolean>(false);

  // Preferences Form
  jobAlerts = signal<boolean>(true);
  interviewReminders = signal<boolean>(true);
  applicationUpdates = signal<boolean>(true);
  weeklyDigest = signal<boolean>(false);
  preferredTheme = signal<ThemeMode>('dark');
  preferred3D = signal<'auto' | 'force-3d' | 'force-2d'>('auto');
  isSavingPreferences = signal<boolean>(false);

  // Privacy & Deletion Modal
  isExporting = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteConfirmPassword = '';
  isDeletingAccount = signal<boolean>(false);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.name.set(user.name || '');
      this.headline.set(user.headline || '');
      this.phone.set(user.phone || '');

      const prefs = user.notificationPreferences || {};
      this.jobAlerts.set(prefs.jobAlerts ?? true);
      this.interviewReminders.set(prefs.interviewReminders ?? true);
      this.applicationUpdates.set(prefs.applicationUpdates ?? true);
      this.weeklyDigest.set(prefs.weeklyDigest ?? false);

      this.preferredTheme.set((user.themePreference as ThemeMode) || this.themeService.themeMode());
      this.preferred3D.set(user.preferred3DMode || this.deviceService.user3DPreference());
    }
  }

  setTab(tab: 'profile' | 'security' | 'preferences' | 'privacy'): void {
    this.activeTab.set(tab);
  }

  saveProfile(): void {
    const nameVal = this.name().trim();
    if (!nameVal) {
      this.toast.error('Name cannot be empty.');
      return;
    }
    this.isSavingProfile.set(true);
    this.userService
      .updateProfileBasic({
        name: nameVal,
        headline: this.headline().trim(),
        phone: this.phone().trim(),
      })
      .subscribe({
        next: () => {
          this.isSavingProfile.set(false);
          this.toast.success('Profile settings updated successfully!');
        },
        error: (err) => {
          this.isSavingProfile.set(false);
          this.toast.error(err?.error?.message || 'Failed to update profile.');
        },
      });
  }

  savePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.toast.error('Please fill in both current and new passwords.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.toast.error('New password must be at least 6 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toast.error('New password and confirmation do not match.');
      return;
    }

    this.isSavingPassword.set(true);
    this.userService
      .updatePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.isSavingPassword.set(false);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.toast.success('Password updated successfully!');
        },
        error: (err) => {
          this.isSavingPassword.set(false);
          this.toast.error(err?.error?.message || 'Current password incorrect.');
        },
      });
  }

  onThemeSelect(mode: ThemeMode): void {
    this.preferredTheme.set(mode);
    this.themeService.setTheme(mode);
  }

  on3DSelect(mode: 'auto' | 'force-3d' | 'force-2d'): void {
    this.preferred3D.set(mode);
    this.deviceService.set3DPreference(mode);
  }

  savePreferences(): void {
    this.isSavingPreferences.set(true);
    this.userService
      .updatePreferences({
        notificationPreferences: {
          jobAlerts: this.jobAlerts(),
          interviewReminders: this.interviewReminders(),
          applicationUpdates: this.applicationUpdates(),
          weeklyDigest: this.weeklyDigest(),
        },
        themePreference: this.preferredTheme(),
        preferred3DMode: this.preferred3D(),
      })
      .subscribe({
        next: () => {
          this.isSavingPreferences.set(false);
          this.toast.success('Preferences saved successfully!');
        },
        error: (err) => {
          this.isSavingPreferences.set(false);
          this.toast.error(err?.error?.message || 'Failed to save preferences.');
        },
      });
  }

  exportData(): void {
    this.isExporting.set(true);
    this.userService.exportMyData().subscribe({
      next: (res) => {
        this.isExporting.set(false);
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute(
          'download',
          `skillbridge-data-export-${new Date().toISOString().slice(0, 10)}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.toast.success('Your data export JSON has been downloaded.');
      },
      error: () => {
        this.isExporting.set(false);
        this.toast.error('Unable to export data at this time.');
      },
    });
  }

  openDeleteModal(): void {
    this.deleteConfirmPassword = '';
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteConfirmPassword = '';
  }

  confirmDeleteAccount(): void {
    if (!this.deleteConfirmPassword) {
      this.toast.error('Please enter your password to confirm deletion.');
      return;
    }
    this.isDeletingAccount.set(true);
    this.userService.deleteMyAccount(this.deleteConfirmPassword).subscribe({
      next: () => {
        this.isDeletingAccount.set(false);
        this.closeDeleteModal();
        this.authService.logout();
        this.toast.info('Your account has been permanently deleted.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isDeletingAccount.set(false);
        this.toast.error(err?.error?.message || 'Incorrect password. Account was not deleted.');
      },
    });
  }
}

