import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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

/** Little ♪ sprites that drift up from the turntable while music is on. */
export function Notes({ on }: { on: boolean }) {
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

