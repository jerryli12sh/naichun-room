import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { canvasTex, FONT } from './textures'
import { door as words } from '../content/door'
import type { DoorMood } from '../state/store'

/*
 * Imperative builders for the corridor, the door and the mood props.
 * Built once with useMemo and mounted with <primitive>; DoorIntro animates the handles returned here.
 * Units are metres. The door wall sits at z = 0 and the corridor (camera side) is +z.
 */

export const DOOR_W = 0.92
export const DOOR_H = 2.05
export const WALL_T = 0.14

const mat = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o })
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 4, r)

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D, shadow = true) {
  const o = new THREE.Mesh(geo, m)
  o.position.set(x, y, z)
  o.castShadow = shadow
  o.receiveShadow = true
  parent?.add(o)
  return o
}

/* ---------------------------------------------------------------- corridor */

export function buildCorridor() {
  const group = new THREE.Group()

  // floor: pale beige tiles
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#d8cfc0'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = (210 + Math.random() * 10) | 0
      g.fillStyle = `rgb(${v},${v - 8},${v - 20})`
      g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250)
    }
  })
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
  floorTex.repeat.set(6, 3)
  // corridor floor stops at the wall: behind it is the real room. Sits 4 mm up so it never fights the room's plinth.
  const floor = mesh(new THREE.PlaneGeometry(14, 6), mat(0xffffff, { map: floorTex, roughness: 0.45 }), 0, 0.004, -WALL_T / 2 + 3, group, false)
  floor.rotation.x = -Math.PI / 2

  // the wall, with a hole for the door
  const wallW = 9, wallH = 3.2
  const shape = new THREE.Shape()
  shape.moveTo(-wallW / 2, 0); shape.lineTo(wallW / 2, 0); shape.lineTo(wallW / 2, wallH); shape.lineTo(-wallW / 2, wallH); shape.lineTo(-wallW / 2, 0)
  const hole = new THREE.Path()
  hole.moveTo(-DOOR_W / 2, 0); hole.lineTo(-DOOR_W / 2, DOOR_H); hole.lineTo(DOOR_W / 2, DOOR_H); hole.lineTo(DOOR_W / 2, 0); hole.lineTo(-DOOR_W / 2, 0)
  shape.holes.push(hole)
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false })
  wallGeo.translate(0, 0, -WALL_T / 2)
  mesh(wallGeo, mat(0xf4ecdc, { roughness: 0.9 }), 0, 0, 0, group)
  mesh(new THREE.BoxGeometry(wallW, 0.1, 0.02), mat(0xd7c7aa), 0, 0.05, WALL_T / 2 + 0.01, group) // skirting

  // cream door frame
  const frameM = mat(0xf8f2e6, { roughness: 0.5 })
  mesh(rbox(0.07, DOOR_H + 0.06, 0.2, 0.015), frameM, -DOOR_W / 2 - 0.03, (DOOR_H + 0.06) / 2, 0, group)
  mesh(rbox(0.07, DOOR_H + 0.06, 0.2, 0.015), frameM, DOOR_W / 2 + 0.03, (DOOR_H + 0.06) / 2, 0, group)
  mesh(rbox(DOOR_W + 0.13, 0.07, 0.2, 0.015), frameM, 0, DOOR_H + 0.03, 0, group)

  // warm wall lamp over the door
  mesh(rbox(0.34, 0.08, 0.12, 0.03), mat(0xf6efe2), 0, 2.52, 0.1, group)
  const lampGlow = mesh(rbox(0.3, 0.03, 0.1, 0.012), mat(0xfff3d0, { emissive: 0xffd27a, emissiveIntensity: 2.2 }), 0, 2.47, 0.12, group)

  // corridor window: cold blue night, distant blocks, stars and a moon
  const nightTex = canvasTex(512, 768, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#0a1430'); grd.addColorStop(0.6, '#1d3767'); grd.addColorStop(1, '#33548a')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.1})`
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.6, Math.random() * 1.6 + 0.3, 0, 7); g.fill()
    }
    g.shadowColor = '#e9f1ff'; g.shadowBlur = 40; g.fillStyle = '#f3f6ff'
    g.beginPath(); g.arc(w * 0.7, h * 0.2, 34, 0, 7); g.fill(); g.shadowBlur = 0
    g.fillStyle = '#1d3767'; g.beginPath(); g.arc(w * 0.7 + 16, h * 0.2 - 10, 30, 0, 7); g.fill()
    ;[[0, 0.62, 0.22], [0.18, 0.55, 0.2], [0.36, 0.7, 0.16], [0.5, 0.5, 0.22], [0.7, 0.64, 0.18], [0.86, 0.58, 0.2]].forEach(([x, y, bw]) => {
      g.fillStyle = '#0b1529'; g.fillRect(x * w, y * h, bw * w, h)
      for (let yy = y * h + 14; yy < h; yy += 22) for (let xx = x * w + 10; xx < (x + bw) * w - 10; xx += 18)
        if (Math.random() < 0.16) { g.fillStyle = Math.random() < 0.7 ? '#ffcf6e' : '#a9c7ff'; g.fillRect(xx, yy, 8, 10) }
    })
    g.fillStyle = '#07101f'
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * w, h - 20 + Math.random() * 30, 40 + Math.random() * 40, 0, 7); g.fill() }
  })
  // the same view by day: soft blue sky, sunlit blocks, green canopy
  const dayTex = canvasTex(512, 768, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#8fc0ea'); grd.addColorStop(0.65, '#cfe5f5'); grd.addColorStop(1, '#e8f1f2')
    g.fillStyle = grd; g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255,255,255,.85)'
    ;[[0.25, 0.16, 60], [0.38, 0.14, 44], [0.72, 0.3, 52], [0.83, 0.28, 36]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x * w, y * h, r, r * 0.45, 0, 0, 7); g.fill() })
    ;[[0, 0.62, 0.22], [0.18, 0.55, 0.2], [0.36, 0.7, 0.16], [0.5, 0.5, 0.22], [0.7, 0.64, 0.18], [0.86, 0.58, 0.2]].forEach(([x, y, bw], i) => {
      g.fillStyle = i % 2 ? '#e9e4da' : '#dcd6cb'; g.fillRect(x * w, y * h, bw * w, h)
      g.fillStyle = 'rgba(90,110,130,.35)'
      for (let yy = y * h + 14; yy < h; yy += 22) for (let xx = x * w + 10; xx < (x + bw) * w - 10; xx += 18) g.fillRect(xx, yy, 8, 10)
    })
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 3 ? '#6f9a5a' : '#5d8a4c'
      g.beginPath(); g.arc(Math.random() * w, h - 30 + Math.random() * 40, 45 + Math.random() * 45, 0, 7); g.fill()
    }
  })
  const winX = 2.05, winY = 1.45, winW = 1.05, winH = 1.55
  const win = new THREE.Group(); win.position.set(winX, winY, WALL_T / 2 + 0.005); group.add(win)
  const winDayMat = new THREE.MeshBasicMaterial({ map: dayTex, toneMapped: false, color: 0xe6e6e6 })
  const winNightMat = new THREE.MeshBasicMaterial({ map: nightTex, toneMapped: false, color: 0xb9c6dd, transparent: true, depthWrite: false })
  mesh(new THREE.PlaneGeometry(winW, winH), winDayMat, 0, 0, 0, win, false)
  mesh(new THREE.PlaneGeometry(winW, winH), winNightMat, 0, 0, 0.001, win, false)
  const wf = mat(0xf8f4ec, { roughness: 0.4 })
  mesh(rbox(winW + 0.08, 0.06, 0.07, 0.015), wf, 0, winH / 2, 0.02, win)
  mesh(rbox(winW + 0.08, 0.08, 0.12, 0.015), wf, 0, -winH / 2, 0.04, win)
  mesh(rbox(0.06, winH, 0.07, 0.015), wf, -winW / 2, 0, 0.02, win)
  mesh(rbox(0.06, winH, 0.07, 0.015), wf, winW / 2, 0, 0.02, win)
  mesh(rbox(0.04, winH, 0.05, 0.01), wf, 0, 0, 0.02, win)
  mesh(rbox(winW, 0.04, 0.05, 0.01), wf, 0, -0.18, 0.02, win)
  mesh(rbox(winW - 0.04, 0.32, 0.015, 0.006), mat(0xd9d5cc, { roughness: 0.9 }), 0, winH / 2 - 0.19, 0.03, win) // half-drawn blind

  // a pot plant and a pair of croc-green slippers by the door
  const pot = new THREE.Group(); pot.position.set(-1.55, 0, 0.45); group.add(pot)
  mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 24), mat(0xe8d7bd), 0, 0.12, 0, pot)
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.SphereGeometry(0.09, 16, 12), mat(0x6f9a5a), (Math.random() - 0.5) * 0.12, 0.3 + Math.random() * 0.25, (Math.random() - 0.5) * 0.1, pot)
    leaf.scale.set(0.6, 1.6, 0.35)
    leaf.rotation.set((Math.random() - 0.5) * 0.8, i, (Math.random() - 0.5) * 0.9)
  }
  const slipper = (x: number, z: number, ry: number) => {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; group.add(s)
    mesh(rbox(0.11, 0.03, 0.27, 0.014), mat(0xf4f1ea), 0, 0.015, 0, s)
    mesh(rbox(0.12, 0.04, 0.08, 0.018), mat(0x7fb466), 0, 0.045, 0.06, s)
  }
  slipper(0.62, 0.42, -0.25); slipper(0.78, 0.55, 0.4)

  /* ---------------- the door ---------------- */
  // hinged on the +x side (as seen from the corridor), so it swings open flat along the room's open +x edge
  const pivot = new THREE.Group(); pivot.position.set(DOOR_W / 2, 0, 0); group.add(pivot)
  const woodTex = canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#dcbb8d'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = `rgba(${(150 + Math.random() * 40) | 0},${(105 + Math.random() * 30) | 0},60,${Math.random() * 0.12 + 0.03})`
      g.lineWidth = Math.random() * 3 + 0.5
      g.beginPath()
      let x = Math.random() * w
      g.moveTo(x, 0)
      for (let y = 0; y <= h; y += 32) { x += (Math.random() - 0.5) * 6; g.lineTo(x, y) }
      g.stroke()
    }
  })
  mesh(rbox(DOOR_W - 0.01, DOOR_H - 0.02, 0.05, 0.012), mat(0xffffff, { map: woodTex, roughness: 0.55 }), -DOOR_W / 2, DOOR_H / 2, 0, pivot)

  // room plate
  const plateTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f2cd6b'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#3b3128'; g.font = `700 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(words.plate, w / 2, h / 2 + 8)
  }, true)
  const plate = new THREE.Group(); plate.position.set(-DOOR_W / 2, 1.58, 0.03); pivot.add(plate)
  mesh(rbox(0.34, 0.17, 0.016, 0.02), mat(0xf0c75e, { roughness: 0.35, metalness: 0.15 }), 0, 0, 0, plate)
  mesh(new THREE.PlaneGeometry(0.31, 0.155), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4 }), 0, 0, 0.0085, plate, false)

  // peephole
  mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 20).rotateX(Math.PI / 2), mat(0x8c7a64, { metalness: 0.6, roughness: 0.3 }), -DOOR_W / 2, 1.36, 0.03, pivot)

  // lever handle (turns before the door opens)
  const handle = new THREE.Group(); handle.position.set(-(DOOR_W - 0.12), 1.0, 0.03); pivot.add(handle)
  mesh(rbox(0.05, 0.17, 0.018, 0.012), mat(0x55504a, { metalness: 0.5, roughness: 0.35 }), 0, 0, 0, handle)
  const lever = new THREE.Group(); lever.position.set(0, 0.02, 0.03); handle.add(lever)
  mesh(rbox(0.14, 0.028, 0.028, 0.012), mat(0xe8e1cf, { metalness: 0.3, roughness: 0.3 }), 0.06, 0, 0, lever)

  // his crocodile avatar as a sticker on the door
  const crocTex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}intro/croc-hi.jpg`)
  crocTex.colorSpace = THREE.SRGBColorSpace
  const sticker = new THREE.Group(); sticker.position.set(-DOOR_W / 2 + 0.2, 1.2, 0.028); sticker.rotation.z = 0.12; pivot.add(sticker)
  mesh(new THREE.CircleGeometry(0.105, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), 0, 0, 0, sticker, false)
  mesh(new THREE.CircleGeometry(0.092, 40), new THREE.MeshStandardMaterial({ map: crocTex, roughness: 0.6 }), 0, 0, 0.001, sticker, false)

  // "睡神 营业中" hanger on the handle
  const hangerTex = canvasTex(256, 384, (g, w) => {
    g.fillStyle = '#f6eedd'; g.beginPath(); g.roundRect(0, 0, w, 384, 30); g.fill()
    g.beginPath(); g.arc(w / 2, 62, 38, 0, 7); g.fillStyle = '#d9c9a8'; g.fill()
    g.textAlign = 'center'
    g.fillStyle = '#3b3128'; g.font = `800 64px ${FONT}`; g.fillText(words.hanger.title, w / 2, 190)
    g.fillStyle = '#8a7357'; g.font = `600 40px ${FONT}`; g.fillText(words.hanger.sub, w / 2, 252)
    g.fillStyle = '#5f7fb8'; g.font = `600 54px ${FONT}`; g.fillText('z z Z', w / 2, 330)
  }, true)
  const hanger = new THREE.Group(); hanger.position.set(0.06, 0.02, 0.06); lever.add(hanger)
  mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 24), mat(0xb9a17b), 0, -0.02, 0, hanger)
  const hangCard = mesh(rbox(0.12, 0.18, 0.006, 0.012), mat(0xffffff, { map: hangerTex, roughness: 0.8 }), 0, -0.13, 0, hanger)

  // warm light leaking under the door, and its pool on the floor
  const gapMat = new THREE.MeshBasicMaterial({ color: 0xffc865, transparent: true, opacity: 0.55, toneMapped: false })
  mesh(new THREE.PlaneGeometry(DOOR_W - 0.04, 0.016), gapMat, 0, 0.008, WALL_T / 2 + 0.002, group, false)
  const spillTex = canvasTex(256, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, 0, 4, w / 2, 0, w / 2)
    r.addColorStop(0, 'rgba(255,205,120,.9)'); r.addColorStop(1, 'rgba(255,205,120,0)')
    g.fillStyle = r; g.fillRect(0, 0, w, h)
  })
  const spillMat = new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false })
  const spill = mesh(new THREE.PlaneGeometry(1.4, 0.7), spillMat, 0, 0.004, WALL_T / 2 + 0.35, group, false)
  spill.rotation.x = -Math.PI / 2

  /* ---------------- lights ---------------- */
  const spot = new THREE.SpotLight(0xffd59a, 26, 7, 0.9, 0.65, 1.6)
  spot.position.set(0, 2.45, 0.5); spot.target.position.set(0, 0.6, 0.6)
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004
  const fill = new THREE.PointLight(0xffe2b8, 5, 7, 1.6); fill.position.set(-1.6, 1.8, 2.2)
  const winLight = new THREE.PointLight(0x7ea0ff, 1.6, 3.2, 2); winLight.position.set(winX, winY, 0.8)
  group.add(spot, spot.target, fill, winLight)

  return { group, pivot, lever, hangCard, gapMat, spillMat, lampGlow, spot, fill, winLight, winNightMat }
}
export type Corridor = ReturnType<typeof buildCorridor>

