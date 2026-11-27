import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { CloneProject } from '../data/clone';
import { PROJECT_DETAILS, type StoryBlock } from '../data/projectDetails';

export interface ProjectDetailHandle {
  startCloseAnimation: (focusVisible?: boolean) => void;
}

const OPEN_DURATION = 1050;
const OPEN_EASING = 'cubic-bezier(0.7, 0, 0.2, 1)';
const CLOSE_DURATION = 820;
const CLOSE_DELAY = 130;
const CLOSE_EASING = 'cubic-bezier(0.6, 0, 0.25, 1)';
const REVEAL_DELAY_MS = 560;

function measureHero(hero: HTMLElement) {
  const rect = hero.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    radius: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 0,
  };
}

function measureCardMedia(cardMedia: HTMLElement) {
  const radius = parseFloat(getComputedStyle(cardMedia).borderTopLeftRadius) || 0;
  const page = document.querySelector<HTMLElement>('.page');
  const pageStyle = page ? getComputedStyle(page) : null;
  const pageTransform = pageStyle && pageStyle.transform !== 'none' ? pageStyle.transform : null;
  let pageMatrix: DOMMatrix | null = null;
  if (pageTransform) {
    try {
      pageMatrix = new DOMMatrix(pageTransform);
    } catch {}
  }
  const scale = pageMatrix?.a || 1;
  const [originX, originY] = (pageStyle?.transformOrigin ?? '0 0').split(' ').map(parseFloat);

  const unproject = (rect: { left: number; top: number; width: number; height: number }) => ({
    left: originX + (rect.left - originX - (pageMatrix?.e ?? 0)) / scale,
    top: originY + (rect.top - originY - (pageMatrix?.f ?? 0)) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  });

  const cardBody = cardMedia.closest<HTMLElement>('.card-body');
  const fallback = { lens: 'perspective(1500px)', z: 0, angle: 0, ox: 0, oy: 0 };
  if (!cardBody) {
    return {
      box: { ...unproject(cardMedia.getBoundingClientRect()), radius },
      ...fallback,
      filter: null,
    };
  }

  const bodyStyle = getComputedStyle(cardBody);
  const inlineTransform = cardBody.style.transform;
  const lens = /perspective\([^)]*\)/.exec(inlineTransform)?.[0] ?? fallback.lens;
  const z = parseFloat(/translateZ\(([-\d.]+)px\)/.exec(inlineTransform)?.[1] ?? '0');
  const angle = parseFloat(/rotateY\(([-\d.]+)deg\)/.exec(inlineTransform)?.[1] ?? '0');
  const filter = bodyStyle.filter && bodyStyle.filter !== 'none' ? bodyStyle.filter : null;
  const [ox, oy] = bodyStyle.transformOrigin.split(' ').map(parseFloat);

  cardBody.style.transform = 'none';
  const mediaBox = unproject(cardMedia.getBoundingClientRect());
  const bodyBox = unproject(cardBody.getBoundingClientRect());
  cardBody.style.transform = inlineTransform;

  return {
    box: { ...mediaBox, radius },
    lens,
    z,
    angle,
    ox: bodyBox.left + ox - mediaBox.left,
    oy: bodyBox.top + oy - mediaBox.top,
    filter,
  };
}

function computeFlyerTransforms(
  card: ReturnType<typeof measureCardMedia>,
  hero: ReturnType<typeof measureHero>
) {
  const scaleX = hero.width > 0 ? card.box.width / hero.width : 1;
  const scaleY = hero.height > 0 ? card.box.height / hero.height : 1;
  const r = (dx: number, dy: number, z: number, angle: number, sx: number, sy: number) =>
    `translate(${dx}px, ${dy}px) translate(${card.ox}px, ${card.oy}px) ${card.lens} translateZ(${z}px) rotateY(${angle}deg) translate(${-card.ox}px, ${-card.oy}px) scale(${sx}, ${sy})`;

  return {
    cardTransform: r(card.box.left - hero.left, card.box.top - hero.top, card.z, card.angle, scaleX, scaleY),
    heroTransform: r(0, 0, 0, 0, 1, 1),
    cardRadius: `${card.box.radius / (scaleX || 1)}px`,
    heroRadius: `${hero.radius}px`,
  };
}

