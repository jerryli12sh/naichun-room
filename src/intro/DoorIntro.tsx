import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { buildCorridor, buildMoodProps, buildTomato, WALL_T } from './build'
import { textSprite } from './textures'
import { useIntro } from './introStore'
import * as sfx from './sfx'
import { Avatar } from '../avatar/Avatar'
import { pickMood, useRoom } from '../state/store'
import { door, doorLines } from '../content/door'
import { AVATAR_HEIGHT, AVATAR_SPOT, DOOR, nightness, ROOM } from '../content/layout'
import './intro.css'

/*
 * Branch 1: the door intro, built onto the real room.
 *
 * The corridor, front wall and door sit outside the room's front (+z) wall, in the same world and
 * scale as the room, with the door at DOOR.cx. Knock once: nothing. Twice: a Zzz drifts out under
 * the door. Three times: footsteps, the handle turns, the door swings open and 乃春 walks up to it
 * in a random mood. "进屋看看": he steps back to his spot in the room, the camera goes through the
 * door in one move, `entered` flips, the corridor fades away and CameraRig carries on to the
 * diorama view. No cuts.
 *
 * Everything here is in a local frame whose origin is the middle of the doorway at floor level;
 * local -z is into the room, +z is the corridor.
 */

const ORIGIN = new THREE.Vector3(DOOR.cx, 0, ROOM.d / 2 + WALL_T / 2)
const toLocal = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).sub(ORIGIN)

const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
}
type Tween = { t: number; dur: number; fn: (k: number) => void; e: (t: number) => number; done: () => void }
type Floater = { s: THREE.Sprite; t: number; life: number; start: THREE.Vector3; rise: number; drift: number; size: number }

const CAM_START = new THREE.Vector3(0, 1.5, 7.2)
const CAM_HOME = new THREE.Vector3(0, 1.32, 4.4)
const CAM_OPEN = new THREE.Vector3(-0.05, 1.3, 3.8)
const CAM_LOOK = new THREE.Vector3(-0.05, 1.08, 0)
// the camera's way in: through the middle of the doorway, ending a step inside looking at the room
const CAM_IN = new THREE.CatmullRomCurve3([
  CAM_OPEN.clone(),
  new THREE.Vector3(0, 1.4, 1.4),
  new THREE.Vector3(0.1, 1.7, 0.25),
  new THREE.Vector3(0.2, 2.3, -0.1), // just over the threshold and up high, looking down over him into the room
])
// where CameraRig's diorama view looks (HOME.target), so the hand-over doesn't jerk
const ROOM_LOOK = toLocal(0, 0.8, 0)

// The door sweeps a 0.92 m circle around its hinge at local (+0.46, 0). He waits outside that
// circle while it swings and only walks into it once the door is fully open: no clipping.
const FIG_START = new THREE.Vector3(-0.08, 0, -1.4)
const FIG_DOOR = new THREE.Vector3(-0.06, 0, -0.3)
const FIG_SLEEPY = new THREE.Vector3(-0.1, 0, -0.45) // the sleepyhead doesn't quite make it to the threshold
const FIG_ASIDE = toLocal(AVATAR_SPOT.x, 0, AVATAR_SPOT.z) // where the room's own avatar takes over
const DOOR_OPEN = 1.45 // rad, nearly flat along the room's open +x edge
const PROPS_SCALE = AVATAR_HEIGHT / 1.1 // props were modelled around a 1.10 m figure
const FADE = 1.2 // seconds for the corridor to dissolve after you walk in

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const lerp = THREE.MathUtils.lerp
const WIN_DAY = new THREE.Color('#d6e8ff'), WIN_NIGHT = new THREE.Color('#7ea0ff')

