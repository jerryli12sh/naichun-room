import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../state/store'
import { startMusic } from '../audio/audio'

const NOTE_COLORS = ['#d2802a', '#5b6f95', '#3f8f35']

function noteTexture(ch: string, color: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.font = 'bold 48px sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = color
  g.fillText(ch, 32, 34)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Little ♪ sprites that drift up from the player while music is on. */
function Notes({ on }: { on: boolean }) {
  const textures = useMemo(() => ['♪', '♫'].flatMap((ch) => NOTE_COLORS.map((c) => noteTexture(ch, c))), [])
  const pool = useMemo(
    () => Array.from({ length: 8 }, () => ({ sprite: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })), t: -1, sway: 0 })),
    [],
  )
  const group = useRef<THREE.Group>(null)
  useEffect(() => {
    pool.forEach((p) => {
      p.sprite.scale.setScalar(0.07)
      p.sprite.visible = false
      group.current!.add(p.sprite)
    })
  }, [pool])
  useFrame((_, dt) => {
    if (on && Math.random() < dt * 2.2) {
      const p = pool.find((q) => q.t < 0)
      if (p) {
        p.t = 0
        p.sway = Math.random() * 6
        p.sprite.material.map = textures[Math.floor(Math.random() * textures.length)]
        p.sprite.material.needsUpdate = true
        p.sprite.position.set(0, 0.08, 0)
        p.sprite.visible = true
      }
    }
    for (const p of pool) {
      if (p.t < 0) continue
      p.t += dt
      p.sprite.position.y += dt * 0.22
      p.sprite.position.x = Math.sin(p.t * 3 + p.sway) * 0.04
      p.sprite.material.opacity = Math.min(1, p.t * 4) * Math.max(0, 1 - p.t / 2)
      if (p.t > 2) { p.t = -1; p.sprite.visible = false }
    }
  })
  return <group ref={group} />
}

/**
 * Small CD player on the bedside cabinet. Click toggles musicOn: a generic ambient loop
 * (no playlist), the disc spins, the LED lights and notes float up.
 * Rendered inside a Focusable, which handles hover, click squash and the camera.
 */
export function CdPlayer() {
  const musicOn = useRoom((s) => s.musicOn)
  const disc = useRef<THREE.Mesh>(null)
  useEffect(() => {
    if (!musicOn) return
    return startMusic()
  }, [musicOn])
  useFrame((_, dt) => {
    if (musicOn) disc.current!.rotation.y += dt * 8
  })
  return (
    <group>
      <RoundedBox args={[0.26, 0.06, 0.2]} radius={0.02} position={[0, 0.03, 0]} castShadow>
        <meshStandardMaterial color="#e7e2d6" roughness={0.45} />
      </RoundedBox>
      <mesh ref={disc} position={[-0.03, 0.064, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.006, 40]} />
        <meshStandardMaterial color="#dfe6f0" metalness={0.3} roughness={0.2} emissive="#334466" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-0.03, 0.068, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.008, 20]} />
        <meshStandardMaterial color="#f2c24b" />
      </mesh>
      <mesh position={[0.1, 0.045, 0.1]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={musicOn ? '#5dff7a' : '#444444'} toneMapped={false} />
      </mesh>
      <Notes on={musicOn} />
    </group>
  )
}
