import { useEffect, useRef } from 'react';

/**
 * film-light: animated film grain + a slow light sweep drawn on a canvas
 * above the page (pointer-events none). The original draws the same idea
 * on CANVAS.film-light; the static grain also lives in body::after.
 */
export function FilmLight() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Small noise tile, redrawn at random offsets each frame.
    const tile = document.createElement('canvas');
    tile.width = 160;
    tile.height = 160;
    const tctx = tile.getContext('2d');
    if (!tctx) return;
    const img = tctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 20);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);

    let raf = 0;
    let last = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 90) return; // ~11fps grain, cheap
      last = t;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.05;
      const ox = -Math.floor(Math.random() * 160);
      const oy = -Math.floor(Math.random() * 160);
      for (let x = ox; x < w; x += 160) {
        for (let y = oy; y < h; y += 160) {
          ctx.drawImage(tile, x, y);
        }
      }
      // Slow light sweep across the top.
      const sx = ((t / 24000) % 1.4 - 0.2) * w;
      const grad = ctx.createRadialGradient(sx, h * 0.12, 0, sx, h * 0.12, w * 0.35);
      grad.addColorStop(0, 'rgba(214, 224, 238, 0.05)');
      grad.addColorStop(1, 'rgba(214, 224, 238, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas id="film-light" className="film-light" aria-hidden="true" ref={ref} />;
}

/**
 * pond: a very slow ambient light drift that fades in once the intro is
 * done (data-ready mirrors the original's CANVAS.pond behaviour).
 */
export function Pond({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.5 + 0.32 * Math.sin(t / 9000 + (i * Math.PI * 2) / 3));
        const cy = h * (0.46 + 0.1 * Math.cos(t / 12000 + i * 1.7));
        const r = w * 0.28;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(214, 224, 238, 0.035)');
        g.addColorStop(1, 'rgba(214, 224, 238, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas className="pond" aria-hidden="true" ref={ref} data-ready={ready ? '' : undefined} />;
}
