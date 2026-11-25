import * as THREE from 'three'
import { BACK_Z, nightness, ROOM, WINDOWS } from '../../content/layout'

/**
 * Shared state for everything outside the windows and the light coming in.
 * <Lights/> eases these once per frame; scenery, sky, rain, shafts and glass read them.
 * Units are metres; the room floor is y 0, the outside ground is far below (the room is up on level 8).
 */
export const GROUND_Y = -22
/** Inner face of the back wall, where light enters the room. */
export const WALL_IN_Z = BACK_Z
/** Outer face of the back wall. */
export const WALL_OUT_Z = -ROOM.d / 2 - ROOM.wall

export const isLowEnd =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600)

const srgb = (hex: string) => new THREE.Color(hex)

export const env = {
  night: 0, // 0 day .. 1 night (eased)
  rain: 0, // 0 dry .. 1 pouring (eased)
  golden: 0, // 0..1 low warm sun (morning / late afternoon)
  sunUp: 1, // sun above horizon and not night
  /** Unit vector pointing from the room toward the sun (day) or moon (night). */
  keyDir: new THREE.Vector3(0, 0.7, -0.7),
  sunDir: new THREE.Vector3(0, 0.7, -0.7),
  moonDir: new THREE.Vector3(-0.35, 0.55, -0.76).normalize(),
  hazeColor: new THREE.Color(),
  hazeDensity: 0.012,
  time: 0,
  flash: 0, // lightning, 0..1
}

/** Uniforms shared by every outside material (one object, so all of them update at once). */
export const outsideUniforms = {
  uHazeColor: { value: new THREE.Color() }, // sRGB, mixed in after tone mapping
  uHazeDensity: { value: 0.012 },
  uOrigin: { value: new THREE.Vector3(0.3, 1.4, WALL_OUT_Z) },
  uTime: { value: 0 },
  uNight: { value: 0 },
  uRain: { value: 0 },
  uWind: { value: 0.3 },
  uSunDir: { value: env.sunDir },
  uMoonDir: { value: env.moonDir },
  uFlash: { value: 0 },
}

/** Direction to the sun for an hour of the day. The windows face the afternoon sun. */
export function sunDirection(hour: number, out = new THREE.Vector3()) {
  const p = THREE.MathUtils.clamp((hour - 6.3) / 12.6, 0, 1) // 06:18 .. 18:54
  const el = THREE.MathUtils.degToRad(Math.sin(Math.PI * p) * 40 + 6)
  const az = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(48, -42, p))
  const h = Math.cos(el)
  return out.set(h * Math.sin(az), Math.sin(el), -h * Math.cos(az)).normalize()
}

const HAZE = {
  day: srgb('#d5e3ea'),
  golden: srgb('#f2cfa2'),
  night: srgb('#18233f'),
  rain: srgb('#9ea8b2'),
  rainNight: srgb('#232b3a'),
}
const tmp = new THREE.Color()
const target = new THREE.Vector3()

/** Ease the outside state toward the store's hour / rain. Called by <Lights/> every frame. */
export function stepEnv(hour: number, raining: boolean, dt: number) {
  const k = Math.min(1, dt * 1.5)
  env.time += dt
  env.night += (nightness(hour) - env.night) * k
  env.rain += ((raining ? 1 : 0) - env.rain) * Math.min(1, dt * 0.9)
  sunDirection(Math.min(Math.max(hour, 6.3), 18.9), target)
  env.sunDir.lerp(target, k).normalize()
  const el = Math.asin(env.sunDir.y)
  env.golden = THREE.MathUtils.clamp(1 - (el - 0.1) / 0.35, 0, 1) * (1 - env.night)
  env.sunUp = (1 - env.night) * THREE.MathUtils.smoothstep(el, 0.02, 0.12)
  env.keyDir.copy(env.sunDir).lerp(env.moonDir, env.night).normalize()

  // lightning: rare double flicker while it pours
  if (env.rain > 0.8 && Math.random() < dt / 22) env.flash = 1
  env.flash = Math.max(0, env.flash - dt * 2.6)
  const flash = env.flash > 0 ? env.flash * (0.6 + 0.4 * Math.sin(env.time * 60)) : 0

  const dry = tmp.copy(HAZE.day).lerp(HAZE.golden, env.golden).lerp(HAZE.night, env.night)
  const wet = env.hazeColor.copy(HAZE.rain).lerp(HAZE.rainNight, env.night)
  env.hazeColor.copy(dry).lerp(wet, env.rain)
  env.hazeDensity = THREE.MathUtils.lerp(0.0042, 0.012, env.rain) * (1 - env.night * 0.25)

  const u = outsideUniforms
  u.uHazeColor.value.copy(env.hazeColor).convertLinearToSRGB().lerp(new THREE.Color(1, 1, 1), flash * 0.35)
  u.uHazeDensity.value = env.hazeDensity
  u.uTime.value = env.time
  u.uNight.value = env.night
  u.uRain.value = env.rain
  u.uWind.value = 0.3 + env.rain * 0.7
  u.uFlash.value = flash
}

