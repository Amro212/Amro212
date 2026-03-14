export const screenSurfaceVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const synthwaveBackdropFragmentShader = `
uniform float uTime;
uniform float uScroll;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;

  vec3 baseBottom = vec3(0.020, 0.005, 0.050);
  vec3 baseTop = vec3(0.160, 0.035, 0.230);
  vec3 color = mix(baseBottom, baseTop, smoothstep(0.02, 0.92, uv.y));

  float horizonY = 0.19 + uScroll * 0.08;
  float horizonGlow = exp(-pow((uv.y - horizonY) * 8.5, 2.0));
  color += vec3(0.520, 0.070, 0.360) * horizonGlow * 0.92;

  float upperWash = smoothstep(0.36, 1.0, uv.y);
  color += vec3(0.060, 0.020, 0.100) * upperWash;

  float lowerBand = 1.0 - smoothstep(0.0, 0.38, uv.y);
  float cyanLift = lowerBand * (pow(1.0 - uv.x, 3.2) + pow(uv.x, 3.2));
  color += vec3(0.020, 0.180, 0.250) * cyanLift * 0.75;

  float centerMist = exp(-pow((uv.x - 0.5) * 3.0, 2.0)) * smoothstep(0.08, 0.44, uv.y);
  color += vec3(0.070, 0.020, 0.110) * centerMist * 0.35;

  float grain = (hash(floor(uv * vec2(480.0, 260.0)) + floor(uTime * 30.0)) - 0.5) * 0.035;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const synthwaveGridVertexShader = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const synthwaveGridFragmentShader = `
uniform float uTime;
uniform float uOpacity;
varying vec3 vWorldPosition;

float gridLine(float value, float scale, float width) {
  float scaled = value * scale;
  float line = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
  return 1.0 - min(line / width, 1.0);
}

void main() {
  vec2 gridUv = vWorldPosition.xz;

  float minor = max(
    gridLine(gridUv.x, 1.0, 1.6),
    gridLine(gridUv.y, 1.0, 1.6)
  );

  float major = max(
    gridLine(gridUv.x, 0.2, 2.4),
    gridLine(gridUv.y, 0.2, 2.4)
  );

  float distanceFade = 1.0 - smoothstep(3.0, 32.0, -gridUv.y);
  float edgeFade = 1.0 - smoothstep(18.0, 31.0, abs(gridUv.x));
  float pulse = 0.94 + 0.06 * sin(uTime * 2.1 + gridUv.x * 0.28 + gridUv.y * 0.16);

  vec3 base = mix(vec3(0.020, 0.028, 0.080), vec3(0.045, 0.018, 0.080), smoothstep(0.0, 28.0, -gridUv.y));
  vec3 minorColor = vec3(0.120, 0.820, 1.200);
  vec3 majorColor = vec3(0.420, 1.320, 1.800);
  vec3 color = base;
  color += minorColor * minor * 0.28 * distanceFade * edgeFade * pulse;
  color += majorColor * major * 0.68 * distanceFade * edgeFade;

  gl_FragColor = vec4(color, uOpacity);
}
`;

export const crtScreenFragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

vec2 barrelDistort(vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float radius = dot(centered, centered);
  centered *= 1.0 + radius * 0.035;
  return centered * 0.5 + 0.5;
}

void main() {
  vec2 uv = barrelDistort(vUv);
  vec2 centered = vUv * 2.0 - 1.0;
  float dist = length(centered);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.008, 0.025, 0.015, 1.0);
    return;
  }

  vec2 aberration = centered * (0.0012 + dist * 0.0015);
  vec3 texel;
  texel.r = texture2D(uTexture, uv + aberration).r;
  texel.g = texture2D(uTexture, uv).g;
  texel.b = texture2D(uTexture, uv - aberration).b;

  float scanline = 0.976 + 0.024 * sin(uv.y * uResolution.y * 1.05 + uTime * 20.0);
  float mask = 0.992 + 0.008 * sin(uv.x * uResolution.x * 0.4);
  float flicker = 0.994 + 0.006 * sin(uTime * 14.0) * sin(uTime * 5.2);

  float phosphor = smoothstep(0.08, 0.88, texel.g + texel.b * 0.22);
  vec3 color = texel;
  color *= mix(vec3(0.8, 0.88, 0.82), vec3(0.89, 0.96, 0.87), phosphor);
  color *= scanline * mask * flicker;
  color += vec3(0.002, 0.012, 0.005) * phosphor;

  float vignette = 1.0 - smoothstep(0.42, 0.96, dist);
  color *= 0.82 + vignette * 0.18;
  color += vec3(0.0, 0.01, 0.005) * (1.0 - vignette) * 0.12;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const crtGlassVertexShader = `
varying vec2 vUv;
varying vec3 vNormalWorld;
varying vec3 vViewDirection;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vNormalWorld = normalize(mat3(modelMatrix) * normal);
  vViewDirection = cameraPosition - worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const crtGlassFragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalWorld;
varying vec3 vViewDirection;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vNormalWorld), normalize(vViewDirection)), 0.0), 3.0);
  vec3 cyan = vec3(0.160, 0.860, 1.000);
  vec3 magenta = vec3(1.000, 0.220, 0.620);
  vec3 tint = mix(cyan, magenta, smoothstep(0.18, 0.88, vUv.x));

  float band = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
  float shimmer = 0.82 + 0.18 * sin((vUv.y + uTime * 0.05) * 20.0);
  float alpha = fresnel * 0.22 + band * 0.04;
  vec3 color = tint * (fresnel * 0.82 + band * 0.12) * shimmer;

  gl_FragColor = vec4(color, alpha);
}
`;

export const postPassVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const postPassFragmentShader = `
uniform sampler2D tDiffuse;
uniform float uAberration;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 centered = uv * 2.0 - 1.0;
  float dist = dot(centered, centered);
  vec2 offset = centered * (0.0005 + dist * uAberration);

  vec3 color;
  color.r = texture2D(tDiffuse, uv + offset).r;
  color.g = texture2D(tDiffuse, uv).g;
  color.b = texture2D(tDiffuse, uv - offset).b;

  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 1.08);
  color = (color - 0.5) * 1.08 + 0.5;
  color *= vec3(1.02, 1.0, 1.04);

  float vignette = 1.0 - smoothstep(0.34, 1.10, dist);
  color *= mix(0.76, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;



