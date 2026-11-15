// WebAudio synth port of the original site's sound module (module 83847).
// Everything is synthesized; no audio files exist. Master gain 1.3,
// DynamicsCompressor threshold -10, convolver reverb with a generated
// 90ms impulse, reverb send gain 0.16, looping filtered-noise ambience bed.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let convolver: ConvolverNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let bed: {
  level: GainNode;
  band: BiquadFilterNode;
  pan: StereoPannerNode;
} | null = null;
let unlocked = false;

const jit = (e: number) => 1 + (2 * Math.random() - 1) * e;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** p() — init / resume, idempotent. Call on first user gesture. */
export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const t = new AC();
    ctx = t;
    master = t.createGain();
    master.gain.value = 1.3;
    const comp = t.createDynamicsCompressor();
    comp.threshold.value = -10;
    master.connect(comp);
    comp.connect(t.destination);
    // 90ms decaying-noise stereo impulse for the convolver.
    const len = Math.floor(t.sampleRate * 0.09);
    const impulse = t.createBuffer(2, len, t.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    convolver = t.createConvolver();
    convolver.buffer = impulse;
    const wet = t.createGain();
    wet.gain.value = 0.16;
    convolver.connect(wet);
    wet.connect(master);
    // 50ms white-noise buffer shared by all noise bursts.
    noiseBuf = t.createBuffer(1, Math.floor(t.sampleRate * 0.05), t.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Looping filtered-noise ambience bed (scroll velocity).
    const src = t.createBufferSource();
    const bedBuf = t.createBuffer(1, Math.floor(t.sampleRate * 2.5), t.sampleRate);
    src.buffer = bedBuf;
    const sd = bedBuf.getChannelData(0);
    for (let i = 0; i < sd.length; i++) sd[i] = Math.random() * 2 - 1;
    src.loop = true;
    const band = t.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.8;
    const level = t.createGain();
    level.gain.value = 0;
    const lfoSrc = t.createBufferSource();
    lfoSrc.buffer = src.buffer;
    lfoSrc.loop = true;
    lfoSrc.playbackRate.value = 0.03;
    const lfoGain = t.createGain();
    lfoGain.gain.value = 2.2;
    const lfoLevel = t.createGain();
    lfoLevel.gain.value = 1;
    lfoSrc.connect(lfoGain);
    lfoGain.connect(lfoLevel.gain);
    const pan = t.createStereoPanner();
    src.connect(band);
    band.connect(level);
    level.connect(lfoLevel);
    lfoLevel.connect(pan);
    pan.connect(master);
    src.start();
    lfoSrc.start();
    bed = { level, band, pan };
  }
  unlocked = true;
  if (ctx.state === 'suspended') void ctx.resume();
}

function live(): AudioContext | null {
  return ctx && unlocked && master && convolver && noiseBuf && ctx.state !== 'closed' ? ctx : null;
}

/** g() — stereo panner wired dry (master) + wet (convolver). */
function send(t: AudioContext, pan: number): StereoPannerNode {
  const n = t.createStereoPanner();
  n.pan.value = clamp(pan, -1, 1);
  n.connect(master!);
  n.connect(convolver!);
  return n;
}

interface BurstOpts {
  gain: number;
  decay: number;
  hp?: number;
  lp?: number;
  band?: number;
  q?: number;
}

/** m() — noise burst with filter chain + exponential decay. */
function burst(t: AudioContext, when: number, out: AudioNode, o: BurstOpts) {
  const src = t.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = jit(0.1);
  let node: AudioNode = src;
  if (o.band !== undefined) {
    const f = t.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.band;
    f.Q.value = o.q ?? 1.5;
    node.connect(f);
    node = f;
  }
  if (o.hp !== undefined) {
    const f = t.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = o.hp;
    node.connect(f);
    node = f;
  }
  if (o.lp !== undefined) {
    const f = t.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    node.connect(f);
    node = f;
  }
  const g = t.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.gain), when + 0.0003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + o.decay);
  node.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + o.decay + 0.05);
}

/** f() — sine blip with frequency glide. */
function blip(t: AudioContext, when: number, out: AudioNode, from: number, to: number, peak: number, dur: number) {
  const osc = t.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), when + dur);
  const g = t.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/** y() — scroll-velocity ambience bed. */
export function scrollAmbience(velocity: number, pan = 0) {
  const n = live();
  if (!n || !bed) return;
  const a = Math.min(1, velocity / 1400);
  const r = n.currentTime;
  bed.level.gain.setTargetAtTime(a > 0.01 ? 0.26 * Math.pow(a, 0.55) : 0, r, a > 0.01 ? 0.025 : 0.05);
  bed.band.frequency.setTargetAtTime(500 + 2100 * a, r, 0.04);
  bed.pan.pan.setTargetAtTime(0.6 * clamp(pan, -1, 1), r, 0.05);
}

