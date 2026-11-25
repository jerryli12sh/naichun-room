import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../../state/store'
import { palette } from '../../content/palette'
import { crocDisgust, tomatoYeetLines } from '../../content/stickers'
import { tomatoSvg } from './stickerArt'
import { BACK_Z, WINDOWS, PANEL } from '../../content/layout'
import { awardSticker, BED_RECT, BED_TOP, crocWorldPos, useCroc } from './crocState'

const BACK_WALL_Z = BACK_Z + 0.005 // just in front of the back wall
const svgUrl = (inner: string, vb = '-30 -30 60 60') =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="256" height="256">${inner}</svg>`)}`

function useSvgTexture(url: string) {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(url)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [url])
}

/** Bits of back wall that are not window or photo board: between the yellow panel and the window, above the window, right of it. */
const W = WINDOWS.wide
const WALL_SPOTS: (() => [number, number])[] = [
  () => [PANEL.x1 + 0.12 + Math.random() * (W.cx - W.w / 2 - PANEL.x1 - 0.24), 1.2 + Math.random() * 0.9],
  () => [W.cx - W.w / 2 + Math.random() * W.w, W.y0 + W.h + 0.2],
  () => [W.cx + W.w / 2 + 0.15 + Math.random() * 0.2, 1.2 + Math.random() * 0.9],
]
const randomWallSpot = (): [number, number, number] => [...WALL_SPOTS[Math.floor(Math.random() * WALL_SPOTS.length)](), BACK_WALL_Z]

/**
 * 番茄禁区: a tomato sticker stuck on the wall. A click flicks it spinning out of the room;
 * it sneaks back somewhere else later. Three flicks unlock the "番茄退散" sticker.
 */
export function WallTomato() {
  const tex = useSvgTexture(svgUrl(tomatoSvg(0, 0, 1)))
  const ref = useRef<THREE.Mesh>(null)
  const [home, setHome] = useState<[number, number, number]>([(PANEL.x1 + W.cx - W.w / 2) / 2, 1.75, BACK_WALL_Z])
  const [say, setSay] = useState<string | null>(null)
  const flying = useRef<number | null>(null)

  useFrame(() => {
    const m = ref.current
    if (!m) return
    if (flying.current === null) {
      m.position.set(...home)
      m.rotation.z = -0.25
      m.scale.setScalar(1)
      m.visible = true
      return
    }
    const t = (performance.now() - flying.current) / 1000
    // up and out over the open front of the room, spinning
    m.position.set(home[0] + t * 3.2, home[1] + t * 2.2 - t * t * 0.8, home[2] + t * 4)
    m.rotation.z = -0.25 - t * 18
    m.scale.setScalar(Math.max(0.2, 1 - t * 0.6))
    m.visible = t < 1.4
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (flying.current !== null) return
    const n = useRoom.getState().tomatoYeets
    setSay(tomatoYeetLines[n % tomatoYeetLines.length])
    setTimeout(() => setSay(null), 1000)
    flying.current = performance.now()
    useRoom.getState().set({ tomatoYeets: n + 1 })
    if (n + 1 === 3) setTimeout(() => awardSticker('yeet'), 700)
    setTimeout(() => {
      flying.current = null
      setHome(randomWallSpot())
    }, 9000)
  }

  return (
    <>
      <mesh
        ref={ref}
        onClick={click}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <circleGeometry args={[0.11, 32]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.05} roughness={0.7} />
      </mesh>
      {say && (
        <Html position={[home[0], home[1] + 0.18, home[2] + 0.05]} center zIndexRange={[30, 0]}>
          <div className="croc-bubble">{say}</div>
        </Html>
      )}
    </>
  )
}

const R = 0.06
const ENTRY: [number, number, number] = [1.6, R, 1.6]
const REST: [number, number, number] = [0.7, R, 0.9]
const DRAG_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.75)

/**
 * A little tomato that rolls into the room once in a while. Drag it next to the croc and the croc runs away.
 */
