import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import macSvg from '../assets/mac-intro.svg?raw';

/**
 * Intro overlay: the isometric retro Mac assembles part by part while the
 * page loads, then switches on. Rebuilt from the original's SVG artwork
 * (src/assets/mac-intro.svg) with a staged part reveal, a camera zoom that
 * follows the SVG's own data-shots keyframes, a switch-on glow, and a fade.
 * Runs ~10s, click (or Enter/Space) skips. Reduced motion shortens it.
 */

const BUILD_MS = 7000;
const SWITCH_ON_AT = 8000;
const FADE_AT = 9000;
const DONE_AT = 9600;

type Shot = [number, number, number, number];

function parseShots(svg: string): Shot[] {
  const m = svg.match(/data-shots='([^']+)'/);
  if (!m) return [[0, 500, 400, 1], [1, 500, 400, 1]];
  try {
    return JSON.parse(m[1]) as Shot[];
  } catch {
    return [[0, 500, 400, 1], [1, 500, 400, 1]];
  }
}

function sampleShots(shots: Shot[], f: number): { x: number; y: number; s: number } {
  if (f <= shots[0][0]) return { x: shots[0][1], y: shots[0][2], s: shots[0][3] };
  for (let i = 1; i < shots.length; i++) {
    const [t1, x1, y1, s1] = shots[i - 1];
    const [t2, x2, y2, s2] = shots[i];
    if (f <= t2) {
      const k = t2 === t1 ? 0 : (f - t1) / (t2 - t1);
      return { x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k, s: s1 + (s2 - s1) * k };
    }
  }
  const last = shots[shots.length - 1];
  return { x: last[1], y: last[2], s: last[3] };
}

export default function IntroOverlay({ onDone }: { onDone: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const svgEl = svgWrapRef.current?.querySelector('svg');
    if (!overlay || !svgEl) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shots = parseShots(macSvg);

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      timersRef.current.forEach((t) => window.clearTimeout(t));
      overlay.dataset.stage = 'fade';
      timersRef.current.push(window.setTimeout(onDone, 500));
    };

    const skip = () => finish();

    if (reduced) {
      overlay.dataset.built = '';
      timersRef.current.push(window.setTimeout(finish, 600));
      overlay.addEventListener('click', skip);
      return () => {
        overlay.removeEventListener('click', skip);
        timersRef.current.forEach((t) => window.clearTimeout(t));
      };
    }

    // Stagger the part-by-part assembly using each group's data-b start time.
    const parts = Array.from(overlay.querySelectorAll<SVGElement>('[data-b]'));
    parts.sort((a, b) => {
      const ta = parseFloat(a.dataset.b?.split(' ')[0] ?? '0');
      const tb = parseFloat(b.dataset.b?.split(' ')[0] ?? '0');
      return ta - tb;
    });
    parts.forEach((el) => {
      const t = parseFloat(el.dataset.b?.split(' ')[0] ?? '0');
      el.style.transitionDelay = `${Math.max(0, t) * BUILD_MS}ms`;
    });
    requestAnimationFrame(() => {
      overlay.dataset.built = '';
    });

    // Camera zoom following the SVG's own shot keyframes.
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min((now - start) / FADE_AT, 1);
      const { x, y, s } = sampleShots(shots, f);
      svgEl.style.transform = `translate(-50%, -50%) scale(${s})`;
      svgEl.style.transformOrigin = `${x / 10}% ${y / 8}%`;
      if (f < 1 && !doneRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    timersRef.current.push(
      window.setTimeout(() => {
        overlay.dataset.stage = 'on';
      }, SWITCH_ON_AT),
      window.setTimeout(() => {
        overlay.dataset.stage = 'fade';
      }, FADE_AT),
      window.setTimeout(onDone, DONE_AT),
    );
    overlay.addEventListener('click', skip);
    return () => {
      cancelAnimationFrame(raf);
      overlay.removeEventListener('click', skip);
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={overlayRef}
      className="iso intro-overlay"
      data-theme="dark"
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
      }}
      style={{ '--vig': 0.55 } as CSSProperties}
    >
      <div ref={svgWrapRef} dangerouslySetInnerHTML={{ __html: macSvg }} />
    </div>
  );
}
