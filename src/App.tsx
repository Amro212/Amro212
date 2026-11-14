import { useCallback, useEffect, useRef, useState } from 'react';
import ContactMenu from './components/ContactMenu';
import { FilmLight, Pond } from './components/Effects';
import Hero from './components/Hero';
import IntroOverlay from './components/IntroOverlay';
import ProjectCard from './components/ProjectCard';
import Slider from './components/Slider';
import { PROJECTS } from './data/clone';

const SLIDE_COUNT = 10; // 00 intro + 09 projects

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resumeOpen, setResumeOpen] = useState(false);

  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const geomRef = useRef({ firstStep: 740, pitch: 624 });
  const snapTimer = useRef<number | undefined>(undefined);
  const wheelAccum = useRef(0);
  const dragRef = useRef<{ pointerId: number; startX: number; startProgress: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  const current = Math.max(0, Math.min(9, Math.round(progress)));

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    if (cards.length === 0) return;
    const vw = window.innerWidth;
    const first = cards[0];
    const firstStep = first.offsetLeft + first.offsetWidth / 2 - vw / 2;
    const pitch = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : first.offsetWidth;
    geomRef.current = { firstStep, pitch };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.intro = 'on';
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Spring the continuous progress toward its snap target.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = targetRef.current;
      const p = progressRef.current;
      const diff = target - p;
      if (Math.abs(diff) < 0.0005) {
        if (p !== target) {
          progressRef.current = target;
          setProgress(target);
        }
        return;
      }
      const next = p + diff * (1 - Math.exp(-dt * 14));
      progressRef.current = next;
      setProgress(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(9, index));
    targetRef.current = clamped;
  }, []);

  const setProgressDirect = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(9, value));
    progressRef.current = clamped;
    targetRef.current = clamped;
    setProgress(clamped);
  }, []);

  const scheduleSnap = useCallback(() => {
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      targetRef.current = Math.max(0, Math.min(9, Math.round(progressRef.current)));
    }, 140);
  }, []);

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    document.documentElement.dataset.intro = 'done';
    document.documentElement.style.setProperty('--sig-end', '1.2s');
  }, []);

  // Resume modal: blur the page while it is open (mirrors the original).
  useEffect(() => {
    if (resumeOpen) {
      document.documentElement.dataset.resumeMotion = '';
      document.documentElement.dataset.resume = 'open';
    } else {
      delete document.documentElement.dataset.resume;
      delete document.documentElement.dataset.resumeMotion;
    }
  }, [resumeOpen]);

  useEffect(() => {
    if (!resumeOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setResumeOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [resumeOpen]);

  // Arrow-key navigation when focus is not inside the slider or contact menu.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!introDone || resumeOpen) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest('.slider, .contact, input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introDone, resumeOpen, current, goTo]);

  const pxFromProgress = (s: number) => {
    const { firstStep, pitch } = geomRef.current;
    return s <= 1 ? s * firstStep : firstStep + (s - 1) * pitch;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!introDone || resumeOpen) return;
    if ((e.target as HTMLElement).closest('.slider, .contact')) return;
    // Let the intro column scroll natively on short screens.
    const layer = introLayerRef.current;
    if (layer && Math.abs(e.deltaY) > Math.abs(e.deltaX) && layer.scrollHeight > layer.clientHeight + 4) {
      const atTop = layer.scrollTop <= 0 && e.deltaY < 0;
      const atBottom = layer.scrollTop + layer.clientHeight >= layer.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) return;
    }
    // One slide per wheel notch: accumulate deltas and step the target.
    wheelAccum.current += e.deltaY + e.deltaX;
    while (Math.abs(wheelAccum.current) >= 100) {
      const step = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current -= step * 100;
      targetRef.current = Math.max(0, Math.min(9, targetRef.current + step));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!introDone || resumeOpen) return;
    if ((e.target as HTMLElement).closest('.slider, .contact, button, .tree-row')) return;
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startProgress: progressRef.current, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (!drag.moved) return;
    const next = Math.max(0, Math.min(9, drag.startProgress - dx / geomRef.current.pitch));
    progressRef.current = next;
    targetRef.current = next;
    setProgress(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (drag.moved) {
      draggedRef.current = true;
      targetRef.current = Math.max(0, Math.min(9, Math.round(progressRef.current)));
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 50);
    }
  };

  // Suppress the click that follows a drag so cards don't navigate.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const translate = -pxFromProgress(progress);
  const introOpacity = 1 - Math.max(0, Math.min(1, progress / 0.6));

  return (
    <>
      <FilmLight />
      {!introDone ? <IntroOverlay onDone={handleIntroDone} /> : null}
      <main className="page" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClickCapture={onClickCapture}>
        <Pond ready={introDone} />
        <div
          className="intro-layer"
          ref={introLayerRef}
          style={{ transform: `translateX(${translate.toFixed(1)}px)`, opacity: introOpacity }}
        >
          <Hero />
        </div>
        <div className="stage-light" aria-hidden="true" />
        <div className="projects" ref={trackRef} style={{ transform: `translateX(${translate.toFixed(1)}px)` }}>
          {PROJECTS.map((project, i) => {
            const { firstStep, pitch } = geomRef.current;
            const offsetPx = firstStep + i * pitch - pxFromProgress(progress);
            return (
              <ProjectCard
                key={project.title}
                project={project}
                index={i}
                offsetPx={offsetPx}
                active={i === current - 1 && introDone}
                onCardClick={() => undefined}
              />
            );
          })}
        </div>
        <ContactMenu onOpenResume={() => setResumeOpen(true)} />
        <Slider
          progress={progress}
          current={current}
          onJump={goTo}
          onScrub={(fraction) => setProgressDirect(fraction * (SLIDE_COUNT - 1))}
          onScrubEnd={scheduleSnap}
        />
      </main>
      {resumeOpen ? (
        <div className="resume-modal" role="dialog" aria-modal="true" aria-label="Resume">
          <div className="resume-modal-backdrop" onClick={() => setResumeOpen(false)} />
          <div className="resume-modal-card">
            <h2>Resume</h2>
            <p>
              Placeholder for phase 2. The original site opens the resume here; Amro&apos;s resume file
              will be linked in this spot when the content is swapped in.
            </p>
            <button type="button" onClick={() => setResumeOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
