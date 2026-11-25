import * as THREE from 'three'
import { FONT_HAND } from '../../content/fonts'

/** Canvas → texture, painted now and once more when the handwriting font has loaded. */
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const paint = () => {
    const c = canvas.getContext('2d')!
    c.clearRect(0, 0, w, h)
    draw(c)
    tex.needsUpdate = true
  }
  paint()
  document.fonts?.load(`32px 'LXGW WenKai'`, '乃春笑着过日子').then(paint).catch(() => {})
  return tex
}

// deterministic noise so the grooves look the same every visit
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

/** Ratio of the label radius to the record radius (100 mm label on a 12" LP). */
export const LABEL_FRAC = 0.34

/** Top face of the record: fine grooves, track gaps, and a cream/sage label. Mapped onto a cylinder cap. */
export function recordTexture() {
  return canvasTex(1024, 1024, (c) => {
    const R = 512
    const r = rng(7)
    c.fillStyle = '#121212'
    c.fillRect(0, 0, 1024, 1024)
    c.save()
    c.translate(R, R)
    const labelR = R * LABEL_FRAC
    const gaps = [0.93, 0.8, 0.69, 0.58, 0.48].map((f) => labelR + (R - labelR) * f)
    for (let rad = labelR + 6; rad < R - 4; rad += 1.25) {
      const gap = gaps.some((g) => Math.abs(rad - g) < 3)
      const v = gap ? 8 : 20 + Math.floor(r() * 22)
      c.strokeStyle = `rgb(${v},${v},${v + 2})`
      c.lineWidth = 1
      c.beginPath()
      c.arc(0, 0, rad, 0, Math.PI * 2)
      c.stroke()
    }
    // lead-in / run-out bands are glossier
    c.strokeStyle = '#0a0a0a'
    c.lineWidth = 6
    c.beginPath(); c.arc(0, 0, R - 3, 0, Math.PI * 2); c.stroke()
    c.lineWidth = 10
    c.beginPath(); c.arc(0, 0, labelR + 6, 0, Math.PI * 2); c.stroke()

    // label
    c.fillStyle = '#F4EDE1'
    c.beginPath(); c.arc(0, 0, labelR, 0, Math.PI * 2); c.fill()
    c.strokeStyle = '#A7B59E'
    c.lineWidth = 16
    c.beginPath(); c.arc(0, 0, labelR - 12, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = '#7E8E77'
    c.lineWidth = 2
    c.beginPath(); c.arc(0, 0, labelR - 24, 0, Math.PI * 2); c.stroke()
    c.fillStyle = '#4a5a46'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = `bold 46px ${FONT_HAND}`
    c.fillText('乃春', 0, -58)
    c.font = `26px ${FONT_HAND}`
    c.fillText('笑着过日子', 0, 58)
    c.font = `18px ui-sans-serif, system-ui, sans-serif`
    c.fillStyle = '#7E8E77'
    c.fillText('SIDE A', -78, 2)
    c.fillText('33⅓', 78, 2)
    // spindle hole
    c.fillStyle = '#2a2a2a'
    c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill()
    c.restore()
  })
}

/** Platter rim: strobe dots, so the spin reads even from across the room. Repeats around the side. */
export function strobeTexture() {
  const t = canvasTex(256, 32, (c) => {
    c.fillStyle = '#c9ccce'
    c.fillRect(0, 0, 256, 32)
    c.fillStyle = '#8d9296'
    for (let i = 0; i < 8; i++) {
      c.beginPath(); c.arc(16 + i * 32, 11, 5, 0, Math.PI * 2); c.fill()
    }
    c.fillStyle = '#b4b8bb'
    c.fillRect(0, 22, 256, 2)
  })
  t.wrapS = THREE.RepeatWrapping
  t.repeat.set(12, 1)
  return t
}

export type Cover = 'smile' | 'rain' | 'safari'

/** Record sleeve fronts (original art, themed on the memories, not real albums). */
export function coverTexture(kind: Cover) {
  return canvasTex(512, 512, (c) => {
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    if (kind === 'smile') {
      c.fillStyle = '#F4EDE1'
      c.fillRect(0, 0, 512, 512)
      // half sun with rays
      c.fillStyle = '#D99A3E'
      c.beginPath(); c.arc(256, 300, 110, Math.PI, 0); c.fill()
      c.strokeStyle = '#D99A3E'
      c.lineWidth = 10
      c.lineCap = 'round'
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI
        c.beginPath()
        c.moveTo(256 + Math.cos(a) * 135, 300 + Math.sin(a) * 135)
        c.lineTo(256 + Math.cos(a) * 170, 300 + Math.sin(a) * 170)
        c.stroke()
      }
      c.fillStyle = '#A7B59E'
      c.fillRect(0, 300, 512, 212)
      // smile
      c.strokeStyle = '#F4EDE1'
      c.lineWidth = 9
      c.beginPath(); c.arc(256, 248, 46, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke()
      c.fillStyle = '#F4EDE1'
      c.beginPath(); c.arc(226, 236, 8, 0, Math.PI * 2); c.arc(286, 236, 8, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#3f4a3c'
      c.font = `bold 58px ${FONT_HAND}`
      c.fillText('笑着过日子', 256, 384)
      c.font = `26px ${FONT_HAND}`
      c.fillText('乃春 · 第一张', 256, 446)
    } else if (kind === 'rain') {
      const g = c.createLinearGradient(0, 0, 0, 512)
      g.addColorStop(0, '#2c3d63')
      g.addColorStop(1, '#1E2B45')
      c.fillStyle = g
      c.fillRect(0, 0, 512, 512)
      // lit window
      c.fillStyle = '#f3d38a'
      c.fillRect(186, 170, 140, 170)
      c.fillStyle = '#1E2B45'
      c.fillRect(252, 170, 8, 170)
      c.fillRect(186, 250, 140, 8)
      // rain
      const r = rng(3)
      c.strokeStyle = 'rgba(200,220,255,0.55)'
      c.lineWidth = 2
      for (let i = 0; i < 90; i++) {
        const x = r() * 560 - 30
        const y = r() * 512
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 26); c.stroke()
      }
      c.fillStyle = '#e6ecf7'
      c.font = `bold 52px ${FONT_HAND}`
      c.fillText('下雨天', 256, 410)
      c.font = `22px ${FONT_HAND}`
      c.fillText('最适合睡觉和听歌', 256, 458)
    } else {
      c.fillStyle = '#23352b'
      c.fillRect(0, 0, 512, 512)
      // leaves
      const r = rng(11)
      for (let i = 0; i < 26; i++) {
        c.fillStyle = ['#2f4a39', '#3a5a44', '#4d7357'][i % 3]
        c.save()
        c.translate(r() * 512, r() * 300)
        c.rotate(r() * Math.PI)
        c.beginPath(); c.ellipse(0, 0, 70, 22, 0, 0, Math.PI * 2); c.fill()
        c.restore()
      }
      // two glowing eyes
      c.fillStyle = '#d8f07a'
      c.beginPath(); c.ellipse(206, 250, 26, 16, 0, 0, Math.PI * 2); c.ellipse(306, 250, 26, 16, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#1a1a1a'
      c.fillRect(202, 236, 8, 28)
      c.fillRect(302, 236, 8, 28)
      c.fillStyle = '#d8f07a'
      c.font = `bold 50px ${FONT_HAND}`
      c.fillText('夜间动物园', 256, 400)
      c.font = `20px ui-sans-serif, system-ui, sans-serif`
      c.fillText('NIGHT SAFARI', 256, 450)
    }
  })
}
