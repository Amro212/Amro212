type TrailPoint = {
  x: number;
  y: number;
  bornAt: number;
  size: number;
};

const GRID_SIZE_PX = 15;
const TRAIL_SIZE_RATIO = 0.2;
const MAX_AGE_MS = 200;
const INTERPOLATION_STEP_PX = 4;
const GOOEY_FILTER_STRENGTH = 2;
const GOO_STRENGTH = 3;
const BASE_SIZE_PX = Math.max(1, GRID_SIZE_PX * TRAIL_SIZE_RATIO);
const EXTRA_SIZE_PX = BASE_SIZE_PX * 0.75;
const ALPHA_MULTIPLIER = 0.45 + GOO_STRENGTH * 1.5;
const TRAIL_COLOR_RGB = '0, 0, 0';

class ProjectsPixelTrail {
  private section: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: TrailPoint[] = [];
  private lastPoint: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isActive = false;

  constructor(section: HTMLElement) {
    this.section = section;

    const context = this.createCanvas();
    if (!context) {
      throw new Error('Failed to initialize projects pixel trail canvas context.');
    }

    this.ctx = context;
    this.section.classList.add('projects--trail-enabled');

    this.handlePointerEnter = this.handlePointerEnter.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.render = this.render.bind(this);

    this.section.addEventListener('pointerenter', this.handlePointerEnter);
    this.section.addEventListener('pointermove', this.handlePointerMove);
    this.section.addEventListener('pointerleave', this.handlePointerLeave);

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.section);
    }

    window.addEventListener('resize', this.handleResize, { passive: true });

    this.handleResize();
    requestAnimationFrame(this.render);
  }

  private createCanvas(): CanvasRenderingContext2D | null {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'projects-pixeltrail-canvas';
    this.canvas.style.filter = `blur(${GOOEY_FILTER_STRENGTH}px) contrast(${12 + GOO_STRENGTH * 2})`;
    this.section.appendChild(this.canvas);

    const context = this.canvas.getContext('2d', { alpha: true });
    if (context) {
      context.imageSmoothingEnabled = false;
    }

    return context;
  }

  private handleResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, this.section.clientWidth);
    const height = Math.max(1, this.section.clientHeight);

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private handlePointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.isActive = true;
    this.section.classList.add('projects--trail-active');
  }

  private handlePointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;

    const bounds = this.section.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (this.lastPoint) {
      const dx = x - this.lastPoint.x;
      const dy = y - this.lastPoint.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.floor(distance / INTERPOLATION_STEP_PX));

      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        this.pushPoint(this.lastPoint.x + dx * t, this.lastPoint.y + dy * t);
      }
    } else {
      this.pushPoint(x, y);
    }

    this.lastPoint = { x, y };
  }

  private handlePointerLeave(): void {
    this.isActive = false;
    this.lastPoint = null;
    this.section.classList.remove('projects--trail-active');
  }

  private pushPoint(x: number, y: number): void {
    const snappedX = this.snapToGrid(x);
    const snappedY = this.snapToGrid(y);
    const lastPoint = this.points[this.points.length - 1];

    if (lastPoint && lastPoint.x === snappedX && lastPoint.y === snappedY) {
      return;
    }

    const now = performance.now();
    this.points.push({
      x: snappedX,
      y: snappedY,
      bornAt: now,
      size: BASE_SIZE_PX + Math.random() * 0.35,
    });
  }

  private snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE_PX) * GRID_SIZE_PX;
  }

  private render(timestamp: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    this.points = this.points.filter((point) => timestamp - point.bornAt <= MAX_AGE_MS);

    for (const point of this.points) {
      const age = (timestamp - point.bornAt) / MAX_AGE_MS;
      const alpha = Math.max(0, (1 - age) * (1 - age) * ALPHA_MULTIPLIER);
      const size = point.size + (1 - age) * EXTRA_SIZE_PX;

      this.ctx.fillStyle = `rgba(${TRAIL_COLOR_RGB}, ${alpha.toFixed(3)})`;
      this.ctx.fillRect(
        Math.round(point.x - size / 2),
        Math.round(point.y - size / 2),
        Math.ceil(size),
        Math.ceil(size),
      );
    }

    if (!this.isActive && this.points.length === 0) {
      this.section.classList.remove('projects--trail-active');
    }

    requestAnimationFrame(this.render);
  }
}

let trailInstance: ProjectsPixelTrail | null = null;

export function initProjectsPixelTrail(): void {
  if (trailInstance) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const section = document.getElementById('projects');
  if (!section) return;

  trailInstance = new ProjectsPixelTrail(section);
}