const swayChunk = (sway: number) => `
  vec4 ow = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    ow = instanceMatrix * ow;
  #endif
  ow = modelMatrix * ow;
  ${
    sway > 0
      ? `float sw = ${sway.toFixed(3)} * uWind * clamp((ow.y - ${GROUND_Y.toFixed(1)}) / 14.0, 0.0, 1.6);
         ow.x += sin(uTime * 1.3 + ow.x * 0.35 + ow.z * 0.21) * sw * (0.65 + 0.35 * sin(uTime * 0.37 + ow.z));
         ow.z += cos(uTime * 1.1 + ow.x * 0.27) * sw * 0.5;
         ow.y += sin(uTime * 2.1 + ow.x * 1.7 + ow.z) * sw * 0.25;`
      : ''
  }
  vOutWorld = ow.xyz;
  vec4 mvPosition = viewMatrix * ow;
  gl_Position = projectionMatrix * mvPosition;`

function patchVertex(s: { vertexShader: string; uniforms: Record<string, THREE.IUniform> }, sway: number) {
  Object.assign(s.uniforms, outsideUniforms)
  s.vertexShader = s.vertexShader
    .replace('#include <common>', `#include <common>\nuniform float uTime; uniform float uWind; varying vec3 vOutWorld;`)
    .replace('#include <project_vertex>', swayChunk(sway))
}

/** Make a material draw only through the window openings (stencil 1) and fade into the haze with distance. */
export function outside<M extends THREE.Material>(m: M, opts: { sway?: number; haze?: boolean; leafy?: boolean } = {}): M {
  m.stencilWrite = true
  m.stencilRef = 1
  m.stencilFunc = THREE.EqualStencilFunc
  m.stencilFail = THREE.KeepStencilOp
  m.stencilZFail = THREE.KeepStencilOp
  m.stencilZPass = THREE.KeepStencilOp
  const sway = opts.sway ?? 0
  const haze = opts.haze ?? true
  const leafy = !!opts.leafy
  m.onBeforeCompile = (s) => {
    patchVertex(s, sway)
    if (leafy)
      // foliage: clumps of leaves as dark gaps and bright tips, in world space so instances differ
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          ${haze ? '' : 'varying vec3 vOutWorld;'}
          float lhash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          float lnoise(vec3 p) {
            vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(lhash(i), lhash(i + vec3(1,0,0)), u.x), mix(lhash(i + vec3(0,1,0)), lhash(i + vec3(1,1,0)), u.x), u.y),
                       mix(mix(lhash(i + vec3(0,0,1)), lhash(i + vec3(1,0,1)), u.x), mix(lhash(i + vec3(0,1,1)), lhash(i + vec3(1,1,1)), u.x), u.y), u.z);
          }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float lf = lnoise(vOutWorld * 1.7) * 0.6 + lnoise(vOutWorld * 5.3) * 0.4;
          diffuseColor.rgb *= 0.62 + 0.6 * smoothstep(0.25, 0.8, lf);
          diffuseColor.rgb += vec3(0.04, 0.06, 0.0) * smoothstep(0.7, 0.95, lf);`,
        )
    if (haze)
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uHazeColor; uniform float uHazeDensity; uniform vec3 uOrigin; varying vec3 vOutWorld;`,
        )
        .replace(
          '#include <dithering_fragment>',
          `float hf = 1.0 - exp(-max(distance(vOutWorld, uOrigin) - 4.0, 0.0) * uHazeDensity);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, clamp(hf, 0.0, 1.0));
          #include <dithering_fragment>`,
        )
  }
  m.customProgramCacheKey = () => `outside-${sway}-${haze}-${leafy}`
  return m
}

/** Depth material for shadows that sways with its leaves, so dappled light moves on the desk. */
export function swayDepth(sway: number) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = (s) => {
    patchVertex(s, sway)
  }
  m.customProgramCacheKey = () => `outside-depth-${sway}`
  return m
}

/** Rectangles of the openings, for masks, shafts and area lights. */
export const OPENINGS = Object.values(WINDOWS)
