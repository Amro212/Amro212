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
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/** Original en() card styling from offset/pitch. Shared by the React
 * render (initial paint) and App's per-frame imperative pass, so the
 * blur/tilt track the spring instead of going stale between React
 * state updates. */
export function cardBodyStyle(offsetPx: number, pitch: number): {
  transform: string;
  filter: string;
  shade: string;
  lift: string;
  glint: string;
  glintX: string;
  rim: string;
} {
  const e = offsetPx / (pitch || 1);
  const ae = Math.abs(e);
  const angle = Math.max(-34, Math.min(34, -22 * e));
  const translateZ = -(70 * Math.min(1.5, ae));
  const blur = 2.4 * Math.max(0, Math.min(1.4, ae) - 0.15);
  const s = (angle * Math.PI) / 180;
  const l = -0.5 * Math.sin(s) + 0.79 * Math.cos(s) - 0.79;
  return {
    transform: `perspective(1500px) translateZ(${translateZ.toFixed(1)}px) rotateY(${angle.toFixed(2)}deg)`,
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '',
    shade: Math.max(0, -(1.6 * l) + 0.12 * Math.min(1, ae)).toFixed(2),
    lift: Math.max(0, 1.4 * l).toFixed(2),
    glint: (0.1 + 0.16 * Math.max(0, 1 - Math.abs(angle + 8) / 30)).toFixed(2),
    glintX: `${Math.max(0, Math.min(100, 50 - 2.4 * angle)).toFixed(1)}%`,
    rim: (0.08 + 0.32 * Math.max(0, -angle / 34)).toFixed(2),
  };
}

/** Apply the computed style to a live .card-body element. */
export function applyCardBodyStyle(el: HTMLElement, offsetPx: number, pitch: number) {
  const s = cardBodyStyle(offsetPx, pitch);
  el.style.transform = s.transform;
  el.style.filter = s.filter;
  el.style.setProperty('--shade', s.shade);
  el.style.setProperty('--lift', s.lift);
  el.style.setProperty('--glint', s.glint);
  el.style.setProperty('--glint-x', s.glintX);
  el.style.setProperty('--rim', s.rim);
}

interface Props {
  project: CloneProject;
  index: number;
  /** Offset of this card's centre from the viewport centre, in px. */
  offsetPx: number;
  /** Track pitch in px (624 at 1440x900). */
  pitch: number;
  active: boolean;
  onCardClick: (e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, index, offsetPx, pitch, active, onCardClick }: Props) {
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

  // Original en(): e = offset/pitch; rotateY = clamp(-22*e, ±34);
  // translateZ = -(70*min(1.5,|e|)); blur = 2.4*max(0, min(1.4,|e|)-0.15).
  const cs = cardBodyStyle(offsetPx, pitch);
  const media = project.media;
  const reflectionSrc = media.type === 'video' ? media.poster : media.src;

  const bodyStyle: CSSProperties = {
    transform: cs.transform,
    filter: cs.filter,
    // @ts-expect-error CSS custom properties for the card shading/glint
    '--shade': cs.shade,
    '--lift': cs.lift,
    '--glint': cs.glint,
    '--glint-x': cs.glintX,
    '--rim': cs.rim,
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
          {project.external && !project.slug ? <ExternalArrow /> : null}
        </span>
      </span>
    </span>
  );

  // External projects with a case-study slug open the viewer in place;
  // external projects without one stay plain outbound links.
  if (project.external && !project.slug) {
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
