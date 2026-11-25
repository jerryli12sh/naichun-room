import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../state/store'
import { nightness, ROOM, WINDOWS } from '../content/layout'
import { startRain } from '../audio/audio'

const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()

/**
 * The view outside, painted live on a canvas: sky, the block opposite, trees, moon, rain on the glass.
 * Sits just outside the openings so nothing can be seen from beyond the room.
 */
function useOutsideView() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const trees = Array.from({ length: 40 }, () => [Math.random() * 512, 330 + Math.random() * 120, 40 + Math.random() * 50, Math.random()])
    const wins = Array.from({ length: 24 }, (_, i) => [i % 4, Math.floor(i / 4), Math.random() < 0.6 ? 1 : 0])
    const drops = Array.from({ length: 220 }, () => [Math.random() * 512, Math.random() * 512, 6 + Math.random() * 10])
    const beads = Array.from({ length: 40 }, () => [Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 0.2 + Math.random()])
    const paint = (n: number, rain: number, dt: number) => {
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 0, 512)
      const r = rain * 0.6 * (1 - n * 0.6)
      grad.addColorStop(0, mix(mix('#7fb6e6', '#0b1733', n), '#5d6a7c', r))
      grad.addColorStop(1, mix(mix('#d4e9f5', '#2a4676', n), '#8995a4', r))
      g.fillStyle = grad
      g.fillRect(0, 0, 512, 512)
      if (n > 0.3) {
        g.globalAlpha = (n - 0.3) * (1 - rain)
        g.fillStyle = '#fff'
        for (let i = 0; i < 30; i++) g.fillRect((i * 97) % 512, (i * 53) % 220, 2, 2)
        g.fillStyle = '#fff6d8'
        g.beginPath(); g.arc(360, 110, 34, 0, 7); g.fill()
        g.fillStyle = mix('#0b1733', '#5d6a7c', r)
        g.beginPath(); g.arc(376, 100, 30, 0, 7); g.fill()
        g.globalAlpha = 1
      } else if (rain < 0.5) {
        g.fillStyle = 'rgba(255,248,220,0.9)'
        g.beginPath(); g.arc(400, 90, 30, 0, 7); g.fill()
      }
      g.fillStyle = mix('#e9e4da', '#334058', n)
      g.fillRect(40, 150, 200, 362)
      for (const [x, y, lit] of wins) {
        g.fillStyle = n > 0.5 && lit ? '#ffd98f' : mix('#9fb4c6', '#1d2638', n)
        g.fillRect(58 + x * 46, 170 + y * 52, 30, 26)
      }
      for (const [x, y, rr, k] of trees) {
        g.fillStyle = mix(mix('#3f7a4c', '#5d8f55', k), '#11202e', n)
        g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill()
      }
      if (rain > 0.01) {
        g.strokeStyle = `rgba(220,232,250,${0.55 * rain})`
        g.lineWidth = 1.5
        g.beginPath()
        for (const d of drops) {
          d[1] += d[2] * dt * 60
          d[0] -= dt * 40
          if (d[1] > 512) { d[1] = -20; d[0] = Math.random() * 560 }
          g.moveTo(d[0], d[1]); g.lineTo(d[0] - 4, d[1] + 22)
        }
        g.stroke()
        g.fillStyle = `rgba(235,242,255,${0.6 * rain})`
        for (const d of beads) {
          d[1] += d[3] * dt * 25
          if (d[1] > 520) { d[1] = -10; d[0] = Math.random() * 512 }
          g.beginPath(); g.ellipse(d[0], d[1], d[2], d[2] * 1.4, 0, 0, 7); g.fill()
        }
      }
      tex.needsUpdate = true
    }
    return { tex, paint }
  }, [])
}

