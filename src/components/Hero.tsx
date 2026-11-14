import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { EXPERIENCE, EXPERIENCE_ARIA_LABEL, HERO } from '../data/clone';

const SIGNATURE_PATHS = [
  'M300 40 C285 135 250 235 215 330',
  'M560 45 C470 85 360 140 278 172 C338 190 395 225 432 258 C447 272 462 258 472 238 C484 213 492 190 507 178 C520 168 530 180 540 186 C552 192 567 186 580 178 C588 198 592 220 606 218 C620 216 630 196 638 180 C644 168 660 164 668 172 C678 183 664 202 648 212 C672 214 696 204 714 190 C752 150 795 85 820 44 C832 24 816 18 802 38 C780 75 762 150 748 222 C764 196 784 174 804 174 C822 174 820 200 828 216 C834 228 854 222 872 208 C960 175 1100 168 1300 175',
];

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

/** 3x3 direction sprite: the face looks toward the pointer. */
function useMascot() {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
  const [boop, setBoop] = useState(false);

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const col = dx < -0.33 ? 0 : dx > 0.33 ? 2 : 1;
    const row = dy < -0.33 ? 0 : dy > 0.33 ? 2 : 1;
    if (framesRef.current) {
      framesRef.current.style.backgroundPosition = `${col * 50}% ${row * 50}%`;
    }
  };

  const onPointerLeave = () => {
    if (framesRef.current) framesRef.current.style.backgroundPosition = '50% 50%';
  };

  const onBoop = () => {
    setBoop(false);
    requestAnimationFrame(() => setBoop(true));
  };

  return { bodyRef, framesRef, boop, onPointerMove, onPointerLeave, onBoop };
}

export default function Hero() {
  const sigRef = useRef<SVGSVGElement>(null);
  const [expanded, setExpanded] = useState(0);
  const mascot = useMascot();

  // Measure signature paths so the draw-on animation has real lengths.
  useEffect(() => {
    const svg = sigRef.current;
    if (!svg) return;
    svg.querySelectorAll('path').forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.setProperty('--len', `${len}`);
      path.style.setProperty('--dur', '0.9s');
      path.style.setProperty('--delay', `${0.15 + i * 0.45}s`);
    });
  }, []);

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
      <svg
        ref={sigRef}
        className="signature"
        viewBox="80 20 1240 330"
        fill="none"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {SIGNATURE_PATHS.map((d) => (
          <path key={d.slice(0, 12)} d={d} />
        ))}
      </svg>

      <header className="header">
        <button
          type="button"
          className="mascot"
          aria-label="Boop Krish"
          style={{ width: 104, height: 104 }}
          onPointerMove={mascot.onPointerMove}
          onPointerLeave={mascot.onPointerLeave}
          onClick={mascot.onBoop}
        >
          <span className="mascot-body" ref={mascot.bodyRef} data-boop={mascot.boop ? '' : undefined}>
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
