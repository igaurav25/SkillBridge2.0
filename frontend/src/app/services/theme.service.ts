import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  themeMode = signal<ThemeMode>('dark');
  currentTheme = signal<'dark' | 'light'>('dark');

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sb_theme') as ThemeMode;
      if (saved && ['dark', 'light', 'system'].includes(saved)) {
        this.setTheme(saved);
      } else {
        this.setTheme('dark');
      }

      // Listen for OS system theme changes
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (this.themeMode() === 'system') {
            this.applyResolvedTheme();
          }
        });
      }
    }
  }

  toggleTheme() {
    const cycle: ThemeMode[] = ['dark', 'light', 'system'];
    const nextIdx = (cycle.indexOf(this.themeMode()) + 1) % cycle.length;
    this.setTheme(cycle[nextIdx]);
  }

  setTheme(mode: ThemeMode) {
    this.themeMode.set(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_theme', mode);
    }
    this.applyResolvedTheme();
  }

  private applyResolvedTheme() {
    let resolved: 'dark' | 'light' = 'dark';
    if (this.themeMode() === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } else {
      resolved = this.themeMode() === 'light' ? 'light' : 'dark';
    }

    this.currentTheme.set(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }

  isSystem(): boolean {
    return this.themeMode() === 'system';
  }
}
