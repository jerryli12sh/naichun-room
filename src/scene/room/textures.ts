import * as THREE from 'three'

/** Light oak floor planks, drawn once on a canvas (no image assets needed). */
export function makePlankTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')!
  const rows = 8
  const rh = c.height / rows
  for (let r = 0; r < rows; r++) {
    let x = -Math.random() * 200
    while (x < c.width) {
      const len = 180 + Math.random() * 160
      const l = 68 + Math.random() * 8
      g.fillStyle = `hsl(32, 42%, ${l}%)`
      g.fillRect(x, r * rh, len, rh)
      // grain
      g.strokeStyle = 'rgba(120,80,40,0.08)'
      g.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const y = r * rh + Math.random() * rh
        g.beginPath()
        g.moveTo(x, y)
        g.bezierCurveTo(x + len / 3, y + 3, x + (2 * len) / 3, y - 3, x + len, y)
        g.stroke()
      }
      g.fillStyle = 'rgba(90,60,30,0.25)'
      g.fillRect(x, r * rh, 2, rh)
      x += len
    }
    g.fillStyle = 'rgba(90,60,30,0.3)'
    g.fillRect(0, r * rh, c.width, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2.4)
  t.anisotropy = 8
  return t
}

/** Very soft vertical grain for the yellow wood panel behind the bed. */
export function makePanelTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(150,100,40,${0.03 + Math.random() * 0.05})`
    g.lineWidth = 1 + Math.random() * 2
    const x = Math.random() * 256
    g.beginPath()
    g.moveTo(x, 0)
    g.bezierCurveTo(x + 6, 85, x - 6, 170, x + 3, 256)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
