import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRoom } from '../state/store'

/** Clock face showing the visitor's real local time, redrawn once a second. */
function useClockFace() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const paint = () => {
      const g = c.getContext('2d')!
      const d = new Date()
      g.fillStyle = '#fffaf0'
      g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill()
      g.strokeStyle = '#333'
      g.lineCap = 'round'
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.lineWidth = 3
        g.beginPath(); g.moveTo(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50); g.lineTo(64 + Math.sin(a) * 56, 64 - Math.cos(a) * 56); g.stroke()
      }
      const hand = (a: number, l: number, w: number, col: string) => {
        g.strokeStyle = col
        g.lineWidth = w
        g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(a) * l, 64 - Math.cos(a) * l); g.stroke()
      }
      const h = (d.getHours() % 12) + d.getMinutes() / 60
      const m = d.getMinutes() + d.getSeconds() / 60
      hand((h / 12) * Math.PI * 2, 30, 6, '#333')
      hand((m / 60) * Math.PI * 2, 44, 4, '#333')
      hand((d.getSeconds() / 60) * Math.PI * 2, 48, 2, '#d33')
      tex.needsUpdate = true
    }
    paint()
    return { tex, paint }
  }, [])
}

/**
 * Pale-blue twin-bell alarm clock (tomato red is reserved for the tomato) on the bedside cabinet (睡神的闹钟). Click rings it: it shakes,
 * beeps, and stamps alarmRangAt in the store so the avatar (branch 3) can go to bed or wake up.
 * Rendered inside a Focusable; the ring is triggered through its onActivate.
 */
export function AlarmClock() {
  const rangAt = useRoom((s) => s.alarmRangAt)
  const { tex, paint } = useClockFace()
  const body = useRef<THREE.Group>(null)
  const acc = useRef(0)
  useFrame((state, dt) => {
    acc.current += dt
    if (acc.current > 1) { paint(); acc.current = 0 }
    const since = (Date.now() - rangAt) / 1000
    const shaking = rangAt > 0 && since < 1.4
    body.current!.rotation.z = shaking ? Math.sin(state.clock.elapsedTime * 60) * 0.15 * (1 - since / 1.4) : 0
    body.current!.position.y = shaking ? Math.abs(Math.sin(state.clock.elapsedTime * 40)) * 0.008 : 0
  })
  return (
    <group ref={body} rotation-y={-0.35}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.05, 32]} />
        <meshStandardMaterial color="#8fb3d1" roughness={0.4} />
      </mesh>
      <mesh position-z={0.026}>
        <circleGeometry args={[0.064, 32]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.05, 0.065, 0]} rotation-z={-s * 0.5}>
            <sphereGeometry args={[0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#c9ccd2" metalness={0.3} roughness={0.3} />
          </mesh>
          <mesh position={[s * 0.045, -0.08, 0]} rotation-z={s * 0.4}>
            <cylinderGeometry args={[0.006, 0.006, 0.04, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
