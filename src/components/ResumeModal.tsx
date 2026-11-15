import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clickSound, initAudio } from '../audio';

// No hosted resume PDF exists for Amro (verified Nov 15, 2026: no
// resume/cv file in the old tree bf2295d, and every candidate URL on
// https://itsamro.me/ returns 404). Until one is hosted, the modal's
// primary action sends visitors to his LinkedIn instead. Do not invent
// a resume URL here; add a real hosted PDF and restore the viewer then.
const LINKEDIN_URL = 'https://www.linkedin.com/in/amro-abedmoosa';

interface Props {
  from: DOMRect;
  home: () => HTMLElement | null;
  onClose: () => void;
}

export default function ResumeModal({ from, home, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  const [sheet, setSheet] = useState(false);
  const dragRef = useRef<{ y: number; t: number; dy: number } | null>(null);

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSheet = () => window.matchMedia('(max-width: 640px)').matches;

  // Mount: dataset flags + open sound + FLIP from the source rect.
  useLayoutEffect(() => {
    prevFocus.current = document.activeElement;
    document.documentElement.dataset.resume = 'open';
    document.documentElement.dataset.resumeMotion = '';
    setSheet(isSheet());
    initAudio();
    clickSound(true);
    const win = windowRef.current;
    if (win && !reduced()) {
      if (isSheet()) {
        win.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
          duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards',
        });
      } else {
        const target = win.getBoundingClientRect();
        const dx = from.left - target.left;
        const dy = from.top - target.top;
        const sx = from.width / target.width;
        const sy = from.height / target.height;
        win.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 460, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
        );
      }
    }
    windowRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    return () => {
      delete document.documentElement.dataset.resume;
      delete document.documentElement.dataset.resumeMotion;
      if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    const win = windowRef.current;
    clickSound(false);
    if (!win || reduced()) { onClose(); return; }
    const homeEl = home();
    let anim: Animation | null = null;
    if (isSheet()) {
      anim = win.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
        duration: 320, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards',
      });
    } else if (homeEl) {
      const homeRect = homeEl.getBoundingClientRect();
      const target = win.getBoundingClientRect();
      // Correct for the .page transform via DOMMatrix when measuring.
      const page = document.querySelector('.page');
      let hr = homeRect;
      if (page) {
        const cs = getComputedStyle(page);
        if (cs.transform !== 'none') {
          const m = new DOMMatrix(cs.transform);
          const ox = parseFloat(cs.transformOrigin.split(' ')[0]) || 0;
          const oy = parseFloat(cs.transformOrigin.split(' ')[1]) || 0;
          const s = m.a || 1;
          hr = new DOMRect(ox + (homeRect.left - ox - m.e) / s, oy + (homeRect.top - oy - m.f) / s, homeRect.width / s, homeRect.height / s);
        }
      }
      const dx = hr.left - target.left;
      const dy = hr.top - target.top;
      anim = win.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${hr.width / target.width}, ${hr.height / target.height})`, opacity: 0 },
        ],
        { duration: 340, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
      );
    } else {
      anim = win.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: 340, fill: 'forwards' });
    }
    if (anim) anim.onfinish = () => onClose();
    else onClose();
  };

  // Escape (capture, wins over the contact menu) + Tab trap.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); return; }
      if (e.key === 'Tab') {
        const win = windowRef.current;
        if (!win) return;
        const items = Array.from(win.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        if (!items.length) return;
        const first = items[0]; const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home]);

  // Sheet drag-to-dismiss.
  const onSheetPointerDown = (e: React.PointerEvent) => {
    if (!sheet) return;
    dragRef.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onSheetPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    d.dy = e.clientY - d.y;
    if (windowRef.current && d.dy > 0) windowRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onSheetPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !windowRef.current) return;
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    windowRef.current.style.transform = '';
    if (d.dy > 110 || velocity > 0.8) close();
    else if (windowRef.current) {
      windowRef.current.animate([{ transform: `translateY(${d.dy}px)` }, { transform: 'translateY(0)' }], {
        duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    }
  };

  return createPortal(
    <div className="rs" data-mode={sheet ? 'sheet' : 'window'}>
      <div className="rs-backdrop" onClick={close} />
      <div className="rs-window" ref={windowRef} role="dialog" aria-modal="true" aria-label="Resume">
        {sheet ? (
          <div className="rs-sheet-head" onPointerDown={onSheetPointerDown} onPointerMove={onSheetPointerMove} onPointerUp={onSheetPointerUp}>
            <span className="rs-grab" />
            <span className="rs-title">Resume</span>
            <button type="button" className="rs-close" onClick={close} aria-label="Close resume">✕</button>
          </div>
        ) : (
          <div className="rs-bar">
            <button type="button" className="rs-close" onClick={close}>
              <span aria-hidden="true">✕</span> close <kbd className="rs-kbd">esc</kbd>
            </button>
            <span className="rs-title">Resume</span>
            <div className="rs-actions">
              <a className="rs-action" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="View Amro Abed Moosa on LinkedIn">view on linkedin</a>
            </div>
          </div>
        )}
        <div className="rs-body" ref={bodyRef}>
          <div className="rs-page rs-page-linkedin">
            <p>Amro Abed Moosa&rsquo;s resume isn&rsquo;t hosted here yet.</p>
            <p>See his full experience and background on LinkedIn.</p>
            <a className="rs-action" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">view on linkedin</a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