/* ---------------------------------------------------------------- mood props */

/**
 * Props that go with each door mood, in the avatar's local space
 * (feet at the origin, facing +z, about 1.16 tall). `head` holds head-mounted ones.
 */
export function buildMoodProps(mood: DoorMood) {
  const group = new THREE.Group()
  const head = new THREE.Group(); head.position.set(0, 0.93, 0); group.add(head)
  const parts: Record<string, THREE.Object3D> = {}

  if (mood === 'sleeping') {
    // eye mask pushed up onto the forehead, pillow dragged along
    const mask = mesh(rbox(0.34, 0.07, 0.05, 0.025), mat(0x3d4f7a, { roughness: 0.9 }), 0, 0.15, 0.17, head)
    mask.rotation.x = -0.35
    ;[-1, 1].forEach((s) => {
      const m = mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: 0xf6eedd }), s * 0.07, 0.155, 0.197, head, false)
      m.rotation.x = -0.35
    })
    const pil = mesh(rbox(0.36, 0.2, 0.1, 0.05), mat(0xf6f1e6, { roughness: 0.95 }), -0.28, 0.32, 0.06, group)
    pil.rotation.set(0.1, 0.2, 1.2)
  }
  if (mood === 'headphones') {
    const hpM = mat(0xf2c35a, { roughness: 0.4 }), hpD = mat(0x2e2a28, { roughness: 0.5 })
    mesh(new THREE.TorusGeometry(0.25, 0.018, 10, 40, Math.PI), hpM, 0, 0.02, 0, head)
    ;[-1, 1].forEach((s) => {
      mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 24), hpD, s * 0.25, -0.01, 0, head).rotation.z = Math.PI / 2
      mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.065, 24), hpM, s * 0.262, -0.01, 0, head).rotation.z = Math.PI / 2
    })
  }
  if (mood === 'croc') {
    // the crocodile from his sticker, as a plush
    const croc = new THREE.Group(); croc.position.set(0, 0.55, 0.18); group.add(croc)
    const gM = mat(0x9fd16a, { roughness: 0.9 }), gD = mat(0x6aa046, { roughness: 0.9 })
    mesh(new THREE.CapsuleGeometry(0.11, 0.16, 10, 20), gM, 0, 0, 0, croc).rotation.z = Math.PI / 2
    mesh(new THREE.SphereGeometry(0.12, 24, 20), gM, 0, 0.12, 0.05, croc).scale.set(1.15, 0.85, 1.2)
    mesh(new THREE.SphereGeometry(0.1, 24, 20), gM, 0, 0.09, 0.15, croc).scale.set(1.25, 0.6, 0.9)
    ;[-1, 1].forEach((s) => {
      mesh(new THREE.SphereGeometry(0.055, 20, 16), mat(0xffffff, { roughness: 0.4 }), s * 0.06, 0.22, 0.07, croc)
      mesh(new THREE.SphereGeometry(0.024, 14, 10), mat(0x2b3a22), s * 0.06, 0.22, 0.12, croc)
    })
    for (let i = 0; i < 4; i++) mesh(new THREE.ConeGeometry(0.025, 0.05, 8), gD, 0.18 - i * 0.05, 0.1, -0.06, croc).rotation.x = -0.4
    mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 20, Math.PI), mat(0x4a7a30), 0, 0.08, 0.235, croc).rotation.z = Math.PI
    parts.croc = croc
  }
  if (mood === 'eating') {
    const bowl = new THREE.Group(); bowl.position.set(-0.1, 0.56, 0.24); group.add(bowl)
    mesh(new THREE.SphereGeometry(0.1, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xfaf7f0, { roughness: 0.3, side: THREE.DoubleSide }), 0, 0.06, 0, bowl)
    mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 32), mat(0x5f7fb8), 0, 0.06, 0, bowl).rotation.x = Math.PI / 2
    mesh(new THREE.SphereGeometry(0.09, 24, 16), mat(0xffffff, { roughness: 0.9 }), 0, 0.07, 0, bowl).scale.y = 0.45
    mesh(new THREE.SphereGeometry(0.03, 12, 10), mat(0xe9a23b), 0.03, 0.1, 0.02, bowl) // egg
    mesh(new THREE.SphereGeometry(0.025, 12, 10), mat(0x6c9a4a), -0.03, 0.1, -0.01, bowl) // greens
    const sticks = new THREE.Group(); sticks.position.set(0.16, 0.62, 0.22); group.add(sticks)
    ;[0, 1].forEach((i) => mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.24, 8), mat(0x9b7650), i * 0.015, 0, 0, sticks))
    sticks.rotation.set(0.9, 0, -0.6)
    parts.sticks = sticks
  }
  return { group, head, parts }
}

/** The tomato he picked out of his food, which rolls out of the door. */
export function buildTomato() {
  const group = new THREE.Group()
  const body = new THREE.Group(); body.position.y = 0.062; group.add(body)
  mesh(new THREE.SphereGeometry(0.07, 24, 18), mat(0xe2463a, { roughness: 0.35 }), 0, 0, 0, body).scale.y = 0.88
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26
    const l = mesh(new THREE.ConeGeometry(0.015, 0.05, 6), mat(0x4f8a3a), Math.cos(a) * 0.02, 0.065, Math.sin(a) * 0.02, body)
    l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2)
  }
  group.visible = false
  return { group, body }
}
