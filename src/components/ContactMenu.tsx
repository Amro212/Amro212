import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CONTACT } from '../data/clone';
import { glideTick, initAudio, pressSound, slideSound } from '../audio';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="contact-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

function RowIcon({ kind }: { kind: 'linkedin' | 'resume' | 'email' | 'mentorship' }) {
  const props = {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  };
  if (kind === 'linkedin') {
    return (
      <svg {...props}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <path d="M8 10.5V16M8 7.75v.01M11.5 16v-5.5M11.5 13c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v3" />
      </svg>
    );
  }
  if (kind === 'resume') {
    return (
      <svg {...props}>
        <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3.5V8h4.5M9 12.5h6M9 16h4" />
      </svg>
    );
  }
  if (kind === 'email') {
    return (
      <svg {...props}>
        <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
        <path d="M15.5 8.5V6.5a2.5 2.5 0 0 0-2.5-2.5H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.5a3 3 0 0 1 0 5M17.5 14a5 5 0 0 1 3 5" />
    </svg>
  );
}

type RowId = 'linkedin' | 'resume' | 'email' | 'mentorship';
type Row = { id: RowId; label: string; hint: string; href?: string };

const ROWS: Row[] = [
  { id: 'linkedin', label: 'linkedin', hint: 'L', href: CONTACT.linkedin },
  { id: 'resume', label: 'resume', hint: 'R' },
  { id: 'email', label: 'copy email', hint: 'C' },
  { id: 'mentorship', label: '1:1 mentorship', hint: 'M', href: CONTACT.mentorship },
];

const SHORTCUTS: Record<string, RowId> = { l: 'linkedin', r: 'resume', c: 'email', m: 'mentorship' };

type Phase = 'closed' | 'opening' | 'open' | 'closing';

export default function ContactMenu({ onOpenResume }: { onOpenResume: (from: DOMRect, home: () => HTMLElement | null) => void }) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [pressed, setPressed] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<RowId | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const glideRef = useRef<HTMLSpanElement>(null);
  const pillRectRef = useRef<DOMRect | null>(null);
  const closeAnimsRef = useRef<Animation[]>([]);
  const keyboardRef = useRef(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const resumeOpenRef = useRef(false);
  const open = phase !== 'closed';
  const copied = copiedId === 'email';

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const moveGlide = (el: HTMLElement | null) => {
    const glide = glideRef.current;
    if (!glide) return;
    if (!el) { glide.removeAttribute('data-on'); return; }
    const wasOn = glide.hasAttribute('data-on');
    glide.style.transform = `translateY(${el.offsetTop}px)`;
    glide.style.height = `${el.offsetHeight}px`;
    glide.setAttribute('data-on', '');
    if (wasOn) glideTick();
  };

  const openMenu = (keyboard: boolean) => {
    if (phase !== 'closed') return;
    pillRectRef.current = capRef.current?.getBoundingClientRect() ?? null;
    keyboardRef.current = keyboard;
    initAudio();
    slideSound(true);
    setPhase(reducedMotion() ? 'open' : 'opening');
  };

  const closeMenu = (keyboard: boolean) => {
    if (phase !== 'open') return;
    keyboardRef.current = keyboard;
    moveGlide(null);
    slideSound(false);
    setPhase(reducedMotion() ? 'closed' : 'closing');
  };

  // FLIP open: cap width/height 520ms, rows staggered 380ms (110 + 40t).
  useLayoutEffect(() => {
    if (phase !== 'opening') return;
    const cap = capRef.current;
    const pill = pillRectRef.current;
    const rows = listRef.current?.querySelectorAll<HTMLElement>('.contact-row');
    if (!cap || !pill) { setPhase('open'); return; }
    const openRect = cap.getBoundingClientRect();
    const anim = cap.animate(
      [{ width: `${pill.width}px`, height: `${pill.height}px` }, { width: `${openRect.width}px`, height: `${openRect.height}px` }],
      { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );
    const rowAnims = Array.from(rows ?? []).map((row, t) =>
      row.animate(
        [
          { opacity: 0, transform: 'translateY(-6px)', filter: 'blur(4px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0px)' },
        ],
        { duration: 380, delay: 110 + 40 * t, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
      ),
    );
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Do NOT cancel here: cancelling removes the fill while the rows
      // are still mounted. The original only sets state on finish.
      setPhase('open');
    };
    anim.onfinish = finish;
    return () => { anim.cancel(); rowAnims.forEach((a) => a.cancel()); };
  }, [phase]);

  // FLIP close: rows fade 120ms, cap back to pill rect 380ms (delay 60).
  useLayoutEffect(() => {
    if (phase !== 'closing') return;
    const cap = capRef.current;
    const pill = pillRectRef.current;
    const rows = listRef.current?.querySelectorAll<HTMLElement>('.contact-row');
    if (!cap || !pill) { setPhase('closed'); return; }
    const openRect = cap.getBoundingClientRect();
    const rowAnims = Array.from(rows ?? []).map((row) =>
      row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' }),
    );
    const anim = cap.animate(
      [{ width: `${openRect.width}px`, height: `${openRect.height}px` }, { width: `${pill.width}px`, height: `${pill.height}px` }],
      { duration: 380, delay: 60, easing: 'cubic-bezier(0.6, 0, 0.3, 1)', fill: 'forwards' },
    );
    closeAnimsRef.current = [anim, ...rowAnims];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Do NOT cancel here: cancelling removes the fill before React
      // commits the unmount, flashing the menu open for a frame.
      // Cancellation happens in the phase === 'closed' effect below,
      // after the rows have unmounted (the original's S.current pattern).
      setPhase('closed');
    };
    anim.onfinish = finish;
    return () => { anim.cancel(); rowAnims.forEach((a) => a.cancel()); };
  }, [phase]);

  // Cancel the close animations only after the closed commit unmounted
  // the rows, so the cap's natural size is already the pill size.
  useLayoutEffect(() => {
    if (phase === 'closed') {
      closeAnimsRef.current.forEach((a) => a.cancel());
      closeAnimsRef.current = [];
    }
  }, [phase]);

  // Focus management.
  useEffect(() => {
    if (phase === 'open' && keyboardRef.current) {
      listRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    }
    if (phase === 'closed' && keyboardRef.current) {
      headRef.current?.focus();
      keyboardRef.current = false;
    }
  }, [phase]);

  // Escape + outside-click (stand down while the resume modal is open).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (document.documentElement.dataset.resume === 'open') return;
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeMenu(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.documentElement.dataset.resume === 'open') return;
        closeMenu(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Global L/R/C/M shortcuts, from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const id = SHORTCUTS[key];
      if (!id || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const de = document.documentElement;
      if (de.dataset.intro === 'on' || de.dataset.project === 'open' || de.dataset.resume === 'open') return;
      const nav = navRef.current;
      if (!nav || getComputedStyle(nav).visibility === 'hidden') return;
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable || (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      initAudio();
      pressSound(true);
      setPressed(open ? id : 'key');
      if (open) {
        const rowEl = listRef.current?.querySelector<HTMLElement>(`[data-way="${id}"]`);
        if (rowEl) moveGlide(rowEl);
      }
      void activate(id);
    };
    const onKeyUp = (e: globalThis.KeyboardEvent) => {
      if (SHORTCUTS[e.key.toLowerCase()]) setPressed(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copyEmail = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = CONTACT.email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { return false; }
    }
    return true;
  };

  const activate = async (id: RowId) => {
    initAudio();
    if (id === 'linkedin') { window.open(CONTACT.linkedin, '_blank', 'noopener,noreferrer'); return; }
    if (id === 'mentorship') { window.open(CONTACT.mentorship, '_blank', 'noopener,noreferrer'); return; }
    if (id === 'resume') {
      // Menu stays open; FLIP source is the row rect (or the cap rect).
      const rowEl = listRef.current?.querySelector<HTMLElement>('[data-way="resume"]');
      const from = rowEl?.getBoundingClientRect() ?? capRef.current?.getBoundingClientRect();
      if (!from) return;
      resumeOpenRef.current = true;
      onOpenResume(from, () => listRef.current?.querySelector<HTMLElement>('[data-way="resume"]') ?? capRef.current);
      return;
    }
    const ok = await copyEmail();
    if (ok) {
      setCopiedId('email');
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1800);
    } else {
      window.location.href = `mailto:${CONTACT.email}`;
    }
  };

  const onListKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const list = e.currentTarget;
    const items = Array.from(list.querySelectorAll<HTMLElement>('a, button'));
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      items[(idx + dir + items.length) % items.length]?.focus();
    }
  };

  const rowPress = (id: RowId) => ({
    onPointerDown: () => { initAudio(); pressSound(true); setPressed(id); },
    onPointerUp: () => setPressed((cur) => (cur === id ? null : cur)),
    onPointerLeave: () => setPressed((cur) => (cur === id ? null : cur)),
  });

  return (
    <nav className="contact" aria-label="Contact" ref={navRef}>
      <div
        className="contact-cap"
        ref={capRef}
        data-open={open ? '' : undefined}
        data-phase={phase}
        data-down={pressed === 'key' && !open ? '' : undefined}
      >
        <button
          ref={headRef}
          type="button"
          className="contact-head"
          aria-expanded={phase === 'open' || phase === 'opening'}
          aria-controls="contact-ways"
          onClick={(e) => (phase === 'closed' ? openMenu(e.detail === 0) : closeMenu(e.detail === 0))}
          onPointerDown={() => { initAudio(); setPressed('key'); }}
          onPointerUp={() => setPressed((cur) => (cur === 'key' ? null : cur))}
          onPointerLeave={() => setPressed((cur) => (cur === 'key' ? null : cur))}
        >
          <span className="contact-label">
            <span className="contact-face" aria-hidden={copied && !open}>
              contact
            </span>
            <span className="contact-face contact-face-done" aria-hidden={!copied || open}>
              <CheckIcon />
              copied
            </span>
          </span>
          <ChevronIcon />
        </button>
        {open ? (
          <div className="contact-ways" onPointerLeave={() => moveGlide(null)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) moveGlide(null); }}>
            <span ref={glideRef} className="contact-glide" aria-hidden="true" />
            <ul ref={listRef} id="contact-ways" className="contact-list" onKeyDown={onListKeyDown}>
              {ROWS.map((row) => {
                const done = copiedId === row.id;
                const inner = (
                  <>
                    <span className="contact-row-icon">{done ? <CheckIcon /> : <RowIcon kind={row.id} />}</span>
                    <span className="contact-row-label">{done ? 'copied' : row.label}</span>
                    <kbd className="contact-kbd" aria-hidden="true">{row.hint}</kbd>
                  </>
                );
                const common = {
                  className: 'contact-row',
                  'data-way': row.id,
                  'data-down': pressed === row.id ? '' : undefined,
                  'data-done': done ? '' : undefined,
                  'aria-keyshortcuts': row.hint,
                  onPointerEnter: (e: { currentTarget: HTMLElement }) => moveGlide(e.currentTarget),
                  onFocus: (e: { currentTarget: HTMLElement }) => moveGlide(e.currentTarget),
                };
                return (
                  <li key={row.id}>
                    {row.href ? (
                      <a href={row.href} target="_blank" rel="noopener noreferrer" {...common} {...rowPress(row.id)} onClick={() => void activate(row.id)}>
                        {inner}
                      </a>
                    ) : (
                      <button type="button" {...common} {...rowPress(row.id)} onClick={() => void activate(row.id)}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
      <span className="contact-status" role="status" aria-live="polite">
        {copiedId === 'email' ? 'Email copied' : ''}
      </span>
    </nav>
  );
}
