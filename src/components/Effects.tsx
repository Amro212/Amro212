// Film light: static CSS/SVG grain (body::after already carries it) plus a
// slow CSS light sweep. No per-frame canvas work at all — the old version
// did full-screen gradient fillRects + tiled drawImage every frame.
export function FilmLight() {
  return <div className="film-light" aria-hidden="true" />;
}
