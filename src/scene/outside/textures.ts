import * as THREE from 'three'

/** Facade tile: 8 bays x 8 floors of a PGP-style block (cream walls, white-framed windows, AC ledges, yellow fins). */
export const FACADE = { bays: 8, floors: 8, bayW: 3.4, floorH: 3.1 }
const PX = 128

let rng = 1234567
const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647)

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

type Win = { x: number; y: number; w: number; h: number; lit: number; tint: string }

export function makeFacade() {
  const W = FACADE.bays * PX
  const H = FACADE.floors * PX
  const [c, g] = canvas(W, H)
  const [e, ge] = canvas(W, H)
  ge.fillStyle = '#000'
  ge.fillRect(0, 0, W, H)
  // wall with soft vertical streaks of weathering
  g.fillStyle = '#efe7d8'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? '120,110,95' : '255,255,250'},${0.02 + rand() * 0.04})`
    g.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 10 + rand() * 60)
  }
  const wins: Win[] = []
  const tints = ['#f3e3c4', '#e9d6d0', '#d8e3d1', '#f1efe9', '#d6dde9', '#f4d9a8']
  for (let f = 0; f < FACADE.floors; f++) {
    const y0 = f * PX
    // slab band
    g.fillStyle = '#e2d8c6'
    g.fillRect(0, y0 + PX - 14, W, 14)
    g.fillStyle = 'rgba(80,70,60,0.18)'
    g.fillRect(0, y0 + PX - 2, W, 2)
    for (let b = 0; b < FACADE.bays; b++) {
      const x0 = b * PX
      const w = { x: x0 + 22, y: y0 + 26, w: 84, h: 66, lit: rand(), tint: tints[Math.floor(rand() * tints.length)] }
      wins.push(w)
      // reveal shadow
      g.fillStyle = '#b9ae9c'
      g.fillRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8)
      // glass: sky reflection, darker toward the bottom
      const gr = g.createLinearGradient(0, w.y, 0, w.y + w.h)
      gr.addColorStop(0, '#a9c0cf')
      gr.addColorStop(1, '#5f7584')
      g.fillStyle = gr
      g.fillRect(w.x, w.y, w.w, w.h)
      // curtains half drawn in some rooms
      if (rand() < 0.65) {
        g.fillStyle = w.tint
        const cw = w.w * (0.25 + rand() * 0.5)
        g.globalAlpha = 0.85
        g.fillRect(rand() < 0.5 ? w.x : w.x + w.w - cw, w.y, cw, w.h)
        g.globalAlpha = 1
      }
      // white frame + mullion
      g.strokeStyle = '#fbfaf6'
      g.lineWidth = 4
      g.strokeRect(w.x, w.y, w.w, w.h)
      g.fillStyle = '#fbfaf6'
      g.fillRect(w.x + w.w * 0.5 - 2, w.y, 4, w.h)
      g.fillRect(w.x, w.y + w.h * 0.36, w.w, 3)
      // AC condenser ledge under every other window
      if ((b + f) % 2 === 0) {
        g.fillStyle = '#d7cfc1'
        g.fillRect(w.x + 6, w.y + w.h + 8, 40, 16)
        g.fillStyle = 'rgba(60,55,50,0.35)'
        for (let k = 0; k < 4; k++) g.fillRect(w.x + 10 + k * 9, w.y + w.h + 11, 5, 10)
      }
    }
  }
  // PGPR yellow fins between some bays
  for (let b = 0; b <= FACADE.bays; b += 4) {
    g.fillStyle = '#d99a3e'
    g.fillRect(b * PX - 5, 0, 10, H)
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.fillRect(b * PX - 5, 0, 3, H)
  }
  const paintLit = (w: Win) => {
    ge.fillStyle = '#000'
    ge.fillRect(w.x, w.y, w.w, w.h)
    if (w.lit < 0.5) {
      const warm = w.lit < 0.38
      const gr = ge.createRadialGradient(w.x + w.w / 2, w.y + w.h * 0.3, 4, w.x + w.w / 2, w.y + w.h / 2, w.w * 0.75)
      gr.addColorStop(0, warm ? '#ffe2a8' : '#dfe8ff')
      gr.addColorStop(1, warm ? '#c27a35' : '#5a6f9a')
      ge.fillStyle = gr
      ge.fillRect(w.x, w.y, w.w, w.h)
      // curtain silhouette dims part of the glow
      ge.fillStyle = 'rgba(0,0,0,0.35)'
      ge.fillRect(w.x + w.w * 0.5 - 2, w.y, 4, w.h)
      ge.fillRect(w.x, w.y + w.h * 0.36, w.w, 3)
    }
  }
  wins.forEach(paintLit)
  const map = new THREE.CanvasTexture(c)
  const emissive = new THREE.CanvasTexture(e)
  for (const t of [map, emissive]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
  }
  /** Someone switches a light on or off somewhere across the way. */
  const flick = () => {
    const w = wins[Math.floor(rand() * wins.length)]
    w.lit = w.lit < 0.5 ? 0.6 + rand() * 0.4 : rand() * 0.5
    paintLit(w)
    emissive.needsUpdate = true
  }
  return { map, emissive, flick }
}

/** Ground: lawn with mottling, footpaths, a road and a car park. World area x -180..180, z -250..50. */
export const GROUND_AREA = { x0: -180, x1: 180, z0: -250, z1: 50 }
export const PATHS: [number, number][][] = [
  [[-90, -12], [-50, -14], [-22, -17], [0, -21], [16, -25], [36, -24], [60, -29], [100, -26]],
  [[-4, -21], [-8, -27], [-12, -26]],
  [[22, -25], [26, -36], [24, -40]],
]
export const ROAD: [number, number][] = [[-180, -70], [-80, -74], [-20, -78], [40, -72], [100, -66], [180, -70]]

export function makeGround() {
  const W = 2048
  const H = Math.round((W * (GROUND_AREA.z1 - GROUND_AREA.z0)) / (GROUND_AREA.x1 - GROUND_AREA.x0))
  const [c, g] = canvas(W, H)
  const sx = W / (GROUND_AREA.x1 - GROUND_AREA.x0)
  const toPx = ([x, z]: [number, number]) => [(x - GROUND_AREA.x0) * sx, (z - GROUND_AREA.z0) * sx] as const
  g.fillStyle = '#7ea063'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 5000; i++) {
    const r = 4 + rand() * 30
    g.fillStyle = rand() < 0.5 ? `rgba(70,110,60,${0.08 + rand() * 0.1})` : `rgba(170,190,110,${0.05 + rand() * 0.08})`
    g.beginPath()
    g.ellipse(rand() * W, rand() * H, r, r * 0.7, rand() * 3, 0, 7)
    g.fill()
  }
  const line = (pts: [number, number][], width: number, color: string) => {
    g.strokeStyle = color
    g.lineWidth = width * sx
    g.lineCap = g.lineJoin = 'round'
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(...toPx(p)) : g.moveTo(...toPx(p))))
    g.stroke()
  }
  line(ROAD, 9, '#6f7275')
  line(ROAD, 0.3, '#e9e4cf')
  for (const p of PATHS) {
    line(p, 3.2, '#cfc4ae')
    line(p, 2.6, '#ddd3be')
  }
  // car park + a basketball court near the blocks
  const rect = (x: number, z: number, w: number, d: number, color: string) => {
    const [px, pz] = toPx([x - w / 2, z - d / 2])
    g.fillStyle = color
    g.fillRect(px, pz, w * sx, d * sx)
  }
  rect(46, -58, 30, 14, '#8c8e8f')
  for (let i = 0; i < 12; i++) rect(33 + i * 2.5, -58, 0.15, 5, '#e8e8e0')
  rect(-34, -22, 15, 28, '#b8644a')
  rect(-34, -22, 13, 26, '#c7765a')
  rect(-34, -22, 13, 0.15, '#f2eee4')
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