/** White frame, transom bar, sill and grey roller blind for one opening. */
function Frame({ w, h }: { w: number; h: number }) {
  const f = 0.05
  const d = ROOM.wall + 0.04
  const white = <meshStandardMaterial color="#fbfbf8" roughness={0.4} />
  return (
    <group>
      <RoundedBox args={[w, f, d]} radius={0.01} position={[0, f / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w, f, d]} radius={0.01} position={[0, h - f / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[f, h, d]} radius={0.01} position={[-w / 2 + f / 2, h / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[f, h, d]} radius={0.01} position={[w / 2 - f / 2, h / 2, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w, 0.035, d - 0.02]} radius={0.008} position={[0, h * 0.38, 0]} castShadow>{white}</RoundedBox>
      <RoundedBox args={[w + 0.1, 0.03, 0.22]} radius={0.01} position={[0, -0.01, 0.07]} castShadow receiveShadow>{white}</RoundedBox>
      <mesh position={[0, h + 0.08, 0.08]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.04, 0.04, w + 0.06, 16]} />
        <meshStandardMaterial color="#cfccc6" roughness={0.95} />
      </mesh>
      <RoundedBox args={[w, 0.2, 0.01]} radius={0.003} position={[0, h - 0.05, 0.1]} castShadow>
        <meshStandardMaterial color="#cfccc6" roughness={0.95} />
      </RoundedBox>
    </group>
  )
}

/**
 * Both back-wall windows. Clicking either one starts or stops the rain (isRaining in the store),
 * with rain sound. The avatar (branch 3) is expected to walk over and watch.
 */
export function Windows() {
  const hour = useRoom((s) => s.timeOfDay)
  const isRaining = useRoom((s) => s.isRaining)
  const set = useRoom((s) => s.set)
  const setFocus = useRoom((s) => s.setFocus)
  const { tex, paint } = useOutsideView()
  const n = useRef(nightness(hour))
  const rain = useRef(0)
  const glass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#bfd9ee', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }),
    [],
  )
  const [hover, setHover] = useState(false)
  // each opening shows the part of the painted view that lines up with it
  const views = useMemo(
    () =>
      Object.values(WINDOWS).map((o) => {
        const u0 = (o.cx - o.w / 2 + ROOM.w / 2) / ROOM.w
        const u1 = (o.cx + o.w / 2 + ROOM.w / 2) / ROOM.w
        const v0 = o.y0 / ROOM.h
        const v1 = (o.y0 + o.h) / ROOM.h
        const geo = new THREE.PlaneGeometry(o.w, o.h)
        const uv = geo.attributes.uv as THREE.BufferAttribute
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0)
        return { o, geo }
      }),
    [],
  )

  useEffect(() => {
    if (!isRaining) return
    return startRain()
  }, [isRaining])

  useFrame((_, dt) => {
    n.current += (nightness(hour) - n.current) * Math.min(1, dt * 1.5)
    rain.current += ((isRaining ? 1 : 0) - rain.current) * Math.min(1, dt * 1.5)
    paint(n.current, rain.current, Math.min(dt, 0.05))
    glass.opacity = 0.12 + rain.current * 0.15 + (hover ? 0.06 : 0)
  })

  const outsideZ = -ROOM.d / 2 - ROOM.wall + 0.004
  const frameZ = -ROOM.d / 2 - ROOM.wall / 2
  const toggle = () => {
    set({ isRaining: !isRaining })
    const o = WINDOWS.wide
    setFocus({ id: 'window', position: [o.cx - 0.3, o.y0 + o.h / 2, -1.2], distance: 2 })
  }

  return (
    <group
      onClick={(e) => (e.stopPropagation(), toggle())}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
      onPointerOut={() => (setHover(false), (document.body.style.cursor = 'auto'))}
    >
      {views.map(({ o, geo }) => {
        return (
          <group key={o.cx}>
            <mesh geometry={geo} position={[o.cx, o.y0 + o.h / 2, outsideZ]}>
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
            <mesh position={[o.cx, o.y0 + o.h / 2, frameZ]} material={glass}>
              <planeGeometry args={[o.w - 0.06, o.h - 0.06]} />
            </mesh>
            <group position={[o.cx, o.y0, frameZ]}>
              <Frame w={o.w} h={o.h} />
            </group>
          </group>
        )
      })}
    </group>
  )
}
