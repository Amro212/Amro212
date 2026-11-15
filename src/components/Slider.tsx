import { useCallback, useEffect, useRef } from 'react';
import { clickSound, initAudio } from '../audio';

interface Props {
  /** Continuous slide position, 0 (intro) through count-1 (last project). */
  progress: number;
  current: number;
  /** Total slides: 1 intro + one per project. */
  count: number;
  /** Slide names for aria labels, index 0 is the intro. */
  labels: string[];
  onJump: (index: number) => void;
  onScrub?: (fraction: number) => void;
  onScrubEnd?: (fraction: number) => void;
}

export default function Slider({ progress, current, count, labels, onJump, onScrub, onScrubEnd }: Props) {
  const max = Math.max(1, count - 1);
  const sliderRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; offset: number; fraction: number; isTouch?: boolean; samples: { t: number; p: number }[] } | null>(null);

  const getKnobFraction = useCallback(() => {
    const rail = railRef.current;
    const knob = knobRef.current;
    if (!rail || !knob || !rail.clientWidth) return 0;
    const railRect = rail.getBoundingClientRect();
    const knobRect = knob.getBoundingClientRect();
    return Math.max(0, Math.min(1, (knobRect.left + knobRect.width / 2 - railRect.left) / railRect.width));
  }, []);

  const pan = useCallback(() => {
    return Math.max(-1, Math.min(1, getKnobFraction() * 2 - 1));
  }, [getKnobFraction]);

  const finish = useCallback((fraction?: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const slider = sliderRef.current;
    slider?.removeAttribute('data-active');
    try {
      if (slider && !drag.isTouch && slider.hasPointerCapture(drag.id)) {
        slider.releasePointerCapture(drag.id);
      }
    } catch {
      // Ignored for environments where pointer capture is already released
    }
    clickSound(false, pan());
    const finalFraction = fraction ?? drag.fraction;
    if (onScrubEnd) {
      onScrubEnd(finalFraction);
    } else {
      onJump(Math.round(finalFraction * max));
    }
  }, [onScrubEnd, onJump, max, pan]);

  useEffect(() => {
    const cancel = () => {
      if (document.hidden) finish();
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel();
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [finish]);

  // Pointer event handlers (desktop mouse + fallback)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.slider-stop')) return;
    if (e.button !== 0 || !e.isPrimary || dragRef.current) return;
    if (e.pointerType === 'touch') return;
    const rail = railRef.current;
    if (!rail || !rail.clientWidth) return;
    initAudio();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails on certain browsers
    }
    e.currentTarget.focus({ preventScroll: true });
    const x = e.clientX - rail.getBoundingClientRect().left;
    const knob = getKnobFraction() * rail.clientWidth;
    const offset = Math.abs(x - knob) < (knobRef.current?.offsetWidth || 0) ? knob - x : 0;
    const targetPx = Math.max(0, Math.min(rail.clientWidth, x + offset));
    const fraction = targetPx / rail.clientWidth;
    dragRef.current = { id: e.pointerId, offset, fraction, isTouch: false, samples: [{ t: performance.now(), p: x + offset }] };
    e.currentTarget.setAttribute('data-active', '');
    clickSound(true, pan());
    if (onScrub) onScrub(fraction);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.isTouch || drag.id !== e.pointerId || !rail || !rail.clientWidth) return;
    const x = e.clientX - rail.getBoundingClientRect().left + drag.offset;
    drag.samples.push({ t: performance.now(), p: x });
    if (drag.samples.length > 12) drag.samples.shift();
    drag.fraction = Math.max(0, Math.min(rail.clientWidth, x)) / rail.clientWidth;
    if (onScrub) onScrub(drag.fraction);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.isTouch || drag.id !== e.pointerId || !rail || !rail.clientWidth) return;
    const now = performance.now();
    const recent = drag.samples.filter((sample) => now - sample.t < 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = recent.length >= 2 && last.t > first.t ? (last.p - first.p) / (last.t - first.t) * 1000 : 0;
    const projected = e.clientX - rail.getBoundingClientRect().left + drag.offset + 0.12 * velocity;
    finish(Math.max(0, Math.min(1, projected / rail.clientWidth)));
  };

  // Dedicated touch event handlers for rock-solid mobile performance
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.slider-stop')) return;
    if (e.touches.length !== 1 || dragRef.current) return;
    const rail = railRef.current;
    if (!rail || !rail.clientWidth) return;
    const touch = e.touches[0];
    initAudio();
    const x = touch.clientX - rail.getBoundingClientRect().left;
    const knob = getKnobFraction() * rail.clientWidth;
    const offset = Math.abs(x - knob) < (knobRef.current?.offsetWidth || 0) ? knob - x : 0;
    const targetPx = Math.max(0, Math.min(rail.clientWidth, x + offset));
    const fraction = targetPx / rail.clientWidth;
    dragRef.current = { id: touch.identifier, offset, fraction, isTouch: true, samples: [{ t: performance.now(), p: x + offset }] };
    sliderRef.current?.setAttribute('data-active', '');
    clickSound(true, pan());
    if (onScrub) onScrub(fraction);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !drag.isTouch || !rail || !rail.clientWidth) return;
    const touch = Array.from(e.touches).find((t) => t.identifier === drag.id);
    if (!touch) return;
    if (e.cancelable) e.preventDefault();
    const x = touch.clientX - rail.getBoundingClientRect().left + drag.offset;
    drag.samples.push({ t: performance.now(), p: x });
    if (drag.samples.length > 12) drag.samples.shift();
    drag.fraction = Math.max(0, Math.min(rail.clientWidth, x)) / rail.clientWidth;
    if (onScrub) onScrub(drag.fraction);
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || !drag.isTouch || !rail || !rail.clientWidth) return;
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === drag.id);
    if (!touch) return;
    const now = performance.now();
    const recent = drag.samples.filter((sample) => now - sample.t < 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = recent.length >= 2 && last.t > first.t ? (last.p - first.p) / (last.t - first.t) * 1000 : 0;
    const projected = touch.clientX - rail.getBoundingClientRect().left + drag.offset + 0.12 * velocity;
    finish(Math.max(0, Math.min(1, projected / rail.clientWidth)));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(count - 1, current + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      initAudio();
      onJump(Math.max(0, current - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      initAudio();
      onJump(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      initAudio();
      onJump(count - 1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(count - 1, current + 1));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      initAudio();
      onJump(Math.max(0, current - 1));
    }
  };

  const fraction = Math.max(0, Math.min(1, progress / max));

  return (
    <div
      ref={sliderRef}
      className="slider"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => finish()}
      onLostPointerCapture={(e) => {
        if (dragRef.current && !dragRef.current.isTouch && dragRef.current.id === e.pointerId) {
          finish();
        }
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => finish()}
      role="slider"
      tabIndex={0}
      aria-label="Scroll through projects"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuetext={labels[current] ?? 'Intro'}
      onKeyDown={onKeyDown}
    >
      <div className="slider-well">
        <span className="slider-groove" />
        <div className="slider-rail" ref={railRef}>
          <div className="slider-knob" ref={knobRef}>
            <span className="slider-cap" />
          </div>
        </div>
      </div>
      <div className="slider-stops" role="group" aria-label="Project slide navigation">
        {Array.from({ length: count }, (_, i) => (
          <button
            type="button"
            key={i}
            className="slider-stop"
            data-on={i === current ? '' : undefined}
            style={{ left: `${(i / max) * 100}%` }}
            aria-label={`Jump to slide ${i}: ${labels[i] ?? `Slide ${i}`}`}
            onClick={(e) => {
              e.stopPropagation();
              initAudio();
              onJump(i);
            }}
          >
            {String(i).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
