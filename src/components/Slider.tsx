import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { clickSound, initAudio } from '../audio';

interface Props {
  /** Continuous slide position, 0 (intro) through 9 (last project). */
  progress: number;
  current: number;
  onJump: (index: number) => void;
  onScrub: (fraction: number) => void;
  onScrubEnd: () => void;
}

const LABELS = ['Intro', 'AI Agent Builder', 'People of Bengaluru', 'Tapaway', 'Quote Builder', 'Designfolio', 'Onboarding', 'Soul Design System', 'Damnnnn', 'Gamified LMS'];

export default function Slider({ progress, current, onJump, onScrub, onScrubEnd }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fractionFromClientX = (clientX: number) => {
    const rail = railRef.current;
    if (!rail) return 0;
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  // et(): knob position mapped to -1..1 for stereo pan.
  const pan = () => {
    const f = Math.max(0, Math.min(1, progress / 9));
    return f * 2 - 1;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Clicking a stop number jumps directly instead of starting a scrub.
    if ((e.target as HTMLElement).closest('.slider-stop')) return;
    if (e.button !== 0) return;
    initAudio();
    clickSound(true, pan());
    e.preventDefault();
    draggingRef.current = true;
    sliderRef.current?.setPointerCapture(e.pointerId);
    sliderRef.current?.setAttribute('data-active', '');
    onScrub(fractionFromClientX(e.clientX));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onScrub(fractionFromClientX(e.clientX));
  };

  const endScrub = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    sliderRef.current?.removeAttribute('data-active');
    clickSound(false, pan());
    onScrubEnd();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(9, current + 1));
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
      onJump(9);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      initAudio();
      onJump(Math.min(9, current + 1));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      initAudio();
      onJump(Math.max(0, current - 1));
    }
  };

  const fraction = Math.max(0, Math.min(1, progress / 9));

  return (
    <div
      ref={sliderRef}
      className="slider"
      role="slider"
      tabIndex={0}
      aria-label="Scroll through projects"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuetext={LABELS[current] ?? 'Intro'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
      onKeyDown={onKeyDown}
    >
      <div className="slider-well">
        <span className="slider-groove" />
        <div className="slider-rail" ref={railRef}>
          <div className="slider-knob" style={{ left: `${fraction * 100}%` }}>
            <span className="slider-cap" />
          </div>
        </div>
      </div>
      <div className="slider-stops">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i}
            type="button"
            className="slider-stop"
            data-on={i === current ? '' : undefined}
            style={{ left: `${(i / 9) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              initAudio();
              onJump(i);
            }}
            aria-label={`Go to ${LABELS[i]}`}
          >
            {String(i).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