export function DoorIntro() {
  const mood = useRoom((s) => s.doorMood)
  const setRoom = useRoom((s) => s.set)
  const { camera } = useThree()
  const intro = useIntro

  const c = useMemo(buildCorridor, [])
  const props = useMemo(() => buildMoodProps(mood), [mood])
  const tomato = useMemo(buildTomato, [])
  const fig = useRef<THREE.Group>(null)
  const sway = useRef<THREE.Group>(null)
  const fx = useRef<THREE.Group>(null)

  const a = useRef({
    doorAngle: 0,
    handle: 0,
    shake: 0,
    lit: 0, // 0..1, light under the door brightening as he gets up
    walking: false,
    night: nightness(useRoom.getState().timeOfDay),
    camBase: CAM_HOME.clone(),
    camLive: false, // pointer parallax around camBase
    camFree: false, // CameraRig has the camera
    tweens: [] as Tween[],
    floaters: [] as Floater[],
    alive: true,
  }).current

  const tween = (dur: number, fn: (k: number) => void, e = ease.inOut, delay = 0) =>
    new Promise<void>((done) => a.tweens.push({ t: -delay, dur, fn, e, done }))

  const floatText = (text: string, pos: THREE.Vector3, o: { size?: number; rise?: number; drift?: number; life?: number; color?: string; glow?: string; delay?: number } = {}) => {
    const { size = 0.22, rise = 0.6, drift = 0.2, life = 1.6, color, glow, delay = 0 } = o
    setTimeout(() => {
      if (!a.alive || !fx.current) return
      const s = textSprite(text, color, glow)
      s.position.copy(pos); s.scale.setScalar(size); s.material.opacity = 0
      fx.current.add(s)
      a.floaters.push({ s, t: 0, life, start: pos.clone(), rise, drift: (Math.random() - 0.5) * drift + drift * 0.5, size })
    }, delay)
  }

  const setCam = (local: THREE.Vector3) => camera.position.copy(local).add(ORIGIN)
  const lookAt = (local: THREE.Vector3) => camera.lookAt(local.clone().add(ORIGIN))

  /* ---------- camera setup: glide in from down the corridor ---------- */
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    setCam(CAM_START)
    const fit = () => { if (!a.camFree) { cam.fov = cam.aspect < 1 ? 52 : 38; cam.updateProjectionMatrix() } }
    fit()
    window.addEventListener('resize', fit)
    tween(2.6, (k) => setCam(CAM_START.clone().lerp(a.camBase, k))).then(() => {
      a.camLive = true
      intro.getState().set({ phase: 'idle' })
    })
    return () => {
      a.alive = false
      window.removeEventListener('resize', fit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- the three knocks ---------- */
  const knock = async () => {
    const st = intro.getState()
    if (st.phase !== 'idle') return
    const knocks = st.knocks + 1
    st.set({ phase: 'busy', knocks })
    const at = new THREE.Vector3(-0.12, 1.32, 0.12)
    for (let i = 0; i < 2; i++) {
      sfx.knock(i * 0.17, 1 - i * 0.15)
      setTimeout(() => (a.shake = 1), i * 170)
      floatText('咚', at.clone().add(new THREE.Vector3(i * 0.18 - 0.06, i * 0.08, 0)), { size: 0.2, rise: 0.35, life: 1, delay: i * 170, color: '#fff3d6', glow: 'rgba(255,207,110,.8)' })
    }
    if (knocks === 1) {
      await wait(1100)
      st.set({ phase: 'idle', hint: door.hints.afterFirst })
    } else if (knocks === 2) {
      await wait(900)
      ;['z', 'z', 'Z'].forEach((z, i) =>
        floatText(z, new THREE.Vector3(-0.25 + i * 0.06, 0.12 + i * 0.04, 0.14), { size: 0.14 + i * 0.06, rise: 1.1, drift: 0.5, life: 2.6, delay: i * 380, color: '#cfe0ff', glow: 'rgba(150,185,255,.9)' }))
      await wait(1300)
      st.set({ phase: 'idle', hint: door.hints.afterSecond })
    } else {
      await wait(700)
      st.set({ hint: door.hints.coming })
      tween(0.8, (k) => (a.lit = k))
      ;[0, 0.42, 0.82, 1.18].forEach((t, i) => sfx.step(0.35 + t, 0.18 + i * 0.04))
      await wait(1900)
      await openDoor()
    }
  }

  /**
   * Walk the figure to `to`: turn toward where he's going, walk with a small step bob and sway,
   * then turn to `face` (yaw) on arrival. Short moves (stepping back) skip the turn.
   */
  const walk = (to: THREE.Vector3, dur: number, steps: number, face = 0, turn = true) => {
    const g = fig.current, sw = sway.current
    if (!g || !sw) return Promise.resolve()
    const from = g.position.clone(), r0 = g.rotation.y
    const d = to.clone().sub(from)
    const heading = turn ? Math.atan2(d.x, d.z) : r0
    a.walking = true
    return tween(dur, (k) => {
      const m = ease.inOut(k)
      g.position.lerpVectors(from, to, m)
      // turn to the heading in the first quarter, to the final facing in the last third
      g.rotation.y = k < 0.25 ? lerpAngle(r0, heading, ease.inOut(k / 0.25))
        : k < 0.67 ? heading
        : lerpAngle(heading, face, ease.inOut((k - 0.67) / 0.33))
      const ph = k * Math.PI * steps
      const amp = Math.sin(Math.PI * k) // steps ease in and out with the motion
      sw.position.y = Math.abs(Math.sin(ph)) * 0.025 * amp
      sw.rotation.z = Math.sin(ph) * 0.04 * amp
      sw.rotation.x = 0.05 * amp // lean into the walk
    }, (t) => t).then(() => {
      sw.position.y = 0; sw.rotation.set(0, 0, 0)
      a.walking = false
    })
  }

  const openDoor = async () => {
    const st = intro.getState()
    st.set({ phase: 'opening' })
    sfx.latch(0); sfx.latch(0.12)
    await tween(0.35, (k) => (a.handle = k * 0.6), ease.outCubic)
    const sleepy = useRoom.getState().doorMood === 'sleeping'
    if (fig.current) { fig.current.position.copy(FIG_START); fig.current.rotation.y = 0; fig.current.visible = true }
    sfx.creak(0)
    tween(0.4, (k) => (a.handle = 0.6 * (1 - k)), ease.inOut, 0.5)
    await tween(sleepy ? 2.1 : 1.7, (k) => (a.doorAngle = k * DOOR_OPEN), ease.outCubic)
    // now he comes to the door (slower when half asleep)
    const from = a.camBase.clone()
    tween(1.8, (k) => a.camBase.lerpVectors(from, CAM_OPEN, k))
    ;(sleepy ? [0, 0.6, 1.2] : [0, 0.32, 0.64, 0.96]).forEach((d) => sfx.step(d + 0.15, 0.12))
    await walk(sleepy ? FIG_SLEEPY : FIG_DOOR, sleepy ? 1.9 : 1.3, sleepy ? 3 : 4, 0, false)
    if (useRoom.getState().doorMood === 'eating') rollTomato()
    await wait(250)
    st.set({ bubble: true })
    sfx.chime()
    loopFx()
    await wait(1600)
    st.set({ phase: 'open' })
  }

  // ambient effects while the door is open: more Zzz, or music notes
  const loopFx = () => {
    const m = useRoom.getState().doorMood
    const ph = intro.getState().phase
    if (!a.alive || (ph !== 'opening' && ph !== 'open')) return
    const head = (fig.current?.position ?? FIG_DOOR).clone().add(new THREE.Vector3(0, AVATAR_HEIGHT * 0.95, 0.1))
    if (m === 'sleeping') {
      floatText(Math.random() < 0.5 ? 'z' : 'Z', head.clone().add(new THREE.Vector3(0.22, 0.15, 0)), { size: 0.12, rise: 0.6, drift: 0.3, life: 2.2, color: '#cfe0ff', glow: 'rgba(150,185,255,.9)' })
      setTimeout(loopFx, 1400)
    } else if (m === 'headphones') {
      floatText(Math.random() < 0.5 ? '♪' : '♫', head.clone().add(new THREE.Vector3((Math.random() < 0.5 ? -1 : 1) * 0.32, -0.08, 0)), { size: 0.14, rise: 0.6, drift: 0.4, life: 2, color: '#ffcf6e', glow: 'rgba(255,207,110,.8)' })
      setTimeout(loopFx, 650)
    }
  }

  const rollTomato = () => {
    tomato.group.visible = true
    const s = new THREE.Vector3(-0.3, 0, -0.1), e = new THREE.Vector3(-0.95, 0, 1.05)
    tween(1.5, (k) => {
      tomato.group.position.lerpVectors(s, e, k)
      tomato.body.rotation.z = k * 9; tomato.body.rotation.x = k * 3
    }, ease.outCubic, 0.15)
  }

  /* ---------- close the door and try another mood ---------- */
  const replay = async () => {
    const st = intro.getState()
    if (st.phase !== 'open') return
    st.set({ phase: 'busy', bubble: false })
    tomato.group.visible = false
    const from = a.camBase.clone(), ang = a.doorAngle
    tween(1.6, (k) => a.camBase.lerpVectors(from, CAM_HOME, k))
    await walk(FIG_START, 1.0, 3, 0, false) // back out of the door's way before it swings shut
    await tween(0.9, (k) => (a.doorAngle = ang * (1 - k)))
    sfx.knock(0, 0.5)
    if (fig.current) fig.current.visible = false
    a.lit = 0
    const doorMood = pickMood(useRoom.getState().doorMood)
    setRoom({ doorMood, lastMood: doorMood })
    st.set({ phase: 'idle', knocks: 0, hint: door.hints.start })
  }

  /* ---------- walk in: one continuous move, then hand the camera to CameraRig ---------- */
  const enter = async () => {
    const st = intro.getState()
    if (st.phase !== 'open') return
    st.set({ phase: 'leaving', bubble: false })
    a.camLive = false
    // he heads back to his spot in the room while the camera follows through the door
    ;[0, 0.35, 0.7, 1.05, 1.4].forEach((d) => sfx.step(d + 0.1, 0.1))
    walk(FIG_ASIDE, 1.7, 5, AVATAR_SPOT.yaw) // gets there before the camera is through the door
    const start = camera.position.clone().sub(ORIGIN)
    CAM_IN.points[0].copy(start)
    const look = new THREE.Vector3()
    await tween(2.6, (k) => {
      setCam(CAM_IN.getPoint(k))
      look.lerpVectors(CAM_LOOK, ROOM_LOOK, ease.inOut(Math.min(1, k * 1.3)))
      lookAt(look)
    }, ease.inOut)
    // hand over: the room's avatar appears where ours stands, CameraRig takes the camera on to
    // the diorama view, and the corridor dissolves as the camera rises out through it
    a.camFree = true
    ;(camera as THREE.PerspectiveCamera).fov = 35
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    if (fig.current) fig.current.visible = false
    setRoom({ entered: true })
    const mats = collectMaterials(c.group)
    await tween(FADE, (k) => mats.forEach(([m, o]) => (m.opacity = o * (1 - k))), ease.inOut, 0.15)
    st.set({ phase: 'done' })
  }

  // requests from the HTML overlay
  const request = useIntro((s) => s.request)
  useEffect(() => {
    if (!request) return
    if (request.kind === 'knock') knock()
    if (request.kind === 'replay') replay()
    if (request.kind === 'enter') enter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  /* ---------- per-frame ---------- */
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05), t = state.clock.elapsedTime
    for (let i = a.tweens.length - 1; i >= 0; i--) {
      const w = a.tweens[i]
      w.t += dt
      if (w.t < 0) continue
      const k = Math.min(w.t / w.dur, 1)
      w.fn(w.e(k))
      if (k >= 1) { a.tweens.splice(i, 1); w.done() }
    }

    const phase = intro.getState().phase
    if (!a.camFree && phase !== 'leaving') {
      if (a.camLive) {
        const p = state.pointer
        const target = new THREE.Vector3(a.camBase.x + p.x * 0.18, a.camBase.y + p.y * 0.08, a.camBase.z).add(ORIGIN)
        state.camera.position.lerp(target, 0.06)
      }
      lookAt(CAM_LOOK)
    }

    // door swing (hinged on +x, so it turns the other way), plus a shudder when knocked
    a.shake *= 0.86
    c.pivot.rotation.y = -a.doorAngle + Math.sin(t * 60) * a.shake * 0.006
    c.lever.rotation.z = -a.handle // press the lever down
    c.hangCard.parent!.rotation.z = a.handle // keep the hanger dangling straight
    c.hangCard.rotation.z = Math.sin(t * 2.2) * 0.04 + Math.sin(t * 40) * a.shake * 0.15

    // corridor day / night, eased like the room's Lights (which also paint the background)
    a.night += (nightness(useRoom.getState().timeOfDay) - a.night) * Math.min(1, dt * 1.5)
    const n = a.night
    if (phase !== 'leaving' && phase !== 'done') {
      c.spot.intensity = lerp(9, 26, n)
      c.fill.intensity = lerp(3, 5, n)
      c.winLight.intensity = lerp(2.2, 1.6, n); c.winLight.color.copy(WIN_DAY).lerp(WIN_NIGHT, n)
      c.winNightMat.opacity = n
      c.gapMat.opacity = lerp(0.22, 0.55, n) + a.lit * 0.4 + Math.sin(t * 1.3) * 0.02
      c.spillMat.opacity = lerp(0.08, 0.25, n) + a.lit * 0.35
    } else {
      c.spot.intensity *= 0.95; c.fill.intensity *= 0.95; c.winLight.intensity *= 0.95
    }
    ;(c.lampGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = lerp(0.8, 2.1, n) + Math.sin(t * 0.8) * 0.1

    // idle motion per mood (the model itself is static; the avatar branch owns the rig)
    if (sway.current && fig.current?.visible && !a.walking && phase !== 'leaving') {
      const m = useRoom.getState().doorMood
      const s = sway.current
      if (m === 'sleeping') { s.rotation.z = Math.sin(t * 1.1) * 0.04; s.rotation.x = 0.02 + Math.sin(t * 0.7) * 0.015 }
      else if (m === 'headphones') { s.rotation.z = Math.sin(t * 6.2) * 0.035; s.position.y = Math.abs(Math.sin(t * 6.2)) * 0.012 }
      else if (m === 'croc') { s.rotation.z = Math.sin(t * 2) * 0.04; if (props.parts.croc) props.parts.croc.position.y = 0.55 + Math.sin(t * 4) * 0.01 }
      else if (m === 'eating') { s.rotation.z = Math.sin(t * 1.6) * 0.025; if (props.parts.sticks) props.parts.sticks.rotation.x = 0.9 + Math.max(0, Math.sin(t * 2.4)) * 0.25 }
    }

    // floating 咚 / Zzz / notes
    for (let i = a.floaters.length - 1; i >= 0; i--) {
      const f = a.floaters[i]
      f.t += dt
      const k = f.t / f.life
      f.s.position.set(f.start.x + Math.sin(k * 3) * 0.04 + f.drift * k, f.start.y + f.rise * ease.outCubic(k), f.start.z)
      f.s.material.opacity = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4)
      f.s.scale.setScalar(f.size * (0.8 + 0.2 * Math.min(1, k * 4)))
      if (k >= 1) { f.s.removeFromParent(); f.s.material.map?.dispose(); f.s.material.dispose(); a.floaters.splice(i, 1) }
    }
  })

  // keyboard: space / enter knocks
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter') && knock()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const phase = useIntro((s) => s.phase)
  const bubble = useIntro((s) => s.bubble)
  const canKnock = phase === 'idle'

  return (
    <group position={ORIGIN}>
      <primitive
        object={c.group}
        onClick={(e: ThreeEvent<MouseEvent>) => { if (isDoor(e.object, c.pivot)) { e.stopPropagation(); knock() } }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => { document.body.style.cursor = canKnock && isDoor(e.object, c.pivot) ? 'pointer' : 'auto' }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      />
      <group ref={fig} position={FIG_START} visible={false}>
        {/* soft contact shadow so he reads as standing on the floor */}
        <mesh rotation-x={-Math.PI / 2} position-y={0.006} renderOrder={1}>
          <circleGeometry args={[0.26, 32]} />
          <meshBasicMaterial map={contactTex} transparent depthWrite={false} opacity={0.5} />
        </mesh>
        <group ref={sway}>
          <Suspense fallback={null}>
            <Avatar />
          </Suspense>
          <group scale={PROPS_SCALE}>
            <primitive object={props.group} />
          </group>
        </group>
        <Html position={[0, AVATAR_HEIGHT + 0.12, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`nc-bubble${bubble ? ' show' : ''}`}>{doorLines[mood]}</div>
        </Html>
      </group>
      <primitive object={tomato.group} />
      <group ref={fx} />
    </group>
  )
}

function lerpAngle(a: number, b: number, k: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * k
}

/** Every material in the corridor, made fadeable, with its current opacity. */
function collectMaterials(root: THREE.Object3D) {
  const out: [THREE.Material, number][] = []
  const seen = new Set<THREE.Material>()
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (!m) return
    ;(Array.isArray(m) ? m : [m]).forEach((mat) => {
      if (seen.has(mat)) return
      seen.add(mat)
      mat.transparent = true
      mat.depthWrite = mat.opacity >= 1 && mat.depthWrite
      mat.needsUpdate = true
      out.push([mat, mat.opacity])
    })
    ;(o as THREE.Mesh).castShadow = false
  })
  return out
}

/** soft dark blob under his feet */
const contactTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128
  const g = cv.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  r.addColorStop(0, 'rgba(20,14,8,.75)'); r.addColorStop(0.55, 'rgba(20,14,8,.3)'); r.addColorStop(1, 'rgba(20,14,8,0)')
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(cv)
})()

function isDoor(o: THREE.Object3D, pivot: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === pivot) return true
  return false
}
