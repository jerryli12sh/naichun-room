import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export { FONT_HAND as HAND } from '../../content/fonts'

/** A CanvasTexture that is redrawn whenever deps change (and once more after web fonts load). */
export function useCanvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { canvas, tex }
  }, [w, h])

  useEffect(() => {
    const paint = () => {
      const c = canvas.getContext('2d')!
      c.clearRect(0, 0, w, h)
      draw(c)
      tex.needsUpdate = true
    }
    paint()
    // repaint once the handwriting font has arrived
    document.fonts?.load(`32px 'LXGW WenKai'`, '乃春').then(paint).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => () => tex.dispose(), [tex])
  return tex
}
