import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CloneProject } from '../data/clone';

function ExternalArrow() {
  return (
    <svg
      className="card-out"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

interface Props {
  project: CloneProject;
  index: number;
  /** Offset of this card's centre from the viewport centre, in px. */
  offsetPx: number;
  active: boolean;
  onCardClick: (e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, index, offsetPx, active, onCardClick }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {
        /* autoplay blocked or no source yet; poster stays visible */
      });
    } else {
      video.pause();
    }
  }, [active]);

  // 3D tilt: side cards lean away from the viewer, the active card is flat.
  const angle = Math.max(-20, Math.min(20, -offsetPx * 0.03));
  const dist = Math.min(Math.abs(offsetPx) / 1500, 0.45);
  const media = project.media;
  const reflectionSrc = media.type === 'video' ? media.poster : media.src;

  const bodyStyle: CSSProperties = {
    transform: `perspective(1500px) rotateY(${angle.toFixed(2)}deg)`,
    // @ts-expect-error CSS custom properties for the card shading/glint
    '--shade': dist.toFixed(2),
    '--lift': Math.abs(offsetPx) < 60 ? 1 : 0,
    '--glint': Math.abs(offsetPx) < 60 ? 0.1 : 0.04,
    '--glint-x': `${Math.max(0, Math.min(100, 50 - offsetPx * 0.04))}%`,
  };

  const inner = (
    <span className="card-body" style={bodyStyle}>
      {project.eyebrow ? <span className="card-eyebrow">{project.eyebrow}</span> : null}
      <span className="card-media">
        {media.type === 'video' ? (
          <span className="loop-video">
            <video
              ref={videoRef}
              poster={media.poster}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              aria-label={project.title}
            >
              {media.av1 ? <source src={media.av1} type='video/mp4; codecs="av01.0.05M.08"' /> : null}
              <source src={media.mp4} type="video/mp4" />
            </video>
          </span>
        ) : (
          <img alt={media.alt} src={media.src} draggable={false} loading="eager" decoding="async" />
        )}
      </span>
      <span className="card-floor" aria-hidden="true">
        <img className="card-reflection" src={reflectionSrc} alt="" draggable={false} loading="lazy" decoding="async" />
      </span>
      <span className="card-meta">
        <span className="card-title" data-mini="text">
          {project.title}
        </span>
        <span className="card-kind" data-mini="text">
          {project.kind}
          {project.external ? <ExternalArrow /> : null}
        </span>
      </span>
    </span>
  );

  if (project.external) {
    return (
      <a
        className="card"
        href={project.href}
        target="_blank"
        rel="noopener"
        data-card
        data-external
        draggable={false}
        style={{ '--i': index } as CSSProperties}
        onClick={onCardClick}
      >
        {inner}
      </a>
    );
  }
  // Case-study cards are divs that open the project viewer in place.
  return (
    <div
      className="card"
      data-card
      draggable={false}
      tabIndex={0}
      role="button"
      aria-label={`${project.title} case study`}
      style={{ '--i': index } as CSSProperties}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(e as unknown as React.MouseEvent); }
      }}
    >
      {inner}
    </div>
  );
}
