// WebGL2 pond port — faithful port of the original's pond module
// (three.js, heightfield water sim, procedural koi + fry).
// No image assets; everything procedural. See docs/reference-interaction-audit.md.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const u = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

const PASS_VS = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const WAVE_FS = `
uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec4 uDrops[24];
uniform int uCount;
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tPrev, vUv);
  vec2 px = vUv * uSize;
  for (int i = 0; i < 24; i++) {
    if (i >= uCount) break;
    vec4 d = uDrops[i];
    float k = max(0.0, 1.0 - length(px - d.xy) / d.z);
    info.r += (0.5 - cos(k * 3.14159) * 0.5) * d.w;
  }
  float avg = (
    texture2D(tPrev, vUv - vec2(uTexel.x, 0.0)).r +
    texture2D(tPrev, vUv + vec2(uTexel.x, 0.0)).r +
    texture2D(tPrev, vUv - vec2(0.0, uTexel.y)).r +
    texture2D(tPrev, vUv + vec2(0.0, uTexel.y)).r
  ) * 0.25;
  info.g += (avg - info.r) * 2.0;
  info.g *= 0.994;
  info.r += info.g;
  info.r *= 0.999;
  gl_FragColor = info;
}
`;

const COMP_FS = `
uniform sampler2D tFish;
uniform sampler2D tWater;
uniform vec2 uRes;
uniform vec2 uTexel;
uniform float uDpr;
uniform float uColumn;
varying vec2 vUv;
const vec3 BG = vec3(6.0, 8.0, 11.0) / 255.0;
const vec3 DOT = vec3(18.0, 20.0, 24.0) / 255.0;
void main() {
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float h = texture2D(tWater, vUv).r;
  float hl = texture2D(tWater, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture2D(tWater, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture2D(tWater, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture2D(tWater, vUv + vec2(0.0, uTexel.y)).r;
  vec2 g = vec2(hr - hl, hu - hd);
  vec2 off = g * 18.0;
  vec2 q = px + vec2(off.x, -off.y) * 0.7;
  vec2 m = mod(q, 16.0) - 8.0;
  float aa = 0.6 / uDpr;
  vec3 col = mix(BG, DOT, 1.0 - smoothstep(1.0 - aa, 1.0 + aa, length(m)));
  vec4 fish = texture2D(tFish, vUv + off / uRes);
  float lap = hl + hr + hu + hd - 4.0 * h;
  fish.rgb *= 1.0 + clamp(-lap * 6.0, -0.15, 0.4);
  float colm = 1.0 - smoothstep(uColumn, uColumn + 170.0, abs(px.x - uRes.x * 0.5));
  fish *= 1.0 - 0.48 * colm;
  col = col * (1.0 - fish.a) + fish.rgb;
  float band = dot(g, vec2(-0.55, 0.835));
  col += vec3(0.6, 0.66, 0.75) * clamp(band * 0.9, 0.0, 0.16);
  col *= 1.0 - clamp(-band * 0.7, 0.0, 0.22);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FISH_VS = `
