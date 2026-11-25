import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { buildCorridor, buildMoodProps, buildTomato } from './build'
import { textSprite } from './textures'
import { useIntro } from './introStore'
import * as sfx from './sfx'
import { Avatar } from '../avatar/Avatar'
import { pickMood, useRoom } from '../state/store'
import { door, doorLines } from '../content/door'
import { nightness } from '../content/layout'
import './intro.css'

/*
 * Branch 1: the door intro.
 * Knock once: nothing. Twice: a Zzz drifts out from under the door. Three times: the light comes on,
 * footsteps, the handle turns and 乃春 opens the door in a random mood (room store `doorMood`).
 * "进屋看看" walks through the door and sets `entered`, which swaps this scene for the room.
 */

const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
}
type Tween = { t: number; dur: number; fn: (k: number) => void; e: (t: number) => number; done: () => void }
type Floater = { s: THREE.Sprite; t: number; life: number; start: THREE.Vector3; rise: number; drift: number; size: number }

const CAM_HOME = new THREE.Vector3(0, 1.32, 4.4)
const CAM_OPEN = new THREE.Vector3(-0.05, 1.25, 3.3)
const CAM_LOOK = new THREE.Vector3(0.1, 1.08, 0)
const FIG_POS = new THREE.Vector3(0.08, 0, -0.55)
const FIG_SCALE = 1.12
const AVATAR_H = 1.16
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const lerp = THREE.MathUtils.lerp
// day / night ends for the corridor (night is the look Jerry signed off on)
const BG_DAY = new THREE.Color('#e9e1d3'), BG_NIGHT = new THREE.Color('#0d1626')
const HEMI_DAY = new THREE.Color('#fff4e0'), HEMI_NIGHT = new THREE.Color('#9fb0d8')
const SKY_DAY = new THREE.Color('#fff1d6'), SKY_NIGHT = new THREE.Color('#9db6ff')
const WIN_DAY = new THREE.Color('#d6e8ff'), WIN_NIGHT = new THREE.Color('#7ea0ff')

