import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CONTACT } from '../data/clone';

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
  if (kind === 'linkedin') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    );
  }
  if (kind === 'resume') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }
  if (kind === 'email') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type Row = {
  id: 'linkedin' | 'resume' | 'email' | 'mentorship';
  label: string;
  hint: string;
  href?: string;
};

const ROWS: Row[] = [
  { id: 'linkedin', label: 'linkedin', hint: 'L', href: CONTACT.linkedin },
  { id: 'resume', label: 'resume', hint: 'R' },
  { id: 'email', label: 'copy email', hint: 'C' },
  { id: 'mentorship', label: '1:1 mentorship', hint: 'M', href: CONTACT.mentorship },
];

export default function ContactMenu({ onOpenResume }: { onOpenResume: () => void }) {
  const [open, setOpen] = useState(false);
  const [down, setDown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [glide, setGlide] = useState<{ top: number; height: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        headRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CONTACT.email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const activate = (row: Row) => {
    if (row.id === 'email') void copyEmail();
    else if (row.id === 'resume') {
      setOpen(false);
      onOpenResume();
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
      return;
    }
    const byHint = ROWS.find((r) => r.hint.toLowerCase() === e.key.toLowerCase());
    if (byHint) {
      e.preventDefault();
      if (byHint.href) window.open(byHint.href, '_blank', 'noopener');
      else activate(byHint);
    }
  };

  const onRowHover = (e: { currentTarget: HTMLElement }) => {
    const el = e.currentTarget;
    setGlide({ top: el.offsetTop, height: el.offsetHeight });
  };

  return (
    <nav className="contact" aria-label="Contact" ref={navRef}>
      <div className="contact-cap" data-open={open ? '' : undefined} data-phase={open ? 'open' : 'closed'} data-down={down && !open ? '' : undefined}>
        <button
          ref={headRef}
          type="button"
          className="contact-head"
          aria-expanded={open}
          aria-controls="contact-ways"
          onClick={() => setOpen((v) => !v)}
          onPointerDown={() => setDown(true)}
          onPointerUp={() => setDown(false)}
          onPointerLeave={() => setDown(false)}
        >
          <span className="contact-label">
            <span className="contact-face" aria-hidden={copied}>
              contact
            </span>
            <span className="contact-face contact-face-done" aria-hidden={!copied}>
              <CheckIcon />
              copied
            </span>
          </span>
          <ChevronIcon />
        </button>
        {open ? (
          <div className="contact-ways">
            <span
              className="contact-glide"
              aria-hidden="true"
              style={glide ? { top: glide.top, height: glide.height, opacity: 1 } : undefined}
            />
            <ul id="contact-ways" className="contact-list" onKeyDown={onListKeyDown} onPointerLeave={() => setGlide(null)}>
              {ROWS.map((row) => {
                const inner = (
                  <>
                    <span className="contact-row-icon">
                      <RowIcon kind={row.id} />
                    </span>
                    <span className="contact-row-label">{row.label}</span>
                    <span className="contact-kbd" aria-hidden="true">
                      {row.hint}
                    </span>
                  </>
                );
                return (
                  <li key={row.id}>
                    {row.href ? (
                      <a
                        className="contact-row"
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onPointerEnter={onRowHover}
                        onFocus={onRowHover}
                      >
                        {inner}
                      </a>
                    ) : (
                      <button type="button" className="contact-row" onClick={() => activate(row)} onPointerEnter={onRowHover} onFocus={onRowHover}>
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
        {copied ? 'Email copied' : ''}
      </span>
    </nav>
  );
}
