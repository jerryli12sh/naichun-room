import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../state/store'
import { ROOM, WINDOWS } from '../content/layout'
import { env } from '../scene/outside/env'
import { Sky } from '../scene/outside/Sky'
import { Scenery } from '../scene/outside/Scenery'
import { Rain } from '../scene/outside/Rain'
import { WindowLight } from '../scene/outside/WindowLight'
import { startRain } from '../audio/audio'

/** Raindrops sitting on and running down the glass, drawn procedurally (no texture). */
const glassFrag = /* glsl */ `
uniform float uRain; uniform float uTime; uniform float uNight; uniform float uHover; uniform vec2 uSize;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// one layer of drops; returns (mask, rim)
vec2 drops(vec2 uv, float t, float scale) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  float life = fract(t * (0.05 + h * 0.08) + h);
  vec2 c = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float r = 0.08 + 0.16 * hash(id + 1.3);
  float d = length((f - c * 0.6) * vec2(1.0, 0.85));
  float m = smoothstep(r, r * 0.75, d) * smoothstep(1.0, 0.7, life) * step(0.72, h);
  // specular glint on the upper side of the bead
  vec2 hp = f - c * 0.6 - vec2(-0.25, 0.3) * r;
  float rim = smoothstep(r * 0.35, 0.0, length(hp)) * m;
  return vec2(m, rim);
}
// a few drops sliding down with a wet trail
vec2 runs(vec2 uv, float t) {
  float cols = 9.0;
  float x = uv.x * cols;
  float id = floor(x);
  float fx = fract(x) - 0.5;
  float h = hash(vec2(id, 2.0));
  float speed = 0.06 + h * 0.08;
  float y = 1.15 - fract(t * speed + h) * 1.4;
  float wob = 0.12 * sin(uv.y * 30.0 + h * 10.0);
  float dx = (fx - wob * 0.5) * 1.6;
  float d = length(vec2(dx / cols, (uv.y - y) * 0.9)) * cols;
  float head = smoothstep(0.22, 0.12, d) * step(0.45, h);
  float trail = smoothstep(0.08, 0.02, abs(dx)) * smoothstep(y, y + 0.35, uv.y) * step(uv.y, y + 0.35) * 0.5 * step(0.45, h);
  return vec2(head, trail);
}
void main() {
  vec2 uv = vUv * uSize;
  vec2 a = drops(uv, uTime, 22.0);
  vec2 b = drops(uv + 3.7, uTime * 1.3, 38.0);
  vec2 r = runs(vUv, uTime);
  float m = (max(a.x, b.x * 0.6) + r.x) * uRain;
  float rim = (a.y + b.y * 0.8 + r.x * 0.6) * uRain;
  float trail = r.y * uRain;
  // glass tint and a faint diagonal sheen so it reads as glass when dry
  float sheen = smoothstep(0.08, 0.0, abs(vUv.x * 0.8 + vUv.y * 0.5 - 0.62)) * 0.05 * (1.0 - uNight * 0.6);
  vec3 tint = mix(vec3(0.82, 0.9, 0.97), vec3(0.45, 0.52, 0.66), uNight);
  vec3 col = tint;
  float alpha = 0.05 + uRain * 0.14 + sheen + uHover * 0.05;
  // beads darken a little (they refract the darker ground) and glint at the top
  col = mix(col, tint * 0.75, clamp(m, 0.0, 1.0));
  col = mix(col, vec3(1.0), clamp(rim, 0.0, 1.0));
  alpha += m * 0.14 + rim * 0.5 + trail * 0.1;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}`
const glassVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

/** Writes stencil 1 wherever the opening is seen; the outside world draws only there. */
const maskMat = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  stencilWrite: true,
  stencilRef: 1,
  stencilFunc: THREE.AlwaysStencilFunc,
  stencilZPass: THREE.ReplaceStencilOp,
})