export function DoorIntro() {
  const mood = useRoom((s) => s.doorMood)
  const setRoom = useRoom((s) => s.set)
  const { camera, scene } = useThree()
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
    lit: 0, // 0..1, his room light switching on before he opens the door
    night: nightness(useRoom.getState().timeOfDay),
    camBase: CAM_HOME.clone(),
    camLive: false,
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

  /* ---------- scene setup: night background, fog, camera ---------- */
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const prevBg = scene.background, prevFog = scene.fog
    scene.background = new THREE.Color()
    scene.fog = new THREE.Fog(new THREE.Color(), 7, 16)
    cam.position.set(0, 1.5, 7.2)
    const fit = () => { cam.fov = cam.aspect < 1 ? 52 : 38; cam.updateProjectionMatrix() }
    fit()
    window.addEventListener('resize', fit)
    // camera glides in from down the corridor
    const from = cam.position.clone()
    tween(2.6, (k) => cam.position.lerpVectors(from, a.camBase, k)).then(() => {
      a.camLive = true
      intro.getState().set({ phase: 'idle' })
    })
    return () => {
      a.alive = false
      window.removeEventListener('resize', fit)
      scene.background = prevBg; scene.fog = prevFog
      cam.fov = 35; cam.updateProjectionMatrix()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- the three knocks ---------- */
  const knock = async () => {
    const st = intro.getState()
    if (st.phase !== 'idle') return
    const knocks = st.knocks + 1
    st.set({ phase: 'busy', knocks })
    const at = new THREE.Vector3(0.12, 1.32, 0.12)
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
        floatText(z, new THREE.Vector3(0.25 + i * 0.06, 0.12 + i * 0.04, 0.14), { size: 0.14 + i * 0.06, rise: 1.1, drift: 0.5, life: 2.6, delay: i * 380, color: '#cfe0ff', glow: 'rgba(150,185,255,.9)' }))
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

  const openDoor = async () => {
    const st = intro.getState()
    st.set({ phase: 'opening' })
    sfx.latch(0); sfx.latch(0.12)
    await tween(0.35, (k) => (a.handle = -k * 0.6), ease.outCubic)
    if (fig.current) fig.current.visible = true
    sfx.creak(0)
    const target = useRoom.getState().doorMood === 'sleeping' ? 0.95 : 1.25 // the sleepyhead only half opens it
    tween(0.4, (k) => (a.handle = -0.6 * (1 - k)), ease.inOut, 0.5)
    await tween(1.7, (k) => (a.doorAngle = k * target), ease.outCubic)
    const from = a.camBase.clone()
    tween(1.4, (k) => a.camBase.lerpVectors(from, CAM_OPEN, k))
    if (useRoom.getState().doorMood === 'eating') rollTomato()
    await wait(350)
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
    const head = FIG_POS.clone().add(new THREE.Vector3(0, 1.2, 0.1))
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
    const s = new THREE.Vector3(0.15, 0, -0.35), e = new THREE.Vector3(0.95, 0, 1.05)
    tween(1.5, (k) => {
      tomato.group.position.lerpVectors(s, e, k)
      tomato.body.rotation.z = -k * 9; tomato.body.rotation.x = k * 3
    }, ease.outCubic, 0.15)
  }

  /* ---------- close the door and try another mood ---------- */
  const replay = async () => {
    const st = intro.getState()
    if (st.phase !== 'open') return
    st.set({ phase: 'busy', bubble: false })
    tomato.group.visible = false
    const from = a.camBase.clone(), ang = a.doorAngle
    tween(1.2, (k) => a.camBase.lerpVectors(from, CAM_HOME, k))
    await tween(0.9, (k) => (a.doorAngle = ang * (1 - k)))
    sfx.knock(0, 0.5)
    if (fig.current) fig.current.visible = false
    a.lit = 0
    const doorMood = pickMood(useRoom.getState().doorMood)
    setRoom({ doorMood, lastMood: doorMood })
    st.set({ phase: 'idle', knocks: 0, hint: door.hints.start })
  }

  /* ---------- walk in ---------- */
  const enter = async () => {
    const st = intro.getState()
    if (st.phase !== 'open') return
    st.set({ phase: 'leaving', bubble: false })
    a.camLive = false
    const cam = camera
    const from = cam.position.clone()
    const to = new THREE.Vector3(0.2, 1.25, -0.9)
    await tween(1.4, (k) => { cam.position.lerpVectors(from, to, k) }, ease.inOut)
    setRoom({ entered: true })
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

    const cam = state.camera
    if (a.camLive) {
      const p = state.pointer
      cam.position.lerp(new THREE.Vector3(a.camBase.x + p.x * 0.18, a.camBase.y + p.y * 0.08, a.camBase.z), 0.06)
    }
    if (intro.getState().phase === 'leaving') cam.lookAt(0.2, 1.15, -2)
    else cam.lookAt(CAM_LOOK)

    // door swing, plus a little shudder when knocked
    a.shake *= 0.86
    c.pivot.rotation.y = a.doorAngle + Math.sin(t * 60) * a.shake * 0.006
    c.lever.rotation.z = a.handle
    c.hangCard.parent!.rotation.z = -a.handle // keep the hanger dangling straight
    c.hangCard.rotation.z = Math.sin(t * 2.2) * 0.04 + Math.sin(t * 40) * a.shake * 0.15
    // day / night, eased so the light switch in the room store fades rather than cuts
    a.night += (nightness(useRoom.getState().timeOfDay) - a.night) * Math.min(1, dt * 1.5)
    const n = a.night
    ;(scene.background as THREE.Color).copy(BG_DAY).lerp(BG_NIGHT, n)
    ;(scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color)
    c.hemi.intensity = lerp(1.15, 0.75, n); c.hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, n)
    c.moon.intensity = lerp(1.1, 0.35, n); c.moon.color.copy(SKY_DAY).lerp(SKY_NIGHT, n)
    c.spot.intensity = lerp(9, 26, n)
    c.fill.intensity = lerp(3, 5, n)
    c.winLight.intensity = lerp(2.2, 1.6, n); c.winLight.color.copy(WIN_DAY).lerp(WIN_NIGHT, n)
    c.winNightMat.opacity = n
    c.roomLight.intensity = lerp(1.2, 2, n) + a.lit * 5
    c.gapMat.opacity = lerp(0.22, 0.55, n) + a.lit * 0.4 + Math.sin(t * 1.3) * 0.02
    c.spillMat.opacity = lerp(0.08, 0.25, n) + a.lit * 0.35
    ;(c.lampGlow.material as THREE.MeshStandardMaterial).emissiveIntensity = lerp(0.8, 2.1, n) + Math.sin(t * 0.8) * 0.1

    // idle motion per mood (the model itself is static; branch 3 adds a rig)
    if (sway.current && fig.current?.visible) {
      const m = useRoom.getState().doorMood
      const s = sway.current
      if (m === 'sleeping') { s.rotation.z = Math.sin(t * 1.1) * 0.05; s.rotation.x = 0.03 + Math.sin(t * 0.7) * 0.02 }
      else if (m === 'headphones') { s.rotation.z = Math.sin(t * 6.2) * 0.05; s.position.y = Math.abs(Math.sin(t * 6.2)) * 0.015 }
      else if (m === 'croc') { s.rotation.z = Math.sin(t * 2) * 0.05; if (props.parts.croc) props.parts.croc.position.y = 0.55 + Math.sin(t * 4) * 0.01 }
      else if (m === 'eating') { s.rotation.z = Math.sin(t * 1.6) * 0.03; if (props.parts.sticks) props.parts.sticks.rotation.x = 0.9 + Math.max(0, Math.sin(t * 2.4)) * 0.25 }
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
    <group>
      <primitive
        object={c.group}
        onClick={(e: ThreeEvent<MouseEvent>) => { if (isDoor(e.object, c.pivot)) { e.stopPropagation(); knock() } }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => { document.body.style.cursor = canKnock && isDoor(e.object, c.pivot) ? 'pointer' : 'auto' }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      />
      <group ref={fig} position={FIG_POS} scale={FIG_SCALE} visible={false}>
        <group ref={sway}>
          <Suspense fallback={null}>
            <Avatar height={AVATAR_H} />
          </Suspense>
          <primitive object={props.group} />
        </group>
        <Html position={[0, 1.3, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`nc-bubble${bubble ? ' show' : ''}`}>{doorLines[mood]}</div>
        </Html>
      </group>
      <primitive object={tomato.group} />
      <group ref={fx} />
    </group>
  )
}

function isDoor(o: THREE.Object3D, pivot: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === pivot) return true
  return false
}
