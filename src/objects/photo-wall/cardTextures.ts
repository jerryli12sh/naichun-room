import * as THREE from 'three'
import type { PhotoEntry } from '../../content/photos'
import { photoSign } from '../../content/photos'
import { FONT_HAND as FONT } from '../../content/fonts'

/** Canvas size for one face. Matches the card's 5:6 polaroid ratio. */
export const CW = 500
export const CH = 600
/** Canvas pixels per layout unit; 2 keeps text and photos sharp when a card is held up close. */
const RES = 2
const INK = '#3b3631'
const PAPER_FRONT = '#fbf8f1'
const PAPER_BACK = '#f5ecdc'
const RED = '#d9573f'

const fontReady = new Map<string, Promise<unknown>>()
/** Load only the unicode-range subsets these characters need (the webfont is split into ~100 files). */
function loadFont(text: string) {
  if (!fontReady.has(text)) {
    fontReady.set(text, document.fonts.load(`40px ${FONT}`, text).catch(() => null))
  }
  return fontReady.get(text)!
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

function makeTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Tiny paper grain so the faces don't look like flat UI. */
function grain(ctx: CanvasRenderingContext2D, seed: number) {
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  ctx.save()
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(80,60,30,${0.015 + rnd() * 0.03})`
    ctx.fillRect(rnd() * CW, rnd() * CH, 1 + rnd() * 2, 1 + rnd() * 2)
  }
  ctx.restore()
}

const PH = { x: 30, y: 30, s: 440 } // square photo window on the front

function drawFront(ctx: CanvasRenderingContext2D, e: PhotoEntry, i: number, img: HTMLImageElement | null) {
  ctx.fillStyle = PAPER_FRONT
  ctx.fillRect(0, 0, CW, CH)
  grain(ctx, i + 1)
  if (e.file) {
    ctx.fillStyle = '#d8d2c6'
    ctx.fillRect(PH.x, PH.y, PH.s, PH.s)
    if (img) {
      // cover-crop to a square around the focus point
      const side = Math.min(img.width, img.height)
      const [fx, fy] = e.focus ?? [0.5, 0.5]
      const sx = Math.max(0, Math.min(img.width - side, fx * img.width - side / 2))
      const sy = Math.max(0, Math.min(img.height - side, fy * img.height - side / 2))
      ctx.drawImage(img, sx, sy, side, side, PH.x, PH.y, PH.s, PH.s)
      // slight warm film tone
      ctx.fillStyle = 'rgba(255,214,160,0.08)'
      ctx.fillRect(PH.x, PH.y, PH.s, PH.s)
    }
  } else {
    // empty slot: dashed window with a plus
    ctx.strokeStyle = '#b9ad98'
    ctx.lineWidth = 5
    ctx.setLineDash([18, 14])
    ctx.strokeRect(PH.x + 10, PH.y + 10, PH.s - 20, PH.s - 20)
    ctx.setLineDash([])
    ctx.strokeStyle = '#c9bda8'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    const c = PH.x + PH.s / 2
    ctx.beginPath()
    ctx.moveTo(c - 40, c); ctx.lineTo(c + 40, c)
    ctx.moveTo(c, c - 40); ctx.lineTo(c, c + 40)
    ctx.stroke()
  }
  ctx.fillStyle = INK
  ctx.font = `38px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(e.place, CW / 2, PH.y + PH.s + 62)
}

function drawBack(ctx: CanvasRenderingContext2D, e: PhotoEntry, i: number) {
  ctx.fillStyle = PAPER_BACK
  ctx.fillRect(0, 0, CW, CH)
  grain(ctx, i + 101)
  // faint ruled lines
  ctx.strokeStyle = 'rgba(120,150,190,0.22)'
  ctx.lineWidth = 2
  for (let y = 180; y < 520; y += 58) {
    ctx.beginPath(); ctx.moveTo(40, y + 14); ctx.lineTo(CW - 40, y + 14); ctx.stroke()
  }
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  // place
  ctx.font = `42px ${FONT}`
  ctx.fillStyle = INK
  ctx.fillText(e.place, 44, 110)
  // note
  ctx.font = `36px ${FONT}`
  e.note.split('\n').forEach((line, k) => ctx.fillText(line, 50, 180 + k * 58))
  // sign
  ctx.textAlign = 'right'
  ctx.font = `30px ${FONT}`
  ctx.fillStyle = '#6b625a'
  ctx.fillText(photoSign, CW - 44, 548)
  // little red "笑" stamp
  ctx.save()
  ctx.translate(82, 528)
  ctx.rotate(-0.18)
  ctx.strokeStyle = RED
  ctx.fillStyle = RED
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke()
  ctx.font = `34px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('笑', 0, 2)
  ctx.restore()
}

/** Front and back textures for one card. Draws a placeholder now, the real thing once font + image are in. */
export function createCardTextures(e: PhotoEntry, i: number) {
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = CW * RES
    c.height = CH * RES
    return c
  }
  const fc = mk()
  const bc = mk()
  const front = makeTexture(fc)
  const back = makeTexture(bc)
  const fctx = fc.getContext('2d')!
  const bctx = bc.getContext('2d')!
  fctx.scale(RES, RES)
  bctx.scale(RES, RES)
  drawFront(fctx, e, i, null)
  drawBack(bctx, e, i)

  const text = e.place + e.note + photoSign + '笑'
  const img = e.file ? loadImage(`${import.meta.env.BASE_URL}photos/${e.file}`).catch(() => null) : Promise.resolve(null)
  Promise.all([loadFont(text), img]).then(([, im]) => {
    drawFront(fctx, e, i, im)
    drawBack(bctx, e, i)
    front.needsUpdate = true
    back.needsUpdate = true
  })
  return { front, back }
}
