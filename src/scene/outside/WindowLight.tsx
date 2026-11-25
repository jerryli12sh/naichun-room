import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { env, isLowEnd, OPENINGS, WALL_IN_Z } from './env'

RectAreaLightUniformsLib.init()

const SUN = new THREE.Color('#ffe4b8')
const GOLD = new THREE.Color('#ffb36b')
const MOON = new THREE.Color('#9db4ff')
const MAX_LEN = 4.2

type Opening = (typeof OPENINGS)[number]

/** Corners of an opening on the inner wall face: bottom-left, bottom-right, top-right, top-left. */
function corners(o: Opening) {
  const z = WALL_IN_Z + 0.005
  // keep the beam inside the white frame
  const f = 0.04
  return [
    new THREE.Vector3(o.cx - o.w / 2 + f, o.y0 + f, z),
    new THREE.Vector3(o.cx + o.w / 2 - f, o.y0 + f, z),
    new THREE.Vector3(o.cx + o.w / 2 - f, o.y0 + o.h - f, z),
    new THREE.Vector3(o.cx - o.w / 2 + f, o.y0 + o.h - f, z),
  ]
}

/** How far light travels from p along l before reaching the floor. */
const reach = (p: THREE.Vector3, l: THREE.Vector3) => Math.min(MAX_LEN, l.y < -0.02 ? p.y / -l.y : MAX_LEN)

const shaftVert = /* glsl */ `
attribute vec2 aUV; attribute float aHeight;
varying vec2 vUV; varying float vHeight; varying vec3 vWorld;
void main() {
  vUV = aUV; vHeight = aHeight;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const shaftFrag = /* glsl */ `
