import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DeviceCapabilityService } from '../../services/device-capability.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-hero-scene',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="hero-visual-frame"
      [class.is-light]="themeService.currentTheme() === 'light'"
      role="img"
      aria-label="Interactive 3D visualization of SkillBridge career trajectory and skill graph"
    >
      <!-- WebGL Canvas (desktop & capable mobile) -->
      <canvas
        #canvasEl
        class="hero-webgl-canvas"
        [class.is-ready]="sceneState() === 'ready'"
        *ngIf="!useFallback()"
      ></canvas>

      <!-- 2D Static/Reduced-Motion Constellation Fallback or Loading Veil -->
      <div
        class="hero-fallback-stage"
        [class.is-hidden]="sceneState() === 'ready' && !useFallback()"
        aria-hidden="true"
      >
        <div class="orbital-glow"></div>
        <svg class="orbital-svg" viewBox="0 0 420 420" fill="none">
          <defs>
            <linearGradient id="sbOrbitGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#818cf8" />
              <stop offset="50%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="210" cy="210" r="165" stroke="url(#sbOrbitGrad)" stroke-opacity="0.28" stroke-width="1.2" stroke-dasharray="6 6" />
          <circle cx="210" cy="210" r="118" stroke="#22d3ee" stroke-opacity="0.35" stroke-width="1.5" />
          <circle cx="210" cy="210" r="72" stroke="#818cf8" stroke-opacity="0.5" stroke-width="1.5" />
          <polygon points="210,136 274,210 210,284 146,210" stroke="url(#sbOrbitGrad)" stroke-width="2" fill="rgba(99,102,241,0.14)" />
          <circle cx="210" cy="210" r="22" fill="url(#sbOrbitGrad)" fill-opacity="0.88" />
          <!-- Orbital milestone nodes -->
          <circle cx="328" cy="210" r="9" fill="#22d3ee" />
          <circle cx="92" cy="210" r="8" fill="#a78bfa" />
          <circle cx="210" cy="45" r="7" fill="#818cf8" />
          <circle cx="296" cy="316" r="8" fill="#10b981" />
        </svg>

        <div class="fallback-nodes" aria-hidden="true">
          <span class="node-pill node-tl">Skills</span>
          <span class="node-pill node-tr">ATS Match</span>
          <span class="node-pill node-bl">Roadmaps</span>
          <span class="node-pill node-br">Careers</span>
        </div>

        <div *ngIf="sceneState() === 'loading' && !useFallback()" class="scene-status-pill">
          Initializing 3D Career Core…
        </div>
      </div>

      <!-- Subtle Mode Toggle Badge (Desktop / Capable GPU only) -->
      <div class="scene-caption">
        <span class="caption-dot" [class.live]="sceneState() === 'ready' && !useFallback()"></span>
        <span class="caption-label">
          {{
            useFallback()
              ? (deviceService.prefersReducedMotion() ? 'Reduced-Motion 2D View' : 'Adaptive 2D View')
              : (deviceService.renderingMode() === 'full-3d' ? 'Interactive 3D Core' : 'Adaptive 3D Lite')
          }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .hero-visual-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      min-height: 300px;
      max-height: 460px;
      border-radius: var(--radius-xl);
      overflow: hidden;
      border: 1px solid var(--border-card);
      background: radial-gradient(circle at 55% 42%, rgba(79, 70, 229, 0.22) 0%, rgba(13, 18, 34, 0.92) 72%);
      box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .hero-visual-frame.is-light {
      background: radial-gradient(circle at 55% 42%, rgba(99, 102, 241, 0.14) 0%, rgba(241, 245, 249, 0.96) 72%);
    }
    .hero-webgl-canvas {
      position: relative;
      z-index: 2;
      display: block;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.45s ease;
    }
    .hero-webgl-canvas.is-ready {
      opacity: 1;
    }
    .hero-fallback-stage {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      transition: opacity 0.4s ease;
    }
    .hero-fallback-stage.is-hidden {
      opacity: 0;
    }
    .orbital-glow {
      position: absolute;
      width: 65%;
      height: 65%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(34, 211, 238, 0.16), rgba(99, 102, 241, 0.08) 55%, transparent 72%);
      filter: blur(18px);
    }
    .orbital-svg {
      width: min(82%, 340px);
      height: auto;
      position: relative;
      z-index: 1;
    }
    .fallback-nodes {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .node-pill {
      position: absolute;
      padding: 0.28rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: var(--bg-glass);
      color: var(--text-primary);
      border: 1px solid var(--border-card);
      box-shadow: var(--shadow-xs);
    }
    .node-tl { top: 16%; left: 10%; }
    .node-tr { top: 20%; right: 10%; }
    .node-bl { bottom: 20%; left: 10%; }
    .node-br { bottom: 18%; right: 10%; }
    .scene-status-pill {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 3;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-glass);
      border: 1px solid var(--border-subtle);
    }
    .scene-caption {
      position: absolute;
      left: 1rem;
      bottom: 0.9rem;
      z-index: 4;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.3rem 0.7rem;
      border-radius: var(--radius-full);
      background: var(--bg-glass);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border-subtle);
      pointer-events: none;
    }
    .caption-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text-muted);
    }
    .caption-dot.live {
      background: var(--accent-cyan);
      box-shadow: 0 0 8px var(--accent-cyan);
    }
    .caption-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
  `],
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasRef?: ElementRef<HTMLCanvasElement>;

  deviceService = inject(DeviceCapabilityService);
  themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly sceneState = signal<'loading' | 'ready' | 'fallback'>('loading');
  readonly runtimeWebglFailed = signal<boolean>(false);

  readonly useFallback = computed<boolean>(() => {
    return this.runtimeWebglFailed() || this.deviceService.renderingMode() === '2d-fallback';
  });

  private rafId: number | null = null;
  private isPaused = false;
  private isInViewport = true;
  private pointerX = 0;
  private pointerY = 0;

  private cleanupCallbacks: Array<() => void> = [];
  private disposeScene?: () => void;

  constructor() {
    effect(() => {
      const shouldFallback = this.useFallback();
      if (shouldFallback && this.sceneState() === 'ready') {
        this.teardownThree();
        this.sceneState.set('fallback');
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      this.sceneState.set('fallback');
      return;
    }
    if (this.useFallback()) {
      this.sceneState.set('fallback');
      return;
    }
    // Defer Three.js initialization slightly so hero typography paints first
    const timer = window.setTimeout(() => {
      this.initThreeScene().catch(() => {
        this.runtimeWebglFailed.set(true);
        this.sceneState.set('fallback');
      });
    }, 60);
    this.cleanupCallbacks.push(() => clearTimeout(timer));
  }

  private async initThreeScene(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.useFallback()) {
      this.sceneState.set('fallback');
      return;
    }

    const THREE = await import('three');
    const mode = this.deviceService.renderingMode();
    if (!canvas.isConnected || mode === '2d-fallback') {
      this.sceneState.set('fallback');
      return;
    }

    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: mode === 'full-3d',
        powerPreference: mode === 'full-3d' ? 'high-performance' : 'low-power',
      });
    } catch {
      this.runtimeWebglFailed.set(true);
      this.sceneState.set('fallback');
      return;
    }

    const maxDpr = mode === 'full-3d' ? 1.75 : 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 480;
    const height = parent?.clientHeight || 360;
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / Math.max(height, 1), 0.1, 60);
    camera.position.set(0, 0.25, 6.2);

    // Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x818cf8, 0.75);
    const keyLight = new THREE.DirectionalLight(0xe0e7ff, 1.8);
    keyLight.position.set(4, 5, 6);
    const cyanLight = new THREE.PointLight(0x22d3ee, 2.2, 16);
    cyanLight.position.set(-3.5, 2.0, 2.5);
    const violetLight = new THREE.PointLight(0xa78bfa, 2.0, 16);
    violetLight.position.set(3.5, -2.0, 2.0);
    scene.add(ambientLight, keyLight, cyanLight, violetLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Central crystalline career core
    const coreGeo = new THREE.OctahedronGeometry(0.95, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: 0x312e81,
      emissiveIntensity: 0.7,
      metalness: 0.45,
      roughness: 0.2,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Geodesic wireframe cage
    const cageGeo = new THREE.IcosahedronGeometry(1.42, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    rootGroup.add(cageMesh);

    // Orbital Career Trajectory Rings
    const segments = mode === 'simplified-3d' ? 36 : 72;
    const ring1Geo = new THREE.TorusGeometry(2.05, 0.022, 10, segments);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.set(Math.PI / 3.1, Math.PI / 6, 0);
    rootGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.45, 0.016, 10, segments);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.42 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.set(-Math.PI / 3.4, -Math.PI / 5, 0);
    rootGroup.add(ring2);

    // 4 Orbiting Skill/Milestone Nodes
    const nodeGeo = new THREE.SphereGeometry(0.11, 14, 14);
    const nodeColors = [0x22d3ee, 0xa78bfa, 0x10b981, 0x818cf8];
    const orbitNodes: Array<{ mesh: InstanceType<typeof THREE.Mesh>; radius: number; speed: number; phase: number; tilt: number }> = [];
    nodeColors.forEach((hex, idx) => {
      const mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.6,
        roughness: 0.25,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      rootGroup.add(mesh);
      orbitNodes.push({
        mesh,
        radius: idx % 2 === 0 ? 2.05 : 2.45,
        speed: 0.35 + idx * 0.08,
        phase: (idx * Math.PI) / 2,
        tilt: idx % 2 === 0 ? 0.52 : -0.65,
      });
    });

    // Floating Particle Field
    const particleCount = mode === 'full-3d' ? 220 : mode === 'balanced-3d' ? 120 : 60;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.0 - 1.0;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Desktop-only mouse parallax
    const onPointerMove = (ev: MouseEvent) => {
      if (!this.deviceService.isDesktop() || this.deviceService.isTouch()) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.pointerX = ((ev.clientX - rect.left) / rect.width - 0.5) * 2;
      this.pointerY = ((ev.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // Pause when tab hidden
    const onVisibilityChange = () => {
      this.isPaused = document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // WebGL context loss safety
    const onContextLost = (e: Event) => {
      e.preventDefault();
      this.runtimeWebglFailed.set(true);
      this.sceneState.set('fallback');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // Responsive ResizeObserver
    let resizeObs: ResizeObserver | null = null;
    if (parent && 'ResizeObserver' in window) {
      resizeObs = new ResizeObserver(() => {
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      });
      resizeObs.observe(parent);
    }

    // Pause when scrolled offscreen
    let intObs: IntersectionObserver | null = null;
    if (parent && 'IntersectionObserver' in window) {
      intObs = new IntersectionObserver(
        (entries) => {
          this.isInViewport = entries.some((e) => e.isIntersecting);
        },
        { threshold: 0.05 }
      );
      intObs.observe(parent);
    }

    // Cleanup & full GPU resource disposal
    this.disposeScene = () => {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      window.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      resizeObs?.disconnect();
      intObs?.disconnect();

      scene.traverse((obj: unknown) => {
        const meshLike = obj as {
          geometry?: { dispose: () => void };
          material?: { dispose: () => void; map?: { dispose: () => void } } | Array<{ dispose: () => void }>;
        };
        meshLike.geometry?.dispose?.();
        if (Array.isArray(meshLike.material)) {
          meshLike.material.forEach((m) => m?.dispose?.());
        } else if (meshLike.material) {
          meshLike.material.map?.dispose?.();
          meshLike.material.dispose?.();
        }
      });
      renderer.dispose();
    };

    this.sceneState.set('ready');

    let lastTime = performance.now();
    let elapsed = 0;

    const animate = (now: number) => {
      this.rafId = requestAnimationFrame(animate);
      if (this.isPaused || !this.isInViewport) {
        lastTime = now;
        return;
      }

      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;

      coreMesh.rotation.y += delta * 0.45;
      coreMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.25;
      cageMesh.rotation.y -= delta * 0.22;
      cageMesh.rotation.z += delta * 0.12;
      ring1.rotation.z += delta * 0.18;
      ring2.rotation.z -= delta * 0.14;
      particles.rotation.y += delta * 0.04;

      for (const n of orbitNodes) {
        const angle = elapsed * n.speed + n.phase;
        n.mesh.position.set(
          Math.cos(angle) * n.radius,
          Math.sin(angle) * Math.sin(n.tilt) * n.radius * 0.65,
          Math.sin(angle) * Math.cos(n.tilt) * n.radius
        );
      }

      // Smooth camera drift + desktop mouse parallax
      const targetX = (this.deviceService.isDesktop() && !this.deviceService.isTouch() ? this.pointerX * 0.35 : 0) + Math.sin(elapsed * 0.3) * 0.18;
      const targetY = (this.deviceService.isDesktop() && !this.deviceService.isTouch() ? -this.pointerY * 0.25 : 0) + Math.cos(elapsed * 0.25) * 0.12 + 0.2;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  private teardownThree(): void {
    this.disposeScene?.();
    this.disposeScene = undefined;
  }

  ngOnDestroy(): void {
    for (const fn of this.cleanupCallbacks) fn();
    this.cleanupCallbacks = [];
    this.teardownThree();
  }
}
