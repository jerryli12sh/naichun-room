import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRoom, type AvatarMode } from '../state/store'
import { AVATAR_HEIGHT as HEIGHT, nightness, SURFACES } from '../content/layout'
import { Bubbles, type BubblesHandle } from './Bubbles'
import { useAvatarModel } from './Avatar'

const SPEED = 0.8 // m/s
const DOZE_AFTER = 45 // s without any click from the visitor (daytime only)

type Spot = { x: number; z: number; yaw: number }
const look = (x: number, z: number, lx: number, lz: number): Spot => ({ x, z, yaw: Math.atan2(lx - x, lz - z) })

/** Where he goes. yaw 0 = facing +z (towards the open side of the room). */
const SPOTS = {
  center: look(0.25, 0.3, 3, 3),
  front: look(-0.2, 1.2, 3, 3), // keeps the doorway strip (x 0.4..1.5, z > 0.8) clear
  photos: look(-0.25, 0.55, -1.5, -0.68), // looking at the photo board above the bed
  window: look(-0.1, -0.98, -0.25, -1.8), // over the cabinet, out of the narrow window
  bedside: look(-0.15, -0.5, -1, -0.5),
  desk: look(0.33, -0.8, 0.3, -1.8), // at the desk, over the books
}
const WANDER: (keyof typeof SPOTS)[] = ['center', 'front', 'photos', 'center']

/** Lying in bed: feet towards the room, head on the pillow, face up. */
const BED = { x: SURFACES.bed.x - 0.05, z: -1.72 + HEIGHT, mattress: SURFACES.bed.y - 0.02 }

const LINES = ['笑着过日子！', '黄总在此', '嘿嘿', '今晚打数模？', '吃了没？']
const COLORS = { warm: '#d2802a', blue: '#5b6f95', red: '#e0574a' }

type Pose = { x: number; z: number; yaw: number; tilt: number; lift: number }
type Tween = { from: Pose; to: Pose; t: number; dur: number; arc: number; done?: () => void }

const lerpAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t
const damp = (v: number, target: number, k: number, dt: number) => v + (target - v) * Math.min(1, dt * k)

/**
 * 乃春's avatar (branch 3). A static image-to-3D model, so all motion is whole-body:
 * walking bob, head-bob sway to music, leaning at the desk, nodding off, lying in bed.
 *
 * Reacts to the store: isRaining (walks to the window and watches), musicOn (bobs; wakes him),
 * alarmRangAt (goes to bed, or wakes up if already asleep), timeOfDay (a night owl: at night he
 * mostly stands at the desk). Wanders between spots otherwise, and dozes off if the visitor
 * leaves the room alone in the daytime. Publishes what he is doing as avatarMode.
 */
