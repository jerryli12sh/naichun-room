import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FONT_HAND } from '../content/fonts'

export type BubblesHandle = { emit: (text: string, color: string, pos: THREE.Vector3, opts?: { life?: number; vy?: number }) => void }

function textTexture(text: string, color: string) {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  const font = `bold 56px ${FONT_HAND}`
  g.font = font
  c.width = Math.ceil(g.measureText(text).width) + 32
  c.height = 84
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = 10
  g.strokeStyle = 'rgba(255,255,255,0.92)'
  g.strokeText(text, c.width / 2, 44)
  g.fillStyle = color
  g.fillText(text, c.width / 2, 44)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return { t, aspect: c.width / c.height }
}

type Item = { sprite: THREE.Sprite; t: number; life: number; vy: number; vx: number; sway: number }

/** Words that float up and fade (困…, Zzz, 笑着过日子！). World-space, so they don't follow the avatar. */
export const Bubbles = forwardRef<BubblesHandle>(function Bubbles(_, ref) {
  const group = useRef<THREE.Group>(null)
  const items = useMemo<Item[]>(() => [], [])
  useImperativeHandle(ref, () => ({
    emit(text, color, pos, opts = {}) {
      const { t, aspect } = textTexture(text, color)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }))
      const h = 0.13
      sprite.scale.set(h * aspect, h, 1)
      sprite.position.copy(pos)
      sprite.renderOrder = 10
      group.current!.add(sprite)
      items.push({ sprite, t: 0, life: opts.life ?? 2.2, vy: opts.vy ?? 0.22, vx: (Math.random() - 0.5) * 0.1, sway: Math.random() * 6 })
    },
  }))
  useEffect(() => () => items.forEach((i) => (i.sprite.material.map?.dispose(), i.sprite.material.dispose())), [items])
  useFrame((_, dt) => {
    for (let k = items.length - 1; k >= 0; k--) {
      const f = items[k]
      f.t += dt
      f.sprite.position.y += f.vy * dt
      f.sprite.position.x += Math.sin(f.t * 3 + f.sway) * 0.002 + f.vx * dt
      f.sprite.material.opacity = Math.min(1, f.t * 4) * Math.max(0, 1 - f.t / f.life)
      if (f.t > f.life) {
        group.current!.remove(f.sprite)
        f.sprite.material.map?.dispose()
        f.sprite.material.dispose()
        items.splice(k, 1)
      }
    }
  })
  return <group ref={group} />
})
