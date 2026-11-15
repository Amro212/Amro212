import { initAudio } from '../audio';

interface Props {
  /** Continuous slide position, 0 (intro) through count-1 (last project). */
  progress: number;
  current: number;
  /** Total slides: 1 intro + one per project. */
  count: number;
  /** Slide names for aria labels, index 0 is the intro. */
  labels: string[];
  onJump: (index: number) => void;
}

export default function Slider({ progress, current, count, labels, onJump }: Props) {
  /** Last slide index; guarded so a single-slide list never divides by zero. */
  const max = Math.max(1, count - 1);

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
      className="slider"
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
        <div className="slider-rail">
          <div className="slider-knob">
            <span className="slider-cap" />
          </div>
        </div>
      </div>
      <div className="slider-stops" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="slider-stop"
            data-on={i === current ? '' : undefined}
            style={{ left: `${(i / max) * 100}%` }}
          >
            {String(i).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}
