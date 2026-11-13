import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class MobileNativeService {
  private router = inject(Router);
  private location = inject(Location);
  private zone = inject(NgZone);
  private toast = inject(ToastService);

  readonly isNative = signal<boolean>(Capacitor.isNativePlatform());
  readonly platform = signal<string>(Capacitor.getPlatform());
  readonly pushToken = signal<string | null>(null);

  // Active modal dismiss delegate (allows open modals to capture the back button first)
  private backButtonInterceptors: Array<() => boolean> = [];
  private lastBackPressTime = 0;

  constructor() {
    if (this.isNative()) {
      this.initHardwareBackButton();
      this.initDeepLinkListener();
      this.initPushNotifications();
    }
  }

  // Register an interceptor that will be asked to handle back button before router navigation
  registerBackButtonInterceptor(interceptor: () => boolean): () => void {
    this.backButtonInterceptors.push(interceptor);
    return () => {
      this.backButtonInterceptors = this.backButtonInterceptors.filter((fn) => fn !== interceptor);
    };
  }

  private initHardwareBackButton(): void {
    App.addListener('backButton', ({ canGoBack }) => {
      this.zone.run(() => {
        // 1. Check if any modal or bottom sheet interceptor wants to handle it
        for (let i = this.backButtonInterceptors.length - 1; i >= 0; i--) {
          const handled = this.backButtonInterceptors[i]();
          if (handled) return;
        }

        // 2. Check if on root path
        const currentUrl = this.router.url.split('?')[0];
        const rootPaths = ['/', '/login', '/student/dashboard', '/recruiter/dashboard', '/admin/dashboard'];
        const isRoot = rootPaths.includes(currentUrl);

        if (isRoot) {
          const now = Date.now();
          if (now - this.lastBackPressTime < 2000) {
            App.exitApp();
          } else {
            this.lastBackPressTime = now;
            this.toast.info('Press back again to exit SkillBridge');
            this.triggerHapticLight();
          }
          return;
        }

        // 3. Navigate back
        if (canGoBack) {
          this.location.back();
        } else {
          this.router.navigate(['/']);
        }
      });
    });
  }

  private initDeepLinkListener(): void {
    App.addListener('appUrlOpen', (event) => {
      this.zone.run(() => {
        try {
          const url = new URL(event.url);
          // Handle skillbridge:// path or https://skillbridge.com path
          const path = url.pathname + url.search + url.hash;
          if (path && path !== '/') {
            this.router.navigateByUrl(path);
          }
        } catch {
          // Fallback regex matching
          const match = event.url.match(/skillbridge:\/\/([^\s]+)/);
          if (match && match[1]) {
            this.router.navigateByUrl('/' + match[1]);
          }
        }
      });
    });
  }

  // Push Notifications Scaffolding & Registration
  async initPushNotifications(): Promise<void> {
    if (!this.isNative()) return;

    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('[Push] Notification permission not granted:', permStatus.receive);
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('[Push] Device registration token:', token.value);
        this.pushToken.set(token.value);
        this.setSecureItem('sb_push_token', token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('[Push] Registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        this.zone.run(() => {
          this.toast.info(`${notification.title || 'SkillBridge'}: ${notification.body || ''}`);
          this.triggerHapticSuccess();
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        this.zone.run(() => {
          const data = notification.notification.data;
          if (data && data.route) {
            this.router.navigateByUrl(data.route);
          } else {
            this.router.navigate(['/notifications']);
          }
        });
      });
    } catch (err: any) {
      console.warn('[Push] Setup notice:', err?.message || err);
    }
  }

  // Native Camera or Gallery Capture with Web Fallback
  async pickProfilePicture(): Promise<string | null> {
    if (this.isNative()) {
      try {
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
        });
        this.triggerHapticLight();
        return image.dataUrl || null;
      } catch (err: any) {
        if (err?.message !== 'User cancelled photos app') {
          console.warn('[Camera] Capture skipped:', err?.message);
        }
        return null;
      }
    }
    return null;
  }

  // Secure Token and Preferences Storage (Capacitor Preferences + LocalStorage fallback)
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch {}
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      const res = await Preferences.get({ key });
      if (res.value !== null) return res.value;
    } catch {}
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch {}
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  // Haptic Tactile Feedback
  async triggerHapticLight(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }
  }

  async triggerHapticMedium(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
    }
  }

  async triggerHapticSuccess(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
    }
  }
}

