import { useCallback, useEffect, useRef, useState } from 'react';
import ContactMenu from './components/ContactMenu';
import MusicPlayer from './components/MusicPlayer';
import { FilmLight } from './components/Effects';
import Hero from './components/Hero';
import Pond from './components/Pond';
import ProjectCard, { applyCardBodyStyle } from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import ResumeModal from './components/ResumeModal';
import Slider from './components/Slider';
import { PROJECTS } from './data/clone';
import { hardStopThud, initAudio, installAudioUnlock, scrollAmbience, snapTick, softTick } from './audio';

const SLIDE_COUNT = PROJECTS.length + 1; // 00 intro + one slide per project
const MAX_INDEX = SLIDE_COUNT - 1;

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

  const pxRef = useRef(0);
  const pxVelRef = useRef(0);
  const targetPxRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const sliderWrapRef = useRef<HTMLDivElement>(null);
  const geomRef = useRef({ firstStep: 740, pitch: 624, maxPx: 5732 });
  const railWidthRef = useRef(0);
  const snapTimer = useRef<number | undefined>(undefined);
  const overshootRef = useRef(0);
  const lastIndexRef = useRef(0);
  const lastKnobStepRef = useRef(0);
  const lastTickMsRef = useRef(0);
  const knobPxRef = useRef(0);
  const knobVelocityRef = useRef(0);

  const current = Math.max(0, Math.min(MAX_INDEX, Math.round(progress)));

  // Track px for a slide position, clamped to the last card's centre.
  const pxFromProgress = useCallback((s: number) => {
    const { firstStep, pitch, maxPx } = geomRef.current;
    const px = s <= 1 ? s * firstStep : firstStep + (s - 1) * pitch;
    return Math.max(0, Math.min(maxPx, px));
  }, []);

  const pxToProgress = useCallback((px: number) => {
    const { firstStep, pitch } = geomRef.current;
    const progress = px <= firstStep ? px / firstStep : 1 + (px - firstStep) / pitch;
    return Math.max(0, Math.min(MAX_INDEX, progress));
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-card]'));
    if (cards.length === 0) return;
    const vw = window.innerWidth;
    // DOMRects retain subpixel widths; offsetLeft/offsetWidth round each
    // card independently and accumulate drift between numbered stops.
    // The resume overlay scales the page; measure in its unscaled space.
    const pageScale = track.parentElement!.getBoundingClientRect().width / vw;
    const trackLeft = track.getBoundingClientRect().left;
    const first = cards[0].getBoundingClientRect();
    const firstStep = (first.left - trackLeft + first.width / 2) / pageScale - vw / 2;
    const pitch = (cards.length > 1 ? cards[1].getBoundingClientRect().left - first.left : first.width) / pageScale;
    // Max scroll centers the last card exactly. The original clamps to
    // track width - viewport, which leaves its last card 80 px right of
    // centre; this site centers every slide symmetrically instead.
    const last = cards[cards.length - 1].getBoundingClientRect();
    const maxPx = Math.max(0, (last.left - trackLeft + last.width / 2) / pageScale - vw / 2);
    // Rebase both springs through logical slide positions before changing geometry.
    const position = pxToProgress(pxRef.current);
    const target = pxToProgress(targetPxRef.current);
    const knobFraction = railWidthRef.current ? knobPxRef.current / railWidthRef.current : 0;
    geomRef.current = { firstStep, pitch, maxPx };
    pxRef.current = pxFromProgress(position);
    targetPxRef.current = pxFromProgress(target);
    pxVelRef.current = 0;
    knobVelocityRef.current = 0;
    setProgress(position);
    const rail = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-rail');
    if (rail) railWidthRef.current = rail.getBoundingClientRect().width;
    knobPxRef.current = knobFraction * railWidthRef.current;
  }, [pxFromProgress, pxToProgress]);

  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;
    let revealFrame = 0;
    let revealScheduled = false;
    let revealTimer = 0;
    const skipEntrance = matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.pathname.startsWith('/projects/');
    root.dataset.intro = skipEntrance ? 'done' : 'on';
    // Keep the final reference fade; the intentionally omitted 3D intro is unnecessary here.
    const fontTimeout = window.setTimeout(reveal, 600);
    function reveal() {
      if (cancelled || skipEntrance || revealScheduled || root.dataset.intro !== 'on') return;
      revealScheduled = true;
      window.clearTimeout(fontTimeout);
      revealFrame = requestAnimationFrame(() => {
        revealFrame = requestAnimationFrame(() => {
          root.dataset.intro = 'reveal';
          revealTimer = window.setTimeout(() => { root.dataset.intro = 'done'; }, 900);
        });
      });
    }
    void document.fonts.ready.then(reveal);
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    installAudioUnlock();
    return () => {
      cancelled = true;
      window.clearTimeout(fontTimeout);
      window.clearTimeout(revealTimer);
      cancelAnimationFrame(revealFrame);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

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
  }, [pxToProgress]);

  // Spring the continuous track px toward its snap target, and fire the
  // carousel sounds from the knob's rounded 1/40-step changes.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (document.hidden) { scrollAmbience(0); return; }
      const target = targetPxRef.current;
      let px = pxRef.current;
      let vel = pxVelRef.current;
      // Original spring: 1/240 s substeps, settle epsilon 0.05.
      for (let remaining = dt; remaining > 1e-6; remaining -= SUBSTEP) {
        const h = Math.min(remaining, SUBSTEP);
        vel += (TRACK_K * (target - px) - TRACK_C * vel) * h;
        px += vel * h;
      }
      if (motion.matches) { px = target; vel = 0; }
      if (Math.abs(target - px) < 0.05 && Math.abs(vel) < 0.05) {
        px = target;
        vel = 0;
      }
      pxRef.current = px;
      pxVelRef.current = vel;
      const p = pxToProgress(px);
      applyTransformsPx(px);
      // Knob position in rail px (0..railWidth), step = railWidth/40.
      const railW = railWidthRef.current || 1;
      const knobTarget = (pxToProgress(target) / MAX_INDEX) * railW;
      let knobPx = knobPxRef.current;
      let knobVel = knobVelocityRef.current;
      const knobK = 420;
      const knobC = 41;
      if (motion.matches) {
        knobPx = knobTarget;
        knobVel = 0;
      } else {
        for (let remaining = dt; remaining > 1e-6; remaining -= SUBSTEP) {
          const h = Math.min(remaining, SUBSTEP);
          knobVel += (knobK * (knobTarget - knobPx) - knobC * knobVel) * h;
          knobPx += knobVel * h;
          if (knobPx < 0 || knobPx > railW) {
            overshootRef.current = Math.max(overshootRef.current, Math.abs(knobVel));
            knobPx = Math.max(0, Math.min(railW, knobPx));
            knobVel = 0;
          }
        }
      }
      if (Math.abs(knobTarget - knobPx) < 0.05 && Math.abs(knobVel) < 0.05) {
        knobPx = knobTarget;
        knobVel = 0;
      }
      knobPxRef.current = knobPx;
      knobVelocityRef.current = knobVel;
      const knob = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-knob');
      if (knob) knob.style.left = `${(Math.max(0, Math.min(1, knobPx / railW)) * 100).toFixed(2)}%`;
      const stepPx = railW / 40;
      const pan = Math.max(-1, Math.min(1, (knobPx / railW) * 2 - 1));
      scrollAmbience(Math.abs(knobVel) * 0.6, pan);
      // Snap / soft tick on rounded-step change, during motion.
      const nStep = Math.round(knobPx / stepPx);
      if (nStep !== lastKnobStepRef.current) {
        lastKnobStepRef.current = nStep;
        const stopSteps = new Set(Array.from({ length: SLIDE_COUNT }, (_, i) => Math.round((i / MAX_INDEX) * 40)));
        if (nStep >= 0 && nStep <= 40 && stopSteps.has(nStep)) {
          lastTickMsRef.current = now;
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

  useEffect(() => {
    const mute = () => scrollAmbience(0);
    window.addEventListener('blur', mute);
    document.addEventListener('visibilitychange', mute);
    return () => {
      window.clearTimeout(snapTimer.current);
      mute();
      window.removeEventListener('blur', mute);
      document.removeEventListener('visibilitychange', mute);
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(MAX_INDEX, index));
    targetPxRef.current = pxFromProgress(clamped);
  }, [pxFromProgress]);

  const onScrub = useCallback((fraction: number) => {
    window.clearTimeout(snapTimer.current);
    targetPxRef.current = pxFromProgress(fraction * MAX_INDEX);
  }, [pxFromProgress]);

  const onScrubEnd = useCallback((fraction: number) => {
    targetPxRef.current = nearestStopPx(pxFromProgress(fraction * MAX_INDEX));
  }, [nearestStopPx, pxFromProgress]);

  const scheduleSnap = useCallback(() => {
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      // Snap the accumulated TARGET (wheel destination), not the current
      // spring position: snapping the position 180 ms in would drag a
      // 700px flick back to the slide it started from.
      targetPxRef.current = nearestStopPx(targetPxRef.current);
      // Hard-stop thud if the wheel pushed past a track end.
      if (overshootRef.current > 80) {
        const maxPx = geomRef.current.maxPx || 1;
        const pan = Math.max(-1, Math.min(1, (pxRef.current / maxPx) * 2 - 1));
        hardStopThud(Math.min(1, overshootRef.current / 900), pan);
      }
      overshootRef.current = 0;
    }, 180);
  }, [nearestStopPx]);

  const clearProject = useCallback(() => {
    setOpenProject((cur) => {
      if (cur !== null) {
        window.setTimeout(() => {
          document.querySelectorAll<HTMLElement>('[data-card]')[cur]?.focus();
        }, 50);
      }
      return null;
    });
  }, []);

  // Keep route state synchronized even while the detail viewer is unmounted.
  useEffect(() => {
    const syncProject = (fromHistory: boolean) => {
      const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
      const index = match ? PROJECTS.findIndex((project) => project.slug === match[1]) : -1;
      if (index >= 0) {
        setDirectProjectLoad(!fromHistory);
        setOpenProject(index);
      } else {
        clearProject();
      }
    };
    syncProject(false);
    const onPop = () => syncProject(true);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [clearProject]);

  const closeProject = useCallback(() => {
    if (history.state?.pv != null) {
      history.back();
    } else {
      // Fresh deep links have no portfolio entry to return to.
      history.replaceState(null, '', '/');
      clearProject();
    }
  }, [clearProject]);

  const openProjectAt = useCallback((index: number) => {
    initAudio();
    history.pushState({ pv: index }, '', `/projects/${PROJECTS[index].slug}`);
    setDirectProjectLoad(false);
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
    if ((e.target as HTMLElement).closest('.contact')) return;
    const layer = introLayerRef.current;
    if (layer && pxRef.current < 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && layer.scrollHeight > layer.clientHeight + 4) {
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

  // Mobile touch gesture tracking (swipe between cards).
  const touchSwipeRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    isHorizontal: boolean | null;
    samples: { t: number; x: number }[];
  } | null>(null);
  const swipedRef = useRef(false);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (resumeReq || openProject !== null) return;
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('.contact, .slider, input, textarea, button, a')) return;
    initAudio();
    const touch = e.touches[0];
    touchSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      isHorizontal: null,
      samples: [{ t: performance.now(), x: touch.clientX }],
    };
    swipedRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const swipe = touchSwipeRef.current;
    if (!swipe) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipe.startX;
    const dy = touch.clientY - swipe.startY;

    if (swipe.isHorizontal === null) {
      if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
        swipe.isHorizontal = Math.abs(dx) > Math.abs(dy);
        if (swipe.isHorizontal) swipedRef.current = true;
      }
    }

    if (swipe.isHorizontal) {
      if (e.cancelable) e.preventDefault();
      swipedRef.current = true;
      const stepDelta = touch.clientX - swipe.lastX;
      swipe.lastX = touch.clientX;
      swipe.samples.push({ t: performance.now(), x: touch.clientX });
      if (swipe.samples.length > 8) swipe.samples.shift();

      // Moving finger left (stepDelta < 0) advances carousel forward (increases targetPx)
      const { maxPx } = geomRef.current;
      const next = targetPxRef.current - stepDelta;
      targetPxRef.current = Math.max(0, Math.min(maxPx, next));
      scheduleSnap();
    }
  };

  const onTouchEnd = () => {
    const swipe = touchSwipeRef.current;
    if (!swipe) return;
    if (swipe.isHorizontal) {
      const now = performance.now();
      const recent = swipe.samples.filter((s) => now - s.t < 150);
      let velocity = 0;
      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        if (last.t > first.t) velocity = ((last.x - first.x) / (last.t - first.t)) * 1000;
      }
      const totalDx = swipe.lastX - swipe.startX;
      if (velocity < -200 || totalDx < -40) {
        goTo(current + 1);
      } else if (velocity > 200 || totalDx > 40) {
        goTo(current - 1);
      } else {
        targetPxRef.current = nearestStopPx(targetPxRef.current);
      }
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 120);
    }
    touchSwipeRef.current = null;
  };

  const translate = -pxFromProgress(progress);
  const introOpacity = 1 - Math.max(0, Math.min(1, progress / 0.6));

  return (
    <>
      <FilmLight />
      <main
        className="page"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
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
                  if (swipedRef.current) return;
                  if (project.external && !project.slug) return;
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  openProjectAt(i);
                }}
              />
            );
          })}
        </div>
        <ContactMenu onOpenResume={(from, home) => setResumeReq({ from, home })} />
        <MusicPlayer />
        <div ref={sliderWrapRef}>
          <Slider
            progress={progress}
            current={current}
            count={SLIDE_COUNT}
            labels={['Intro', ...PROJECTS.map((p) => p.title)]}
            onJump={goTo}
            onScrub={onScrub}
            onScrubEnd={onScrubEnd}
          />
        </div>
      </main>
      {resumeReq ? (
        <ResumeModal from={resumeReq.from} home={resumeReq.home} onClose={() => setResumeReq(null)} />
      ) : null}
      {openProject !== null ? (
        <ProjectDetail key={openProject} project={PROJECTS[openProject]} index={openProject} onClose={closeProject} directLoad={directProjectLoad} />
      ) : null}
    </>
  );
}