/** w() — short click. */
export function clickSound(full: boolean, pan = 0) {
  const n = live();
  if (!n) return;
  const a = n.currentTime;
  const r = send(n, 0.6 * pan);
  const i = full ? 1 : 0.65;
  burst(n, a, r, { gain: 0.32 * i, decay: 0.012, band: 1500 * jit(0.06), q: 1.6 });
  blip(n, a, r, full ? 210 : 250, 120, 0.15 * i, 0.035);
}

/** v() — multi-layer slide open/close sound. */
export function slideSound(open: boolean) {
  const t = live();
  if (!t) return;
  const n = t.currentTime;
  const a = send(t, -0.35);
  if (open) {
    burst(t, n, a, { gain: 0.5, decay: 0.006, hp: 2000 * jit(0.06), lp: 7200 });
    burst(t, n + 0.011, a, { gain: 0.14, decay: 0.008, band: 3300 * jit(0.06), q: 2.4 });
    burst(t, n + 0.046, a, { gain: 0.42, decay: 0.03, band: 520 * jit(0.06), q: 1.4 });
    burst(t, n + 0.048, a, { gain: 0.12, decay: 0.004, hp: 1500, lp: 5200 });
    blip(t, n + 0.046, a, 140 * jit(0.05), 68, 0.16, 0.05);
  } else {
    burst(t, n, a, { gain: 0.32, decay: 0.022, band: 600 * jit(0.06), q: 1.5 });
    blip(t, n, a, 165 * jit(0.05), 92, 0.12, 0.035);
    burst(t, n + 0.034, a, { gain: 0.42, decay: 0.005, hp: 2200 * jit(0.06), lp: 7600 });
    burst(t, n + 0.041, a, { gain: 0.1, decay: 0.004, hp: 2600, lp: 7000 });
  }
}

/** b() — click variant (row press / shortcut). */
export function pressSound(full: boolean) {
  const t = live();
  if (!t) return;
  const n = t.currentTime;
  const a = send(t, -0.3);
  const r = full ? 1 : 0.55;
  burst(t, n, a, { gain: 0.42 * r, decay: 0.005, hp: 1800 * jit(0.06), lp: 6800 });
  burst(t, n, a, { gain: 0.2 * r, decay: 0.014, band: 900 * jit(0.06), q: 1.8 });
  blip(t, n, a, full ? 185 : 215, 115, 0.08 * r, 0.03);
}

/** Glide tick — quiet high tick when the contact glide moves rows. */
let lastTick = 0;
export function glideTick() {
  const now = performance.now();
  if (now - lastTick < 45) return;
  lastTick = now;
  const t = live();
  if (!t) return;
  const n = send(t, -0.3);
  burst(t, t.currentTime, n, { gain: 0.06, decay: 0.003, band: 5200 * jit(0.08), q: 2 });
}

/** Slider snap tick (inline sound + haptic). */
export function snapTick(velocityFactor: number) {
  const t = live();
  if (!t) return;
  const n = t.currentTime;
  const a = send(t, -0.35);
  const i = Math.min(1, velocityFactor);
  burst(t, n, a, { gain: 0.1 * i, decay: 0.006, hp: 1800 * jit(0.06), lp: 6800 });
  burst(t, n, a, { gain: 0.08 * i, decay: 0.01, band: 900 * jit(0.06), q: 1.8 });
  burst(t, n + 0.008, a, { gain: 0.06 * i, decay: 0.004, band: 3300 * jit(0.06), q: 2.4 });
  blip(t, n, a, 120 * jit(0.06), 62, 0.09 * i, 0.035);
  vibrate(8);
}

/** Slider soft tick while passing a stop at speed. */
let lastSoftTick = 0;
export function softTick(speed: number) {
  const now = performance.now();
  if (now - lastSoftTick < 18) return;
  lastSoftTick = now;
  const t = live();
  if (!t) return;
  burst(t, t.currentTime, send(t, -0.35), {
    gain: 0.04 + 0.08 * Math.min(1, speed / 1400),
    decay: 0.003,
    band: 4200 * jit(0.15),
    q: 1.8,
  });
}

/** Slider hard-stop thud at a track end. */
export function hardStopThud() {
  const t = live();
  if (!t) return;
  const n = t.currentTime;
  const a = send(t, -0.35);
  burst(t, n, a, { gain: 0.3, decay: 0.02, band: 500 * jit(0.06), q: 1.4 });
  burst(t, n, a, { gain: 0.2, decay: 0.01, hp: 1500, lp: 6000 });
  blip(t, n, a, 95, 40, 0.26, 0.1);
  vibrate(12);
}

/** k() — haptics. */
export function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
}

/** Audio state for headless verification (no sound is audible headless). */
export function audioState(): string {
  if (!ctx) return 'none';
  return ctx.state;
}
export function installAudioUnlock() {
  const unlock = () => initAudio();
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(ev, unlock, { once: true, passive: true });
  }
}
