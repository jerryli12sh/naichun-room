import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { photos, type PhotoEntry } from '../../content/photos'
import { palette } from '../../content/palette'
import { useRoom } from '../../state/store'
import { createCardTextures } from './cardTextures'
import { RoundedBox } from '@react-three/drei'
import { nightness, PHOTO_WALL } from '../../content/layout'

export const PHOTO_WALL_ID = 'photo-wall'

/** Card size in metres before fitting to the board (polaroid, 5:6). */
const W = 0.15
const H = 0.18
const T = 0.003
const COLS = 6
const BOARD_T = 0.018 // board thickness; cards sit on its front face
const HOLD_DIST = 0.55 // metres in front of the camera when taken down

const PINS = [palette.tomato, palette.croc, '#8fb3d9', '#f2f2f2', palette.pgprYellow]

/** Deterministic jitter so the wall looks hand-pinned but the same on every visit. */
function rand(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

type Layout = { x: number; y: number; z: number; rz: number; s: number; pin: string }

/**
 * Hand-pinned scatter: start from staggered rows, jitter each card, tilt it (some a lot, most a little),
 * vary the size a touch, then push apart cards that overlap too much and keep them on the board.
 * Cards may overlap a little; each gets its own depth so the overlaps stack cleanly.
 */
function layout(n: number, bw: number, bh: number): Layout[] {
  const rows = Math.ceil(n / COLS)
  const gx = (bw - 0.1) / COLS
  const gy = (bh - 0.12) / rows
  const base = Math.min((gx * 0.95) / W, (gy * 0.95) / H)
  const cards = Array.from({ length: n }, (_, i) => {
    const c = i % COLS
    const r = Math.floor(i / COLS)
    const stagger = (r % 2 ? 0.28 : -0.22) * gx
    // tilt: mostly gentle, every few cards a bolder lean, alternating direction
    const bold = rand(i, 6) < 0.3
    const sign = rand(i, 7) < 0.5 ? -1 : 1
    const rz = sign * (bold ? 0.14 + rand(i, 3) * 0.1 : 0.04 + rand(i, 3) * 0.08)
    return {
      x: (c - (COLS - 1) / 2) * gx + stagger + (rand(i, 1) - 0.5) * gx * 0.45,
      y: ((rows - 1) / 2 - r) * gy - 0.02 + (rand(i, 2) - 0.5) * gy * 0.38,
      z: 0,
      rz,
      s: base * (0.92 + rand(i, 5) * 0.14),
      pin: PINS[Math.floor(rand(i, 4) * PINS.length)],
    }
  })
  // relax: keep centres at least ~80% of a card apart, and inside the frame
  const mx = 0.04
  const my = 0.05
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = cards[i]
        const b = cards[j]
        const minX = ((a.s + b.s) / 2) * W * 0.82
        const minY = ((a.s + b.s) / 2) * H * 0.8
        const dx = b.x - a.x
        const dy = b.y - a.y
        const ox = minX - Math.abs(dx)
        const oy = minY - Math.abs(dy)
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const m = (ox / 2) * Math.sign(dx || 1)
            a.x -= m
            b.x += m
          } else {
            const m = (oy / 2) * Math.sign(dy || 1)
            a.y -= m
            b.y += m
          }
        }
      }
    }
    for (const c of cards) {
      const hw = (W * c.s) / 2
      const hh = (H * c.s) / 2
      c.x = Math.max(-bw / 2 + mx + hw, Math.min(bw / 2 - mx - hw, c.x))
      c.y = Math.max(-bh / 2 + my + hh, Math.min(bh / 2 - my - 0.03 - hh, c.y))
    }
  }
  // stacking order: a fixed shuffle, ~1 mm per layer
  const order = cards.map((_, i) => i).sort((p, q) => rand(p, 8) - rand(q, 8))
  order.forEach((ci, k) => (cards[ci].z = k * 0.0012))
  return cards
}

/**
 * Photo wall (branch 4): a framed pinboard with fairy lights and 18 pinned polaroids.
 * Lives in "wall space": x right, y up, z out of the wall. Board size and which wall come from
 * PHOTO_WALL in content/layout.ts; Room.tsx mounts it inside a Focusable at that point.
 *
 * Interaction, only while the wall is focused:
 *   click a photo -> it comes off the board and floats in front of the camera
 *   click it again -> flips to the back (place + note)
 *   click it again, click anywhere else, or leave the wall -> it goes back on the board
 * Click another photo while one is held and they swap.
 */
