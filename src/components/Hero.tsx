import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { EXPERIENCE, EXPERIENCE_ARIA_LABEL, HERO } from '../data/clone';
import { AMRO_SIGNATURE_DATA_URI } from '../data/signature';

function PillIcon({ kind }: { kind: 'design' | 'code' | 'ai' }) {
  if (kind === 'design') {
    return (
      <svg className="pill-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20l1.2-4.3L15.6 5.3a2.1 2.1 0 0 1 3 3L8.3 18.8 4 20Z" />
        <path d="M13.6 7.3l3 3" />
      </svg>
    );
  }
  if (kind === 'code') {
    return (
      <svg className="pill-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 7 3.5 12l5 5" />
        <path d="m15.5 7 5 5-5 5" />
      </svg>
    );
  }
  return (
    <svg className="pill-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="var(--text-strong)" d="M10 3c.7 4.4 2.6 6.3 7 7-4.4.7-6.3 2.6-7 7-.7-4.4-2.6-6.3-7-7 4.4-.7 6.3-2.6 7-7Z" />
      <path fill="var(--text-strong)" fillOpacity="0.75" d="M18 14c.35 2.1 1.15 2.9 3.25 3.25-2.1.35-2.9 1.15-3.25 3.25-.35-2.1-1.15-2.9-3.25-3.25 2.1-.35 2.9-1.15 3.25-3.25Z" />
    </svg>
  );
}

/** Mascot: window-level pointer tracking, 8 compass sectors of 45 deg,
 * 70px dead zone, ~29.4 deg hysteresis, 114px at all widths, WAAPI boop
 * (420ms, 5-keyframe squash), idle auto-cycle on coarse pointers only. */
const DIRECTIONS = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
const SECTORS = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
const SECTOR = (2 * Math.PI) / SECTORS.length;

const BOOP_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.08, 0.9)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.96, 1.06)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.02, 0.98)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
];

function useMascot() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);

  const setDirection = (dir: string) => {
    const d = DIRECTIONS.indexOf(dir);
    if (d < 0 || !framesRef.current) return;
    framesRef.current.style.backgroundPosition = `${(d % 3) * 50}% ${50 * Math.floor(d / 3)}%`;
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine) {
      let sector = -1;
      const onMove = (e: PointerEvent) => {
        const btn = btnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const sx = e.clientX - (rect.left + rect.width / 2);
        const sy = e.clientY - (rect.top + rect.height / 2);
        if (Math.hypot(sx, sy) < 70) { sector = -1; setDirection('center'); return; }
        const ang = Math.atan2(sy, sx);
        if (sector !== -1) {
          const diff = Math.abs(Math.atan2(Math.sin(ang - sector * SECTOR), Math.cos(ang - sector * SECTOR)));
          if (diff < SECTOR / 2 + 0.12) return;
        }
        sector = (Math.round(ang / SECTOR) + SECTORS.length) % SECTORS.length;
        setDirection(SECTORS[sector]);
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      return () => window.removeEventListener('pointermove', onMove);
    }
    // Coarse pointers: idle auto-cycle, paused while hidden / off-screen.
    const cycle: [string, number][] = [
      ['right', 1500], ['down-right', 1100], ['down-left', 1100],
      ['left', 1500], ['down-left', 1100], ['down-right', 1100],
    ];
    let i = 0;
    let timer = 0;
    let visible = true;
    const step = () => {
      if (document.hidden || !visible) { timer = window.setTimeout(step, 900); return; }
      setDirection(cycle[i][0]);
      timer = window.setTimeout(() => { i = (i + 1) % cycle.length; step(); }, cycle[i][1] + Math.random() * 500);
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    if (btnRef.current) io.observe(btnRef.current);
    setDirection(cycle[0][0]);
    timer = window.setTimeout(() => { i = 1; step(); }, cycle[0][1] + Math.random() * 500);
    return () => { window.clearTimeout(timer); io.disconnect(); };
  }, []);

  const onBoop = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    bodyRef.current?.animate(BOOP_KEYFRAMES, { duration: 420, easing: 'linear' });
  };

  return { btnRef, bodyRef, framesRef, onBoop };
}

export default function Hero() {
  const [expanded, setExpanded] = useState(0);
  const mascot = useMascot();

  const toggleRow = (i: number) => setExpanded((cur) => (cur === i ? -1 : i));
  const onRowKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleRow(i);
    }
  };

  // Build the tree lines. Each line renders as its own block span so rows
  // stay clickable while the whole block reads as one <pre>.
  type Line = { text: string; row?: number; blank?: boolean };
  const lines: Line[] = [{ text: '~/experience' }];
  EXPERIENCE.forEach((entry, i) => {
    const isLast = i === EXPERIENCE.length - 1;
    const branch = isLast ? '└' : '├';
    const cont = isLast ? ' ' : '│';
    if (expanded === i) {
      lines.push({ text: `${branch}─> ${entry.company}/`, row: i });
      lines.push({ text: `${cont}   ├─ ${entry.role}` });
      lines.push({ text: `${cont}   └─ ${entry.dates} · ${entry.duration}` });
    } else {
      lines.push({ text: `${branch}── ${entry.company}/ +`, row: i });
    }
  });
  lines.push({ text: ' ', blank: true });
  lines.push({ text: ' ', blank: true });
  lines.push({ text: ' ', blank: true });
  lines.push({ text: HERO.experienceFooter });

  return (
    <section className="intro">
      {/* Amro's own handwritten signature (raster, transparent
          background). Same placement/sizing as the original's SVG
          scribble; it wipes in left-to-right instead of a stroke draw. */}
      <img
        className="signature"
        src={AMRO_SIGNATURE_DATA_URI}
        alt=""
        aria-hidden="true"
        draggable={false}
      />

      <header className="header">
        <button
          type="button"
          className="mascot"
          aria-label="Boop Krish"
          ref={mascot.btnRef}
          onClick={mascot.onBoop}
        >
          <span className="mascot-body" ref={mascot.bodyRef}>
            <span
              className="mascot-frames"
              ref={mascot.framesRef}
              style={{ backgroundImage: 'url(https://www.designengineer.fyi/mascot/krish-directions.webp)', backgroundPosition: '50% 50%' }}
            />
          </span>
        </button>
        <div>
          <h1 className="name">{HERO.name}</h1>
          <p className="tagline">
            Staff Product Designer &amp; <span className="nowrap">Design Engineer</span>
          </p>
        </div>
      </header>

      <p className="bio">
        {HERO.bio.map((part, i) =>
          part.pill ? (
            <span className="pill" key={i}>
              <PillIcon kind={part.pill} />
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>

      <pre className="tree" role="img" aria-label={EXPERIENCE_ARIA_LABEL} style={{ '--cols': 52 } as CSSProperties}>
        {lines.map((line, i) =>
          line.row !== undefined ? (
            <span
              key={i}
              className="tree-row"
              role="button"
              tabIndex={0}
              onClick={() => toggleRow(line.row as number)}
              onKeyDown={(e) => onRowKey(e, line.row as number)}
            >
              {line.text}
            </span>
          ) : (
            <span key={i} className="tree-static">
              {line.text}
            </span>
          ),
        )}
      </pre>
    </section>
  );
}
