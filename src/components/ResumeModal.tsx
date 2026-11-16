import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clickSound, initAudio } from '../audio';
import {
  PORTFOLIO_URL,
  RESUME_IMG,
  RESUME_IMG_HEIGHT,
  RESUME_IMG_WIDTH,
  RESUME_PDF,
  RESUME_PDF_FILENAME,
} from '../data/resume';

interface Props {
  from: DOMRect;
  home: () => HTMLElement | null;
  onClose: () => void;
}

interface LayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DURATION_OPEN = { duration: 460, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' };
const DURATION_CLOSE_FLIP = { duration: 340, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' };
const DURATION_SHEET_IN = { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
const DURATION_SHEET_OUT = { duration: 320, easing: 'cubic-bezier(0.4, 0, 1, 1)' };

const computeTransform = (fromRect: LayoutRect, toRect: LayoutRect) =>
  `translate(${fromRect.left - toRect.left}px, ${fromRect.top - toRect.top}px) scale(${fromRect.width / toRect.width}, ${fromRect.height / toRect.height})`;

const getRect = (el: HTMLElement): LayoutRect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

export default function ResumeModal({ from, home, onClose }: Props) {
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening');
  const [isSheet, setIsSheet] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false));
  const [layout, setLayout] = useState<LayoutRect | null>(null);

  const windowRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);
  const sheetDragRef = useRef<{ id: number; x: number; y: number; t: number; dy: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [pageWidth, setPageWidth] = useState(0);
  const focusRef = useRef<{ fx: number; fy: number; x: number; y: number } | null>(null);

  const isReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Track responsive sheet mode.
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsSheet(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Compute centered window bounds for desktop.
  useLayoutEffect(() => {
    if (isSheet) return;
    const updateLayout = () => {
      const w = Math.min(820, window.innerWidth - 64);
      const h = Math.min(window.innerHeight - 64, 1060);
      setLayout({
        left: Math.round((window.innerWidth - w) / 2),
        top: Math.round((window.innerHeight - h) / 2),
        width: w,
        height: h,
      });
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [isSheet]);

  // Opening animation: FLIP from trigger rect or slide up in sheet mode.
  useLayoutEffect(() => {
    const win = windowRef.current;
    if (phase !== 'opening' || !win || (!isSheet && !layout) || openedRef.current) return;
    openedRef.current = true;

    const doc = document.documentElement;
    doc.dataset.resumeMotion = '';
    doc.dataset.resume = 'open';
    initAudio();
    clickSound(true);

    const onFinish = () => {
      delete doc.dataset.resumeMotion;
      setPhase('open');
      closeBtnRef.current?.focus({ preventScroll: true });
    };

    if (isReducedMotion()) {
      onFinish();
      return;
    }

    const anim = isSheet
      ? win.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], DURATION_SHEET_IN)
      : win.animate(
          [
            { transform: computeTransform(from, getRect(win)), opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: 'none', opacity: 1 },
          ],
          DURATION_OPEN,
        );

    anim.onfinish = onFinish;
    return () => {
      try {
        anim.cancel();
      } catch {}
    };
  }, [phase, layout, isSheet, from]);

  // Close trigger and closing animation.
  const close = useCallback(() => {
    setPhase((prev) => (prev !== 'closing' ? 'closing' : prev));
  }, []);

  useLayoutEffect(() => {
    const win = windowRef.current;
    if (phase !== 'closing' || !win) return;

    const doc = document.documentElement;
    const homeEl = home();
    const homeRect: LayoutRect | null = homeEl
      ? (() => {
          const page = document.querySelector('.page');
          const cs = page ? getComputedStyle(page) : null;
          const m = cs && cs.transform !== 'none' ? new DOMMatrix(cs.transform) : null;
          const r = m?.a || 1;
          const [ox, oy] = (cs?.transformOrigin ?? '0 0').split(' ').map(parseFloat);
          const rect = homeEl.getBoundingClientRect();
          return {
            left: ox + (rect.left - ox - (m?.e ?? 0)) / r,
            top: oy + (rect.top - oy - (m?.f ?? 0)) / r,
            width: rect.width / r,
            height: rect.height / r,
          };
        })()
      : null;

    doc.dataset.resumeMotion = '';
    delete doc.dataset.resume;
    clickSound(false);

    const onFinish = () => {
      delete doc.dataset.resumeMotion;
      onClose();
      const targetEl = homeEl instanceof HTMLElement ? homeEl : prevFocus.current;
      if (targetEl instanceof HTMLElement) {
        targetEl.focus({ preventScroll: true });
      }
    };

    if (isReducedMotion()) {
      onFinish();
      return;
    }

    const curTransform = getComputedStyle(win).transform;
    const anim = isSheet
      ? win.animate(
          [
            { transform: curTransform === 'none' ? 'translateY(0)' : curTransform },
            { transform: 'translateY(100%)' },
          ],
          { ...DURATION_SHEET_OUT, fill: 'forwards' },
        )
      : homeRect
      ? win.animate(
          [
            { transform: 'none', opacity: 1 },
            { opacity: 1, offset: 0.7 },
            { transform: computeTransform(homeRect, getRect(win)), opacity: 0 },
          ],
          { ...DURATION_CLOSE_FLIP, fill: 'forwards' },
        )
      : win.animate(
          [
            { opacity: 1 },
            { opacity: 0, transform: 'scale(0.96)' },
          ],
          { ...DURATION_CLOSE_FLIP, fill: 'forwards' },
        );

    anim.onfinish = onFinish;
  }, [phase, isSheet, home, onClose]);

  // Clean dataset flags on unmount.
  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.resume;
      delete document.documentElement.dataset.resumeMotion;
    };
  }, []);

  // Measure base page width using ResizeObserver on scroll body.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const update = () => {
      const cs = getComputedStyle(body);
      setPageWidth(Math.min(760, body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(body);
    return () => ro.disconnect();
  }, [layout]);

  // Zoom callback preserving focal point.
  const setZoomAnchor = useCallback(
    (targetZoom: number, point?: { x: number; y: number }, hold?: { fx: number; fy: number }) => {
      const body = bodyRef.current;
      const page = pageRef.current;
      if (!body || !page) return;

      const clamped = Math.round(100 * Math.min(3, Math.max(1, targetZoom))) / 100;
      const bodyRect = body.getBoundingClientRect();
      const sx = point?.x ?? (bodyRect.left + body.clientWidth / 2);
      const sy = point?.y ?? (bodyRect.top + body.clientHeight / 2);
      const pageRect = page.getBoundingClientRect();

      focusRef.current = {
        ...(hold ?? {
          fx: (sx - pageRect.left) / pageRect.width,
          fy: (sy - pageRect.top) / pageRect.height,
        }),
        x: sx,
        y: sy,
      };

      if (clamped === zoomRef.current) {
        const f = focusRef.current;
        focusRef.current = null;
        body.scrollLeft += pageRect.left + f.fx * pageRect.width - f.x;
        body.scrollTop += pageRect.top + f.fy * pageRect.height - f.y;
        return;
      }

      zoomRef.current = clamped;
      setZoom(clamped);
    },
    [],
  );

  // Re-anchor scroll on zoom change.
  useLayoutEffect(() => {
    const f = focusRef.current;
    const body = bodyRef.current;
    const page = pageRef.current;
    if (!f || !body || !page) return;
    focusRef.current = null;
    const pageRect = page.getBoundingClientRect();
    body.scrollLeft += pageRect.left + f.fx * pageRect.width - f.x;
    body.scrollTop += pageRect.top + f.fy * pageRect.height - f.y;
  }, [zoom]);

  // Gestures: wheel with ctrl/meta, pinch-to-zoom, double-tap.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoomAnchor(zoomRef.current * Math.exp(-0.01 * e.deltaY), {
          x: e.clientX,
          y: e.clientY,
        });
      }
    };

    let pinchState: { d: number; z: number; hold: { fx: number; fy: number } } | null = null;
    let tapState = { t: 0, x: 0, y: 0 };
    let moved = false;

    const getDist = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const getMid = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      moved = false;
      if (e.touches.length === 2) {
        e.preventDefault();
        const mid = getMid(e.touches);
        const pageRect = pageRef.current?.getBoundingClientRect();
        if (pageRect) {
          pinchState = {
            d: getDist(e.touches),
            z: zoomRef.current,
            hold: {
              fx: (mid.x - pageRect.left) / pageRect.width,
              fy: (mid.y - pageRect.top) / pageRect.height,
            },
          };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      moved = true;
      if (pinchState && e.touches.length === 2) {
        e.preventDefault();
        setZoomAnchor(pinchState.z * (getDist(e.touches) / pinchState.d), getMid(e.touches), pinchState.hold);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchState = null;
      }
      if (e.touches.length !== 0 || e.changedTouches.length !== 1 || moved) return;
      const touch = e.changedTouches[0];
      const now = performance.now();
      if (now - tapState.t < 300 && Math.hypot(touch.clientX - tapState.x, touch.clientY - tapState.y) < 30) {
        e.preventDefault();
        setZoomAnchor(zoomRef.current > 1.05 ? 1 : 2, { x: touch.clientX, y: touch.clientY });
        tapState = { t: 0, x: 0, y: 0 };
      } else {
        tapState = { t: now, x: touch.clientX, y: touch.clientY };
      }
    };

    const onGestureStart = (e: Event) => e.preventDefault();

    body.addEventListener('wheel', onWheel, { passive: false });
    body.addEventListener('touchstart', onTouchStart, { passive: false });
    body.addEventListener('touchmove', onTouchMove, { passive: false });
    body.addEventListener('touchend', onTouchEnd, { passive: false });
    body.addEventListener('gesturestart', onGestureStart);

    return () => {
      body.removeEventListener('wheel', onWheel);
      body.removeEventListener('touchstart', onTouchStart);
      body.removeEventListener('touchmove', onTouchMove);
      body.removeEventListener('touchend', onTouchEnd);
      body.removeEventListener('gesturestart', onGestureStart);
    };
  }, [setZoomAnchor]);

  // Keyboard navigation: Escape, zoom keys, Tab trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      } else if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '0'].includes(e.key)) {
        e.preventDefault();
        setZoomAnchor(e.key === '0' ? 1 : zoomRef.current + (e.key === '-' ? -0.25 : 0.25));
      } else if (e.key === 'Tab' && windowRef.current) {
        const items = Array.from(windowRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        items[e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : (idx + 1) % items.length]?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [close, setZoomAnchor]);

  // Mobile sheet drag-to-dismiss.
  const onSheetPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!isSheet || phase !== 'open' || e.button !== 0 || (e.target as HTMLElement).closest('a, button')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    sheetDragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      dy: 0,
    };
  };

  const onSheetPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = sheetDragRef.current;
    if (drag && drag.id === e.pointerId && windowRef.current) {
      drag.dy = Math.max(0, e.clientY - drag.y);
      windowRef.current.style.transform = `translateY(${drag.dy}px)`;
    }
  };

  const onSheetPointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.id !== e.pointerId || !isSheet || !windowRef.current) return;
    sheetDragRef.current = null;
    const velocity = drag.dy / Math.max(1, performance.now() - drag.t);
    if (drag.dy > 110 || velocity > 0.8) {
      close();
      return;
    }
    const win = windowRef.current;
    const anim = win.animate([{ transform: win.style.transform }, { transform: 'translateY(0)' }], DURATION_SHEET_IN);
    anim.onfinish = () => {
      win.style.transform = '';
    };
  };

  const pct = Math.round(100 * zoom);

  const zoomControls = (
    <span className="rs-zoom">
      <button
        type="button"
        className="rs-zoom-step"
        onClick={() => setZoomAnchor(zoom - 0.25)}
        disabled={zoom <= 1}
        aria-label="Zoom out"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 12h12" />
        </svg>
      </button>
      <button
        type="button"
        className="rs-zoom-level"
        onClick={() => setZoomAnchor(1)}
        aria-label={`Zoom ${pct}%, reset`}
      >
        {pct}%
      </button>
      <button
        type="button"
        className="rs-zoom-step"
        onClick={() => setZoomAnchor(zoom + 0.25)}
        disabled={zoom >= 3}
        aria-label="Zoom in"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 12h12M12 6v12" />
        </svg>
      </button>
    </span>
  );

  const actions = (
    <span className="rs-actions">
      {zoomControls}
      <a
        className="rs-action"
        href={RESUME_PDF}
        download={RESUME_PDF_FILENAME}
        aria-label="Download PDF"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
        </svg>
        <span className="rs-action-label">download</span>
      </a>
      <a
        className="rs-action"
        href={RESUME_PDF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open PDF"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17 17 7" />
          <path d="M8.5 7H17v8.5" />
        </svg>
        <span className="rs-action-label">open pdf</span>
      </a>
    </span>
  );

  return createPortal(
    <div className="rs" data-mode={isSheet ? 'sheet' : 'window'} data-phase={phase}>
      <div className="rs-backdrop" onClick={close} />
      <div
        ref={windowRef}
        className="rs-window"
        role="dialog"
        aria-modal="true"
        aria-label="Resume"
        style={!isSheet && layout ? { left: layout.left, top: layout.top, width: layout.width, height: layout.height } : undefined}
      >
        {isSheet ? (
          <header
            className="rs-sheet-head"
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerEnd}
            onPointerCancel={onSheetPointerEnd}
          >
            <span className="rs-grab" aria-hidden="true" />
            <span className="rs-sheet-row">
              <span className="rs-title">{RESUME_PDF_FILENAME}</span>
              {actions}
              <button
                ref={closeBtnRef}
                type="button"
                className="rs-sheet-close"
                onClick={close}
                aria-label="Close resume"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M7 7l10 10M17 7 7 17" />
                </svg>
              </button>
            </span>
          </header>
        ) : (
          <header className="rs-bar">
            <button
              ref={closeBtnRef}
              type="button"
              className="rs-action rs-close"
              onClick={close}
              aria-label="Close resume"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M7 7l10 10M17 7 7 17" />
              </svg>
              close
              <span className="rs-esc" aria-hidden="true">esc</span>
            </button>
            <span className="rs-title">{RESUME_PDF_FILENAME}</span>
            {actions}
          </header>
        )}
        <div
          ref={bodyRef}
          className="rs-body"
          data-zoomed={zoom > 1 ? '' : undefined}
          onDoubleClick={(e) => {
            setZoomAnchor(zoomRef.current > 1.05 ? 1 : 2, { x: e.clientX, y: e.clientY });
          }}
        >
          <div
            ref={pageRef}
            className="rs-page"
            style={pageWidth ? { width: Math.round(pageWidth * zoom), maxWidth: 'none' } : undefined}
          >
            <img
              src={RESUME_IMG}
              alt="Amro Abed Moosa's resume"
              width={RESUME_IMG_WIDTH}
              height={RESUME_IMG_HEIGHT}
              draggable={false}
            />
            <a
              className="rs-page-link"
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View my portfolio"
              style={{ left: '67.8%', top: '4.4%', width: '5.2%', height: '1.1%' }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
