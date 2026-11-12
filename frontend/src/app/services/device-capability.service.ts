import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type DeviceTier = 'high' | 'medium' | 'low' | 'minimal';
export type FormFactor = 'mobile-small' | 'mobile-standard' | 'mobile-large' | 'foldable' | 'tablet' | 'desktop' | 'ultrawide';
export type OrientationMode = 'portrait' | 'landscape';

export interface DeviceTelemetry {
  tier: DeviceTier;
  formFactor: FormFactor;
  orientation: OrientationMode;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isTouchDevice: boolean;
  hasHardwareAcceleration: boolean;
  prefersReducedMotion: boolean;
  isLowPowerMode: boolean;
  gpuRenderer?: string;
  recommended3DComplexity: 'full' | 'balanced' | 'simplified' | '2d-fallback';
}

@Injectable({
  providedIn: 'root'
})
export class DeviceCapabilityService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Reactive state signals
  readonly windowWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  readonly windowHeight = signal<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  readonly deviceTier = signal<DeviceTier>('high');
  readonly isTouch = signal<boolean>(false);
  readonly prefersReducedMotion = signal<boolean>(false);
  readonly isLowBattery = signal<boolean>(false);
  readonly gpuInfo = signal<string>('Standard GPU');
  readonly user3DPreference = signal<'auto' | 'force-3d' | 'force-2d'>('auto');

  // Computed layout signals
  readonly formFactor = computed<FormFactor>(() => {
    const w = this.windowWidth();
    if (w <= 360) return 'mobile-small';
    if (w <= 400) return 'mobile-standard';
    if (w < 600) return 'mobile-large';
    if (w >= 600 && w < 768) return 'foldable';
    if (w >= 768 && w < 1024) return 'tablet';
    if (w >= 1024 && w < 1920) return 'desktop';
    return 'ultrawide';
  });

  readonly isMobile = computed<boolean>(() => this.windowWidth() < 768);
  readonly isTablet = computed<boolean>(() => this.windowWidth() >= 768 && this.windowWidth() < 1024);
  readonly isDesktop = computed<boolean>(() => this.windowWidth() >= 1024);
  readonly isUltrawide = computed<boolean>(() => this.windowWidth() >= 1920);

  readonly orientation = computed<OrientationMode>(() => {
    return this.windowWidth() >= this.windowHeight() ? 'landscape' : 'portrait';
  });

  // Adaptive 3D rendering profile
  readonly renderingMode = computed<'full-3d' | 'balanced-3d' | 'simplified-3d' | '2d-fallback'>(() => {
    const pref = this.user3DPreference();
    if (pref === 'force-2d') return '2d-fallback';
    if (pref === 'force-3d') return 'full-3d';

    if (this.prefersReducedMotion() || this.isLowBattery()) {
      return '2d-fallback';
    }

    const tier = this.deviceTier();
    const isSoftwareWebGL = /swiftshader|llvmpipe|software/i.test(this.gpuInfo());

    if (tier === 'minimal' || isSoftwareWebGL || (tier === 'low' && this.isMobile())) {
      return '2d-fallback';
    }
    if (tier === 'low') {
      return 'simplified-3d';
    }
    if (tier === 'medium' || (tier === 'high' && this.isMobile())) {
      return 'balanced-3d';
    }
    return 'full-3d';
  });

  constructor() {
    if (this.isBrowser) {
      this.initCapabilities();
      this.bindEventListeners();
    }
  }

  private initCapabilities(): void {
    this.windowWidth.set(window.innerWidth);
    this.windowHeight.set(window.innerHeight);

    // Detect touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isTouch.set(hasTouch);

    // Reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion.set(motionQuery.matches);
    motionQuery.addEventListener('change', (e) => this.prefersReducedMotion.set(e.matches));

    // WebGL & GPU probing
    this.probeGPU();

    // Battery status (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const checkBattery = () => {
          this.isLowBattery.set(!battery.charging && battery.level < 0.2);
        };
        checkBattery();
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      }).catch(() => {});
    }

    // Read stored user 3D preference
    const storedPref = localStorage.getItem('skillbridge_3d_pref') as 'auto' | 'force-3d' | 'force-2d';
    if (storedPref) {
      this.user3DPreference.set(storedPref);
    }
  }

  private probeGPU(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!gl) {
        this.deviceTier.set('minimal');
        this.gpuInfo.set('No WebGL Support');
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      let renderer = 'Generic WebGL';
      if (debugInfo) {
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
      }
      this.gpuInfo.set(renderer);

      // Hardware heuristic
      const memory = (navigator as any).deviceMemory || 4; // in GB
      const cores = navigator.hardwareConcurrency || 4;

      const isLowEndGPU = /mali-4|adreno (3|4|505|506)|powervr|llvmpipe|swiftshader/i.test(renderer);
      const isHighEndGPU = /apple|nvidia|geforce|rtx|radeon|rx|adreno (6|7|8)|mali-g(7|8|9)/i.test(renderer);

      if (isLowEndGPU || memory <= 2 || cores <= 2) {
        this.deviceTier.set('low');
      } else if (isHighEndGPU && memory >= 6 && cores >= 6) {
        this.deviceTier.set('high');
      } else {
        this.deviceTier.set('medium');
      }
    } catch {
      this.deviceTier.set('medium');
    }
  }

  private bindEventListeners(): void {
    let resizeTimer: any;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.windowWidth.set(window.innerWidth);
        this.windowHeight.set(window.innerHeight);
      }, 50);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.windowWidth.set(window.innerWidth);
        this.windowHeight.set(window.innerHeight);
      }, 100);
    });
  }

  set3DPreference(pref: 'auto' | 'force-3d' | 'force-2d'): void {
    this.user3DPreference.set(pref);
    if (this.isBrowser) {
      localStorage.setItem('skillbridge_3d_pref', pref);
    }
  }

  getTelemetry(): DeviceTelemetry {
    return {
      tier: this.deviceTier(),
      formFactor: this.formFactor(),
      orientation: this.orientation(),
      screenWidth: this.windowWidth(),
      screenHeight: this.windowHeight(),
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      isTouchDevice: this.isTouch(),
      hasHardwareAcceleration: this.deviceTier() !== 'minimal',
      prefersReducedMotion: this.prefersReducedMotion(),
      isLowPowerMode: this.isLowBattery(),
      gpuRenderer: this.gpuInfo(),
      recommended3DComplexity: this.renderingMode() === '2d-fallback' ? '2d-fallback' :
                               this.renderingMode() === 'simplified-3d' ? 'simplified' :
                               this.renderingMode() === 'balanced-3d' ? 'balanced' : 'full'
    };
  }
}

