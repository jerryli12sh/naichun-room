import * as THREE from 'three'

import { FONT_HAND } from '../content/fonts'

export const FONT = FONT_HAND

/**
 * Canvas texture. With `text: true` it is redrawn once the handwriting webfont has loaded,
 * since the first draw may still use the fallback face.
 */
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, text = false) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (text && document.fonts) {
    document.fonts.load(`700 40px 'LXGW WenKai'`).then(() => {
      g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true
    }).catch(() => {})
  }
  return t
}

export function textSprite(text: string, color = '#fff8e6', glow = 'rgba(255,207,110,0)') {
  const map = canvasTex(256, 256, (g, w, h) => {
    g.font = `700 120px ${FONT}`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.shadowColor = glow; g.shadowBlur = 24
    g.fillStyle = color
    g.fillText(text, w / 2, h / 2 + 6)
  }, true)
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }))
}