export function PhotoWall() {
  const focused = useRoom((s) => s.focus?.id === PHOTO_WALL_ID)
  const [held, setHeld] = useState<number | null>(null)
  const [flipped, setFlipped] = useState(false)
  const { w: bw, h: bh, wall } = PHOTO_WALL
  const slots = useMemo(() => layout(photos.length, bw, bh), [bw, bh])

  useEffect(() => {
    if (!focused) setHeld(null)
  }, [focused])

  // dev-only hook for screenshots: __photoWall.take(3), __photoWall.flip()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__photoWall = {
      take: (i: number) => (setHeld(i), setFlipped(false)),
      flip: () => setFlipped((f) => !f),
      putBack: () => setHeld(null),
    }
  }, [])

  const onCard = (i: number) => {
    if (held === i) {
      if (!flipped) setFlipped(true)
      else setHeld(null)
    } else {
      setHeld(i)
      setFlipped(false)
    }
  }

  return (
    <group rotation-y={wall === 'left' ? Math.PI / 2 : 0}>
      <Board w={bw} h={bh} />
      <FairyLights w={bw} h={bh} />
      {slots.map((sl, i) => (
        <PinShadow key={i} slot={sl} hidden={held === i} />
      ))}
      <group position-z={BOARD_T}>
        {photos.map((p, i) => (
          <Card
            key={i}
            entry={p}
            index={i}
            slot={slots[i]}
            interactive={focused}
            held={held === i}
            flipped={held === i && flipped}
            onClick={() => onCard(i)}
            onMiss={() => setHeld((h) => (h === i ? null : h))}
          />
        ))}
      </group>
    </group>
  )
}

/** Linen pinboard in a thin wooden frame. Clicks on it go to the Focusable (and put a held photo back). */
function Board({ w, h }: { w: number; h: number }) {
  const f = 0.022 // frame width
  return (
    <group>
      <RoundedBox args={[w, h, BOARD_T]} radius={0.006} smoothness={2} position-z={BOARD_T / 2} receiveShadow castShadow>
        <meshStandardMaterial color="#f3ead8" roughness={0.95} />
      </RoundedBox>
      {[
        [0, h / 2 - f / 2, w, f],
        [0, -h / 2 + f / 2, w, f],
        [-w / 2 + f / 2, 0, f, h - 2 * f],
        [w / 2 - f / 2, 0, f, h - 2 * f],
      ].map(([x, y, fw, fh], i) => (
        <RoundedBox key={i} args={[fw, fh, BOARD_T + 0.008]} radius={0.004} smoothness={2} position={[x, y, (BOARD_T + 0.008) / 2]} castShadow>
          <meshStandardMaterial color={palette.wood} roughness={0.6} />
        </RoundedBox>
      ))}
    </group>
  )
}