uniform vec4 uSpine[24];
uniform float uLength;
uniform float uZ;
uniform vec2 uFlap;
uniform vec4 uTail;
uniform vec3 uTailShape;
attribute vec3 aLocal;
attribute vec3 aNorm;
attribute vec2 aCoord;
attribute float aKind;
attribute vec3 aFin;
varying vec3 vN;
varying vec2 vCoord;
varying float vKind;
varying float vSheen;
void main() {
  vec3 loc = aLocal;
  vSheen = 0.0;
  if (aKind > 0.5 && aKind < 1.5) {
    float a = aFin.x;
    float rn = aFin.y;
    float aa = abs(a);
    float reach = uTailShape.x * (0.68 + 0.4 * sin(aa * 1.95)) * sqrt(max(0.0, 1.0 - pow(aa, 8.0)));
    float r = reach * rn;
    float wave = uTail.z - rn * 5.0 + a * 1.4;
    float th = a * uTailShape.z * uTail.y + uTail.x * rn * (0.55 + 0.45 * rn) + uTail.w * rn * rn * sin(wave);
    loc.x += cos(th) * r / uLength;
    loc.y += a * uTailShape.y + sin(th) * r;
    vSheen = cos(wave) * rn;
  } else if (aKind > 1.5 && aKind < 2.5) {
    float sgn = aFin.z;
    float flap = sgn > 0.0 ? uFlap.x : uFlap.y;
    float phi = aFin.x + flap;
    float r = aFin.y * (0.86 + 0.14 * cos(flap * 2.0));
    loc.x += cos(phi) * r / uLength;
    loc.y += sgn * sin(phi) * r;
  }
  float f = clamp(loc.x, 0.0, 1.0) * 23.0;
  float fi = min(floor(f), 22.0);
  int i = int(fi);
  float t = f - fi;
  vec4 a = uSpine[i];
  vec4 b = uSpine[i + 1];
  vec2 T = normalize(mix(a.zw, b.zw, t));
  vec2 P = mix(a.xy, b.xy, t) - T * (loc.x - clamp(loc.x, 0.0, 1.0)) * uLength;
  vec2 N = vec2(-T.y, T.x);
  vN = vec3(-T * aNorm.x + N * aNorm.y, aNorm.z);
  vCoord = aCoord;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(P + N * loc.y, uZ + loc.z, 1.0);
}
`;

const FISH_FS = `
uniform vec3 uBase;
uniform vec4 uPatch[6];
uniform vec3 uPatchCol[6];
uniform float uSeed;
uniform float uClarity;
uniform float uLength;
uniform float uWidth;
uniform float uSheen;
uniform float uBack;
uniform float uEye;
uniform vec3 uTailRoot;
varying vec3 vN;
varying vec2 vCoord;
varying float vKind;
varying float vSheen;
const vec3 WATER = vec3(0.024, 0.031, 0.043);
const vec3 L = vec3(-0.46, 0.56, 0.69);
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
void main() {
  vec2 c = vCoord;
  if (vKind < 0.5) {
    vec3 col = uBase;
    col = mix(col * 0.5, col, mix(1.0, smoothstep(0.05, 0.65, abs(c.y)), uBack));
    for (int i = 0; i < 6; i++) {
      vec4 p = uPatch[i];
      if (p.z <= 0.0) continue;
      vec2 d = vec2((c.x - p.x) / p.z, (c.y - p.y) / p.w);
      float n = 0.5 * noise(c * vec2(16.0, 4.0) + uSeed + float(i) * 7.0) + 0.3 * noise(c * vec2(42.0, 10.0) + uSeed * 1.7);
      float m = smoothstep(0.06, -0.06, dot(d, d) - (0.62 + n));
      col = mix(col, uPatchCol[i], m);
    }
    float k = uLength * 0.42;
    float sa = sin(c.x * k + c.y * 7.0);
    float sb = sin(c.x * k - c.y * 7.0);
    float onA = 1.0 - smoothstep(0.0, 1.0, abs(sa) / max(fwidth(sa), 1e-4));
    float onB = 1.0 - smoothstep(0.0, 1.0, abs(sb) / max(fwidth(sb), 1e-4));
    float fine = 1.0 - smoothstep(0.35, 0.9, fwidth(c.x * k));
    col *= 1.0 - 0.1 * max(onA, onB) * fine * smoothstep(0.14, 0.24, c.x);
    vec2 e = vec2((c.x - 0.075) * uLength, (abs(c.y) - 0.72) * uWidth);
    float eye = 1.0 - smoothstep(uWidth * uEye * 0.8, uWidth * uEye, length(e));
    col = mix(col, vec3(0.02), eye);
    vec3 n = normalize(vN);
    vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
    float dif = 0.4 + 0.6 * max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, h), 0.0), 26.0) * uSheen;
    vec3 lit = col * dif + spec * vec3(1.0, 0.98, 0.95) + eye * pow(max(dot(n, h), 0.0), 60.0) * 0.8;
    lit *= 0.55 + 0.45 * n.z;
    gl_FragColor = vec4(mix(WATER, lit, uClarity), 1.0);
  } else if (vKind < 1.5) {
    float rn = c.x;
    float a = c.y;
    float x = a * 9.0;
    float fw = fwidth(x);
    float dRay = abs(fract(x + 0.5) - 0.5);
    float ray = (1.0 - smoothstep(0.045, 0.045 + fw, dRay)) * (1.0 - smoothstep(0.22, 0.45, fw)) * smoothstep(90.0, 160.0, uLength);
    float fray = noise(vec2(a * 40.0, uSeed)) * 0.06 + noise(vec2(a * 110.0, uSeed * 1.3)) * 0.03;
    float limit = 1.0 - fray * 0.6 - 0.008 * (1.0 - ray);
    float ew = max(fwidth(rn) * 1.5, 0.015);
    float edge = 1.0 - smoothstep(limit - ew, limit, rn);
    float grow = smoothstep(0.0, 0.16, rn);
    float alpha = (mix(0.74, 0.36, smoothstep(0.0, 0.95, rn)) + 0.14 * ray) * grow * edge;
    float away = smoothstep(0.05, 0.75, rn);
    vec3 col = mix(uTailRoot, vec3(0.86, 0.9, 0.94), away * 0.8);
    col = mix(col, uTailRoot * 0.9 + 0.08, ray * 0.3 * (1.0 - away * 0.4));
    col *= 0.95 + 0.07 * sin(x * 6.2832);
    col *= 0.8 + 0.28 * (1.0 - rn);
    col += vec3(1.0, 0.98, 0.95) * pow(max(vSheen, 0.0), 3.0) * 0.4 * uSheen;
    alpha *= mix(0.6, 1.0, uClarity);
    col = mix(WATER, col, uClarity);
    gl_FragColor = vec4(col * alpha, alpha);
  } else {
    float t = c.x;
    float u = c.y;
    float a;
    vec3 fc = mix(uBase, vec3(0.95), 0.35);
    if (vKind < 2.5) {
      a = 0.46 * (0.72 + 0.28 * sin(u * 22.0)) * (1.0 - smoothstep(0.8, 1.0, t)) * (1.0 - smoothstep(0.8, 1.0, abs(u)));
    } else {
      fc *= 0.55;
      a = 0.6 * (1.0 - smoothstep(0.5, 1.0, abs(u))) * smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.85, 1.0, t));
    }
    a *= mix(0.6, 1.0, uClarity);
    vec3 col = mix(WATER, fc * 0.85, uClarity);
    gl_FragColor = vec4(col * a, a);
  }
}
`;

interface Species {
  turn: number; meander: number; vb: [number, number]; glide: [number, number];
  stroke: [number, number]; burst: number; react: number; R: number; amp: number;
  beat: number; beatK: number; edge: number; band: number; bend: number;
}
const SPECIES: Record<'koi' | 'fry', Species> = {
  koi: { turn: 1.1, meander: 1, vb: [24, 40], glide: [1.6, 3.4], stroke: [1.8, 4], burst: 7, react: 1600, R: 360, amp: 0.045, beat: 0.45, beatK: 1 / 75, edge: 0.35, band: 260, bend: 0.4 },
  fry: { turn: 3.4, meander: 2.4, vb: [42, 64], glide: [0.3, 1], stroke: [0.4, 1.3], burst: 6, react: 3200, R: 440, amp: 0.075, beat: 1.4, beatK: 1 / 28, edge: 0.15, band: 130, bend: 0.6 },
};
const TAIL_LEN: Record<'koi' | 'fry', number> = { koi: 0.3, fry: 0.25 };

const WHITE = new THREE.Vector3(0.9, 0.89, 0.86);
const ORANGE = new THREE.Vector3(0.95, 0.46, 0.15);
const RED = new THREE.Vector3(0.84, 0.24, 0.1);
const BLACK = new THREE.Vector3(0.06, 0.06, 0.07);
const GOLD = new THREE.Vector3(0.95, 0.71, 0.27);
const SILVER = new THREE.Vector3(0.8, 0.81, 0.83);
const FRY_COL = new THREE.Vector3(0.66, 0.7, 0.67);

function profileG(x: number): number {
  if (x < 0) return 0;
  if (x < 0.16) return 0.9 * Math.sqrt(1 - Math.pow((0.16 - x) / 0.16, 2));
  if (x < 0.32) return 0.9 + 0.1 * Math.sin(((x - 0.16) / 0.16) * Math.PI / 2);
  return Math.max(0.02, 1 - 0.86 * Math.pow((x - 0.32) / 0.54, 1.7));
}

interface GeomParts { body: THREE.BufferGeometry; fins: THREE.BufferGeometry }

function buildGeom(L: number, width: number, height: number, kind: 'koi' | 'fry'): GeomParts {
  const rings = kind === 'koi' ? 40 : 16;
  const around = kind === 'koi' ? 16 : 8;
  const pos: number[] = []; const loc: number[] = []; const nor: number[] = [];
  const coord: number[] = []; const kinds: number[] = []; const fin: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const x = 0.86 * Math.pow(1 - Math.cos((r / rings) * Math.PI / 2), 0.85);
    const g = profileG(x);
    const hw = Math.max(0.3, width * g);
    const hh = Math.max(0.3, height * g);
    // Original body is a HALF tube (th 0..PI, the camera-facing dome),
    // not a full tube: with a full tube the far side's dark, downward
    // normals render over the top and the fish reads as a black silhouette.
    // Normals are the profile-slope term plus the (height, width) scaled
    // radial components, exactly as in the original.
    const u = ((profileG(x + 0.004) - profileG(x - 0.004)) / 0.008) * (width / L);
    for (let a = 0; a <= around; a++) {
      const th = (a / around) * Math.PI;
      const co = Math.cos(th); const si = Math.sin(th);
      loc.push(x, hw * co, hh * si);
      pos.push(x, hw * co, hh * si);
      const ay = co * hh; const az = si * hw;
      const rr = Math.hypot(ay, az) || 1;
      const c = [-0.8 * u, ay / rr, az / rr];
      const nl = Math.hypot(c[0], c[1], c[2]) || 1;
      nor.push(c[0] / nl, c[1] / nl, c[2] / nl);
      coord.push(x, co);
      kinds.push(0);
      fin.push(0, 0, 0);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let a = 0; a < around; a++) {
      const i0 = r * (around + 1) + a; const i1 = i0 + 1;
      const i2 = i0 + around + 1; const i3 = i2 + 1;
      idx.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  body.setAttribute('aLocal', new THREE.Float32BufferAttribute(loc, 3));
  body.setAttribute('aNorm', new THREE.Float32BufferAttribute(nor, 3));
  body.setAttribute('aCoord', new THREE.Float32BufferAttribute(coord, 2));
  body.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 1));
  body.setAttribute('aFin', new THREE.Float32BufferAttribute(fin, 3));
  body.setIndex(idx);

  // Fins mesh: tail fan (kind 1) + paired fins (kind 2) + dorsal (kind 3, koi only).
  const fpos: number[] = []; const floc: number[] = []; const fnor: number[] = [];
  const fcoord: number[] = []; const fkinds: number[] = []; const ffin: number[] = [];
  const fidx: number[] = [];
  const addGrid = (cols: number, rows: number, fill: (ci: number, ri: number) => { loc: [number, number, number]; coord: [number, number]; finv: [number, number, number]; kind: number }) => {
    const base = fpos.length / 3;
    for (let ri = 0; ri <= rows; ri++) {
      for (let ci = 0; ci <= cols; ci++) {
        const v = fill(ci, ri);
        floc.push(...v.loc); fpos.push(...v.loc);
        fnor.push(0, 0, 1);
        fcoord.push(...v.coord);
        fkinds.push(v.kind);
        ffin.push(...v.finv);
      }
    }
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const i0 = base + ri * (cols + 1) + ci; const i1 = i0 + 1;
        const i2 = i0 + cols + 1; const i3 = i2 + 1;
        fidx.push(i0, i1, i2, i1, i3, i2);
      }
    }
  };
  // Tail fan 28 x 16, rooted at x = 0.8.
  addGrid(28, 16, (ci, ri) => ({
    loc: [0.8, 0, -1], coord: [ri / 16, ci / 28 * 2 - 1],
    finv: [ci / 28 * 2 - 1, ri / 16, 0], kind: 1,
  }));
  // Paired fins: original b() — 3-row fan (root + half + outer rows,
  // 11 columns), root on the flank, radius shaped widest mid-sweep.
  const pairs: [number, number, number, number][] =
    kind === 'koi' ? [[0.22, 0.15, 0.32, 1.25], [0.5, 0.075, 0.25, 0.85]] : [[0.24, 0.1, 0.4, 1.1]];
  for (const [rx, len, a0, a1] of pairs) {
    for (const side of [1, -1]) {
      const rootY = side * Math.max(0.3, width * profileG(rx)) * 0.82;
      addGrid(10, 2, (ci, ri) => {
        const t = ci / 10;
        const ang = a0 + (a1 - a0) * t;
        const outer = len * L * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 1.15 * t)));
        const radius = ri === 0 ? 0 : ri === 1 ? 0.5 * outer : outer;
        return {
          loc: [rx, rootY, -2],
          coord: ri === 0 ? [0, 0] : [ri / 2, 2 * t - 1],
          finv: [ang, radius, side], kind: 2,
        };
      });
    }
  }
  // Dorsal fin (koi only): original 13 x 2 strip, loc.y = ±W*0.07,
  // aCoord = [o, ±1], kind 3.
  if (kind === 'koi') {
    addGrid(12, 1, (ci, ri) => {
      const x = 0.3 + (0.36 * ci) / 12;
      const sgn = ri === 0 ? -1 : 1;
      return {
        loc: [x, sgn * width * 0.07, height * profileG(x) + 1.2],
        coord: [ci / 12, sgn],
        finv: [0, 0, 0], kind: 3,
      };
    });
  }
  const fins = new THREE.BufferGeometry();
  fins.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  fins.setAttribute('aLocal', new THREE.Float32BufferAttribute(floc, 3));
  fins.setAttribute('aNorm', new THREE.Float32BufferAttribute(fnor, 3));
  fins.setAttribute('aCoord', new THREE.Float32BufferAttribute(fcoord, 2));
  fins.setAttribute('aKind', new THREE.Float32BufferAttribute(fkinds, 1));
  fins.setAttribute('aFin', new THREE.Float32BufferAttribute(ffin, 3));
  fins.setIndex(fidx);
  return { body, fins };
}

interface Patch { s: number; a: number; rs: number; ra: number; c: THREE.Vector3 }
interface Fish {
  kind: 'koi' | 'fry'; L: number; W: number; depth: number;
  spine: Float32Array; a: number; v: number; vb: number;
  amp: number; beat: number; flap: number; gliding: boolean; rhythm: number;
  startle: number; boost: number; flee: number;
  pending: { at: number; dir: number; strength: number } | null;
  travel: number; wander: number[];
  tail: { bend: number; bendV: number; spread: number; phase: number; lat: number };
  mat: THREE.ShaderMaterial; bodyMesh: THREE.Mesh; finMesh: THREE.Mesh;
  uSpine: THREE.Vector4[]; uTail: THREE.Vector4;
}

export function canRunPond(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

export function mountPond(canvas: HTMLCanvasElement): () => void {
  const T = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.autoClear = false;
  let L = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(L);
  let C = window.innerWidth; let P = window.innerHeight;
  renderer.setSize(C, P, false);

  const fishCam = new THREE.OrthographicCamera(0, C, 0, -P, 1, 5000);
  fishCam.position.z = 2500;
  const compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fishScene = new THREE.Scene();
  const compScene = new THREE.Scene();
  const waveScene = new THREE.Scene();
  const quad = new THREE.PlaneGeometry(2, 2);

  const fishTarget = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  const waterOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let waterA = new THREE.WebGLRenderTarget(Math.ceil(C / 3), Math.ceil(P / 3), waterOpts);
  let waterB = new THREE.WebGLRenderTarget(Math.ceil(C / 3), Math.ceil(P / 3), waterOpts);

  const dropVecs = Array.from({ length: 24 }, () => new THREE.Vector4());
  const waveMat = new THREE.ShaderMaterial({
    vertexShader: PASS_VS, fragmentShader: WAVE_FS,
    uniforms: {
      tPrev: { value: null }, uTexel: { value: new THREE.Vector2(1 / Math.ceil(C / 3), 1 / Math.ceil(P / 3)) },
      uSize: { value: new THREE.Vector2(C, P) }, uDrops: { value: dropVecs }, uCount: { value: 0 },
    },
    depthTest: false, depthWrite: false,
  });
  const waveQuad = new THREE.Mesh(quad, waveMat);
  waveQuad.frustumCulled = false;
  waveScene.add(waveQuad);
  const compMat = new THREE.ShaderMaterial({
    vertexShader: PASS_VS, fragmentShader: COMP_FS,
    uniforms: {
      tFish: { value: fishTarget.texture }, tWater: { value: waterA.texture },
      uRes: { value: new THREE.Vector2(C, P) },
      uTexel: { value: new THREE.Vector2(1 / Math.ceil(C / 3), 1 / Math.ceil(P / 3)) },
      uDpr: { value: L }, uColumn: { value: Math.min(560, C - 32) / 2 },
    },
    depthTest: false, depthWrite: false,
  });
  const compQuad = new THREE.Mesh(quad, compMat);
  compQuad.frustumCulled = false;
  compScene.add(compQuad);

  const scaleT = clamp(Math.min(C, 1.4 * P) / 1150, 0.62, 1);
  const koiCount = Math.round(clamp((C * P) / 260000, 3, 6));
  const fryCount = C < 700 ? 9 : 15;

  const fishes: Fish[] = [];
  const school = { x: C * 0.7, y: P * 0.3, a: u(0, Math.PI * 2), w0: u(0, 6), w1: u(0, 6) };
  const mouse = { x: 0, y: 0, present: false, still: 0 };
  const queue: number[] = [];
  const delayed: { at: number; x: number; y: number; r: number; s: number }[] = [];
  let clock = 0;
  let lastFrame = 0;
  let raf = 0;
  let disposed = false;
  let contextLost = false;

  const drop = (x: number, y: number, r: number, s: number) => {
    if (queue.length < 96) queue.push(x, y, r, s);
  };

  function makeFish(kind: 'koi' | 'fry', index: number, spawnEdge: boolean): Fish {
    const sp = SPECIES[kind];
    const depth = Math.random();
    const Lpx = kind === 'koi'
      ? u(188, 272) * scaleT * (0.86 + 0.2 * depth)
      : u(20, 29) * Math.max(0.8, scaleT);
    const Wpx = Lpx * (kind === 'koi' ? 0.145 : 0.12);
    const Hpx = Wpx * (kind === 'koi' ? 0.85 : 0.8);
    const geom = buildGeom(Lpx, Wpx, Hpx, kind);
    // Colours / patches.
    let base = FRY_COL.clone();
    let patches: Patch[] = [];
    let sheen = 0.75;
    if (kind === 'koi') {
      const roll = Math.random();
      const mk = (s: number, a: number, rs: number, ra: number, c: THREE.Vector3): Patch => ({ s, a, rs, ra, c });
      if (roll < 0.3) {
        base = WHITE.clone(); sheen = 0.32;
        // One patch colour per fish: 60% red / 40% orange.
        const n = Math.round(u(2, 4));
        const pc = Math.random() < 0.6 ? RED : ORANGE;
        for (let i = 0; i < n; i++) patches.push(mk(u(0.06, 0.72), u(-0.4, 0.4), u(0.07, 0.14), u(0.6, 1.4), pc));
      } else if (roll < 0.42) {
        base = WHITE.clone(); sheen = 0.32;
        patches.push(mk(0.1, 0, 0.055, 0.45, RED));
      } else if (roll < 0.62) {
        base = WHITE.clone(); sheen = 0.32;
        // 2-3 orange patches AND 2-3 black patches, 4-6 total.
        const nO = Math.round(u(2, 3));
        for (let i = 0; i < nO; i++) patches.push(mk(u(0.08, 0.7), u(-0.4, 0.4), u(0.07, 0.13), u(0.6, 1.3), ORANGE));
        const nB = Math.round(u(2, 3));
        for (let i = 0; i < nB; i++) patches.push(mk(u(0.22, 0.78), u(-0.4, 0.4), u(0.025, 0.05), u(0.25, 0.45), BLACK));
      } else if (roll < 0.76) {
        base = ORANGE.clone(); sheen = 0.38;
        const n = Math.round(u(0, 2));
        for (let i = 0; i < n; i++) patches.push(mk(u(0.3, 0.75), u(-0.4, 0.4), u(0.05, 0.1), u(0.4, 0.9), WHITE));
      } else if (roll < 0.86) { base = GOLD.clone(); sheen = 0.6; }
      else if (roll < 0.94) {
        base = BLACK.clone(); sheen = 0.45;
        patches.push(mk(u(0.1, 0.7), u(-0.4, 0.4), u(0.07, 0.12), u(0.6, 1.2), WHITE));
        patches.push(mk(u(0.1, 0.7), u(-0.4, 0.4), u(0.07, 0.12), u(0.6, 1.2), WHITE));
        patches.push(mk(u(0.05, 0.6), u(-0.4, 0.4), u(0.05, 0.1), u(0.5, 1.0), RED));
        patches.push(mk(u(0.05, 0.6), u(-0.4, 0.4), u(0.05, 0.1), u(0.5, 1.0), RED));
      } else { base = SILVER.clone(); sheen = 0.7; }
    }
    const uPatch = Array.from({ length: 6 }, (_, i) => patches[i]
      ? new THREE.Vector4(patches[i].s, patches[i].a, patches[i].rs, patches[i].ra)
      : new THREE.Vector4(0, 0, 0, 0));
    const uPatchCol = Array.from({ length: 6 }, (_, i) => patches[i] ? patches[i].c.clone() : new THREE.Vector3());
    const tailRoot = (patches.find((p) => Math.abs(p.s - 0.76) < 1.4 * p.rs)?.c ?? base).clone();
    const tailLen = Lpx * TAIL_LEN[kind];
    const uniforms = {
      uSpine: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) },
      uLength: { value: Lpx }, uZ: { value: kind === 'koi' ? 100 + 140 * index : 1220 + 10 * index },
      uFlap: { value: new THREE.Vector2() },
      uTail: { value: new THREE.Vector4(0, 1, u(0, 6.28), 0.05) },
      uTailShape: { value: new THREE.Vector3(tailLen, Wpx * profileG(0.8) * 0.9, 0.6) },
      uBase: { value: base }, uPatch: { value: uPatch }, uPatchCol: { value: uPatchCol },
      uSeed: { value: u(0, 100) },
      uClarity: { value: kind === 'koi' ? 0.5 + 0.38 * depth : u(0.62, 0.8) },
      uWidth: { value: Wpx }, uSheen: { value: sheen },
      uBack: { value: kind === 'koi' ? 0 : 1 }, uEye: { value: kind === 'koi' ? 0.12 : 0.2 },
      uTailRoot: { value: tailRoot },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: FISH_VS, fragmentShader: FISH_FS, uniforms, transparent: false });
    const finMat = new THREE.ShaderMaterial({
      vertexShader: FISH_VS, fragmentShader: FISH_FS, uniforms,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const bodyMesh = new THREE.Mesh(geom.body, mat);
    bodyMesh.frustumCulled = false;
    bodyMesh.renderOrder = kind === 'koi' ? 2 * index : 100 + 2 * index;
    const finMesh = new THREE.Mesh(geom.fins, finMat);
    finMesh.frustumCulled = false;
    finMesh.renderOrder = bodyMesh.renderOrder + 1;
    fishScene.add(bodyMesh, finMesh);

    // Spawn position / heading.
    let x = C / 2; let y = P / 2; let a = u(0, Math.PI * 2);
    if (reduced) {
      x = u(C * 0.1, C * 0.9); y = u(P * 0.15, P * 0.85);
    } else if (spawnEdge) {
      if (kind === 'fry') {
        // Whole fry school enters as one cluster from a single edge,
        // 60 px out, ±70 px jitter, heading for the school target.
        const edge = (koiEdgeRot + 2) % 4;
        if (edge === 0) { x = -60; y = school.y + u(-70, 70); }
        else if (edge === 1) { x = C + 60; y = school.y + u(-70, 70); }
        else if (edge === 2) { x = school.x + u(-70, 70); y = -60; }
        else { x = school.x + u(-70, 70); y = P + 60; }
        a = Math.atan2(school.y - y, school.x - x);
      } else {
        const edge = (koiEdgeRot + index) % 4;
        const out = u(0, 90) + 30 * index;
        if (edge === 0) { x = -out; y = u(0, P); }
        else if (edge === 1) { x = C + out; y = u(0, P); }
        else if (edge === 2) { x = u(0, C); y = -out; }
        else { x = u(0, C); y = P + out; }
        const tx = u(C * 0.3, C * 0.7); const ty = u(P * 0.3, P * 0.7);
        a = Math.atan2(ty - y, tx - x);
      }
    } else {
      x = school.x + u(-70, 70); y = school.y + u(-70, 70);
      a = Math.atan2(school.y - y, school.x - x);
    }
    const spine = new Float32Array(48);
    const seg = Lpx / 23;
    for (let i = 0; i < 24; i++) {
      spine[i * 2] = x - Math.cos(a) * seg * i;
      spine[i * 2 + 1] = y - Math.sin(a) * seg * i;
    }
    const fish: Fish = {
      kind, L: Lpx, W: Wpx, depth, spine, a, v: 0,
      vb: u(sp.vb[0], sp.vb[1]),
      amp: sp.amp, beat: u(0, Math.PI * 2), flap: u(0, Math.PI * 2),
      gliding: Math.random() < 0.5, rhythm: u(0.5, 2),
      startle: 0, boost: 0, flee: 0, pending: null, travel: 0,
      wander: [u(0.05, 0.09), u(0, 6.28), u(0.13, 0.2), u(0, 6.28), u(0.27, 0.4), u(0, 6.28)],
      tail: { bend: 0, bendV: 0, spread: 1, phase: u(0, 6.28), lat: Number.NaN },
      mat, bodyMesh, finMesh, uSpine: uniforms.uSpine.value as THREE.Vector4[], uTail: uniforms.uTail.value as THREE.Vector4,
    };
    fish.v = fish.vb;
    return fish;
  }

  // Random edge rotation shared by koi spawn (n+i)%4 and the fry
  // school entry edge (n+2)%4, mirroring the original.
  const koiEdgeRot = Math.floor(Math.random() * 4);

  for (let i = 0; i < koiCount; i++) fishes.push(makeFish('koi', i, true));
  for (let i = 0; i < fryCount; i++) fishes.push(makeFish('fry', i, true));
  // D6: sort koi by depth first, then assign uZ/renderOrder, so a deep
  // (dim) koi can never render over a shallow one.
  fishes
    .filter((f) => f.kind === 'koi')
    .sort((a, b) => a.depth - b.depth)
    .forEach((f, t) => {
      (f.mat.uniforms.uZ as { value: number }).value = 100 + 140 * t;
      f.bodyMesh.renderOrder = 2 * t;
      f.finMesh.renderOrder = 2 * t + 1;
    });

  const startle = (x: number, y: number, strength: number) => {
    for (const f of fishes) {
      const sp = SPECIES[f.kind];
      let best = Infinity; let bx = 0; let by = 0;
      for (let i = 0; i < 24; i += 2) {
        const dx = f.spine[i * 2] - x; const dy = f.spine[i * 2 + 1] - y;
        const d = Math.hypot(dx, dy);
        if (d < best) { best = d; bx = f.spine[i * 2]; by = f.spine[i * 2 + 1]; }
      }
      const s = sp.R * strength;
      if (best > 1.8 * s) continue;
      const h = (best < s ? 0.55 + 0.45 * (1 - best / s) : 0.3 * (1 - (best - s) / (0.8 * s))) * Math.min(1, strength + 0.2);
      const dir = Math.atan2(f.spine[1] - y + 0.5 * (by - y), f.spine[0] - x + 0.5 * (bx - x)) + u(-0.35, 0.35);
      const cand = { at: clock + 0.03 + best / sp.react + u(0, 0.05), dir, strength: h };
      if (!f.pending || cand.strength > f.pending.strength) f.pending = cand;
    }
    // Shove the school target away from the click.
    const dx = school.x - x; const dy = school.y - y;
    const d = Math.hypot(dx, dy) || 1;
    school.x = clamp(x + (dx / d) * 380, C * 0.15, C * 0.85);
    school.y = clamp(y + (dy / d) * 380, P * 0.15, P * 0.85);
  };

  const stepFish = (f: Fish, dt: number) => {
    const sp = SPECIES[f.kind];
    if (f.pending && clock >= f.pending.at) {
      f.flee = f.pending.dir;
      f.startle = Math.max(f.startle, f.pending.strength);
      f.boost = Math.max(f.boost, f.pending.strength);
      f.gliding = false;
      f.rhythm = u(1, 2);
      f.pending = null;
    }
    let fx = 0; let fy = 0;
    const hx = f.spine[0]; const hy = f.spine[1];
    const margin = -f.L * sp.edge;
    const rep = (d: number) => Math.pow(clamp((sp.band - d) / sp.band, 0, 1), 2) * 2.4;
    fx += rep(hx - margin); fx -= rep(C - margin - hx);
    fy += rep(hy - margin); fy -= rep(P - margin - hy);
    if (f.kind === 'koi') {
      const maxW = Math.max(...fishes.filter((o) => o.kind === 'koi').map((o) => o.W));
      for (const o of fishes) {
        if (o === f || o.kind !== 'koi') continue;
        const radius = 3.6 * maxW;
        for (let i = 0; i < 24; i += 3) {
          const dx = hx - o.spine[i * 2]; const dy = hy - o.spine[i * 2 + 1];
          const d = Math.hypot(dx, dy);
          if (d > 0.01 && d < radius) {
            const w = Math.pow(1 - d / radius, 2) * 2.4 * (0.35 + 0.65 * (1 - Math.abs(f.depth - o.depth)));
            fx += (dx / d) * w; fy += (dy / d) * w;
          }
        }
      }
      if (mouse.present && mouse.still > 1.2 && f.startle < 0.05) {
        const dx = mouse.x - hx; const dy = mouse.y - hy;
        const d = Math.hypot(dx, dy);
        if (d < 440 && d > 0.2 * f.L) {
          const s = 0.55 * (1 - d / 440) * clamp((mouse.still - 1.2) / 1.5, 0, 1);
          fx += (dx / d) * s; fy += (dy / d) * s;
        }
      }
    } else {
      let cx = 0; let cy = 0; let ax = 0; let ay = 0; let n = 0;
      for (const o of fishes) {
        if (o === f || o.kind !== 'fry') continue;
        const dx = o.spine[0] - hx; const dy = o.spine[1] - hy;
        const d = Math.hypot(dx, dy);
        if (d < 150) { cx += dx; cy += dy; ax += Math.cos(o.a); ay += Math.sin(o.a); n++; }
        if (d > 0.01 && d < 24) { fx -= (dx / d) * 3 * (1 - d / 24); fy -= (dy / d) * 3 * (1 - d / 24); }
      }
      if (n > 0) {
        fx += (cx / n / 150) * 1.4; fy += (cy / n / 150) * 1.4;
        fx += (ax / n) * 0.9; fy += (ay / n) * 0.9;
      }
      fx += ((school.x - hx) / 150) * 0.45; fy += ((school.y - hy) / 150) * 0.45;
      for (const o of fishes) {
        if (o.kind !== 'koi') continue;
        for (let i = 0; i < 24; i += 2) {
          const dx = hx - o.spine[i * 2]; const dy = hy - o.spine[i * 2 + 1];
          const d = Math.hypot(dx, dy);
          if (d > 0.01 && d < 2.4 * o.W) { fx += (dx / d) * 3; fy += (dy / d) * 3; }
        }
      }
    }
    if (f.startle > 0.02) { fx += Math.cos(f.flee) * 7 * f.startle; fy += Math.sin(f.flee) * 7 * f.startle; }
    const [w0, p0, w2, p2, w4, p4] = f.wander;
    const d = (0.42 * Math.sin(clock * w0 * 2 * Math.PI + p0) + 0.26 * Math.sin(clock * w2 * 2 * Math.PI + p2) + 0.12 * Math.sin(clock * w4 * 2 * Math.PI + p4)) * sp.meander;
    const targetHeading = Math.atan2(fy, fx);
    const hasForce = Math.hypot(fx, fy) > 0.001;
    let turn = d * (f.kind === 'fry' ? 1.4 : 1) * (1 - f.startle);
    if (hasForce) turn += wrapAngle(targetHeading - f.a) * (1.6 + 6 * f.startle);
    turn = clamp(turn, -(sp.turn + 9 * f.startle), sp.turn + 9 * f.startle);
    f.a = wrapAngle(f.a + turn * dt);
    f.rhythm -= dt;
    if (f.rhythm <= 0) {
      f.gliding = !f.gliding;
      f.rhythm = f.gliding ? u(sp.glide[0], sp.glide[1]) : u(sp.stroke[0], sp.stroke[1]);
    }
    const target = f.vb * ((f.gliding ? 0.55 : 1.15) + sp.burst * f.boost);
    const tau = target > f.v ? (f.boost > 0.1 ? 0.07 : 0.28) : 1.5;
    f.v += (target - f.v) * (1 - Math.exp(-dt / tau));
    const ampTarget = f.gliding && f.boost < 0.05 ? 0.3 * sp.amp : sp.amp + 0.07 * f.boost;
    f.amp += (ampTarget - f.amp) * (1 - Math.exp(-dt / 0.4));
    f.beat += 2 * Math.PI * dt * (sp.beat + Math.min(f.v, 260) * sp.beatK);
    f.flap += 2 * Math.PI * dt * (f.gliding ? 0.35 : 0.6) * (f.kind === 'fry' ? 2 : 1);
    f.startle *= Math.exp(-dt / 0.9);
    f.boost *= Math.exp(-dt / 0.75);
    const nx = hx + Math.cos(f.a) * f.v * dt;
    const ny = hy + Math.sin(f.a) * f.v * dt;
    const moved = Math.hypot(nx - hx, ny - hy);
    f.travel += moved;
    f.spine[0] = nx; f.spine[1] = ny;
    const seg = f.L / 23;
    for (let i = 1; i < 24; i++) {
      const px = f.spine[(i - 1) * 2]; const py = f.spine[(i - 1) * 2 + 1];
      const cx = f.spine[i * 2]; const cy = f.spine[i * 2 + 1];
      let ang = Math.atan2(cy - py, cx - px);
      const prevAng = i > 1 ? Math.atan2(py - f.spine[(i - 2) * 2], px - f.spine[(i - 2) * 2]) : f.a;
      ang = prevAng + clamp(wrapAngle(ang - prevAng), -sp.bend, sp.bend);
      f.spine[i * 2] = px + Math.cos(ang) * seg;
      f.spine[i * 2 + 1] = py + Math.sin(ang) * seg;
    }
    if (f.kind === 'koi' && f.depth > 0.45 && f.travel > 22) {
      f.travel = 0;
      drop(hx - Math.cos(f.a) * f.L * 0.1, hy - Math.sin(f.a) * f.L * 0.1, 0.5 * f.W, 0.012 * (f.depth - 0.3) * Math.min(3, f.v / f.vb));
    }
  };

  const posedSpine = new Float32Array(48);
  const updateUniforms = (dt: number) => {
    for (const f of fishes) {
      for (let i = 0; i < 24; i++) {
        const j = Math.min(i, 22);
        const dx = f.spine[j * 2] - f.spine[(j + 1) * 2];
        const dy = f.spine[j * 2 + 1] - f.spine[(j + 1) * 2 + 1];
        const length = Math.hypot(dx, dy) || 1;
        const r = i / 23;
        const off = f.L * f.amp * (Math.pow(r, 1.6) * Math.sin(f.beat - 5 * r) - 0.12 * (1 - r) * Math.sin(f.beat));
        posedSpine[i * 2] = f.spine[i * 2] - dy / length * off;
        posedSpine[i * 2 + 1] = f.spine[i * 2 + 1] + dx / length * off;
      }
      for (let i = 0; i < 24; i++) {
        const prev = Math.max(0, i - 1);
        const next = Math.min(23, i + 1);
        // The shaders extend fins along the headward tangent.
        const dx = posedSpine[prev * 2] - posedSpine[next * 2];
        const dy = posedSpine[prev * 2 + 1] - posedSpine[next * 2 + 1];
        const length = Math.hypot(dx, dy) || 1;
        f.uSpine[i].set(posedSpine[i * 2], -posedSpine[i * 2 + 1], dx / length, -dy / length);
      }
      (f.mat.uniforms.uFlap.value as THREE.Vector2).set(0.3 * Math.sin(f.flap), 0.3 * Math.sin(f.flap + Math.PI));
      const root = f.uSpine[Math.round(0.8 * 23)];
      const tip = f.uSpine[23];
      const lateral = -(tip.x - root.x) * root.w + (tip.y - root.y) * root.z;
      if (dt > 0 && !Number.isNaN(f.tail.lat)) {
        const tailLen = f.L * TAIL_LEN[f.kind];
        const target = clamp(-0.28 * (lateral - f.tail.lat) / dt / tailLen, -0.7, 0.7);
        f.tail.bendV += (70 * (target - f.tail.bend) - 7 * f.tail.bendV) * dt;
        f.tail.bend += f.tail.bendV * dt;
        const spreadTarget = f.boost > 0.15 ? 0.78 : f.gliding ? 1.08 : 1;
        f.tail.spread += (spreadTarget - f.tail.spread) * (1 - Math.exp(-dt / 0.35));
        f.tail.phase += 6.283 * dt * (1.1 + 0.5 * Math.min(f.v / f.vb, 4));
      }
      f.tail.lat = lateral;
      f.uTail.set(f.tail.bend, f.tail.spread, f.tail.phase, 0.04 + 0.03 * Math.min(1, f.v / f.vb) + 0.05 * f.boost);
    }
  };

  const renderFrame = (dt: number) => {
    // Wave substeps.
    const steps = Math.max(1, Math.min(4, Math.round(120 * dt)));
    for (let s = 0; s < steps; s++) {
      if (s === 0) {
        for (let i = 0; i < queue.length / 4; i++) {
          dropVecs[i].set(queue[i * 4], P - queue[i * 4 + 1], queue[i * 4 + 2], queue[i * 4 + 3]);
        }
        (waveMat.uniforms.uCount as { value: number }).value = queue.length / 4;
        queue.length = 0;
      } else (waveMat.uniforms.uCount as { value: number }).value = 0;
      (waveMat.uniforms.tPrev as { value: THREE.Texture | null }).value = waterA.texture;
      renderer.setRenderTarget(waterB);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(waveScene, compCam);
      const tmp = waterA; waterA = waterB; waterB = tmp;
    }
    updateUniforms(dt);
    renderer.setRenderTarget(fishTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(fishScene, fishCam);
    renderer.setRenderTarget(null);
    (compMat.uniforms.tWater as { value: THREE.Texture }).value = waterA.texture;
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(compScene, compCam);
  };

  const resize = () => {
    C = window.innerWidth; P = window.innerHeight;
    L = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(L);
    renderer.setSize(C, P, false);
    fishCam.right = C; fishCam.bottom = -P;
    fishCam.updateProjectionMatrix();
    fishTarget.setSize(Math.round(C * L), Math.round(P * L));
    waterA.dispose(); waterB.dispose();
    waterA = new THREE.WebGLRenderTarget(Math.ceil(C / 3), Math.ceil(P / 3), waterOpts);
    waterB = new THREE.WebGLRenderTarget(Math.ceil(C / 3), Math.ceil(P / 3), waterOpts);
    renderer.setRenderTarget(waterA);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.setRenderTarget(waterB);
    renderer.clear();
    renderer.setRenderTarget(null);
    (waveMat.uniforms.uTexel.value as THREE.Vector2).set(1 / Math.ceil(C / 3), 1 / Math.ceil(P / 3));
    (waveMat.uniforms.uSize.value as THREE.Vector2).set(C, P);
    (compMat.uniforms.uTexel.value as THREE.Vector2).set(1 / Math.ceil(C / 3), 1 / Math.ceil(P / 3));
    (compMat.uniforms.uRes.value as THREE.Vector2).set(C, P);
    (compMat.uniforms.uDpr as { value: number }).value = L;
    (compMat.uniforms.uColumn as { value: number }).value = Math.min(560, C - 32) / 2;
  };
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (disposed || contextLost) return;
      resize(); if (reduced) renderFrame(1 / 30);
    }, 120);
  };

  const mayRun = () => T.dataset.intro !== 'on' && !document.hidden && !contextLost;
  const fullyLive = () => mayRun() && T.dataset.project !== 'open';

  let ambientFryAt = clock + u(1.5, 3.5);
  let ambientKoiAt = clock + u(6, 11);
  let nextAmbientFry = u(1.2, 4);
  let nextAmbientKoi = u(7, 14);

  const frame = (now: number) => {
    if (disposed || !mayRun()) { raf = 0; return; }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 30) : 1 / 60;
    lastFrame = now;
    clock += dt;
    if (mouse.present && fullyLive()) mouse.still += dt;
    // School target drift.
    school.a += dt * (0.5 * Math.sin(0.21 * clock + school.w0) + 0.3 * Math.sin(0.53 * clock + school.w1));
    school.x += Math.cos(school.a) * 46 * dt;
    school.y += Math.sin(school.a) * 46 * dt;
    if (school.x < C * 0.15 || school.x > C * 0.85) school.a = Math.PI - school.a;
    if (school.y < P * 0.15 || school.y > P * 0.85) school.a = -school.a;
    school.x = clamp(school.x, C * 0.15, C * 0.85);
    school.y = clamp(school.y, P * 0.15, P * 0.85);
    for (const f of fishes) stepFish(f, dt);
    if (clock >= ambientFryAt) {
      const fry = fishes.filter((f) => f.kind === 'fry');
      if (fry.length) { const f = fry[Math.floor(Math.random() * fry.length)]; drop(f.spine[0], f.spine[1], 4, 0.22); }
      ambientFryAt = clock + nextAmbientFry; nextAmbientFry = u(1.2, 4);
    }
    if (clock >= ambientKoiAt) {
      const koi = fishes.filter((f) => f.kind === 'koi').sort((a, b) => b.depth - a.depth).slice(0, 2);
      if (koi.length) {
        const f = koi[Math.floor(Math.random() * koi.length)];
        drop(f.spine[0] + Math.cos(f.a) * 4, f.spine[1] + Math.sin(f.a) * 4, 8, 0.35);
        delayed.push({ at: clock + 0.35, x: f.spine[0], y: f.spine[1], r: 7, s: 0.25 });
      }
      ambientKoiAt = clock + nextAmbientKoi; nextAmbientKoi = u(7, 14);
    }
    for (let i = delayed.length - 1; i >= 0; i--) {
      if (clock >= delayed[i].at) { drop(delayed[i].x, delayed[i].y, delayed[i].r, delayed[i].s); delayed.splice(i, 1); }
    }
    renderFrame(dt);
    raf = mayRun() ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    if (disposed || reduced || raf || !mayRun()) return;
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  };

  // Pointer interaction (window-level, inert when reduced motion / not live).
  let dragPointer: number | null = null;
  let lastDragX = 0; let lastDragY = 0;
  let lastMoveX = -1; let lastMoveY = -1;
  const onPointerDown = (e: PointerEvent) => {
    if (reduced || !fullyLive() || !e.isPrimary || e.button !== 0) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('a, button, [role="slider"], [data-card], .contact, .rs, .pv')) return;
    const x = e.clientX; const y = e.clientY;
    drop(x, y, 20, 0.85);
    const base = u(0, Math.PI * 2);
    for (let n = 0; n < 6; n++) {
      const ang = base + (n / 6) * Math.PI * 2 + u(-0.3, 0.3);
      const r = u(28, 64);
      delayed.push({ at: clock + u(0.12, 0.32), x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, r: u(4, 6), s: u(0.18, 0.3) });
    }
    delayed.push({ at: clock + 0.42, x, y, r: 9, s: 0.4 });
    startle(x, y, 1);
    dragPointer = e.pointerId; lastDragX = x; lastDragY = y;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (reduced || !fullyLive()) { resetPointer(); return; }
    if (e.target instanceof Element && e.target.closest('a, button, [role="slider"], [data-card], .contact, .rs, .pv')) { resetPointer(); return; }
    if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.present = true; }
    if (lastMoveX >= 0 && Math.hypot(e.clientX - lastMoveX, e.clientY - lastMoveY) > 3) mouse.still = 0;
    lastMoveX = e.clientX; lastMoveY = e.clientY;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) dragPointer = null;
    if (e.pointerId !== dragPointer) return;
    if (Math.hypot(e.clientX - lastDragX, e.clientY - lastDragY) > 14) {
      drop(e.clientX, e.clientY, 9, 0.28);
      startle(e.clientX, e.clientY, 0.45);
      lastDragX = e.clientX; lastDragY = e.clientY;
    }
  };
  const onPointerUp = (e: PointerEvent) => { if (e.pointerId === dragPointer) dragPointer = null; };
  const resetPointer = () => {
    dragPointer = null;
    mouse.present = false;
    mouse.still = 0;
    lastMoveX = -1; lastMoveY = -1;
  };
  const syncPlayback = () => {
    if (mayRun()) { start(); return; }
    cancelAnimationFrame(raf); raf = 0;
    lastFrame = 0;
    resetPointer();
    queue.length = 0; delayed.length = 0;
  };
  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    window.clearTimeout(resizeTimer);
    syncPlayback();
    canvas.removeAttribute('data-ready');
  };
  const onContextRestored = () => {
    if (disposed) return;
    resetPointer();
    queue.length = 0; delayed.length = 0;
    resize();
    if (reduced) renderFrame(1 / 30);
    contextLost = false;
    canvas.dataset.ready = '';
    syncPlayback();
  };

  window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('blur', resetPointer);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', syncPlayback);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  const observer = new MutationObserver(syncPlayback);
  observer.observe(T, { attributes: true, attributeFilter: ['data-intro'] });

  resize();
  if (reduced) {
    for (let i = 0; i < 40; i++) { clock += 1 / 30; for (const f of fishes) { f.amp = 0.4 * SPECIES[f.kind].amp; stepFish(f, 1 / 30); } }
    renderFrame(1 / 30);
  } else {
    start();
  }
  canvas.dataset.ready = '';

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(resizeTimer);
    observer.disconnect();
    window.removeEventListener('pointerdown', onPointerDown, { capture: true });
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.documentElement.removeEventListener('pointerleave', resetPointer);
    window.removeEventListener('blur', resetPointer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', syncPlayback);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    for (const f of fishes) {
      f.bodyMesh.geometry.dispose(); f.finMesh.geometry.dispose();
      f.mat.dispose();
      (f.finMesh.material as THREE.Material).dispose();
    }
    quad.dispose(); waveMat.dispose(); compMat.dispose();
    fishTarget.dispose(); waterA.dispose(); waterB.dispose();
    renderer.dispose();
  };
}

export default function Pond({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dispose: (() => void) | undefined;
    let unmounted = false;
    const tryMount = () => {
      if (unmounted || dispose || document.documentElement.dataset.intro === 'on') return;
      if (!canRunPond()) return;
      observer.disconnect();
      try { dispose = mountPond(canvas); } catch { /* silent, like the original */ }
    };
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.intro !== 'on') { observer.disconnect(); tryMount(); }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
    tryMount();
    return () => { unmounted = true; observer.disconnect(); dispose?.(); };
  }, []);
  return <canvas className="pond" aria-hidden="true" ref={ref} data-ready={ready ? '' : undefined} />;
}
