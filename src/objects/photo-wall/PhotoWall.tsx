import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { photos, type PhotoEntry } from '../../content/photos'
import { palette } from '../../content/palette'
import { useRoom } from '../../state/store'
import { createCardTextures } from './cardTextures'

export const PHOTO_WALL_ID = 'photo-wall'

/** Card size in metres (polaroid, 5:6). */
const W = 0.15
const H = 0.18
const T = 0.003
const COLS = 6
const GAP_X = 0.175
const GAP_Y = 0.235
const HOLD_DIST = 0.55 // metres in front of the camera when taken down

const TAPE = [palette.pgprYellow, palette.croc, palette.tomato, '#8fb3d9', '#e7a6b8']

/** Deterministic jitter so the wall looks hand-pinned but the same on every visit. */
function rand(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

type Layout = { x: number; y: number; rz: number; tape: string; tapeRz: number }

function layout(n: number): Layout[] {
  const rows = Math.ceil(n / COLS)
  return Array.from({ length: n }, (_, i) => {
    const c = i % COLS
    const r = Math.floor(i / COLS)
    return {
      x: (c - (COLS - 1) / 2) * GAP_X + (rand(i, 1) - 0.5) * 0.025,
      y: ((rows - 1) / 2 - r) * GAP_Y + (rand(i, 2) - 0.5) * 0.03,
      rz: (rand(i, 3) - 0.5) * 0.16,
      tape: TAPE[Math.floor(rand(i, 4) * TAPE.length)],
      tapeRz: (rand(i, 5) - 0.5) * 0.5,
    }
  })
}

/**
 * Photo wall (branch 4). Lives in "wall space": x right, y up, z out of the wall.
 * Room.tsx mounts it inside a Focusable on the left wall.
 *
 * Interaction, only while the wall is focused:
 *   click a photo -> it comes off the wall and floats in front of the camera
 *   click it again -> flips to the back (place + note)
 *   click it again, click anywhere else, or leave the wall -> it goes back on the wall
 * Click another photo while one is held and they swap.
 */
export function PhotoWall() {
  const focused = useRoom((s) => s.focus?.id === PHOTO_WALL_ID)
  const [held, setHeld] = useState<number | null>(null)
  const [flipped, setFlipped] = useState(false)
  const slots = useMemo(() => layout(photos.length), [])

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
    <group rotation-y={Math.PI / 2}>
      {/* invisible board: clicks on the bare wall go to the Focusable (and put a held photo back) */}
      <mesh position-z={0.002} visible={false}>
        <planeGeometry args={[COLS * GAP_X + 0.1, Math.ceil(photos.length / COLS) * GAP_Y + 0.1]} />
        <meshBasicMaterial />
      </mesh>
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
    let tz = 0.006 + (hover && interactive && !held ? 0.03 : 0)
    let ts = hover && interactive && !held ? 1.06 : 1
    _home.setFromEuler(_e.set(hover && interactive && !held ? -0.12 : 0, 0, slot.rz))
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
      position={[slot.x, slot.y, 0.006]}
      rotation-z={slot.rz}
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
        {/* washi tape, only while on the wall */}
        {!held && (
          <mesh position={[0, H / 2 - 0.004, T / 2 + 0.0008]} rotation-z={slot.tapeRz}>
            <planeGeometry args={[0.065, 0.022]} />
            <meshStandardMaterial color={slot.tape} transparent opacity={0.78} roughness={0.7} />
          </mesh>
        )}
      </group>
    </group>
  )
}
