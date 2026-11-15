import { useEffect, useRef } from 'react';
import type { CloneProject } from '../data/clone';
import { PROJECT_DETAILS, type StoryBlock } from '../data/projectDetails';

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
  onClose: () => void;
  /** Opened from a fresh load of /projects/<slug> (no prior history entry). */
  directLoad?: boolean;
}

export default function ProjectDetail({ project, index, onClose, directLoad }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pushedRef = useRef(false);
  const popClosedRef = useRef(false);
  const slug = project.href.replace('/projects/', '').replace(/\/$/, '') || project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const detail = PROJECT_DETAILS[slug];
  const headline = detail?.headline ?? project.title;
  const summary = detail?.summary ?? '';
  const details = detail?.details ?? [];
  const story = detail?.story ?? [];
  const media = project.media;

  useEffect(() => {
    document.documentElement.dataset.project = 'open';
    document.documentElement.dataset.projectMotion = '';
    const prevTitle = document.title;
    document.title = `${project.title} case study | Shai Krishna`;
    try {
      if (!history.state || history.state.pv !== index) {
        history.pushState({ pv: index }, '', `/projects/${slug}`);
        pushedRef.current = true;
      }
    } catch { /* ignore */ }
    const t = window.setTimeout(() => { delete document.documentElement.dataset.projectMotion; }, 900);
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onPop = () => { popClosedRef.current = true; onClose(); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    // Direct load (fresh /projects/<slug>): the original serves a static
    // page with everything revealed (data-revealed), so reveal all blocks
    // at once instead of waiting for a scroll.
    if (directLoad) {
      scrollRef.current?.querySelectorAll('.pv-reveal').forEach((el) => el.setAttribute('data-in', ''));
    }
    // Reveal on scroll, staggered 95ms per newly-visible batch.
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((en) => en.isIntersecting);
      visible.forEach((en, i) => {
        (en.target as HTMLElement).style.setProperty('--delay', `${95 * i}ms`);
        en.target.setAttribute('data-in', '');
        io.unobserve(en.target);
      });
    }, { root: scrollRef.current, rootMargin: '0px 0px -8% 0px' });
    scrollRef.current?.querySelectorAll('.pv-reveal').forEach((el) => io.observe(el));
    return () => {
      window.clearTimeout(t);
      delete document.documentElement.dataset.project;
      delete document.documentElement.dataset.projectMotion;
      document.title = prevTitle;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      io.disconnect();
      if (pushedRef.current && !popClosedRef.current) {
        try {
          // Direct load: there is no homepage entry to go back to, so
          // replace the URL instead of navigating away from the site.
          if (directLoad) history.replaceState(null, '', '/');
          else history.back();
        } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => onClose();

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={headline} data-phase="open">
      <div className="pv-topbar" aria-label="Back to the portfolio">
        <button type="button" onClick={close}>[close]</button>
        <span>esc</span>
      </div>
      <div className="pv-scroll" ref={scrollRef} onClick={(e) => { if (!(e.target as HTMLElement).closest('.pv-column')) close(); }}>
        <article className="pv-column">
          <div className="pv-hero">
            {media.type === 'video' ? (
              <video src={media.mp4} poster={media.poster} muted loop autoPlay playsInline preload="none" disablePictureInPicture aria-label={headline} />
            ) : (
              <img src={media.src} alt={media.alt} />
            )}
          </div>
          <header className="pv-head">
            <p className="pv-eyebrow pv-reveal">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{project.kind.toLowerCase()}</span>
              {detail?.year ? <span>{detail.year}</span> : null}
            </p>
            <h1 className="pv-reveal">{headline}</h1>
            {summary ? <p className="pv-summary pv-reveal">{summary}</p> : null}
          </header>
          {details.length ? (
            <dl className="pv-details pv-reveal">
              {details.map((d) => (
                <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>
              ))}
            </dl>
          ) : null}
          <div className="pv-story">
            {story.map((b, i) => <Block key={i} block={b} />)}
            {!detail ? <p className="pv-placeholder pv-reveal">Case-study content for this project was not available in the mirror.</p> : null}
          </div>
          <footer className="pv-foot">
            <button type="button" onClick={close}>[close]</button>
            <span>esc</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
