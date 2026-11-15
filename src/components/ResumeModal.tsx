import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clickSound, initAudio } from '../audio';

const RESUME_PDF = 'https://www.designengineer.fyi/resume/shai-resume.pdf';
const RESUME_IMG = 'https://www.designengineer.fyi/resume/shai-resume.png';
const PORTFOLIO_URL = 'https://shai-portfolio-eta.vercel.app/';

interface Props {
  from: DOMRect;
  home: () => HTMLElement | null;
  onClose: () => void;
}

export default function ResumeModal({ from, home, onClose }: Props) {
  const windowRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  const [zoom, setZoom] = useState(1);
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

  // Escape (capture, wins over the contact menu) + zoom keys + Tab trap.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-')) {
        e.preventDefault();
        setZoom((z) => Math.min(3, Math.max(1, z + (e.key === '-' ? -0.25 : 0.25))));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); return; }
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

  // Ctrl/meta + wheel zoom, anchored at the pointer.
  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const body = bodyRef.current;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    const old = zoom;
    const next = Math.min(3, Math.max(1, old - Math.sign(e.deltaY) * 0.25));
    if (next === old) return;
    setZoom(next);
    body.scrollLeft += (px + body.scrollLeft) * (next / old - 1);
    body.scrollTop += (py + body.scrollTop) * (next / old - 1);
  };

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

  const pct = Math.round(zoom * 100);

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
              <button type="button" className="rs-action" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out">−</button>
              <button type="button" className="rs-action rs-zoom-pct" onClick={() => setZoom(1)} aria-label="Reset zoom">{pct}%</button>
              <button type="button" className="rs-action" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">+</button>
              <a className="rs-action" href={RESUME_PDF} download="Shai-Krishna-Resume.pdf" aria-label="Download PDF">download</a>
              <a className="rs-action" href={RESUME_PDF} target="_blank" rel="noopener noreferrer" aria-label="Open PDF">open pdf</a>
            </div>
          </div>
        )}
        <div className="rs-body" ref={bodyRef} data-zoomed={zoom > 1 ? '' : undefined} onWheel={onWheel} onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}>
          <div className="rs-page" style={{ width: `${zoom * 100}%` }}>
            <img src={RESUME_IMG} alt="Shai Krishna's resume" width={3600} height={4659} />
            <a className="rs-page-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" aria-label="View my portfolio" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
