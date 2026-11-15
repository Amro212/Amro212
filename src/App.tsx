import { useCallback, useEffect, useRef, useState } from 'react';
import ContactMenu from './components/ContactMenu';
import { FilmLight } from './components/Effects';
import Hero from './components/Hero';
import Pond from './components/Pond';
import ProjectCard, { applyCardBodyStyle } from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import ResumeModal from './components/ResumeModal';
import Slider from './components/Slider';
import { PROJECTS } from './data/clone';
import { hardStopThud, initAudio, installAudioUnlock, scrollAmbience, snapTick, softTick } from './audio';

const SLIDE_COUNT = 10; // 00 intro + 09 projects

// Original track spring (ee()): semi-implicit Euler, 1/240 s substeps,
// dt clamped to 1/30, settle epsilon 0.05 px / 0.05 px/s.
const TRACK_K = 170;
const TRACK_C = 26;
const SUBSTEP = 1 / 240;

export default function App() {
  const [progress, setProgress] = useState(0);
  const [resumeReq, setResumeReq] = useState<{ from: DOMRect; home: () => HTMLElement | null } | null>(null);
  const [openProject, setOpenProject] = useState<number | null>(null);
  const [directProjectLoad, setDirectProjectLoad] = useState(false);

  const progressRef = useRef(0);
  const pxRef = useRef(0);
  const pxVelRef = useRef(0);
  const targetPxRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const sliderWrapRef = useRef<HTMLDivElement>(null);
  const geomRef = useRef({ firstStep: 740, pitch: 624, maxPx: 5732 });
  const railWidthRef = useRef(0);
  const snapTimer = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ pointerId: number; startX: number; startPx: number; moved: boolean; captured: boolean } | null>(null);
  const draggedRef = useRef(false);
  const heldRef = useRef(false);
  const overshootRef = useRef(0);
  const lastIndexRef = useRef(0);
  const lastKnobStepRef = useRef(0);
  const lastTickMsRef = useRef(0);
  const prevKnobPxRef = useRef(0);

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
    // Max scroll = track width - viewport, exactly as the original clamps
    // its last stop (5812 -> 5732 at 1440x900), leaving the last card
    // 80 px right of centre by design.
    const maxPx = Math.max(0, track.scrollWidth - vw);
    geomRef.current = { firstStep, pitch, maxPx };
    const rail = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-rail');
    if (rail) railWidthRef.current = rail.getBoundingClientRect().width;
  }, []);

  useEffect(() => {
    // No intro overlay: the hero is the first thing shown.
    document.documentElement.dataset.intro = 'done';
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    installAudioUnlock();
    // Deep link: a fresh load of /projects/<slug> opens the viewer,
    // like the original's real detail routes.
    const m = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
    if (m) {
      const idx = PROJECTS.findIndex((p) => !p.external && p.href === `/projects/${m[1]}`);
      if (idx >= 0) {
        setDirectProjectLoad(true);
        setOpenProject(idx);
      }
    }
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Track px for a slide position, clamped to the original's max scroll.
  const pxFromProgress = useCallback((s: number) => {
    const { firstStep, pitch, maxPx } = geomRef.current;
    const px = s <= 1 ? s * firstStep : firstStep + (s - 1) * pitch;
    return Math.max(0, Math.min(maxPx, px));
  }, []);

  const pxToProgress = useCallback((px: number) => {
    const { firstStep, pitch } = geomRef.current;
    return px <= firstStep ? px / firstStep : 1 + (px - firstStep) / pitch;
  }, []);

  const stopPxList = useCallback(() => {
    const stops: number[] = [];
    for (let s = 0; s < SLIDE_COUNT; s++) stops.push(pxFromProgress(s));
    return stops;
  }, [pxFromProgress]);

  const nearestStopPx = useCallback((px: number) => {
    const stops = stopPxList();
    let best = stops[0];
    for (const s of stops) if (Math.abs(s - px) < Math.abs(best - px)) best = s;
    return best;
  }, [stopPxList]);

  // Drive the track/intro/knob transforms imperatively; React state only
  // changes when the snapped index changes (no full-tree re-render at 60fps).
  // Card blur/tilt is also applied imperatively every frame: the React
  // `progress` state only updates on index change, so render-time props
  // would go stale mid-spring and the settled card would keep the
  // previous slide's blur.
  const applyTransformsPx = useCallback((px: number) => {
    const p = pxToProgress(px);
    const translate = -px;
    const introOpacity = 1 - Math.max(0, Math.min(1, p / 0.6));
    const intro = introLayerRef.current;
    if (intro) {
      intro.style.transform = `translateX(${translate.toFixed(1)}px)`;
      intro.style.opacity = `${introOpacity}`;
    }
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translateX(${translate.toFixed(1)}px)`;
      const { firstStep, pitch } = geomRef.current;
      track.querySelectorAll<HTMLElement>('[data-card]').forEach((card, i) => {
        const body = card.querySelector<HTMLElement>('.card-body');
        if (body) applyCardBodyStyle(body, firstStep + i * pitch - px, pitch);
      });
    }
    const knob = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-knob');
    if (knob) knob.style.left = `${(Math.max(0, Math.min(1, px / geomRef.current.maxPx)) * 100).toFixed(2)}%`;
  }, [pxToProgress]);

  // Spring the continuous track px toward its snap target, and fire the
  // carousel sounds from the knob's rounded 1/40-step changes.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = targetPxRef.current;
      let px = pxRef.current;
      let vel = pxVelRef.current;
      // Original spring: 1/240 s substeps, settle epsilon 0.05.
      const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        vel += (TRACK_K * (target - px) - TRACK_C * vel) * h;
        px += vel * h;
      }
      if (Math.abs(target - px) < 0.05 && Math.abs(vel) < 0.05) {
        px = target;
        vel = 0;
      }
      pxRef.current = px;
      pxVelRef.current = vel;
      const p = pxToProgress(px);
      progressRef.current = p;
      applyTransformsPx(px);
      // Knob position in rail px (0..railWidth), step = railWidth/40.
      const railW = railWidthRef.current || 1;
      const maxPx = geomRef.current.maxPx || 1;
      const knobPx = (px / maxPx) * railW;
      const stepPx = railW / 40;
      const knobVel = dt > 0 ? (knobPx - prevKnobPxRef.current) / dt : 0;
      prevKnobPxRef.current = knobPx;
      const pan = Math.max(-1, Math.min(1, (knobPx / railW) * 2 - 1));
      scrollAmbience(Math.abs(knobVel) * (heldRef.current ? 1 : 0.6), pan);
      // Snap / soft tick on rounded-step change, during motion.
      const nStep = Math.round(knobPx / stepPx);
      if (nStep !== lastKnobStepRef.current) {
        lastKnobStepRef.current = nStep;
        const stopSteps = new Set(stopPxList().map((s) => Math.round((s / maxPx) * 40)));
        if (stopSteps.has(nStep)) {
          snapTick(Math.abs(knobVel), pan);
        } else if (now - lastTickMsRef.current > 18 && Math.abs(knobVel) > 40) {
          lastTickMsRef.current = now;
          softTick(Math.abs(knobVel), pan);
        }
      }
      const idx = Math.round(p);
      if (idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        setProgress(p);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTransformsPx, pxToProgress]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(9, index));
    targetPxRef.current = pxFromProgress(clamped);
  }, [pxFromProgress]);

  const setProgressDirect = useCallback((fraction: number) => {
    const px = Math.max(0, Math.min(geomRef.current.maxPx, fraction * geomRef.current.maxPx));
    pxRef.current = px;
    pxVelRef.current = 0;
    targetPxRef.current = px;
    applyTransformsPx(px);
    const p = pxToProgress(px);
    progressRef.current = p;
    const idx = Math.round(p);
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setProgress(p);
    }
  }, [applyTransformsPx, pxToProgress]);

  const scheduleSnap = useCallback(() => {
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      // Snap the accumulated TARGET (wheel destination), not the current
      // spring position: snapping the position 180 ms in would drag a
      // 700px flick back to the slide it started from.
      targetPxRef.current = nearestStopPx(targetPxRef.current);
      // Hard-stop thud if the wheel/drag pushed past a track end.
      if (overshootRef.current > 80) {
        const maxPx = geomRef.current.maxPx || 1;
        const pan = Math.max(-1, Math.min(1, (pxRef.current / maxPx) * 2 - 1));
        hardStopThud(Math.min(1, overshootRef.current / 900), pan);
      }
      overshootRef.current = 0;
    }, 180);
  }, [nearestStopPx]);

  const closeProject = useCallback(() => {
    setOpenProject((cur) => {
      if (cur !== null) {
        window.setTimeout(() => {
          document.querySelectorAll<HTMLElement>('[data-card]')[cur]?.focus();
        }, 50);
      }
      return null;
    });
  }, []);

  const openProjectAt = useCallback((index: number) => {
    initAudio();
    setOpenProject(index);
  }, []);

  // Arrow-key navigation when focus is not inside the slider or contact menu.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (resumeReq || openProject !== null) return;
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
  }, [resumeReq, openProject, current, goTo]);

  // Original wheel mapping (eu()): continuous track px, 1 wheel px =
  // 1 track px, deltaMode line x16 / page x viewport width, snap 180 ms
  // after the last event.
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (resumeReq || openProject !== null) return;
    if ((e.target as HTMLElement).closest('.slider, .contact')) return;
    const layer = introLayerRef.current;
    if (layer && Math.abs(e.deltaY) > Math.abs(e.deltaX) && layer.scrollHeight > layer.clientHeight + 4) {
      const atTop = layer.scrollTop <= 0 && e.deltaY < 0;
      const atBottom = layer.scrollTop + layer.clientHeight >= layer.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) return;
    }
    const dominant = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const modeFactor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerWidth : 1;
    const deltaPx = dominant * modeFactor;
    const { maxPx } = geomRef.current;
    const next = targetPxRef.current + deltaPx;
    if ((next < 0 && deltaPx < 0) || (next > maxPx && deltaPx > 0)) {
      // Pushing past a track end: record overshoot velocity (knob px/s
      // estimate) for the hard-stop thud.
      const railW = railWidthRef.current || 1;
      const knobVelEst = Math.abs(deltaPx) * 60 * (railW / (maxPx || 1));
      overshootRef.current = Math.max(overshootRef.current, knobVelEst);
    }
    targetPxRef.current = Math.max(0, Math.min(maxPx, next));
    scheduleSnap();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resumeReq || openProject !== null) return;
    if ((e.target as HTMLElement).closest('.slider, .contact, button, .tree-row')) return;
    // Do NOT capture here: capturing retargets pointerup to <main> and a
    // plain click never reaches the card. Capture lazily on real drag.
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startPx: pxRef.current, moved: false, captured: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) {
      drag.moved = true;
      heldRef.current = true;
      if (!drag.captured) {
        drag.captured = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    }
    if (!drag.moved) return;
    const next = Math.max(0, Math.min(geomRef.current.maxPx, drag.startPx - dx));
    pxRef.current = next;
    pxVelRef.current = 0;
    targetPxRef.current = next;
    applyTransformsPx(next);
    const p = pxToProgress(next);
    progressRef.current = p;
    const idx = Math.round(p);
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setProgress(p);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    heldRef.current = false;
    if (drag.moved) {
      draggedRef.current = true;
      targetPxRef.current = nearestStopPx(pxRef.current);
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    }
  };

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
      <main className="page" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClickCapture={onClickCapture}>
        <Pond ready />
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
                pitch={pitch}
                active={i === current - 1}
                onCardClick={(e) => {
                  if (project.external) return;
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  openProjectAt(i);
                }}
              />
            );
          })}
        </div>
        <ContactMenu onOpenResume={(from, home) => setResumeReq({ from, home })} />
        <div ref={sliderWrapRef}>
          <Slider
            progress={progress}
            current={current}
            onJump={goTo}
            onScrub={(fraction) => { heldRef.current = true; setProgressDirect(fraction); }}
            onScrubEnd={() => { heldRef.current = false; scheduleSnap(); }}
          />
        </div>
      </main>
      {resumeReq ? (
        <ResumeModal from={resumeReq.from} home={resumeReq.home} onClose={() => setResumeReq(null)} />
      ) : null}
      {openProject !== null ? (
        <ProjectDetail project={PROJECTS[openProject]} index={openProject} onClose={closeProject} directLoad={directProjectLoad} />
      ) : null}
    </>
  );
}
