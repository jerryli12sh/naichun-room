import { useMemo } from 'react'
import * as THREE from 'three'
import { outside, outsideUniforms } from './env'

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`

const frag = /* glsl */ `
uniform vec3 uHazeColor; uniform vec3 uSunDir; uniform vec3 uMoonDir;
uniform float uNight; uniform float uRain; uniform float uTime; uniform float uFlash;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float day = 1.0 - uNight;
  float sunEl = uSunDir.y;
  float golden = clamp(1.0 - (sunEl - 0.1) / 0.35, 0.0, 1.0) * day;

  // base gradient
  vec3 zenithDay = mix(vec3(0.36, 0.62, 0.88), vec3(0.52, 0.62, 0.80), golden);
  vec3 zenithNight = vec3(0.035, 0.06, 0.15);
  vec3 zenith = mix(zenithDay, zenithNight, uNight);
  zenith = mix(zenith, mix(vec3(0.56, 0.60, 0.66), vec3(0.10, 0.12, 0.16), uNight), uRain);
  float g = pow(clamp(y, 0.0, 1.0), 0.45);
  vec3 col = mix(uHazeColor, zenith, g);

  // sun glow and disc
  float sd = max(dot(d, uSunDir), 0.0);
  vec3 sunCol = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.72, 0.42), golden);
  float clear = 1.0 - uRain;
  col += sunCol * (pow(sd, 6.0) * 0.28 + pow(sd, 64.0) * 0.5) * day * clear;
  col += sunCol * smoothstep(0.9993, 0.9997, sd) * 3.0 * day * clear;

  // night: stars, moon, the city's orange glow low on the horizon
  if (uNight > 0.01) {
    vec3 sp = d * 220.0;
    vec3 cell = floor(sp);
    float h = hash3(cell);
    vec3 fp = fract(sp) - 0.5;
    float star = step(0.985, h) * smoothstep(0.18, 0.0, length(fp)) * (0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0));
    col += vec3(0.9, 0.95, 1.0) * star * uNight * clear * smoothstep(0.05, 0.3, y);
    float md = dot(d, uMoonDir);
    float disc = smoothstep(0.99955, 0.99975, md);
    // a waxing gibbous: lit side toward the (set) sun
    vec3 side = normalize(cross(uMoonDir, vec3(0, 1, 0)));
    float lit = smoothstep(-0.006, 0.004, dot(d - uMoonDir * md, side) + 0.006);
    float mare = 0.85 + 0.15 * noise(d.xy * 900.0);
    col = mix(col, vec3(1.0, 0.97, 0.88) * mare * mix(0.18, 1.0, lit), disc * uNight * (1.0 - uRain * 0.85));
    col += vec3(0.55, 0.62, 0.8) * pow(max(md, 0.0), 300.0) * 0.35 * uNight * clear;
    col += vec3(0.55, 0.32, 0.18) * exp(-max(y, 0.0) * 9.0) * 0.35 * uNight;
  }

  // clouds on a dome projection, drifting
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.12) * 1.6;
    uv += vec2(uTime * 0.012, uTime * 0.004);
    float n = fbm(uv);
    float cover = mix(0.56, 0.18, uRain);
    float c = smoothstep(cover, cover + 0.28, n) * smoothstep(0.0, 0.12, y);
    float shade = fbm(uv + uSunDir.xz * 0.12);
    vec3 cloudLit = mix(vec3(1.0, 0.99, 0.97), vec3(1.0, 0.8, 0.62), golden);
    vec3 cloudDark = mix(vec3(0.72, 0.76, 0.84), vec3(0.62, 0.55, 0.6), golden);
    vec3 cc = mix(cloudLit, cloudDark, smoothstep(0.35, 0.8, shade));
    cc += sunCol * pow(sd, 10.0) * 0.4 * day;
    cc = mix(cc, vec3(0.62, 0.65, 0.7) * (0.8 + 0.2 * n), uRain);
    cc = mix(cc, mix(vec3(0.09, 0.11, 0.18), vec3(0.07, 0.08, 0.1), uRain) + vec3(0.12, 0.13, 0.17) * pow(max(dot(d, uMoonDir), 0.0), 12.0), uNight);
    col = mix(col, cc, c * mix(0.85, 1.0, uRain));
  }

  col += vec3(0.75, 0.8, 1.0) * uFlash * 0.8;
  gl_FragColor = vec4(col, 1.0);
}`

/** Sky dome: gradient, sun, clouds, stars and moon. Only visible through the windows. */
export function Sky() {
  const mat = useMemo(
    () =>
      outside(
        new THREE.ShaderMaterial({
          uniforms: outsideUniforms,
          vertexShader: vert,
          fragmentShader: frag,
          side: THREE.BackSide,
          depthWrite: false,
          toneMapped: false,
        }),
        { haze: false },
      ),
    [],
  )
  // the outside() vertex patch targets three's built-in chunks; this shader has none, so restore it
  mat.onBeforeCompile = () => {}
  return (
    <mesh material={mat} renderOrder={-5} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  )
}
