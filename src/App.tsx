import { useCallback, useEffect, useRef, useState } from 'react';
import ContactMenu from './components/ContactMenu';
import { FilmLight } from './components/Effects';
import Hero from './components/Hero';
import Pond from './components/Pond';
import ProjectCard, { applyCardBodyStyle } from './components/ProjectCard';
import ProjectDetail, { type ProjectDetailHandle } from './components/ProjectDetail';
import ResumeModal from './components/ResumeModal';
import Slider from './components/Slider';
import { PROJECTS } from './data/clone';
import { hardStopThud, initAudio, installAudioUnlock, scrollAmbience, snapTick, softTick } from './audio';

const SLIDE_COUNT = PROJECTS.length + 1; // 00 intro + one slide per project
const MAX_INDEX = SLIDE_COUNT - 1;
const STOP_STEPS = new Set(Array.from({ length: SLIDE_COUNT }, (_, i) => Math.round(i / MAX_INDEX * 40)));

// Original track spring (ee()): semi-implicit Euler, 1/240 s substeps,
// dt clamped to 1/30, settle epsilon 0.05 px / 0.05 px/s.
const TRACK_K = 170;
const TRACK_C = 26;
const SUBSTEP = 1 / 240;

export default function App() {
  const [progress, setProgress] = useState(0);
  const [resumeReq, setResumeReq] = useState<{ from: DOMRect; home: () => HTMLElement | null } | null>(null);
  const [openProject, setOpenProject] = useState<{
    id: number;
    index: number;
    cardImage: HTMLElement | null;
    directLoad: boolean;
  } | null>(null);
  const openSeqRef = useRef(0);
  const projectDetailRef = useRef<ProjectDetailHandle>(null);

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

  const pageDragRef = useRef<{
    id: number; startX: number; startTarget: number;
    active: boolean; samples: { t: number; p: number }[];
  } | null>(null);
  const swipedRef = useRef(false);
  const wakeRef = useRef<() => void>(() => {});
  const cardBodiesRef = useRef<HTMLElement[]>([]);
  const knobRef = useRef<HTMLElement | null>(null);

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
    cardBodiesRef.current = cards.map((card) => card.querySelector<HTMLElement>('.card-body')!).filter(Boolean);
    knobRef.current = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-knob') ?? null;
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
    wakeRef.current();
    pxVelRef.current = 0;
    knobVelocityRef.current = 0;
    setProgress(position);
    const rail = sliderWrapRef.current?.querySelector<HTMLElement>('.slider-rail');
    if (rail) railWidthRef.current = rail.getBoundingClientRect().width / pageScale;
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
    const removeAudioUnlock = installAudioUnlock();
    return () => {
      cancelled = true;
      removeAudioUnlock();
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
      intro.style.transform = `translate3d(${translate.toFixed(1)}px, 0, 0)`;
      intro.style.opacity = `${introOpacity}`;
    }
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translate3d(${translate.toFixed(1)}px, 0, 0)`;
      const { firstStep, pitch } = geomRef.current;
      cardBodiesRef.current.forEach((body, i) => applyCardBodyStyle(body, firstStep + i * pitch - px, pitch));
    }
  }, [pxToProgress]);

  // Spring the continuous track px toward its snap target, and fire the
  // carousel sounds from the knob's rounded 1/40-step changes.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const tick = (now: number) => {
      raf = 0;
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
      const held = pageDragRef.current?.active === true;
      if (motion.matches || held) { px = target; vel = 0; }
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
      const knob = knobRef.current;
      if (knob) knob.style.transform = `translate3d(${knobPx.toFixed(2)}px, 0, 0)`;
      const stepPx = railW / 40;
      const pan = Math.max(-1, Math.min(1, (knobPx / railW) * 2 - 1));
      scrollAmbience(Math.abs(knobVel) * 0.6, pan);
      // Snap / soft tick on rounded-step change, during motion.
      const nStep = Math.round(knobPx / stepPx);
      if (nStep !== lastKnobStepRef.current) {
        lastKnobStepRef.current = nStep;
        if (nStep >= 0 && nStep <= 40 && STOP_STEPS.has(nStep)) {
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
      if (px !== target || vel !== 0 || knobPx !== knobTarget || knobVel !== 0) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    wakeRef.current = wake;
    const visibility = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', visibility);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      document.removeEventListener('visibilitychange', visibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTransformsPx, pxToProgress]);

  useEffect(() => {
    const mute = () => {
      scrollAmbience(0);
      if (pageDragRef.current) {
        pageDragRef.current = null;
        targetPxRef.current = nearestStopPx(targetPxRef.current);
        wakeRef.current();
      }
    };
    window.addEventListener('blur', mute);
    document.addEventListener('visibilitychange', mute);
    return () => {
      window.clearTimeout(snapTimer.current);
      mute();
      window.removeEventListener('blur', mute);
      document.removeEventListener('visibilitychange', mute);
    };
  }, [nearestStopPx]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(MAX_INDEX, index));
    targetPxRef.current = pxFromProgress(clamped);
    wakeRef.current();
  }, [pxFromProgress]);

  const onScrub = useCallback((fraction: number) => {
    window.clearTimeout(snapTimer.current);
    targetPxRef.current = pxFromProgress(fraction * MAX_INDEX);
    wakeRef.current();
  }, [pxFromProgress]);

  const onScrubEnd = useCallback((fraction: number) => {
    targetPxRef.current = nearestStopPx(pxFromProgress(fraction * MAX_INDEX));
    wakeRef.current();
  }, [nearestStopPx, pxFromProgress]);

  const scheduleSnap = useCallback(() => {
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      // Snap the accumulated TARGET (wheel destination), not the current
      // spring position: snapping the position 180 ms in would drag a
      // 700px flick back to the slide it started from.
      targetPxRef.current = nearestStopPx(targetPxRef.current);
      wakeRef.current();
      // Hard-stop thud if the wheel pushed past a track end.
      if (overshootRef.current > 80) {
        const maxPx = geomRef.current.maxPx || 1;
        const pan = Math.max(-1, Math.min(1, (pxRef.current / maxPx) * 2 - 1));
        hardStopThud(Math.min(1, overshootRef.current / 900), pan);
      }
      overshootRef.current = 0;
    }, 180);
  }, [nearestStopPx]);

  const handleCloseComplete = useCallback((id?: number) => {
    setOpenProject((cur) => {
      if (!cur) return null;
      if (id != null && cur.id !== id) return cur;
      return null;
    });
  }, []);

  const handleRequestClose = useCallback((focusVisible = false) => {
    if (history.state?.pv != null) {
      history.back();
    } else {
      history.replaceState(null, '', '/');
      projectDetailRef.current?.startCloseAnimation(focusVisible);
    }
  }, []);

  const openProjectAt = useCallback((index: number, cardImage: HTMLElement | null = null, directLoad = false) => {
    initAudio();
    if (history.state?.pv !== index) {
      history.pushState({ pv: index }, '', `/projects/${PROJECTS[index].slug}`);
    }
    openSeqRef.current += 1;
    setOpenProject({ id: openSeqRef.current, index, cardImage, directLoad });
  }, []);

  // Check initial deep link on mount
  useEffect(() => {
    const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
    const index = match ? PROJECTS.findIndex((project) => project.slug === match[1]) : -1;
    if (index >= 0) {
      openSeqRef.current += 1;
      setOpenProject({ id: openSeqRef.current, index, cardImage: null, directLoad: true });
    }
  }, []);

  // Synchronize browser history (Back / Forward)
  useEffect(() => {
    const onPop = () => {
      const pv = history.state?.pv;
      if (openProject !== null && pv == null) {
        projectDetailRef.current?.startCloseAnimation();
      } else if (typeof pv === 'number') {
        const cardMedia = document.querySelectorAll<HTMLElement>('[data-card]')[pv]?.querySelector<HTMLElement>('.card-media') ?? null;
        openProjectAt(pv, cardMedia);
      } else {
        const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
        const index = match ? PROJECTS.findIndex((project) => project.slug === match[1]) : -1;
        if (index >= 0) {
          const cardMedia = document.querySelectorAll<HTMLElement>('[data-card]')[index]?.querySelector<HTMLElement>('.card-media') ?? null;
          openProjectAt(index, cardMedia);
        } else if (openProject !== null) {
          projectDetailRef.current?.startCloseAnimation();
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [openProject, openProjectAt]);

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
    wakeRef.current();
    scheduleSnap();
  };

  const onPagePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (resumeReq || openProject !== null) return;
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    const target = e.target as HTMLElement;
    if (target.closest('.contact, .slider, input, textarea, button')) return;
    initAudio();
    window.clearTimeout(snapTimer.current);
    pageDragRef.current = {
      id: e.pointerId, startX: e.clientX, startTarget: pxRef.current,
      active: false, samples: [],
    };
    swipedRef.current = false;
  };

  const onPagePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const swipe = pageDragRef.current;
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.startX;
    if (!swipe.active && Math.abs(dx) > 8) {
      swipe.active = true;
      pxVelRef.current = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
      swipedRef.current = true;
    }

    if (swipe.active) {
      if (e.cancelable) e.preventDefault();
      swipedRef.current = true;
      const { maxPx } = geomRef.current;
      const raw = swipe.startTarget - dx;
      const rubber = (excess: number) => excess * 160 * 0.55 / (160 + 0.55 * excess);
      const position = raw < 0 ? -rubber(-raw) : raw > maxPx ? maxPx + rubber(raw - maxPx) : raw;
      targetPxRef.current = position;
      wakeRef.current();
      pxVelRef.current = 0;
      swipe.samples.push({ t: performance.now(), p: position });
      if (swipe.samples.length > 12) swipe.samples.shift();
    }
  };

  const onPagePointerEnd = (e: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const swipe = pageDragRef.current;
    if (!swipe || swipe.id !== e.pointerId) return;
    pageDragRef.current = null;
    if (swipe.active) {
      const recent = swipe.samples.filter((sample) => performance.now() - sample.t < 100);
      const first = recent[0], last = recent[recent.length - 1];
      const velocity = !cancelled && recent.length >= 2 && last.t > first.t
        ? (last.p - first.p) / (last.t - first.t) * 1000 : 0;
      pxVelRef.current = velocity;
      targetPxRef.current = nearestStopPx(Math.max(0, Math.min(geomRef.current.maxPx, targetPxRef.current + 0.18 * velocity)));
      wakeRef.current();
      window.setTimeout(() => { swipedRef.current = false; }, 120);
    }
  };

  const translate = -pxFromProgress(progress);
  const introOpacity = 1 - Math.max(0, Math.min(1, progress / 0.6));

  return (
    <>
      <FilmLight />
      <main
        className="page"
        onWheel={onWheel}
        onPointerDown={onPagePointerDown}
        onPointerMove={onPagePointerMove}
        onPointerUp={(e) => onPagePointerEnd(e)}
        onPointerCancel={(e) => onPagePointerEnd(e, true)}
      >
        <Pond ready />
        <div
          className="intro-layer"
          ref={introLayerRef}
          style={{ transform: `translate3d(${translate.toFixed(1)}px, 0, 0)`, opacity: introOpacity }}
        >
          <Hero />
        </div>
        <div className="stage-light" aria-hidden="true" />
        <div className="projects" ref={trackRef} style={{ transform: `translate3d(${translate.toFixed(1)}px, 0, 0)` }}>
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
                  const target = e.currentTarget as HTMLElement;
                  const cardMedia = target.querySelector<HTMLElement>('.card-media');
                  openProjectAt(i, cardMedia);
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
        <ProjectDetail
          ref={projectDetailRef}
          key={openProject.id}
          id={openProject.id}
          project={PROJECTS[openProject.index]}
          index={openProject.index}
          cardImage={openProject.cardImage}
          onCloseComplete={handleCloseComplete}
          onRequestClose={handleRequestClose}
          directLoad={openProject.directLoad}
        />
      ) : null}
    </>
  );
}
