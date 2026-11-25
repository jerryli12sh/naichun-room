import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { useRoom } from '../../state/store'
import { SURFACES } from '../../content/layout'
import { paperRustle, sealPop } from './sounds'

const POS: [number, number, number] = [SURFACES.desk.x + 0.24, SURFACES.desk.y, SURFACES.desk.z + 0.17]
const W = 0.2
const D = 0.13

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
  const seal = useRef<THREE.Mesh>(null)
  const paper = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const glowTex = useGlowTexture()
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
          {/* envelope body */}
          <mesh position-y={0.003} castShadow>
            <boxGeometry args={[W, 0.006, D]} />
            <meshStandardMaterial color="#f3e3c3" roughness={0.85} />
          </mesh>
          {/* letter paper, tucked inside */}
          <mesh ref={paper} position={[0, 0.003, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[W * 0.9, D * 0.9]} />
            <meshStandardMaterial color="#fffaf0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* flap hinged at the back edge */}
          <group ref={flap} position={[0, 0.0062, -D / 2]}>
            <mesh rotation-x={Math.PI / 2} castShadow>
              <shapeGeometry args={[flapShape]} />
              <meshStandardMaterial color="#ead6b0" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            {/* wax seal near the flap tip */}
            <mesh ref={seal} position={[0, 0.003, D * 0.5]}>
              <cylinderGeometry args={[0.017, 0.017, 0.006, 20]} />
              <meshStandardMaterial color="#b8443a" roughness={0.35} />
            </mesh>
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
