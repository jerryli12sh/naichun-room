import { FONT_HAND } from '../../content/fonts'

/**
 * Placeholder crocodile sticker art, drawn as SVG in a crayon-ish hand-drawn style.
 * Each sticker in content/stickers.ts either points at a real image or describes one of these.
 * Swap a sticker to `image` once the real sticker pack is in public/stickers/.
 */
export type Eyes = 'normal' | 'closed' | 'happy' | 'wide' | 'spiral' | 'disgust'
export type Mouth = 'smile' | 'big' | 'flat' | 'o' | 'wavy' | 'sing'
export type Prop =
  | 'nightcap'
  | 'moon'
  | 'rain'
  | 'mic'
  | 'laptop'
  | 'shades'
  | 'party'
  | 'okhand'
  | 'notomato'
  | 'yeet'

export type CrocArt = {
  eyes?: Eyes
  mouth?: Mouth
  blush?: boolean
  props?: Prop[]
  text?: string
  textColor?: string
  fontSize?: number
  bg?: string
}

const G = '#a9d07c'
const L = '#5b8a3a'
const INK = '#3d3a33'
const RED = '#c0392b'

export function tomatoSvg(x: number, y: number, s: number) {
  return `<g transform="translate(${x},${y}) scale(${s})">
 <circle cx="0" cy="4" r="22" fill="#e8553f" stroke="#a8321f" stroke-width="3"/>
 <path d="M-10 -14 L0 -8 L10 -14 L4 -6 L12 -2 L0 -4 L-12 -2 L-4 -6Z" fill="#5b9a3a" stroke="#3f6e27" stroke-width="2" stroke-linejoin="round"/>
 <ellipse cx="-8" cy="-2" rx="5" ry="3" fill="#fff6" transform="rotate(-30 -8 -2)"/></g>`
}

function eye(cx: number, cy: number, kind: Eyes) {
  let p: string
  switch (kind) {
    case 'closed':
      p = `<path d="M${cx - 12} ${cy + 2} Q${cx} ${cy + 12} ${cx + 12} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
      break
    case 'happy':
      p = `<path d="M${cx - 11} ${cy + 5} Q${cx} ${cy - 9} ${cx + 11} ${cy + 5}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
      break
    case 'wide':
      p = `<circle cx="${cx}" cy="${cy}" r="4" fill="${INK}"/><path d="M${cx - 14} ${cy + 19} Q${cx} ${cy + 25} ${cx + 14} ${cy + 19}" stroke="#8b6fa8" stroke-width="4" fill="none" opacity=".6"/>`
      break
    case 'spiral':
      p = `<path d="M${cx} ${cy} m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -10 0 a8 8 0 1 1 16 0 a11 11 0 1 1 -22 0" fill="none" stroke="${INK}" stroke-width="2.5"/>`
      break
    case 'disgust':
      p = `<path d="M${cx - 10} ${cy - 7} L${cx + 6} ${cy} L${cx - 10} ${cy + 7}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ${cx > 110 ? `transform="rotate(180 ${cx} ${cy})"` : ''}/>`
      break
    default:
      p = `<circle cx="${cx}" cy="${cy + 2}" r="9" fill="${INK}"/><circle cx="${cx + 3}" cy="${cy - 1}" r="3" fill="#fff"/>`
  }
  return `<circle cx="${cx}" cy="${cy}" r="22" fill="#fff" stroke="${L}" stroke-width="6"/>${p}`
}

const mouths: Record<Mouth, string> = {
  smile: `<path d="M42 128 Q95 160 150 122" fill="#fff" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`,
  big: `<path d="M40 122 Q95 178 152 118 Q95 140 40 122Z" fill="#c9475a" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M48 125 Q95 140 145 121" stroke="#fff" stroke-width="6" fill="none"/>`,
  flat: `<path d="M48 132 L145 128" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`,
  o: `<ellipse cx="80" cy="135" rx="9" ry="11" fill="#c9475a" stroke="${L}" stroke-width="4"/>`,
  wavy: `<path d="M45 132 q12 -8 24 0 t24 0 t24 0 t24 0" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`,
  sing: `<ellipse cx="85" cy="134" rx="22" ry="16" fill="#c9475a" stroke="${L}" stroke-width="5"/>`,
}