/** White frame, transom bar, sill and grey roller blind for one opening. */
function Frame({ w, h }: { w: number; h: number }) {
  const f = 0.05
  const d = ROOM.wall + 0.04
  const white = <meshStandardMaterial color="#fbfbf8" roughness={0.4} />
  return (
    <group>
      <RoundedBox args={[w, f, d]} radius={0.01} position={[0, f / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w, f, d]} radius={0.01} position={[0, h - f / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[f, h, d]} radius={0.01} position={[-w / 2 + f / 2, h / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[f, h, d]} radius={0.01} position={[w / 2 - f / 2, h / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w, 0.035, d - 0.02]} radius={0.008} position={[0, h * 0.38, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w + 0.1, 0.03, 0.22]} radius={0.01} position={[0, -0.01, 0.07]} castShadow receiveShadow>{white}</RoundedBox>
      <mesh position={[0, h + 0.08, 0.08]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.04, 0.04, w + 0.06, 16]} />
        <meshStandardMaterial color="#cfccc6" roughness={0.95} />
      </mesh>
      <RoundedBox args={[w, 0.2, 0.01]} radius={0.003} position={[0, h - 0.05, 0.1]} castShadow>
        <meshStandardMaterial color="#cfccc6" roughness={0.95} />
      </RoundedBox>
    </group>
  )
}

/**
 * Both back-wall windows. Clicking either one starts or stops the rain (isRaining in the store),
 * with rain sound. The avatar (branch 3) is expected to walk over and watch.
 */
export function Windows() {
  const isRaining = useRoom((s) => s.isRaining)
  const set = useRoom((s) => s.set)
  const setFocus = useRoom((s) => s.setFocus)
  const glass = useMemo(
    () =>
      Object.values(WINDOWS).map(
        (o) =>
          new THREE.ShaderMaterial({
            uniforms: {
              uRain: { value: 0 },
              uTime: { value: 0 },
              uNight: { value: 0 },
              uHover: { value: 0 },
              uSize: { value: new THREE.Vector2(o.w, o.h) },
            },
            vertexShader: glassVert,
            fragmentShader: glassFrag,
            transparent: true,
            depthWrite: false,
            // CameraRig treats opacity < 0.5 as see-through
            opacity: 0.1,
          }),
      ),
    [],
  )
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!isRaining) return
    return startRain()
  }, [isRaining])

  useFrame(() => {
    for (const m of glass) {
      m.uniforms.uRain.value = env.rain
      m.uniforms.uTime.value = env.time
      m.uniforms.uNight.value = env.night
      m.uniforms.uHover.value += ((hover ? 1 : 0) - m.uniforms.uHover.value) * 0.15
    }
  })

  const maskZ = -ROOM.d / 2 - ROOM.wall + 0.002
  const frameZ = -ROOM.d / 2 - ROOM.wall / 2
  const toggle = () => {
    set({ isRaining: !isRaining })
    const o = WINDOWS.wide
    setFocus({ id: 'window', position: [o.cx - 0.3, o.y0 + o.h / 2, -1.2], distance: 2 })
  }

  return (
    <>
    <Sky />
    <Scenery />
    <Rain />
    <WindowLight />
    <group
      onClick={(e) => (e.stopPropagation(), toggle())}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
      onPointerOut={() => (setHover(false), (document.body.style.cursor = 'auto'))}
    >
      {Object.values(WINDOWS).map((o, i) => (
        <group key={o.cx}>
          <mesh position={[o.cx, o.y0 + o.h / 2, maskZ]} material={maskMat} renderOrder={-10}>
            <planeGeometry args={[o.w, o.h]} />
          </mesh>
          <mesh position={[o.cx, o.y0 + o.h / 2, frameZ]} material={glass[i]} renderOrder={30}>
            <planeGeometry args={[o.w - 0.06, o.h - 0.06]} />
          </mesh>
          <group position={[o.cx, o.y0, frameZ]}>
            <Frame w={o.w} h={o.h} />
          </group>
        </group>
      ))}
    </group>
    </>
  )
}