export function RoamingTomato() {
  const entered = useRoom((s) => s.entered)
  const g = useRef<THREE.Group>(null)
  const [visible, setVisible] = useState(false)
  const [hello, setHello] = useState(false)
  const state = useRef({ mode: 'hidden' as 'hidden' | 'rolling' | 'idle' | 'drag' | 'fall', t0: 0, target: new THREE.Vector3(...REST), lastFlee: 0, awarded: false })
  const hit = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!entered) return
    const id = setTimeout(() => {
      setVisible(true)
      state.current.mode = 'rolling'
      state.current.t0 = performance.now()
    }, 6000)
    return () => clearTimeout(id)
  }, [entered])

  useFrame((_, dt) => {
    const o = g.current
    const s = state.current
    if (!o) return
    const now = performance.now()
    if (s.mode === 'rolling') {
      const k = Math.min(1, (now - s.t0) / 1400)
      const e = 1 - (1 - k) ** 3
      o.position.set(THREE.MathUtils.lerp(ENTRY[0], REST[0], e), R, THREE.MathUtils.lerp(ENTRY[2], REST[2], e))
      o.rotation.x = -e * 14
      if (k === 1) {
        s.mode = 'idle'
        o.rotation.x = 0
        setHello(true)
        setTimeout(() => setHello(false), 1300)
      }
    } else if (s.mode === 'drag') {
      o.position.lerp(s.target, 0.5)
      o.rotation.z = Math.sin(now / 90) * 0.15
      const [cx, , cz] = crocWorldPos(useCroc.getState().spot)
      if (Math.hypot(o.position.x - cx, o.position.z - cz) < 0.28 && now - s.lastFlee > 900) {
        s.lastFlee = now
        useCroc.getState().flee(crocDisgust[Math.floor(Math.random() * crocDisgust.length)])
        if (!s.awarded && !useRoom.getState().stickersFound.includes('notomato')) {
          s.awarded = true // several flees can happen before the delayed award lands
          setTimeout(() => awardSticker('notomato'), 900)
        }
      }
    } else if (s.mode === 'fall') {
      o.position.x = s.target.x
      o.position.z = s.target.z
      o.position.y = Math.max(s.target.y, o.position.y - dt * 4)
      if (o.position.y === s.target.y) s.mode = 'idle'
    } else if (s.mode === 'idle') {
      o.rotation.z = Math.sin(now / 300) * 0.12 // little wobble
    }
  })

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    state.current.mode = 'drag'
    useRoom.getState().set({ dragging: true })
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (state.current.mode !== 'drag' || !e.ray.intersectPlane(DRAG_PLANE, hit)) return
    state.current.target.set(THREE.MathUtils.clamp(hit.x, -1.4, 1.4), 0.75, THREE.MathUtils.clamp(hit.z, -1.7, 1.7))
  }
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (state.current.mode !== 'drag') return
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    const t = state.current.target
    const onBed = t.x > BED_RECT.x0 && t.x < BED_RECT.x1 && t.z > BED_RECT.z0 && t.z < BED_RECT.z1
    t.y = (onBed ? BED_TOP : 0) + R
    state.current.mode = 'fall'
    useRoom.getState().set({ dragging: false })
  }

  if (!visible) return null
  return (
    <group
      ref={g}
      position={ENTRY}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh castShadow scale={[1, 0.88, 1]}>
        <sphereGeometry args={[R, 32, 24]} />
        <meshStandardMaterial color={palette.tomato} roughness={0.35} />
      </mesh>
      {/* leaves + stem */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.018, R * 0.86, Math.sin((i / 5) * Math.PI * 2) * 0.018]} rotation={[0, (-i / 5) * Math.PI * 2, -0.5]}>
          <boxGeometry args={[0.035, 0.005, 0.012]} />
          <meshStandardMaterial color="#4f8a35" />
        </mesh>
      ))}
      <mesh position={[0, R * 0.95, 0]}>
        <cylinderGeometry args={[0.004, 0.005, 0.025, 6]} />
        <meshStandardMaterial color="#3f6e27" />
      </mesh>
      {/* tiny face so it reads as a character */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[R * 0.82, 0.008, s * 0.018]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      {hello && (
        <Html position={[0, 0.16, 0]} center zIndexRange={[30, 0]}>
          <div className="croc-bubble">嗨~</div>
        </Html>
      )}
    </group>
  )
}