/** Props drawn behind the croc, on its head (inside the crayon filter), or on top. */
const props: Record<Prop, { back?: string; front?: string; over?: string }> = {
  nightcap: {
    front: `<path d="M90 50 L130 10 L160 46Z" fill="#7c8fd0" stroke="${L}" stroke-width="4"/><circle cx="130" cy="10" r="7" fill="#fff" stroke="${L}" stroke-width="3"/>`,
    over: `<text x="168" y="46" font-size="22" fill="#7c8fd0" font-family="sans-serif">z</text><text x="180" y="28" font-size="16" fill="#7c8fd0">z</text>`,
  },
  moon: { back: `<circle cx="30" cy="60" r="12" fill="#ffe9a8"/><circle cx="36" cy="56" r="11" fill="#2e3350"/>` },
  rain: {
    back: Array.from(
      { length: 14 },
      (_, i) => `<path d="M${(i * 37) % 200} ${((i * 53) % 120) + 40} l-4 12" stroke="#6f9ccc" stroke-width="3" stroke-linecap="round"/>`,
    ).join(''),
  },
  mic: {
    front: `<g transform="rotate(-25 40 160)"><rect x="30" y="140" width="14" height="50" rx="6" fill="${INK}"/><circle cx="37" cy="138" r="14" fill="#bbb" stroke="${INK}" stroke-width="4"/></g>`,
    over: `<text x="20" y="80" font-size="26">♪</text><text x="175" y="110" font-size="22">♫</text>`,
  },
  laptop: {
    front: `<rect x="20" y="150" width="110" height="50" rx="6" fill="#d6d6d6" stroke="${INK}" stroke-width="4"/><text x="75" y="182" font-size="16" text-anchor="middle" font-family="serif" fill="${INK}">∂f/∂x=?</text>`,
    over: `<path d="M175 60 q8 14 0 18 q-8 -4 0 -18z" fill="#8cc6f0"/>`,
  },
  shades: { front: `<path d="M76 62 H170 L166 84 Q150 92 140 80 L134 70 H112 L106 82 Q94 94 80 82Z" fill="${INK}"/>` },
  party: {
    front: `<path d="M112 46 L128 0 L146 42Z" fill="#f0a35e" stroke="${L}" stroke-width="4"/>`,
    over: `<g transform="translate(14,140)"><rect width="46" height="30" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/><rect width="46" height="9" fill="#f4a0a0"/><path d="M23 0 v-12" stroke="${INK}" stroke-width="3"/><circle cx="23" cy="-15" r="4" fill="#f0a35e"/></g>`,
  },
  okhand: { over: `<text x="14" y="170" font-size="40">👌</text>` },
  notomato: {
    over: `${tomatoSvg(36, 165, 1)}<path d="M14 145 L58 189 M58 145 L14 189" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>`,
  },
  yeet: {
    over: `<g transform="rotate(30 170 40)">${tomatoSvg(170, 40, 0.8)}</g><path d="M120 60 l30 -20 M128 70 l34 -14" stroke="${RED}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
  },
}

let uid = 0

export function crocSvg(o: CrocArt = {}): string {
  const id = `crayon${uid++}`
  const ps = (o.props ?? []).map((p) => props[p])
  const pick = (k: 'back' | 'front' | 'over') => ps.map((p) => p[k] ?? '').join('')
  const eyes = o.eyes ?? 'normal'
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter></defs>
  <rect width="200" height="200" fill="${o.bg ?? '#fff'}"/>
  ${pick('back')}
  <g filter="url(#${id})">
   <path d="M150 200 C150 170 160 150 175 140 C190 150 198 175 198 200Z" fill="${G}" stroke="${L}" stroke-width="5"/>
   ${[0, 1, 2, 3].map((i) => `<path d="M${176 + i * 4} ${120 + i * 20} q14 4 6 16" fill="${L}" stroke="${L}" stroke-width="3"/>`).join('')}
   <path d="M60 200 C62 168 92 150 130 150 C170 150 185 175 186 200Z" fill="${G}" stroke="${L}" stroke-width="5"/>
   <path d="M38 108 C18 112 16 140 40 146 C80 158 140 156 166 138 C190 120 186 82 160 70 C130 58 120 82 92 86 C70 90 55 104 38 108Z" fill="${G}" stroke="${L}" stroke-width="6" stroke-linejoin="round"/>
   <circle cx="45" cy="117" r="3" fill="${L}"/><circle cx="58" cy="113" r="3" fill="${L}"/>
   ${mouths[o.mouth ?? 'smile']}
   ${o.blush ? `<ellipse cx="150" cy="118" rx="11" ry="6" fill="#f4a0a0" opacity=".7"/>` : ''}
   ${eye(100, 72, eyes)}${eye(146, 66, eyes)}
   ${pick('front')}
  </g>
  ${o.text ? `<text x="100" y="30" text-anchor="middle" font-family="${FONT_HAND}" font-size="${o.fontSize ?? 24}" fill="${o.textColor ?? INK}">${o.text}</text>` : ''}
  ${pick('over')}
  </svg>`
}
