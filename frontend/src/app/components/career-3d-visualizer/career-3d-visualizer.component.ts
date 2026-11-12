import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceCapabilityService } from '../../services/device-capability.service';

interface SkillNode {
  id: string;
  name: string;
  category: 'core' | 'ai-ml' | 'cloud' | 'frontend' | 'backend' | 'devops' | 'database';
  level: number; // 0 - 100
  status: 'mastered' | 'learning' | 'recommended';
  x3d: number;
  y3d: number;
  z3d: number;
  connections: string[];
}

@Component({
  selector: 'app-career-3d-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="career-visualizer-container" [attr.aria-label]="'Career Skill Graph ' + (is3DActive() ? '3D Mode' : '2D Mode')">
      <!-- Top Control Bar -->
      <div class="visualizer-header">
        <div class="visualizer-title-group">
          <span class="status-dot" [class.active-3d]="is3DActive()" aria-hidden="true"></span>
          <h3 class="visualizer-heading">
            <span>{{ is3DActive() ? '🌌 3D Career Skill Orbit' : '🗺️ 2D Interactive Skill Graph' }}</span>
            <span class="tier-pill" [ngClass]="deviceTierBadgeClass()">
              {{ deviceService.deviceTier() | uppercase }} TIER
            </span>
          </h3>
        </div>

        <!-- Controls -->
        <div class="visualizer-controls">
          <div class="mode-switch">
            <button
              type="button"
              (click)="setMode('force-3d')"
              class="mode-btn"
              [class.active]="is3DActive()">
              ✨ 3D Orbit
            </button>
            <button
              type="button"
              (click)="setMode('force-2d')"
              class="mode-btn"
              [class.active]="!is3DActive()">
              📊 2D Map
            </button>
          </div>

          <button
            type="button"
            (click)="resetView()"
            title="Reset Orientation"
            class="reset-btn">
            ↺ Reset
          </button>
        </div>
      </div>

      <!-- Canvas Area -->
      <div class="canvas-wrapper"
           (mousedown)="onMouseDown($event)"
           (touchstart)="onTouchStart($event)"
           (wheel)="onWheel($event)">
        
        <canvas #canvasRef class="visualizer-canvas"></canvas>

        <!-- Subtle 3D Help Overlay on First View -->
        <div *ngIf="showHint() && is3DActive()" class="hint-overlay">
          <span>👆 Drag to rotate</span>
          <span>•</span>
          <span>🔍 Scroll/Pinch to zoom</span>
          <span>•</span>
          <span>Tap nodes for details</span>
        </div>

        <!-- Active Node Inspector Panel -->
        <div *ngIf="selectedNode()" class="node-inspector animate-fade-in">
          <div class="inspector-top">
            <div>
              <div class="inspector-name">{{ selectedNode()?.name }}</div>
              <div class="inspector-cat">{{ selectedNode()?.category }}</div>
            </div>
            <button type="button" (click)="selectedNode.set(null)" aria-label="Close skill inspector" class="inspector-close">✕</button>
          </div>
          <div class="inspector-metrics">
            <div class="inspector-row">
              <span>Proficiency:</span>
              <strong>{{ selectedNode()?.level }}%</strong>
            </div>
            <div class="inspector-bar-track">
              <div class="inspector-bar-fill" [style.width.%]="selectedNode()?.level"></div>
            </div>
            <div class="inspector-row">
              <span>Status:</span>
              <span class="inspector-status">{{ selectedNode()?.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Quick Legend -->
      <div class="legend-bar">
        <div class="legend-items">
          <span class="legend-item"><span class="legend-dot mastered"></span> Mastered</span>
          <span class="legend-item"><span class="legend-dot learning"></span> In Progress</span>
          <span class="legend-item"><span class="legend-dot recommended"></span> Next Priority</span>
        </div>
        <div class="legend-meta">
          {{ nodes.length }} Skill Nodes • {{ is3DActive() ? 'Canvas 3D' : 'Hardware-Safe 2D' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .career-visualizer-container {
      border-radius: 16px;
      border: 1px solid var(--border-card);
      background: var(--bg-card);
      overflow: hidden;
      position: relative;
      box-shadow: var(--shadow-md);
    }
    .visualizer-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: var(--bg-secondary);
    }
    .visualizer-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #10b981;
      flex-shrink: 0;
    }
    .status-dot.active-3d {
      background: var(--primary-500);
    }
    .visualizer-heading {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .tier-pill {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-family: monospace;
      border: 1px solid var(--border-subtle);
    }
    .tier-high { background: rgba(16, 185, 129, 0.14); color: var(--text-primary); border-color: rgba(16, 185, 129, 0.4); }
    .tier-med { background: rgba(99, 102, 241, 0.16); color: var(--text-primary); border-color: rgba(99, 102, 241, 0.4); }
    .tier-low { background: rgba(245, 158, 11, 0.16); color: var(--text-primary); border-color: rgba(245, 158, 11, 0.4); }
    .visualizer-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .mode-switch {
      display: inline-flex;
      padding: 2px;
      border-radius: 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
    }
    .mode-btn, .reset-btn {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      min-height: 34px;
    }
    .mode-btn.active {
      background: var(--primary-600);
      color: #ffffff;
    }
    .reset-btn {
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
    }
    .reset-btn:hover, .mode-btn:hover:not(.active) {
      color: var(--text-primary);
    }
    .canvas-wrapper {
      position: relative;
      width: 100%;
      height: 320px;
      cursor: grab;
      touch-action: none;
      user-select: none;
      overflow: hidden;
      background: var(--bg-primary);
    }
    @media (min-width: 640px) {
      .canvas-wrapper { height: 380px; }
    }
    @media (min-width: 768px) {
      .canvas-wrapper { height: 420px; }
    }
    .visualizer-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .hint-overlay {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      pointer-events: none;
      font-size: 0.75rem;
      color: var(--text-secondary);
      background: var(--bg-glass);
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .node-inspector {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      max-width: 240px;
      padding: 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--border-active);
      background: var(--bg-primary);
      box-shadow: var(--shadow-lg);
      font-size: 0.78rem;
      z-index: 10;
    }
    .inspector-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
    .inspector-name { font-weight: 700; font-size: 0.875rem; color: var(--text-primary); }
    .inspector-cat { font-size: 0.68rem; text-transform: uppercase; font-family: monospace; color: var(--text-secondary); }
    .inspector-close { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 700; padding: 0.2rem 0.4rem; }
    .inspector-metrics { display: flex; flex-direction: column; gap: 0.4rem; }
    .inspector-row { display: flex; justify-content: space-between; gap: 0.5rem; color: var(--text-secondary); }
    .inspector-bar-track { width: 100%; height: 6px; background: var(--bg-secondary); border-radius: 999px; overflow: hidden; }
    .inspector-bar-fill { height: 100%; background: var(--primary-500); border-radius: 999px; }
    .inspector-status { text-transform: capitalize; font-weight: 600; color: var(--text-primary); }
    .legend-bar {
      padding: 0.6rem 1rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }
    .legend-items { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
    .legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
    .legend-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
    .legend-dot.mastered { background: #10b981; }
    .legend-dot.learning { background: #6366f1; }
    .legend-dot.recommended { background: #f59e0b; }
    .legend-meta { font-size: 0.72rem; font-family: monospace; }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class Career3dVisualizerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  deviceService = inject(DeviceCapabilityService);

  readonly selectedNode = signal<SkillNode | null>(null);
  readonly showHint = signal<boolean>(true);

  readonly nodes: SkillNode[] = [
    { id: '1', name: 'TypeScript', category: 'frontend', level: 85, status: 'mastered', x3d: -120, y3d: -40, z3d: 50, connections: ['2', '3'] },
    { id: '2', name: 'Angular 19', category: 'frontend', level: 90, status: 'mastered', x3d: -160, y3d: 40, z3d: -20, connections: ['1', '4'] },
    { id: '3', name: 'Node.js', category: 'backend', level: 80, status: 'mastered', x3d: 80, y3d: -60, z3d: -80, connections: ['1', '5'] },
    { id: '4', name: 'UI / UX Design', category: 'core', level: 75, status: 'learning', x3d: -80, y3d: 110, z3d: 30, connections: ['2'] },
    { id: '5', name: 'REST & GraphQL APIs', category: 'backend', level: 88, status: 'mastered', x3d: 130, y3d: -10, z3d: 70, connections: ['3', '6'] },
    { id: '6', name: 'MongoDB & SQL', category: 'database', level: 82, status: 'mastered', x3d: 70, y3d: 80, z3d: 40, connections: ['5', '7'] },
    { id: '7', name: 'Python ML Engine', category: 'ai-ml', level: 65, status: 'learning', x3d: 140, y3d: 90, z3d: -60, connections: ['6', '8'] },
    { id: '8', name: 'Docker & CI/CD', category: 'devops', level: 50, status: 'recommended', x3d: 0, y3d: -130, z3d: 20, connections: ['3', '7'] },
    { id: '9', name: 'Cloud Architecture', category: 'cloud', level: 45, status: 'recommended', x3d: -30, y3d: 140, z3d: -80, connections: ['8'] }
  ];

  // 3D Engine Variables
  private ctx!: CanvasRenderingContext2D;
  private animationId: number = 0;
  private angleX: number = 0.25;
  private angleY: number = 0.35;
  private zoom: number = 1.0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private autoRotateSpeed: number = 0.003;

  constructor() {
    effect(() => {
      // Re-trigger layout or render on orientation / renderingMode change
      const mode = this.deviceService.renderingMode();
      if (this.canvasRef && this.ctx) {
        this.resizeCanvas();
      }
    });
  }

  is3DActive(): boolean {
    return this.deviceService.renderingMode() !== '2d-fallback';
  }

  deviceTierBadgeClass(): string {
    const tier = this.deviceService.deviceTier();
    if (tier === 'high') return 'tier-high';
    if (tier === 'medium') return 'tier-med';
    return 'tier-low';
  }

  setMode(mode: 'force-3d' | 'force-2d'): void {
    this.deviceService.set3DPreference(mode);
  }

  resetView(): void {
    this.angleX = 0.25;
    this.angleY = 0.35;
    this.zoom = 1.0;
    this.selectedNode.set(null);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
    this.resizeCanvas();

    window.addEventListener('resize', this.onWindowResize);

    // Initial render loop
    this.startRenderLoop();

    // Auto-hide hint after 6s
    setTimeout(() => this.showHint.set(false), 6000);
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    this.resizeCanvas();
  };

  private resizeCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for battery/GPU performance
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private startRenderLoop(): void {
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  private draw(): void {
    if (!this.ctx || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.ctx.clearRect(0, 0, width, height);

    if (this.is3DActive()) {
      this.draw3D(width, height);
    } else {
      this.draw2D(width, height);
    }
  }

  private draw3D(width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const fov = 350;

    if (!this.isDragging) {
      this.angleY += this.autoRotateSpeed;
    }

    const cosX = Math.cos(this.angleX);
    const sinX = Math.sin(this.angleX);
    const cosY = Math.cos(this.angleY);
    const sinY = Math.sin(this.angleY);

    // Project nodes
    const projectedNodes = this.nodes.map(n => {
      // Rotation Y
      const x1 = n.x3d * cosY - n.z3d * sinY;
      const z1 = n.z3d * cosY + n.x3d * sinY;

      // Rotation X
      const y2 = n.y3d * cosX - z1 * sinX;
      const z2 = z1 * cosX + n.y3d * sinX;

      const scale = (fov / (fov + z2 * this.zoom)) * this.zoom;
      const screenX = cx + x1 * scale;
      const screenY = cy + y2 * scale;

      return {
        ...n,
        screenX,
        screenY,
        scale,
        depth: z2
      };
    });

    // Draw connection filaments
    this.ctx.save();
    for (const pNode of projectedNodes) {
      for (const targetId of pNode.connections) {
        const target = projectedNodes.find(n => n.id === targetId);
        if (target) {
          const avgDepth = (pNode.depth + target.depth) / 2;
          const alpha = Math.max(0.1, Math.min(0.5, 0.3 - avgDepth / 600));

          this.ctx.beginPath();
          this.ctx.moveTo(pNode.screenX, pNode.screenY);
          this.ctx.lineTo(target.screenX, target.screenY);
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
          this.ctx.lineWidth = Math.max(1, 1.8 * pNode.scale);
          this.ctx.stroke();
        }
      }
    }
    this.ctx.restore();

    // Sort by depth for correct 3D z-buffering
    projectedNodes.sort((a, b) => b.depth - a.depth);

    // Render nodes
    for (const pNode of projectedNodes) {
      const radius = Math.max(8, 14 * pNode.scale);
      const isSelected = this.selectedNode()?.id === pNode.id;

      // Outer glow
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(pNode.screenX, pNode.screenY, radius * 1.6, 0, Math.PI * 2);
      const glowColor = pNode.status === 'mastered' ? 'rgba(16, 185, 129, 0.25)' :
                        pNode.status === 'learning' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(245, 158, 11, 0.2)';
      this.ctx.fillStyle = glowColor;
      this.ctx.fill();

      // Main Sphere Body
      this.ctx.beginPath();
      this.ctx.arc(pNode.screenX, pNode.screenY, radius, 0, Math.PI * 2);
      const nodeColor = pNode.status === 'mastered' ? '#10B981' :
                        pNode.status === 'learning' ? '#6366F1' : '#F59E0B';
      this.ctx.fillStyle = nodeColor;
      this.ctx.fill();

      if (isSelected) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.stroke();
      }

      // Label
      if (pNode.scale > 0.6) {
        this.ctx.font = `500 ${Math.round(11 * Math.min(1.2, pNode.scale))}px Inter, sans-serif`;
        this.ctx.fillStyle = '#F8FAFC';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pNode.name, pNode.screenX, pNode.screenY + radius + 12);
      }
      this.ctx.restore();
    }
  }

  private draw2D(width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.36;

    // Arrange nodes evenly on 2D responsive circular topological layout
    const positioned = this.nodes.map((n, i) => {
      const theta = (i / this.nodes.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius;
      return { ...n, screenX: x, screenY: y };
    });

    // Draw 2D connections
    this.ctx.save();
    for (const node of positioned) {
      for (const targetId of node.connections) {
        const target = positioned.find(n => n.id === targetId);
        if (target) {
          this.ctx.beginPath();
          this.ctx.moveTo(node.screenX, node.screenY);
          this.ctx.lineTo(target.screenX, target.screenY);
          this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      }
    }

    // Draw central hub
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#6366F1';
    this.ctx.stroke();

    this.ctx.font = '600 11px Inter, sans-serif';
    this.ctx.fillStyle = '#6366F1';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CORE', cx, cy + 4);

    // Draw nodes
    for (const node of positioned) {
      const isSelected = this.selectedNode()?.id === node.id;
      const color = node.status === 'mastered' ? '#10B981' :
                    node.status === 'learning' ? '#6366F1' : '#F59E0B';

      this.ctx.beginPath();
      this.ctx.arc(node.screenX, node.screenY, 14, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      if (isSelected) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.stroke();
      }

      this.ctx.font = '500 11px Inter, sans-serif';
      this.ctx.fillStyle = '#F8FAFC';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name, node.screenX, node.screenY + 24);
    }
    this.ctx.restore();
  }

  // Interaction handlers
  onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.checkHitNode(e.offsetX, e.offsetY);

    const onMouseMove = (moveEv: MouseEvent) => {
      if (!this.isDragging) return;
      const dx = moveEv.clientX - this.lastMouseX;
      const dy = moveEv.clientY - this.lastMouseY;
      this.angleY += dx * 0.008;
      this.angleX += dy * 0.008;
      this.angleX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.angleX));
      this.lastMouseX = moveEv.clientX;
      this.lastMouseY = moveEv.clientY;
    };

    const onMouseUp = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      const touch = e.touches[0];
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.checkHitNode(touch.clientX - rect.left, touch.clientY - rect.top);

      const onTouchMove = (moveEv: TouchEvent) => {
        if (!this.isDragging || moveEv.touches.length !== 1) return;
        const t = moveEv.touches[0];
        const dx = t.clientX - this.lastMouseX;
        const dy = t.clientY - this.lastMouseY;
        this.angleY += dx * 0.008;
        this.angleX += dy * 0.008;
        this.angleX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.angleX));
        this.lastMouseX = t.clientX;
        this.lastMouseY = t.clientY;
      };

      const onTouchEnd = () => {
        this.isDragging = false;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    this.zoom = Math.max(0.6, Math.min(2.0, this.zoom * zoomFactor));
  }

  private checkHitNode(clickX: number, clickY: number): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const cx = width / 2;
    const cy = height / 2;

    if (this.is3DActive()) {
      const fov = 350;
      const cosX = Math.cos(this.angleX);
      const sinX = Math.sin(this.angleX);
      const cosY = Math.cos(this.angleY);
      const sinY = Math.sin(this.angleY);

      for (const n of this.nodes) {
        const x1 = n.x3d * cosY - n.z3d * sinY;
        const z1 = n.z3d * cosY + n.x3d * sinY;
        const y2 = n.y3d * cosX - z1 * sinX;
        const z2 = z1 * cosX + n.y3d * sinX;
        const scale = (fov / (fov + z2 * this.zoom)) * this.zoom;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;
        const dist = Math.hypot(clickX - sx, clickY - sy);

        if (dist <= Math.max(18, 22 * scale)) {
          this.selectedNode.set(n);
          return;
        }
      }
    } else {
      const radius = Math.min(width, height) * 0.36;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const theta = (i / this.nodes.length) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(theta) * radius;
        const sy = cy + Math.sin(theta) * radius;
        const dist = Math.hypot(clickX - sx, clickY - sy);
        if (dist <= 20) {
          this.selectedNode.set(n);
          return;
        }
      }
    }
  }
}