/** A sagging string of warm bulbs along the top of the board; brighter at night. */
function FairyLights({ w, h }: { w: number; h: number }) {
  const hour = useRoom((s) => s.timeOfDay)
  const night = nightness(hour)
  const { tube, bulbs } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const y0 = h / 2 - 0.03
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const x = (t - 0.5) * (w - 0.04)
      // two swags between three hooks
      const sag = Math.sin(t * Math.PI * 2) ** 2 * 0.05
      pts.push(new THREE.Vector3(x, y0 - sag, BOARD_T + 0.012))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const bulbs = Array.from({ length: 13 }, (_, i) => curve.getPointAt((i + 0.5) / 13))
    return { tube: new THREE.TubeGeometry(curve, 80, 0.0018, 5, false), bulbs }
  }, [w, h])
  const glow = 0.6 + night * 2.4
  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial color="#5c5348" roughness={0.6} />
      </mesh>
      {bulbs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.008, p.z]}>
          <sphereGeometry args={[0.0075, 12, 8]} />
          <meshStandardMaterial color="#fff4d6" emissive="#ffc46b" emissiveIntensity={glow * (i % 2 ? 1 : 0.8)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Soft drop shadow under a pinned card, so it reads as paper on a board rather than a floating sticker. */
const shadowTex = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 10, 32, 32, 32)
  grd.addColorStop(0, 'rgba(0,0,0,0.55)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()

function PinShadow({ slot, hidden }: { slot: Layout; hidden: boolean }) {
  return (
    <mesh position={[slot.x + 0.006, slot.y - 0.01, BOARD_T + slot.z + 0.0004]} rotation-z={slot.rz} visible={!hidden}>
      <planeGeometry args={[W * slot.s * 1.25, H * slot.s * 1.2]} />
      <meshBasicMaterial map={shadowTex} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  )
}

type CardProps = {
  entry: PhotoEntry
  index: number
  slot: Layout
  interactive: boolean
  held: boolean
  flipped: boolean
  onClick: () => void
  onMiss: () => void
}

const _wp = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _pq = new THREE.Quaternion()
const _wq = new THREE.Quaternion()
const _home = new THREE.Quaternion()
const _e = new THREE.Euler()

function Card({ entry, index, slot, interactive, held, flipped, onClick, onMiss }: CardProps) {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const frontMat = useRef<THREE.MeshStandardMaterial>(null)
  const backMat = useRef<THREE.MeshStandardMaterial>(null)
  const [hover, setHover] = useState(false)
  const { front, back } = useMemo(() => createCardTextures(entry, index), [entry, index])
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const anim = useRef({ flip: 0, glow: 0, t: 0 })

  useEffect(() => () => (front.dispose(), back.dispose()), [front, back])

  useFrame((state, dt) => {
    const g = outer.current
    const ig = inner.current
    if (!g || !ig || !g.parent) return
    const k = 1 - Math.exp(-dt * 9)
    const a = anim.current
    a.t += dt

    let tx = slot.x
    let ty = slot.y
    const lift = hover && interactive && !held
    let tz = T / 2 + slot.z + (lift ? 0.03 : 0)
    let ts = slot.s * (lift ? 1.06 : 1)
    _home.setFromEuler(_e.set(lift ? -0.08 : 0, 0, slot.rz))
    let tq = _home

    if (held) {
      // a point HOLD_DIST in front of the camera, facing it, converted into wall space
      camera.getWorldDirection(_dir)
      _wp.copy(camera.position).addScaledVector(_dir, HOLD_DIST)
      g.parent.updateWorldMatrix(true, false)
      g.parent.worldToLocal(_wp)
      tx = _wp.x
      ty = _wp.y
      tz = _wp.z
      g.parent.getWorldQuaternion(_pq)
      _wq.copy(_pq).invert().multiply(camera.quaternion)
      // gentle sway while held
      _wq.multiply(_home.setFromEuler(_e.set(Math.sin(a.t * 1.3) * 0.03, Math.sin(a.t * 0.9) * 0.04, 0)))
      tq = _wq
      const visH = 2 * HOLD_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const visW = visH * (size.width / size.height)
      ts = Math.min((0.66 * visH) / H, (0.84 * visW) / W)
    }

    g.position.x += (tx - g.position.x) * k
    g.position.y += (ty - g.position.y) * k
    g.position.z += (tz - g.position.z) * k
    g.quaternion.slerp(tq, k)
    const s = g.scale.x + (ts - g.scale.x) * k
    g.scale.setScalar(s)

    // flip on the inner group so it always turns the same way, with a little hop
    a.flip += ((flipped ? Math.PI : 0) - a.flip) * (1 - Math.exp(-dt * 7))
    ig.rotation.y = a.flip
    ig.position.z = Math.sin(a.flip) * 0.03

    // lift the held card out of the room's lighting so it stays readable at night
    a.glow += ((held ? 0.6 : 0) - a.glow) * k
    if (frontMat.current) frontMat.current.emissiveIntensity = a.glow
    if (backMat.current) backMat.current.emissiveIntensity = a.glow
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return // let it bubble to the wall's Focusable
    e.stopPropagation()
    onClick()
  }

  return (
    <group
      ref={outer}
      position={[slot.x, slot.y, T / 2 + slot.z]}
      rotation-z={slot.rz}
      scale={slot.s}
      onClick={click}
      onPointerMissed={held ? onMiss : undefined}
      onPointerOver={(e) => {
        if (!interactive) return
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => setHover(false)}
    >
      <group ref={inner}>
        {/* front */}
        <mesh position-z={T / 2 + 0.0002} castShadow>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial ref={frontMat} map={front} emissiveMap={front} emissive="#ffffff" emissiveIntensity={0} roughness={0.85} />
        </mesh>
        {/* back */}
        <mesh position-z={-T / 2 - 0.0002} rotation-y={Math.PI}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial ref={backMat} map={back} emissiveMap={back} emissive="#ffffff" emissiveIntensity={0} roughness={0.9} />
        </mesh>
        {/* card edge */}
        <mesh>
          <boxGeometry args={[W, H, T]} />
          <meshStandardMaterial color="#efe9dd" roughness={0.9} />
        </mesh>
        {/* push pin, only while on the board */}
        {!held && (
          <group position={[0, H / 2 - 0.016, T / 2]}>
            <mesh position-z={0.006} castShadow>
              <sphereGeometry args={[0.0085, 16, 12]} />
              <meshStandardMaterial color={slot.pin} roughness={0.35} />
            </mesh>
            <mesh position-z={0.002} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.005, 0.006, 0.004, 16]} />
              <meshStandardMaterial color={slot.pin} roughness={0.35} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}
