import { useEffect, useRef } from 'react';
import type { CloneProject } from '../data/clone';
import { PROJECT_DETAILS, type StoryBlock } from '../data/projectDetails';

function md(text: string): React.ReactNode {
  // **bold** and ~~strikethrough~~ only, as the original uses.
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('~~') && p.endsWith('~~')) return <s key={i}>{p.slice(2, -2)}</s>;
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
        <blockquote className="pv-glass pv-reveal" style={block.tint ? { '--glass-tint': block.tint } as React.CSSProperties : undefined}>
          <span className="pv-glass-mark" aria-hidden="true">“</span>
          <p>{md(block.text)}</p>
          <span className="pv-glass-sheen" aria-hidden="true" />
        </blockquote>
      );
    case 'list':
      return <ul className="pv-list pv-reveal">{block.items.map((it, i) => <li key={i}>{md(it)}</li>)}</ul>;
    case 'journey':
      return (
        <div className="pv-journey pv-reveal">
          {block.steps.map((s, i) => (
            <figure className="pv-journey-card" key={i}>
              {s.image ? <img src={s.image} alt="" loading="lazy" style={{ aspectRatio: block.ratio ? `${block.ratio}` : '4 / 3' }} /> : null}
              <span className="pv-journey-num">{String((block.start ?? 1) + i).padStart(2, '0')}</span>
              <figcaption className="pv-journey-text">{s.text}</figcaption>
            </figure>
          ))}
        </div>
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
        <div className="pv-results pv-reveal">
          {block.label ? <p className="pv-label">{block.label}</p> : null}
          <div className="pv-stats">
            {block.stats.map((s, i) => (
              <div key={i} className="pv-stat"><span className="pv-stat-value">{s.value}</span><span className="pv-stat-caption">{s.caption}</span></div>
            ))}
          </div>
          {block.note ? <p className="pv-p">{block.note}</p> : null}
        </div>
      );
    case 'decline':
      return (
        <div className="pv-decline pv-reveal">
          <p className="pv-label">{block.eyebrow}</p>
          <p className="pv-p">{block.text}</p>
          <div className="pv-meters">
            {block.meters.map((m, i) => (
              <div key={i} className="pv-meter">
                <span className="pv-meter-value">{m.value}</span>
                <span className="pv-meter-bar"><span style={{ width: m.value }} /></span>
                <span className="pv-meter-caption">{m.caption}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'snapshots':
      return (
        <div className="pv-snapshots pv-reveal">
          <p className="pv-label">{block.source}</p>
          <div className="pv-snap-grid">
            {block.cards.map((c, i) => (
              <div key={i} className="pv-snap-card">
                <p className="pv-label">{c.label}</p>
                <h4>{c.title}</h4>
                {c.text ? <p>{c.text}</p> : null}
                {c.groups.map((g, j) => (
                  <div key={j}>
                    <p className="pv-snap-group">{g.label}</p>
                    <ul>{g.items.map((it, k) => <li key={k}>{it}</li>)}</ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case 'slack':
      return <figure className="pv-slack pv-reveal"><img src={block.image} alt={block.alt} loading="lazy" /></figure>;
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
}

export default function ProjectDetail({ project, index, onClose }: Props) {
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
        try { history.back(); } catch { /* ignore */ }
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
              <video src={media.mp4} poster={media.poster} muted loop autoPlay playsInline preload="none" disablePictureInPicture aria-label={project.title} />
            ) : (
              <img src={media.src} alt={media.alt} />
            )}
          </div>
          <header className="pv-head pv-reveal">
            <p className="pv-eyebrow">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{project.kind.toLowerCase()}</span>
              {detail?.year ? <span>{detail.year}</span> : null}
            </p>
            <h2>{headline}</h2>
            {summary ? <p className="pv-summary">{summary}</p> : null}
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
