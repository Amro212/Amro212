import { useCallback, useEffect, useRef } from 'react';
import { clickSound, initAudio } from '../audio';

interface Props {
  current: number;
  /** Total slides: 1 intro + one per project. */
  count: number;
  /** Slide names for aria labels, index 0 is the intro. */
  labels: string[];
  onJump: (index: number) => void;
  getKnobPosition: () => number;
  getStops: () => number[];
  onScrub: (fraction: number) => void;
  onScrubEnd: (fraction: number) => void;
}

export default function Slider({ current, count, labels, onJump, getKnobPosition, getStops, onScrub, onScrubEnd }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; offset: number; fraction: number; samples: { t: number; p: number }[] } | null>(null);

  const pan = useCallback(() => {
    const width = railRef.current?.clientWidth || 1;
    return Math.max(-1, Math.min(1, getKnobPosition() / width * 2 - 1));
  }, [getKnobPosition]);

  const magnetize = (position: number, width: number) => {
    let closest = position;
    let distance = Infinity;
    for (const stop of getStops()) {
      const px = stop * width;
      if (Math.abs(px - position) < distance) {
        distance = Math.abs(px - position);
        closest = px;
      }
    }
    if (distance >= 14) return position;
    const strength = 1 - distance / 14;
    return position + (closest - position) * 0.7 * strength * strength;
  };

  const finish = useCallback((fraction?: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const slider = sliderRef.current;
    slider?.removeAttribute('data-active');
    if (slider?.hasPointerCapture(drag.id)) slider.releasePointerCapture(drag.id);
    clickSound(false, pan());
    onScrubEnd(fraction ?? drag.fraction);
  }, [onScrubEnd, pan]);

  useEffect(() => {
    const cancel = () => finish();
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel();
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [finish]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary || dragRef.current) return;
    const rail = railRef.current;
    if (!rail || !rail.clientWidth) return;
    initAudio();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    const x = e.clientX - rail.getBoundingClientRect().left;
    const knob = getKnobPosition();
    const offset = Math.abs(x - knob) < (knobRef.current?.offsetWidth || 0) ? knob - x : 0;
    const target = magnetize(Math.max(0, Math.min(rail.clientWidth, x + offset)), rail.clientWidth);
    const fraction = target / rail.clientWidth;
    dragRef.current = { id: e.pointerId, offset, fraction, samples: [{ t: performance.now(), p: x + offset }] };
    e.currentTarget.setAttribute('data-active', '');
    clickSound(true, pan());
    onScrub(fraction);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.id !== e.pointerId || !rail || !rail.clientWidth) return;
    const x = e.clientX - rail.getBoundingClientRect().left + drag.offset;
    drag.samples.push({ t: performance.now(), p: x });
    if (drag.samples.length > 12) drag.samples.shift();
    drag.fraction = magnetize(Math.max(0, Math.min(rail.clientWidth, x)), rail.clientWidth) / rail.clientWidth;
    onScrub(drag.fraction);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rail = railRef.current;
    if (!drag || drag.id !== e.pointerId || !rail || !rail.clientWidth) return;
    const now = performance.now();
    const recent = drag.samples.filter((sample) => now - sample.t < 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = recent.length >= 2 && last.t > first.t ? (last.p - first.p) / (last.t - first.t) * 1000 : 0;
    const projected = e.clientX - rail.getBoundingClientRect().left + drag.offset + 0.12 * velocity;
    finish(Math.max(0, Math.min(1, projected / rail.clientWidth)));
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(count - 1, current + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
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
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(count - 1, current + 1));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      initAudio();
      onJump(Math.max(0, current - 1));
    }
  };

  return (
    <div
      ref={sliderRef}
      className="slider"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => finish()}
      onLostPointerCapture={() => finish()}
      role="slider"
      tabIndex={0}
      aria-label="Scroll through projects"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
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
      <div className="slider-stops" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="slider-stop"
          >
            {String(i).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}