uniform vec3 uColor; uniform float uI; uniform float uTime; uniform vec3 uL; uniform float uTransom;
varying vec2 vUV; varying float vHeight; varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  float across = vUV.x, along = vUV.y;
  float edge = smoothstep(0.0, 0.22, across) * smoothstep(1.0, 0.78, across);
  float fade = smoothstep(0.0, 0.06, along) * pow(1.0 - along, 1.35);
  // the transom bar's shadow runs through the beam
  float bar = 1.0 - 0.75 * exp(-pow((vHeight - uTransom) / 0.035, 2.0));
  vec3 q = vWorld - dot(vWorld, uL) * uL;
  float streak = 0.65 + 0.35 * noise(q.xy * 5.0 + q.z * 3.0 + vec2(uTime * 0.04, 0.0));
  float a = uI * edge * fade * bar * streak;
  gl_FragColor = vec4(uColor * a, 1.0);
}`

/** One beam: the opening swept along the light direction to the floor, drawn as four soft additive sides. */
function Shaft({ o, i }: { o: Opening; i: number }) {
  const c = useMemo(() => corners(o), [o])
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3))
    const uv: number[] = []
    const height: number[] = []
    const idx: number[] = []
    const hf = (k: number) => (k < 2 ? 0 : 1) // height fraction of corner k (BL, BR at 0; TR, TL at 1)
    for (let f = 0; f < 4; f++) {
      const a = f, b = (f + 1) % 4
      uv.push(0, 0, 1, 0, 1, 1, 0, 1)
      height.push(hf(a), hf(b), hf(b), hf(a))
      const base = f * 4
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    geo.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2))
    geo.setAttribute('aHeight', new THREE.Float32BufferAttribute(height, 1))
    geo.setIndex(idx)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() },
        uI: { value: 0 },
        uTime: { value: 0 },
        uL: { value: new THREE.Vector3() },
        uTransom: { value: 0.38 },
      },
      vertexShader: shaftVert,
      fragmentShader: shaftFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    return { geo, mat }
  }, [])
  const L = useRef(new THREE.Vector3())
  const far = useMemo(() => c.map(() => new THREE.Vector3()), [c])
  useFrame(() => {
    const l = L.current.copy(env.keyDir).negate()
    c.forEach((p, k) => far[k].copy(p).addScaledVector(l, reach(p, l)))
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let f = 0; f < 4; f++) {
      const a = f, b = (f + 1) % 4
      const quad = [c[a], c[b], far[b], far[a]]
      quad.forEach((v, k) => pos.setXYZ(f * 4 + k, v.x, v.y, v.z))
    }
    pos.needsUpdate = true
    geo.computeBoundingSphere()
    const day = env.sunUp * (1 - env.rain)
    const night = env.night * (1 - env.rain) * 0.35
    mat.uniforms.uI.value = (day * 0.2 + night * 0.14) * (i === 0 ? 0.9 : 1)
    mat.uniforms.uColor.value.copy(SUN).lerp(GOLD, env.golden).lerp(MOON, env.night)
    mat.uniforms.uTime.value = env.time
    mat.uniforms.uL.value.copy(l)
  })
  // height fraction of the transom inside the beam (corners are inset by the frame)
  mat.uniforms.uTransom.value = (o.h * 0.38 - 0.04) / (o.h - 0.08)
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={20} />
}

/** Dust drifting in the beams, catching the light. */
function Dust({ o }: { o: Opening }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const c = useMemo(() => corners(o), [o])
  const { geo, mat } = useMemo(() => {
    const n = isLowEnd ? 70 : 160
    const a = new Float32Array(n * 4)
    for (let i = 0; i < n * 4; i++) a[i] = Math.random()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aR', new THREE.BufferAttribute(a, 4))
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uBL: { value: c[0] },
        uW: { value: c[1].clone().sub(c[0]) },
        uH: { value: c[3].clone().sub(c[0]) },
        uL: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uI: { value: 0 },
        uColor: { value: new THREE.Color() },
        uPR: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform vec3 uBL; uniform vec3 uW; uniform vec3 uH; uniform vec3 uL; uniform float uTime; uniform float uPR;
        attribute vec4 aR; varying float vA;
        void main() {
          float t = uTime * (0.6 + aR.w * 0.8);
          vec2 st = vec2(aR.x + 0.03 * sin(t * 0.21 + aR.y * 30.0), aR.y + 0.03 * cos(t * 0.17 + aR.x * 20.0));
          st = clamp(st, 0.02, 0.98);
          vec3 p = uBL + uW * st.x + uH * st.y;
          float len = min(${MAX_LEN.toFixed(1)}, uL.y < -0.02 ? p.y / -uL.y : ${MAX_LEN.toFixed(1)});
          float s = fract(aR.z + t * 0.006);
          p += uL * len * s;
          p.y += 0.04 * sin(t * 0.5 + aR.z * 40.0);
          vA = smoothstep(0.0, 0.08, s) * (1.0 - s) * (0.4 + 0.6 * sin(t * 1.3 + aR.w * 60.0) * sin(t * 1.3 + aR.w * 60.0));
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.2 + aR.w * 1.6) * uPR * 6.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uI; uniform vec3 uColor; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uI;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return { geo, mat }
  }, [c])
  useFrame(() => {
    mat.uniforms.uL.value.copy(env.keyDir).negate()
    mat.uniforms.uTime.value = env.time
    mat.uniforms.uI.value = env.sunUp * (1 - env.rain) * 0.9 + env.night * (1 - env.rain) * 0.15
    mat.uniforms.uColor.value.copy(SUN).lerp(GOLD, env.golden).lerp(MOON, env.night)
    mat.uniforms.uPR.value = dpr * (window.innerHeight / 900)
  })
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={21} />
}

const SKY_DAY = new THREE.Color('#e3eefa')
const SKY_GOLD = new THREE.Color('#ffd7ad')
const SKY_NIGHT = new THREE.Color('#6f86c4')
const SKY_RAIN = new THREE.Color('#c2c9d2')

/** Soft skylight spilling in through each opening (rect area light), so the sill, desk and floor near the window glow. */
function Skylight({ o, i }: { o: Opening; i: number }) {
  const ref = useRef<THREE.RectAreaLight>(null)
  useEffect(() => {
    ref.current?.lookAt(o.cx, o.y0 + o.h / 2, 5)
  }, [o])
  useFrame(() => {
    const l = ref.current
    if (!l) return
    const day = 1 - env.night
    l.color.copy(SKY_DAY).lerp(SKY_GOLD, env.golden * 0.7).lerp(SKY_RAIN, env.rain).lerp(SKY_NIGHT, env.night)
    l.intensity = (day * (2.6 - env.rain * 0.9) + env.night * 0.9 + env.flash * 8) * (isLowEnd ? 1.2 : 1) * (i === 0 ? 0.8 : 1)
  })
  return <rectAreaLight ref={ref} position={[o.cx, o.y0 + o.h / 2, WALL_IN_Z + 0.03]} width={o.w} height={o.h} />
}

/** Light coming in through the windows: beams with dust by day (moonbeams at night) and soft skylight. */
export function WindowLight() {
  const sky = isLowEnd ? OPENINGS.slice(-1) : OPENINGS
  return (
    <group>
      {OPENINGS.map((o, i) => (
        <group key={o.cx}>
          <Shaft o={o} i={i} />
          <Dust o={o} />
        </group>
      ))}
      {sky.map((o, i) => (
        <Skylight key={o.cx} o={o} i={isLowEnd ? 1 : i} />
      ))}
    </group>
  )
}