const P = (hero: { left: number; top: number; width: number; height: number; radius: number }) => ({
  left: `${hero.left}px`,
  top: `${hero.top}px`,
  width: `${hero.width}px`,
  height: `${hero.height}px`,
  borderRadius: `${hero.radius}px`,
});

function md(text: string): React.ReactNode {
  // **bold**, ~~strikethrough~~ and ^^alert^^ (red .pv-alert em) only.
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\^\^[^^]+\^\^)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{md(p.slice(2, -2))}</strong>;
    if (p.startsWith('~~') && p.endsWith('~~')) return <s key={i}>{p.slice(2, -2)}</s>;
    if (p.startsWith('^^') && p.endsWith('^^')) return <em key={i} className="pv-alert">{p.slice(2, -2)}</em>;
    return <span key={i}>{p}</span>;
  });
}

function Block({ block }: { block: StoryBlock }) {
  switch (block.type) {
    case 'heading': return <h3 className="pv-h pv-reveal">{block.text}</h3>;
    case 'subheading': return <h4 className="pv-sub pv-reveal">{block.text}</h4>;
    case 'p': return <p className="pv-p pv-reveal">{md(block.text)}</p>;
    case 'label': return <p className="pv-label pv-reveal">{block.text}</p>;
    case 'glass':
      return (
        <figure className="pv-glass pv-reveal">
          <blockquote className="pv-glass-card" style={block.tint ? { '--glass-tint': block.tint } as React.CSSProperties : undefined}>
            <span className="pv-glass-mark" aria-hidden="true">“</span>
            <p>{md(block.text)}</p>
            <span className="pv-glass-sheen" aria-hidden="true" />
          </blockquote>
        </figure>
      );
    case 'list':
      return <ul className="pv-list pv-reveal">{block.items.map((it, i) => <li key={i}>{md(it)}</li>)}</ul>;
    case 'journey':
      return (
        <ol className="pv-journey pv-reveal">
          {block.steps.map((s, i) => (
            <li className="pv-journey-card" key={i}>
              {s.image ? <img src={s.image} alt="" loading="lazy" style={{ aspectRatio: block.ratio ? `${block.ratio}` : '4 / 3' }} /> : null}
              <div className="pv-journey-text">
                <span className="pv-journey-num">{String((block.start ?? 1) + i).padStart(2, '0')}</span>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'steps':
      return (
        <ol className="pv-steps pv-reveal">
          {block.items.map((it, i) => (
            <li key={i}>
              <span className="pv-steps-num">{String(i + 1).padStart(2, '0')}</span>
              <strong>{it.title}</strong>
              <p>{it.text}</p>
            </li>
          ))}
        </ol>
      );
    case 'results':
      return (
        <figure className="pv-results pv-reveal">
          {block.label ? <figcaption className="pv-results-label">{block.label}</figcaption> : null}
          <ul className="pv-results-stats">
            {block.stats.map((s, i) => (
              <li key={i}><span className="pv-results-value">{s.value}</span><span className="pv-results-caption">{s.caption}</span></li>
            ))}
          </ul>
          {block.note ? <p className="pv-results-note">{block.note}</p> : null}
        </figure>
      );
    case 'decline': {
      const circ = 2 * Math.PI * 46;
      return (
        <figure className="pv-decline pv-reveal">
          <span className="pv-decline-eyebrow">{block.eyebrow}</span>
          <p className="pv-decline-text">{md(block.text)}</p>
          <ul className="pv-decline-meters">
            {block.meters.map((m, i) => {
              const pct = parseFloat(m.value) || 0;
              const off = circ * (1 - pct / 100);
              const [num, unit] = [m.value.replace(/[^0-9.×–-]+/g, ''), m.value.replace(/[0-9.×–-]+/g, '')];
              return (
                <li key={i} style={{ '--i': i, '--off': off.toFixed(2), '--c': circ.toFixed(2) } as React.CSSProperties}>
                  <span className="pv-meter">
                    <svg viewBox="0 0 108 108" aria-hidden="true">
                      <circle className="pv-meter-track" cx="54" cy="54" r="46" />
                      <circle className="pv-meter-arc" cx="54" cy="54" r="46" />
                    </svg>
                    <span className="pv-meter-value">{num}<span>{unit}</span></span>
                  </span>
                  <span className="pv-meter-caption">{m.caption}</span>
                </li>
              );
            })}
          </ul>
        </figure>
      );
    }
    case 'snapshots':
      return (
        <figure className="pv-snaps pv-reveal">
          <figcaption className="pv-snaps-source">{block.source}</figcaption>
          <div className="pv-snaps-grid">
            {block.cards.map((c, i) => (
              <section key={i} className="pv-snap">
                <span className="pv-snap-label">{c.label}</span>
                <h4>{c.title}</h4>
                {c.text ? <p className="pv-snap-text">{c.text}</p> : null}
                {i === 0 ? (
                  <dl className="pv-snap-groups">
                    {c.groups.map((g, j) => (
                      <div key={j}>
                        <dt>{g.label}</dt>
                        {g.items.map((it, k) => <dd key={k}>{it}</dd>)}
                      </div>
                    ))}
                  </dl>
                ) : (
                  c.groups.map((g, j) => {
                    const asTags = g.items.every((it) => it.length < 40);
                    return (
                      <ul key={j} className={asTags ? 'pv-snap-tags' : 'pv-snap-notes'}>
                        {g.items.map((it, k) => {
                          const m = !asTags ? it.match(/^([^:]+):\s*(.*)$/) : null;
                          return (
                            <li key={k}>
                              {m ? (<><strong>{m[1]}:</strong> {m[2]}</>) : it}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })
                )}
                {c.quote ? (
                  <blockquote className="pv-snap-quote">
                    <span>Value proposition</span>
                    {c.quote.replace(/^Value proposition:\s*/, '')}
                  </blockquote>
                ) : null}
              </section>
            ))}
          </div>
        </figure>
      );
    case 'slack':
      return (
        <figure className="pv-slack pv-reveal">
          <div className="pv-slack-card">
            <img src={block.image} alt={block.alt} loading="lazy" />
            {block.callout ? (
              <figcaption className="pv-slack-callout">
                <svg className="pv-slack-arrow" viewBox="0 0 84 50" aria-hidden="true">
                  <path d="M2 48 C 22 30, 44 22, 82 4 M 70 4 L 82 4 L 78 16" />
                </svg>
                <span>{block.callout}</span>
              </figcaption>
            ) : null}
          </div>
        </figure>
      );
    case 'link':
      return <p className="pv-p pv-reveal"><a href={block.href} target="_blank" rel="noopener noreferrer">{block.text}</a></p>;
    case 'youtube':
      return (
        <div className="pv-youtube pv-reveal">
          <iframe src={`https://www.youtube.com/embed/${block.id}`} title={block.title} allowFullScreen loading="lazy" />
        </div>
      );
    case 'image':
      return <figure className="pv-figure pv-reveal"><img src={block.src} alt={block.alt} loading="lazy" style={{ aspectRatio: block.ratio ? `${block.ratio}` : undefined }} /></figure>;
    case 'video':
      if (block.badge) {
        return (
          <figure className="pv-legacy pv-versioned pv-reveal">
            <div className="pv-figure" style={{ aspectRatio: '1.6' }}>
              <span className="loop-video">
                <video src={block.src} poster={block.poster} muted loop autoPlay playsInline preload="none" aria-label={block.alt} />
              </span>
              {block.badgeKind === 'legacy' ? (
                <span className="pv-legacy-badge"><span className="pv-legacy-dot" aria-hidden="true" />{block.badge}</span>
              ) : (
                <span className="pv-version-badge">
                  <span className="pv-version-mark" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="11" height="11"><path d="M8 2 14 5.2 8 8.4 2 5.2Z" fill="currentColor" /><path d="M2.6 8.2 8 11.1l5.4-2.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".7" /><path d="M2.6 10.9 8 13.8l5.4-2.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".4" /></svg>
                  </span>
                  {block.badge}
                  <span className="pv-version-sheen" aria-hidden="true" />
                </span>
              )}
            </div>
            {block.caption ? <figcaption className="pv-legacy-caption">{block.caption}</figcaption> : null}
          </figure>
        );
      }
      return (
        <figure className="pv-figure pv-reveal">
          <video src={block.src} poster={block.poster} muted loop autoPlay playsInline preload="none" aria-label={block.alt} />
        </figure>
      );
    case 'placeholder':
      return <p className="pv-placeholder pv-reveal">{block.text}</p>;
    default:
      return null;
  }
}

interface Props {
  project: CloneProject;
  index: number;
  cardImage: HTMLElement | null;
  onCloseComplete: (id?: number) => void;
  onRequestClose: (focusVisible?: boolean) => void;
  /** Opened from a fresh load of /projects/<slug> (no prior history entry). */
  directLoad?: boolean;
  id?: number;
}

const ProjectDetail = forwardRef<ProjectDetailHandle, Props>(function ProjectDetail(
  { project, index, cardImage, onCloseComplete, onRequestClose, directLoad, id },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cardMediaRef = useRef<HTMLElement | null>(cardImage);
  const animatingRef = useRef<boolean>(false);
  const titleRef = useRef<string>('');
  const phaseRef = useRef<'opening' | 'open' | 'closing'>(directLoad ? 'open' : 'opening');
  const pendingCloseRef = useRef<{ focusVisible: boolean } | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const openAnimationsRef = useRef<Animation[]>([]);
  const closeAnimationsRef = useRef<Animation[]>([]);
  const startCloseAnimationRef = useRef<(focusVisible?: boolean) => void>(() => {});

  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>(
    directLoad ? 'open' : 'opening'
  );
  const [revealed, setRevealed] = useState<boolean>(Boolean(directLoad));
  const [landed, setLanded] = useState<boolean>(Boolean(directLoad));

  const slug = project.slug ?? (project.href.replace('/projects/', '').replace(/\/$/, '') || project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const detail = PROJECT_DETAILS[slug];
  const headline = detail?.headline ?? project.title;
  const summary = detail?.summary ?? '';
  const details = detail?.details ?? [];
  const story = detail?.story ?? [];
  const media = project.media;

  useLayoutEffect(() => {
    if (phase !== 'opening' || !heroRef.current || !flyerRef.current || !scrollRef.current) return;
    const root = document.documentElement;
    scrollRef.current.scrollTop = 0;
    root.dataset.projectMotion = '';
    root.dataset.project = 'open';
    titleRef.current = document.title;
    document.title = `${project.title} case study | Amro Abed Moosa`;

    const mediaEl = cardImage ?? document.querySelectorAll<HTMLElement>('[data-card]')[index]?.querySelector<HTMLElement>('.card-media') ?? null;
    cardMediaRef.current = mediaEl;

    const heroEl = heroRef.current;
    const flyerEl = flyerRef.current;
    const heroRect = measureHero(heroEl);

    // Sync video currentTime if applicable
    const cardVideo = mediaEl?.querySelector('video');
    if (cardVideo && Number.isFinite(cardVideo.currentTime)) {
      const flyerVideo = flyerEl.querySelector('video');
      if (flyerVideo) try { flyerVideo.currentTime = cardVideo.currentTime; } catch {}
      const heroVideo = heroEl.querySelector('video');
      if (heroVideo) try { heroVideo.currentTime = cardVideo.currentTime; } catch {}
    }

    const onOpeningDone = () => {
      setLanded(true);
      animatingRef.current = false;
      phaseRef.current = 'open';
      setPhase('open');

      const shouldClose = pendingCloseRef.current !== null || (!directLoad && history.state?.pv == null);
      if (shouldClose) {
        const focusVis = pendingCloseRef.current?.focusVisible ?? false;
        pendingCloseRef.current = null;
        startCloseAnimationRef.current(focusVis);
        return;
      }

      closeButtonRef.current?.focus({ preventScroll: true });
    };

    if (directLoad || !mediaEl || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(flyerEl.style, P(heroRect));
      setRevealed(true);
      onOpeningDone();
      return;
    }

    mediaEl.style.visibility = 'hidden';
    const cardMetrics = measureCardMedia(mediaEl);
    Object.assign(flyerEl.style, P(heroRect));
    flyerEl.style.transformOrigin = '0 0';

    const f = computeFlyerTransforms(cardMetrics, heroRect);
    const fillBoth: FillMode = 'both';

    animatingRef.current = true;
    phaseRef.current = 'opening';
    const animTransform = flyerEl.animate(
      [{ transform: f.cardTransform }, { transform: f.heroTransform }],
      { duration: OPEN_DURATION, easing: OPEN_EASING, fill: fillBoth }
    );
    const animRadius = flyerEl.animate(
      [{ borderRadius: f.cardRadius }, { borderRadius: f.heroRadius }],
      { duration: OPEN_DURATION, easing: OPEN_EASING, fill: fillBoth }
    );
    const animFilter = cardMetrics.filter
      ? flyerEl.animate(
          [
            { filter: cardMetrics.filter },
            { filter: 'blur(0px)', offset: 0.25 },
            { filter: 'none' },
          ],
          { duration: OPEN_DURATION, easing: OPEN_EASING, fill: fillBoth }
        )
      : null;

    openAnimationsRef.current = [animTransform, animRadius, animFilter].filter(Boolean) as Animation[];

    revealTimerRef.current = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);

    animTransform.onfinish = onOpeningDone;

    return () => {
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      openAnimationsRef.current.forEach((a) => {
        try { a.cancel(); } catch {}
      });
      openAnimationsRef.current = [];
    };
  }, [phase, cardImage, directLoad, index, project.title]);

  useEffect(() => {
    if (!directLoad) return;
    const root = document.documentElement;
    root.dataset.project = 'open';
    titleRef.current = document.title;
    document.title = `${project.title} case study | Amro Abed Moosa`;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      delete root.dataset.project;
      if (titleRef.current) document.title = titleRef.current;
    };
  }, [directLoad, project.title]);

  const startCloseAnimation = useCallback((focusVisible = false) => {
    if (phaseRef.current === 'closing') return;
    if (phaseRef.current === 'opening' || animatingRef.current) {
      pendingCloseRef.current = { focusVisible };
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      openAnimationsRef.current.forEach((a) => {
        try { a.playbackRate = 2; } catch {}
      });
      return;
    }
    if (phaseRef.current !== 'open' || !heroRef.current || !flyerRef.current) return;
    animatingRef.current = true;
    phaseRef.current = 'closing';
    setPhase('closing');
    setRevealed(false);
    setLanded(false);
    const root = document.documentElement;
    delete root.dataset.project;

    const flyerEl = flyerRef.current;
    const heroEl = heroRef.current;
    const heroRect = measureHero(heroEl);

    // Fade reveal items in 0.26s via CSS
    scrollRef.current?.querySelectorAll<HTMLElement>('.pv-reveal[data-in]').forEach((el) => {
      el.style.setProperty('--delay', '0ms');
      el.removeAttribute('data-in');
    });

    Object.assign(flyerEl.style, P(heroRect));

    const mediaEl = cardMediaRef.current ?? document.querySelectorAll<HTMLElement>('[data-card]')[index]?.querySelector<HTMLElement>('.card-media') ?? null;

    const onClosingDone = () => {
      if (mediaEl) mediaEl.style.visibility = '';
      delete root.dataset.projectMotion;
      if (titleRef.current) document.title = titleRef.current;
      animatingRef.current = false;
      closeAnimationsRef.current = [];
      onCloseComplete(id);
      const cardEl = mediaEl?.closest<HTMLElement>('[data-card]');
      try {
        (cardEl as unknown as { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void })?.focus({
          preventScroll: true,
          focusVisible,
        });
      } catch {
        cardEl?.focus({ preventScroll: true });
      }
    };

    if (!mediaEl || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClosingDone();
      return;
    }

    const cardMetrics = measureCardMedia(mediaEl);
    const f = computeFlyerTransforms(cardMetrics, heroRect);
    flyerEl.style.transformOrigin = '0 0';

    const closeOpts: KeyframeAnimationOptions = {
      duration: CLOSE_DURATION,
      delay: CLOSE_DELAY,
      easing: CLOSE_EASING,
      fill: 'both',
    };

    const animTransform = flyerEl.animate(
      [{ transform: f.heroTransform }, { transform: f.cardTransform }],
      closeOpts
    );
    const animRadius = flyerEl.animate(
      [{ borderRadius: f.heroRadius }, { borderRadius: f.cardRadius }],
      closeOpts
    );
    const animFilter = cardMetrics.filter
      ? flyerEl.animate(
          [
            { filter: 'none' },
            { filter: 'blur(0px)', offset: 0.75 },
            { filter: cardMetrics.filter },
          ],
          closeOpts
        )
      : null;

    closeAnimationsRef.current = [animTransform, animRadius, animFilter].filter(Boolean) as Animation[];

    animTransform.onfinish = onClosingDone;
  }, [id, index, onCloseComplete]);

  startCloseAnimationRef.current = startCloseAnimation;

  useEffect(() => {
    if (phase === 'open' && !directLoad && history.state?.pv == null) {
      const focusVis = pendingCloseRef.current?.focusVisible ?? false;
      pendingCloseRef.current = null;
      startCloseAnimation(focusVis);
    }
  }, [phase, directLoad, startCloseAnimation]);

  useImperativeHandle(ref, () => ({
    startCloseAnimation,
  }), [startCloseAnimation]);

  const handleTriggerClose = useCallback((focusVisible = false) => {
    onRequestClose(focusVisible);
  }, [onRequestClose]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleTriggerClose(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      closeAnimationsRef.current.forEach((a) => {
        try { a.cancel(); } catch {}
      });
      closeAnimationsRef.current = [];
      delete document.documentElement.dataset.project;
      delete document.documentElement.dataset.projectMotion;
      if (cardMediaRef.current) cardMediaRef.current.style.visibility = '';
      if (titleRef.current) document.title = titleRef.current;
    };
  }, [handleTriggerClose]);

  useEffect(() => {
    if (!revealed || !scrollRef.current) return;
    if (directLoad) {
      scrollRef.current.querySelectorAll('.pv-reveal').forEach((el) => el.setAttribute('data-in', ''));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((en) => en.isIntersecting);
      visible.forEach((en, i) => {
        (en.target as HTMLElement).style.setProperty('--delay', `${95 * i}ms`);
        en.target.setAttribute('data-in', '');
        io.unobserve(en.target);
      });
    }, { root: scrollRef.current, rootMargin: '0px 0px -8% 0px' });
    scrollRef.current.querySelectorAll('.pv-reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [revealed, directLoad]);

  const mediaContent = media.type === 'video' ? (
    <span className="loop-video">
      <video
        src={media.mp4}
        poster={media.poster}
        muted
        loop
        autoPlay
        playsInline
        preload="none"
        disablePictureInPicture
        aria-label={headline}
      />
    </span>
  ) : (
    <img src={media.src} alt={media.alt} />
  );

  const flyerMediaContent = media.type === 'video' ? (
    <span className="loop-video">
      <video
        src={media.mp4}
        poster={media.poster}
        muted
        loop
        autoPlay
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
      />
    </span>
  ) : (
    <img src={media.src} alt="" />
  );

  return (
    <div
      className="pv"
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      data-phase={phase}
      data-revealed={revealed ? '' : undefined}
      data-static={directLoad ? '' : undefined}
    >
      <div className="pv-topbar" aria-label="Back to the portfolio">
        <button ref={closeButtonRef} type="button" onClick={() => handleTriggerClose(false)}>
          [close]
        </button>
        <span>esc</span>
      </div>
      <div
        className="pv-scroll"
        ref={scrollRef}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.pv-column')) handleTriggerClose(false);
        }}
      >
        <article className="pv-column">
          <div ref={heroRef} className="pv-hero" data-landed={landed ? '' : undefined}>
            {mediaContent}
          </div>
          <header className="pv-head">
            <p className="pv-eyebrow pv-reveal">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{project.kind.toLowerCase()}</span>
              {detail?.year ? <span>{detail.year}</span> : null}
            </p>
            <h1 className="pv-reveal">{headline}</h1>
            {summary ? <p className="pv-summary pv-reveal">{summary}</p> : null}
            <a className="pv-cta pv-reveal" href={project.href} target="_blank" rel="noopener noreferrer">
              {project.href.includes('github.com') ? 'View on GitHub' : `Visit ${project.title}`}
              <span aria-hidden="true">↗</span>
            </a>
          </header>
          {details.length ? (
            <dl className="pv-details pv-reveal">
              {details.map((d) => (
                <div key={d.label}>
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="pv-story">
            {story.map((b, i) => (
              <Block key={i} block={b} />
            ))}
            {!detail ? (
              <p className="pv-placeholder pv-reveal">
                Case-study content for this project was not available in the mirror.
              </p>
            ) : null}
          </div>
          <footer className="pv-foot">
            <button type="button" onClick={() => handleTriggerClose(false)}>
              [close]
            </button>
            <span>esc</span>
          </footer>
        </article>
      </div>
      <div ref={flyerRef} className="pv-flyer" aria-hidden="true" data-landed={landed ? '' : undefined}>
        {flyerMediaContent}
      </div>
    </div>
  );
});

export default ProjectDetail;
