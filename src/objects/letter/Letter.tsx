import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { useRoom } from '../../state/store'
import { SURFACES } from '../../content/layout'
import { FONT_HAND } from '../../content/fonts'
import { slab } from '../desk/geometry'
import { useCanvasTexture } from '../desk/canvasTexture'
import { paperRustle, sealPop } from './sounds'

const POS: [number, number, number] = [SURFACES.desk.x + 0.33, SURFACES.desk.y - 0.004, SURFACES.desk.z + 0.2]
const W = 0.2
const D = 0.13
const BODY_T = 0.0042
/** Wax seal profile (radius, height): a slightly domed puddle with a soft rim. */
const WAX = [
  [0, 0.0048],
  [0.009, 0.0046],
  [0.0125, 0.0044],
  [0.0155, 0.0036],
  [0.0178, 0.0022],
  [0.0186, 0.0008],
  [0.018, 0],
]

const flapShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(-W / 2, 0)
  s.lineTo(W / 2, 0)
  s.lineTo(0, D * 0.62)
  s.closePath()
  return s
})()

/** A soft round glow texture for the "this wants to be opened" halo. */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,214,150,0.9)')
    grd.addColorStop(0.5, 'rgba(255,190,110,0.25)')
    grd.addColorStop(1, 'rgba(255,190,110,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

/**
 * The unopened letter on the desk. Click: the seal pops, the flap lifts, the paper slides out,
 * then the reading overlay (LetterOverlay, outside the canvas) takes over.
 */
export function Letter() {
  const phase = useRoom((s) => s.letterPhase)
  const opened = useRoom((s) => s.letterOpened)
  const set = useRoom((s) => s.set)
  const flap = useRef<THREE.Group>(null)
  const seal = useRef<THREE.Group>(null)
  const paper = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const glowTex = useGlowTexture()
  const bodyGeo = useMemo(() => slab(W, D, BODY_T, 0.004, 0.0012), [])
  const waxGeo = useMemo(() => new THREE.LatheGeometry(WAX.map(([x, y]) => new THREE.Vector2(x, y)), 40), [])
  const seamTex = useCanvasTexture(
    512,
    333,
    (c) => {
      // the two side flaps and the bottom flap meeting in the middle, as faint fold lines with a touch of shading
      c.clearRect(0, 0, 512, 333)
      c.fillStyle = 'rgba(120,90,50,0.05)'
      c.beginPath()
      c.moveTo(0, 333)
      c.lineTo(256, 150)
      c.lineTo(512, 333)
      c.closePath()
      c.fill()
      c.strokeStyle = 'rgba(120,90,50,0.28)'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(230, 170)
      c.moveTo(512, 0)
      c.lineTo(282, 170)
      c.moveTo(0, 333)
      c.lineTo(256, 150)
      c.lineTo(512, 333)
      c.stroke()
      c.fillStyle = 'rgba(70,55,35,0.75)'
      c.font = `30px ${FONT_HAND}`
      c.fillText('致 黄总', 330, 300)
    },
    [],
  )
  const sealTex = useCanvasTexture(
    128,
    128,
    (c) => {
      c.fillStyle = '#9c2c27'
      c.beginPath()
      c.arc(64, 64, 64, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = 'rgba(60,10,8,0.55)'
      c.lineWidth = 5
      c.beginPath()
      c.arc(64, 64, 54, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = 'rgba(60,10,8,0.65)'
      c.font = `64px ${FONT_HAND}`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('乃', 64, 68)
    },
    [],
  )
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const activate = () => {
    if (phase === 'opening' || phase === 'reading' || phase === 'ending') return
    const wasSealed = !useRoom.getState().letterOpened
    set({ letterPhase: 'opening', letterOpened: true }) // letterOpened is in PERSISTED
    if (wasSealed) sealPop()
    window.setTimeout(() => paperRustle(0.7), wasSealed ? 250 : 0)
    timer.current = window.setTimeout(() => useRoom.getState().set({ letterPhase: 'reading' }), 1400)
  }

  useFrame(({ clock }, dt) => {
    const k = Math.min(1, dt * 5)
    const isOpen = opened || phase !== 'sealed'
    const lifting = phase === 'opening' || phase === 'reading'
    if (flap.current) flap.current.rotation.x += ((isOpen ? -2.7 : 0) - flap.current.rotation.x) * k
    if (seal.current) {
      const s = isOpen ? 0 : 1
      seal.current.scale.setScalar(seal.current.scale.x + (s - seal.current.scale.x) * k)
    }
    if (paper.current) {
      const y = lifting ? 0.11 : isOpen ? 0.012 : 0.003
      const z = lifting ? -0.02 : isOpen ? -0.03 : 0
      paper.current.position.y += (y - paper.current.position.y) * Math.min(1, dt * 3)
      paper.current.position.z += (z - paper.current.position.z) * Math.min(1, dt * 3)
      paper.current.rotation.x += ((lifting ? -0.9 : -Math.PI / 2) - paper.current.rotation.x) * Math.min(1, dt * 3)
    }
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial
      const target = opened ? 0 : 0.55 + Math.sin(clock.elapsedTime * 2) * 0.25
      m.opacity += (target - m.opacity) * k
    }
  })

  return (
    <>
      <Focusable id="letter" position={POS} distance={0.75} onActivate={activate}>
        <group rotation-y={-0.35}>
          {/* halo under the envelope while it's still sealed */}
          <mesh ref={halo} rotation-x={-Math.PI / 2} position-y={0.0015}>
            <planeGeometry args={[0.42, 0.34]} />
            <meshBasicMaterial map={glowTex} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* envelope body: soft-edged paper slab with the fold seams printed on top */}
          <mesh geometry={bodyGeo} castShadow receiveShadow>
            <meshStandardMaterial color="#f1e2c4" roughness={0.88} />
          </mesh>
          <mesh position-y={BODY_T + 0.0002} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[W - 0.002, D - 0.002]} />
            <meshStandardMaterial map={seamTex} roughness={0.88} transparent />
          </mesh>
          {/* letter paper, tucked inside */}
          <mesh ref={paper} position={[0, 0.003, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[W * 0.9, D * 0.9]} />
            <meshStandardMaterial color="#fffaf0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* flap hinged at the back edge */}
          <group ref={flap} position={[0, BODY_T + 0.0005, -D / 2]}>
            <mesh rotation-x={Math.PI / 2} castShadow>
              <shapeGeometry args={[flapShape]} />
              <meshStandardMaterial color="#ead6b0" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            {/* wax seal near the flap tip */}
            <group ref={seal} position={[0, 0.0004, D * 0.5]}>
              <mesh geometry={waxGeo} castShadow>
                <meshPhysicalMaterial color="#a8322c" roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.3} />
              </mesh>
              <mesh position-y={0.0047} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.0105, 32]} />
                <meshPhysicalMaterial map={sealTex} color="#ffffff" roughness={0.45} clearcoat={0.4} transparent />
              </mesh>
            </group>
          </group>
        </group>
      </Focusable>
      <EndingSparkles />
    </>
  )
}

/** Warm motes drifting around the whole diorama while the ending plays. */
function EndingSparkles() {
  const phase = useRoom((s) => s.letterPhase)
  if (phase !== 'ending') return null
  return <Sparkles count={120} scale={[5, 3.5, 5.5]} position={[0.2, 1.6, 0.2]} size={4} speed={0.25} color="#ffd59a" opacity={0.9} />
}