export function RoomAvatar() {
  const { holder, depth } = useAvatarModel()
  const setFocus = useRoom((s) => s.setFocus)
  const root = useRef<THREE.Group>(null)
  const pose = useRef<THREE.Group>(null)
  const bob = useRef<THREE.Group>(null)
  const bubbles = useRef<BubblesHandle>(null)

  const lie: Pose = useMemo(() => ({ x: BED.x, z: BED.z, yaw: 0, tilt: -Math.PI / 2 + 0.04, lift: BED.mattress + depth * 0.1 }), [depth]) // lift: sinks into the mattress a little, the backpack sticks out behind him
  const stand = (sp: Spot): Pose => ({ x: sp.x, z: sp.z, yaw: sp.yaw, tilt: 0, lift: 0 })

  const a = useRef({
    mode: 'idle' as AvatarMode,
    p: stand(SPOTS.center),
    target: null as null | { spot: Spot; then?: () => void },
    tween: null as Tween | null,
    wander: 3,
    stay: 0, // seconds left at the desk
    phase: 0,
    hop: 0,
    lastPoke: performance.now(),
    zzz: 0,
  })

  const say = (text: string, color = COLORS.warm, dy = HEIGHT + 0.12, opts?: { life?: number; vy?: number }) => {
    const p = a.current.p
    bubbles.current?.emit(text, color, new THREE.Vector3(p.x, p.lift + dy, p.z), opts)
  }
  const setMode = (m: AvatarMode) => {
    a.current.mode = m
    if (useRoom.getState().avatarMode !== m) useRoom.getState().set({ avatarMode: m })
  }
  const tweenTo = (to: Pose, dur: number, arc: number, done?: () => void) => {
    a.current.tween = { from: { ...a.current.p }, to, t: 0, dur, arc, done }
  }
  const lieDown = () => tweenTo(lie, 0.7, 0.25, () => setMode('sleep'))
  const getUp = (then?: () => void) => {
    setMode('walk') // busy until he is on his feet
    tweenTo(stand(SPOTS.bedside), 0.7, 0.25, () => (setMode('idle'), (a.current.wander = 2), then?.()))
  }
  const goTo = (spot: Spot, then?: () => void) => {
    if (a.current.mode === 'sleep') return getUp(() => goTo(spot, then))
    a.current.target = { spot, then }
    a.current.stay = 0
    setMode('walk')
  }
  /** After arriving somewhere with nothing else to do. */
  const settle = () => {
    const s = useRoom.getState()
    setMode(s.isRaining ? 'watch' : 'idle')
    if (s.isRaining && a.current.p.x !== SPOTS.window.x) goTo(SPOTS.window, () => setMode('watch'))
    a.current.wander = 4 + Math.random() * 5
  }

  // first frame: asleep if the door said so (branch 1 picks doorMood), else standing mid-room
  useEffect(() => {
    if (useRoom.getState().doorMood === 'sleeping') {
      a.current.p = { ...lie }
      setMode('sleep')
    } else setMode('idle')
  }, [lie])

  // the visitor counts as "around" while they click
  useEffect(() => {
    const poke = () => {
      a.current.lastPoke = performance.now()
      if (a.current.mode === 'doze') (say('嗯？', COLORS.blue), setMode('idle'), (a.current.wander = 1.5))
    }
    window.addEventListener('pointerdown', poke)
    return () => window.removeEventListener('pointerdown', poke)
  }, [])

  // reactions to the rest of the room
  useEffect(
    () =>
      useRoom.subscribe((s, prev) => {
        const m = a.current.mode
        if (s.alarmRangAt !== prev.alarmRangAt && s.alarmRangAt > 0) {
          if (m === 'sleep') (getUp(), setTimeout(() => say('醒了…', COLORS.red), 700))
          else (say('困…', COLORS.blue), goTo(SPOTS.bedside, lieDown))
        }
        if (s.isRaining !== prev.isRaining) {
          if (s.isRaining) {
            if (m === 'sleep') bubbles.current?.emit('…下雨了？', COLORS.blue, new THREE.Vector3(BED.x, BED.mattress + 0.45, BED.z - 0.6))
            else goTo(SPOTS.window, () => setMode('watch'))
          } else if (m === 'watch') settle()
        }
        if (s.musicOn && !prev.musicOn) {
          if (m === 'sleep') (getUp(), say('!', COLORS.red, 0.6))
          else if (m === 'doze') (setMode('idle'), say('!', COLORS.red))
        }
      }),
    [],
  )

  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    a.current.lastPoke = performance.now()
    const p = a.current.p
    const m = a.current.mode
    setFocus({ id: 'avatar', position: [p.x, p.lift + (m === 'sleep' ? 0 : HEIGHT * 0.55), p.z], distance: 2.4 })
    if (m === 'sleep') return say('Zzz…', COLORS.blue, 0.35)
    if (m === 'doze') return (setMode('idle'), say('嗯？没睡！', COLORS.blue))
    a.current.hop = 0.35
    say(LINES[Math.floor(Math.random() * LINES.length)], COLORS.warm, HEIGHT + 0.12, { life: 2.6, vy: 0.15 })
  }

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime
    const s = a.current
    const room = useRoom.getState()
    const night = nightness(room.timeOfDay) > 0.5

    // --- movement
    if (s.tween) {
      const w = s.tween
      w.t = Math.min(1, w.t + dt / w.dur)
      const k = w.t * w.t * (3 - 2 * w.t)
      s.p = {
        x: THREE.MathUtils.lerp(w.from.x, w.to.x, k),
        z: THREE.MathUtils.lerp(w.from.z, w.to.z, k),
        yaw: lerpAngle(w.from.yaw, w.to.yaw, k),
        tilt: THREE.MathUtils.lerp(w.from.tilt, w.to.tilt, k),
        lift: THREE.MathUtils.lerp(w.from.lift, w.to.lift, k) + Math.sin(Math.PI * w.t) * w.arc,
      }
      if (w.t >= 1) {
        s.tween = null
        w.done?.()
      }
    } else if (s.mode === 'walk' && s.target) {
      const { spot } = s.target
      const dx = spot.x - s.p.x
      const dz = spot.z - s.p.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.02) {
        s.p.x = spot.x
        s.p.z = spot.z
        const then = s.target.then
        s.target = null
        if (then) then()
        else settle()
      } else {
        const step = Math.min(dist, dt * SPEED)
        s.p.x += (dx / dist) * step
        s.p.z += (dz / dist) * step
        s.p.yaw = lerpAngle(s.p.yaw, Math.atan2(dx, dz), Math.min(1, dt * 10))
        s.phase += dt * 9
      }
    } else if (s.mode !== 'sleep') {
      // turn to face the spot's direction once arrived
      const here = Object.values(SPOTS).find((sp) => Math.hypot(sp.x - s.p.x, sp.z - s.p.z) < 0.03)
      if (here) s.p.yaw = lerpAngle(s.p.yaw, here.yaw, Math.min(1, dt * 6))
    }

    // --- decisions
    if (s.mode === 'idle' && !s.tween) {
      s.wander -= dt
      if (room.isRaining) goTo(SPOTS.window, () => setMode('watch'))
      else if (!night && performance.now() - s.lastPoke > DOZE_AFTER * 1000 && !room.musicOn) setMode('doze')
      else if (s.wander <= 0) {
        if (night && Math.random() < 0.65) goTo(SPOTS.desk, () => (setMode('desk'), (s.stay = 14 + Math.random() * 12)))
        else {
          const options = WANDER.map((k) => SPOTS[k]).filter((sp) => Math.hypot(sp.x - s.p.x, sp.z - s.p.z) > 0.1)
          goTo(options[Math.floor(Math.random() * options.length)])
        }
      }
    } else if (s.mode === 'desk') {
      s.stay -= dt
      if (room.isRaining) goTo(SPOTS.window, () => setMode('watch'))
      else if (s.stay <= 0 && !room.musicOn) (setMode('idle'), (s.wander = 0.5))
    }

    // --- body language (all on the inner group, blended so switches take ~0.3 s)
    const g = bob.current!
    const walking = s.mode === 'walk' && !s.tween
    const bobbing = room.musicOn && s.mode !== 'sleep' && s.mode !== 'doze'
    let rx = 0
    let rz = Math.sin(t * 1.5) * 0.015 // breathing sway
    let y = 0
    if (walking) {
      rz = Math.sin(s.phase) * 0.06
      y = Math.abs(Math.sin(s.phase)) * 0.03
    }
    if (bobbing) {
      rz = Math.sin(t * 7.5) * 0.09
      rx = Math.abs(Math.sin(t * 7.5)) * 0.06
      if (!walking) y = Math.abs(Math.sin(t * 7.5)) * 0.012
    } else if (s.mode === 'watch') {
      rx = -0.06
      rz = Math.sin(t * 0.8) * 0.03
    } else if (s.mode === 'desk') {
      rx = 0.1 + Math.sin(t * 1.3) * 0.025 // leaning over the books
      rz = Math.sin(t * 0.5) * 0.02
    } else if (s.mode === 'doze') {
      const nod = Math.max(0, Math.sin(t * 0.9)) ** 3
      rx = 0.05 + nod * 0.16
      rz = Math.sin(t * 0.45) * 0.03
    } else if (s.mode === 'sleep') {
      rz = 0
      y = Math.sin(t * 1.6) * 0.004 // breathing
    }
    if (s.hop > 0) {
      s.hop -= dt
      y += Math.sin((1 - s.hop / 0.35) * Math.PI) * 0.08
    }
    g.rotation.x = damp(g.rotation.x, rx, 12, dt)
    g.rotation.z = damp(g.rotation.z, rz, 12, dt)
    g.position.y = damp(g.position.y, y, 20, dt)

    root.current!.position.set(s.p.x, 0, s.p.z)
    root.current!.rotation.y = s.p.yaw
    pose.current!.position.y = s.p.lift
    pose.current!.rotation.x = s.p.tilt

    // Zs while asleep / dozing
    const asleep = s.mode === 'sleep' && !s.tween
    if (asleep || s.mode === 'doze') {
      s.zzz -= dt
      if (s.zzz <= 0) {
        s.zzz = asleep ? 1.1 : 1.6
        const at = asleep ? new THREE.Vector3(BED.x + 0.05, BED.mattress + 0.3, BED.z - 0.7) : new THREE.Vector3(s.p.x + 0.08, HEIGHT + 0.05, s.p.z)
        bubbles.current?.emit('Z', COLORS.blue, at, { vy: 0.16, life: 2.6 })
      }
    }
  })

  return (
    <group>
      <group
        ref={root}
        onClick={click}
        onPointerOver={(e) => (e.stopPropagation(), (document.body.style.cursor = 'pointer'))}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <group ref={pose}>
          <group ref={bob}>
            <primitive object={holder} />
          </group>
        </group>
      </group>
      <Bubbles ref={bubbles} />
    </group>
  )
}
