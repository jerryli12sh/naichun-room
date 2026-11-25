import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { env, GROUND_Y, isLowEnd, outside, swayDepth } from './env'
import { FACADE, GROUND_AREA, makeFacade, makeGround, PATHS } from './textures'

let seed = 98765
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const range = (a: number, b: number) => a + rand() * (b - a)

/** Terrain height: flat lawns near the block, rising to Kent Ridge in the distance. */
export function terrain(x: number, z: number) {
  const ridge = THREE.MathUtils.smoothstep(-z, 120, 240) * (20 + 9 * Math.sin(x * 0.018 + 1.3) + 5 * Math.sin(x * 0.047))
  const roll = 1.2 * Math.sin(x * 0.06 + z * 0.03) * Math.cos(z * 0.05) * THREE.MathUtils.smoothstep(-z, 15, 40)
  return GROUND_Y + ridge + roll
}

// ---------------------------------------------------------------- ground
function Ground() {
  const { geo, mat } = useMemo(() => {
    const w = GROUND_AREA.x1 - GROUND_AREA.x0
    const d = GROUND_AREA.z1 - GROUND_AREA.z0
    const geo = new THREE.PlaneGeometry(w, d, 120, 100)
    geo.rotateX(-Math.PI / 2)
    geo.translate((GROUND_AREA.x0 + GROUND_AREA.x1) / 2, 0, (GROUND_AREA.z0 + GROUND_AREA.z1) / 2)
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) p.setY(i, terrain(p.getX(i), p.getZ(i)))
    geo.computeVertexNormals()
    const mat = outside(new THREE.MeshStandardMaterial({ map: makeGround(), roughness: 0.95 }))
    return { geo, mat }
  }, [])
  return <mesh geometry={geo} material={mat} />
}

// ---------------------------------------------------------------- blocks
/** Box whose UVs are in facade tiles, so windows keep their size on any block. */
function blockGeometry(w: number, h: number, d: number, off: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv as THREE.BufferAttribute
  const tw = FACADE.bays * FACADE.bayW
  const th = FACADE.floors * FACADE.floorH
  // faces: +x, -x, +y, -y, +z, -z (4 verts each)
  const span = [d, d, w, w, w, w]
  const tall = [h, h, d, d, h, h]
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k
      uv.setXY(i, off + (uv.getX(i) * span[f]) / tw, (uv.getY(i) * tall[f]) / th)
    }
  return g
}

type BlockDef = { x: number; z: number; w: number; d: number; floors: number; rot: number }
const BLOCKS: BlockDef[] = [
  { x: -38, z: -84, w: 30, d: 12, floors: 9, rot: 0.14 },
  { x: 40, z: -100, w: 26, d: 12, floors: 10, rot: -0.32 },
  { x: -96, z: -112, w: 26, d: 12, floors: 8, rot: 0.42 },
  { x: 4, z: -150, w: 34, d: 13, floors: 12, rot: 0.06 },
  { x: 96, z: -160, w: 22, d: 12, floors: 11, rot: -0.5 },
  { x: -140, z: -170, w: 28, d: 12, floors: 10, rot: 0.3 },
]

function Blocks() {
  const facade = useMemo(makeFacade, [])
  const mats = useMemo(() => {
    const wall = outside(
      new THREE.MeshStandardMaterial({ map: facade.map, emissiveMap: facade.emissive, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.8 }),
    )
    const roof = outside(new THREE.MeshStandardMaterial({ color: '#d9d1c3', roughness: 0.95 }))
    const dark = outside(new THREE.MeshStandardMaterial({ color: '#8d8679', roughness: 0.9 }))
    const yellow = outside(new THREE.MeshStandardMaterial({ color: '#d99a3e', roughness: 0.7 }))
    return { wall, roof, dark, yellow, box: [wall, wall, roof, roof, wall, wall] }
  }, [facade])
  const beaconMat = useMemo(
    () => outside(new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, toneMapped: false, depthWrite: false }), { haze: false }),
    [],
  )
  const lastFlick = useRef(0)
  useFrame(() => {
    mats.wall.emissiveIntensity = env.night * 1.25
    if (env.night > 0.3 && env.time - lastFlick.current > 1.8) {
      lastFlick.current = env.time
      facade.flick()
    }
    beaconMat.opacity = env.night * (Math.sin(env.time * 3) > 0.6 ? 1 : 0.08)
  })

  return (
    <group>
      {BLOCKS.map((b, i) => {
        const h = b.floors * FACADE.floorH
        const base = terrain(b.x, b.z) - 0.5
        return (
          <group key={i} position={[b.x, base, b.z]} rotation-y={b.rot}>
            <mesh position-y={h / 2 + 3.2} geometry={blockGeometry(b.w, h, b.d, i * 0.37)} material={mats.box} />
            {/* void deck: pillars under the block */}
            <mesh position-y={1.6} material={mats.dark}>
              <boxGeometry args={[b.w - 1.2, 3.2, b.d - 1.6]} />
            </mesh>
            {[-0.46, -0.15, 0.15, 0.46].map((f) => (
              <mesh key={f} position={[b.w * f, 1.6, b.d / 2 - 0.5]} material={mats.roof}>
                <boxGeometry args={[0.7, 3.2, 0.7]} />
              </mesh>
            ))}
            {/* roof: parapet, stair core, water tanks */}
            <mesh position={[0, h + 3.2 + 0.5, 0]} material={mats.roof}>
              <boxGeometry args={[b.w + 0.3, 1, b.d + 0.3]} />
            </mesh>
            <mesh position={[b.w * 0.25, h + 3.2 + 2, 0]} material={mats.roof}>
              <boxGeometry args={[4, 4, 5]} />
            </mesh>
            <mesh position={[-b.w * 0.2, h + 3.2 + 1.7, 1]} material={mats.yellow}>
              <boxGeometry args={[3.5, 2.4, 2.4]} />
            </mesh>
            {i === 3 && (
              <mesh position={[b.w * 0.25, h + 3.2 + 4.6, 0]} material={beaconMat}>
                <sphereGeometry args={[0.45, 10, 8]} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

// ---------------------------------------------------------------- distant skyline + ridge
function Skyline() {
  const facade = useMemo(makeFacade, [])
  const { mesh } = useMemo(() => {
    const n = isLowEnd ? 26 : 44
    const mat = outside(
      new THREE.MeshStandardMaterial({ color: '#d8dde2', map: facade.map, emissiveMap: facade.emissive, emissive: '#fff', emissiveIntensity: 0, roughness: 0.9 }),
    )
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.translate(0, 0.5, 0)
    const uv = geo.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 2.5)
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    const m = new THREE.Matrix4()
    for (let i = 0; i < n; i++) {
      const x = range(-260, 260)
      const z = range(-215, -245)
      const h = range(14, 34) * (Math.abs(x) < 120 ? 1.2 : 0.8)
      m.compose(new THREE.Vector3(x, terrain(x, z) - 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), range(0, 1)), new THREE.Vector3(range(10, 22), h, range(10, 18)))
      mesh.setMatrixAt(i, m)
    }
    return { mesh, mat }
  }, [facade])
  useFrame(() => {
    ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = env.night * 1.6
  })
  return <primitive object={mesh} />
}

// ---------------------------------------------------------------- trees
type Tree = { x: number; z: number; h: number; r: number; kind: 'rain' | 'round' | 'palm' | 'shrub' }

function plantTrees(): Tree[] {
  const trees: Tree[] = []
  const n = isLowEnd ? 150 : 300
  const inBlock = (x: number, z: number) =>
    BLOCKS.some((b) => {
      const c = Math.cos(-b.rot), s = Math.sin(-b.rot)
      const dx = x - b.x, dz = z - b.z
      const lx = dx * c + dz * s, lz = -dx * s + dz * c
      return Math.abs(lx) < b.w / 2 + 3 && Math.abs(lz) < b.d / 2 + 3
    })
  let guard = 0
  while (trees.length < n && guard++ < 4000) {
    const near = trees.length < n * 0.55
    const x = near ? range(-45, 45) : range(-160, 160)
    const z = near ? range(-7, -40) : range(-30, -190)
    if (inBlock(x, z)) continue
    const kind = rand() < 0.14 ? 'palm' : rand() < 0.55 ? 'rain' : 'round'
    const h = kind === 'palm' ? range(9, 14) : kind === 'rain' ? range(11, 19) : range(7, 12)
    trees.push({ x, z, h, r: kind === 'rain' ? range(4.5, 7.5) : range(2.6, 4), kind })
  }
  // shrubs and hedges along the paths
  for (const path of PATHS)
    for (let i = 0; i < path.length - 1; i++)
      for (let k = 0; k < (isLowEnd ? 4 : 8); k++) {
        const t = rand()
        const x = path[i][0] + (path[i + 1][0] - path[i][0]) * t + range(-5, 5)
        const z = path[i][1] + (path[i + 1][1] - path[i][1]) * t + range(-4, 4)
        if (!inBlock(x, z)) trees.push({ x, z, h: range(1.2, 2.4), r: range(1.2, 2.2), kind: 'shrub' })
      }
  // a few big rain trees right below the window so the view has a foreground
  trees.push({ x: -5, z: -10, h: 14.5, r: 7, kind: 'rain' }, { x: 11, z: -14, h: 13.5, r: 6, kind: 'rain' }, { x: -16, z: -16, h: 12, r: 4, kind: 'round' })
  return trees
}

const LEAF = ['#5e8a55', '#6f9a5c', '#7ea567', '#557d4e', '#8aac6c', '#6a915a', '#4d7448']

function Trees() {
  const { canopy, trunks, fronds } = useMemo(() => {
    const trees = plantTrees()
    const blobs: { p: THREE.Vector3; s: THREE.Vector3; c: THREE.Color }[] = []
    const logs: THREE.Matrix4[] = []
    const leaves: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    for (const t of trees) {
      const g = terrain(t.x, t.z)
      const tone = new THREE.Color(LEAF[Math.floor(rand() * LEAF.length)])
      if (t.kind === 'palm') {
        const lean = new THREE.Vector3(range(-0.15, 0.15), 1, range(-0.15, 0.15)).normalize()
        q.setFromUnitVectors(up, lean)
        logs.push(new THREE.Matrix4().compose(new THREE.Vector3(t.x, g, t.z), q.clone(), new THREE.Vector3(0.28, t.h, 0.28)))
        const top = new THREE.Vector3(t.x, g, t.z).addScaledVector(lean, t.h)
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2 + rand()
          const e = new THREE.Euler(range(0.35, 0.7), a, 0, 'YXZ')
          leaves.push(new THREE.Matrix4().compose(top, new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, range(3.2, 4.2))))
        }
        continue
      }
      const trunkH = t.kind === 'shrub' ? 0 : t.h * (t.kind === 'rain' ? 0.5 : 0.42)
      if (t.kind !== 'shrub')
        logs.push(new THREE.Matrix4().compose(new THREE.Vector3(t.x, g, t.z), new THREE.Quaternion(), new THREE.Vector3(t.kind === 'rain' ? 0.55 : 0.32, trunkH, t.kind === 'rain' ? 0.55 : 0.32)))
      const blobsN = t.kind === 'rain' ? 16 : t.kind === 'shrub' ? 3 : 8
      for (let k = 0; k < blobsN; k++) {
        const a = rand() * Math.PI * 2
        const rr = t.r * Math.sqrt(rand()) * (t.kind === 'rain' ? 0.75 : 0.45)
        const cy = t.kind === 'shrub' ? g + range(0.3, 0.8) : g + trunkH + (t.h - trunkH) * (t.kind === 'rain' ? range(0.3, 0.75) : range(0.35, 0.8))
        const s = t.r * (t.kind === 'rain' ? range(0.3, 0.44) : range(0.42, 0.58))
        blobs.push({
          p: new THREE.Vector3(t.x + Math.cos(a) * rr, cy, t.z + Math.sin(a) * rr),
          s: new THREE.Vector3(s, s * (t.kind === 'rain' ? 0.55 : 0.85), s),
          c: tone.clone().offsetHSL(range(-0.015, 0.015), range(-0.05, 0.05), range(-0.05, 0.05)),
        })
      }
    }
    // canopies: lumpy spheres, a darker underside so they read as volumes from afar
    const cg = mergeVertices(new THREE.IcosahedronGeometry(1, 3).deleteAttribute('normal').deleteAttribute('uv'))
    const p = cg.attributes.position as THREE.BufferAttribute
    const col: number[] = []
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i)
      const bump =
        1 + 0.1 * Math.sin(v.x * 7.1 + v.y * 3.3) * Math.cos(v.z * 6.3 - v.y * 2.1) + 0.07 * Math.sin(v.y * 17 + v.x * 13) * Math.sin(v.z * 15 - v.x * 5)
      v.multiplyScalar(bump)
      p.setXYZ(i, v.x, v.y, v.z)
      const ao = THREE.MathUtils.lerp(0.58, 1.06, THREE.MathUtils.smoothstep(v.y, -0.9, 0.7)) * (0.84 + 0.32 * (bump - 0.85))
      const sp = 0.9 + 0.2 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1)
      col.push(ao * sp, ao * sp * 1.02, ao * sp * 0.96)
    }
    cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    cg.computeVertexNormals()
    const canopy = new THREE.InstancedMesh(cg, outside(new THREE.MeshStandardMaterial({ roughness: 0.92, vertexColors: true }), { sway: 0.22 }), blobs.length)
    blobs.forEach((b, i) => {
      canopy.setMatrixAt(i, new THREE.Matrix4().compose(b.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6, 0)), b.s))
      canopy.setColorAt(i, b.c)
    })
    const tg = new THREE.CylinderGeometry(0.6, 1, 1, 8)
    tg.translate(0, 0.5, 0)
    const trunks = new THREE.InstancedMesh(tg, outside(new THREE.MeshStandardMaterial({ color: '#7a6a5a', roughness: 1 })), logs.length)
    logs.forEach((m, i) => trunks.setMatrixAt(i, m))
    // palm frond: a long drooping leaf
    const fg = new THREE.SphereGeometry(1, 8, 4)
    fg.scale(0.5, 0.06, 1)
    fg.translate(0, 0, 1)
    const fp = fg.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < fp.count; i++) fp.setY(i, fp.getY(i) - Math.pow(fp.getZ(i) / 2, 2) * 0.5)
    fg.computeVertexNormals()
    const fronds = new THREE.InstancedMesh(fg, outside(new THREE.MeshStandardMaterial({ color: '#6c9655', roughness: 0.85, side: THREE.DoubleSide }), { sway: 0.3 }), leaves.length)
    leaves.forEach((m, i) => fronds.setMatrixAt(i, m))
    return { canopy, trunks, fronds }
  }, [])
  return (
    <group>
      <primitive object={canopy} />
      <primitive object={trunks} />
      <primitive object={fronds} />
    </group>
  )
}

// ---------------------------------------------------------------- the branch right outside the wide window
/**
 * A rain-tree bough just outside, above the wide window. It casts dappled, swaying shadows
 * onto the desk in the afternoon and frames the top of the view.
 */
function NearBough() {
  const { group, mats } = useMemo(() => {
    const group = new THREE.Group()
    const sway = 0.05
    const leafMat = outside(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, vertexColors: true }), { sway, haze: false })
    const barkMat = outside(new THREE.MeshStandardMaterial({ color: '#6e5f50', roughness: 1 }), { sway: sway * 0.5, haze: false })
    const depthLeaf = swayDepth(sway)
    const depthBark = swayDepth(sway * 0.5)
    // limbs: a curve from off to the right toward the window
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6.4, 1.2, -6.5),
      new THREE.Vector3(3.9, 2.6, -4.6),
      new THREE.Vector3(2.0, 3.1, -3.7),
      new THREE.Vector3(0.0, 3.3, -3.4),
    ])
    const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.09, 7), barkMat)
    limb.castShadow = true
    limb.customDepthMaterial = depthBark
    group.add(limb)
    const twigs: THREE.Vector3[][] = []
    for (let k = 0; k < 7; k++) {
      const a = curve.getPoint(0.35 + k * 0.09)
      const b = a.clone().add(new THREE.Vector3(range(-0.8, 0.5), range(-0.6, 0.5), range(-0.4, 0.8)))
      twigs.push([a, b])
      const tw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, 0.025, 5), barkMat)
      tw.castShadow = true
      tw.customDepthMaterial = depthBark
      group.add(tw)
    }
    // leaf clumps along the twigs: small lumpy spheres, sparse so light gets through
    const lg = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute('normal').deleteAttribute('uv'))
    lg.computeVertexNormals()
    const col: number[] = []
    const lp = lg.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < lp.count; i++) {
      const s = 0.7 + 0.4 * THREE.MathUtils.smoothstep(lp.getY(i), -1, 1)
      col.push(s, s, s)
    }
    lg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    const n = isLowEnd ? 420 : 760
    const leaves = new THREE.InstancedMesh(lg, leafMat, n)
    const m = new THREE.Matrix4()
    for (let i = 0; i < n; i++) {
      const [a, b] = twigs[i % twigs.length]
      const p = a.clone().lerp(b, range(0.3, 1.1)).add(new THREE.Vector3(range(-0.4, 0.4), range(-0.22, 0.22), range(-0.4, 0.4)))
      const s = range(0.022, 0.045)
      m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, 0)), new THREE.Vector3(s * 1.6, s * 0.4, s))
      leaves.setMatrixAt(i, m)
      leaves.setColorAt(i, new THREE.Color(LEAF[i % LEAF.length]))
    }
    leaves.castShadow = true
    leaves.customDepthMaterial = depthLeaf
    group.add(leaves)
    return { group, mats: [leafMat, barkMat] }
  }, [])
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])
  return <primitive object={group} />
}

// ---------------------------------------------------------------- lamps
function Lamps() {
  const { poles, heads, pools, glows } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const path of PATHS) {
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, az] = path[i]
        const [bx, bz] = path[i + 1]
        const len = Math.hypot(bx - ax, bz - az)
        for (let s = 0; s < len; s += 11) {
          const t = s / len
          const x = ax + (bx - ax) * t + 2
          const z = az + (bz - az) * t
          if (Math.abs(x) < 120) pts.push(new THREE.Vector3(x, terrain(x, z), z))
        }
      }
    }
    const pg = new THREE.CylinderGeometry(0.07, 0.09, 4, 6)
    pg.translate(0, 2, 0)
    const poles = new THREE.InstancedMesh(pg, outside(new THREE.MeshStandardMaterial({ color: '#4c5258', roughness: 0.6 })), pts.length)
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 10, 8), outside(new THREE.MeshBasicMaterial({ color: '#fff0cf', toneMapped: false }), { haze: false }), pts.length)
    const glowTex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const g = c.getContext('2d')!
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      gr.addColorStop(0, 'rgba(255,255,255,1)')
      gr.addColorStop(0.25, 'rgba(255,255,255,0.45)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()
    const additive = (color: string) =>
      outside(new THREE.MeshBasicMaterial({ color, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }), { haze: false })
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), additive('#ffbf73'), pts.length)
    const glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 2.6), additive('#ffd9a0'), pts.length)
    const m = new THREE.Matrix4()
    pts.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z)
      poles.setMatrixAt(i, m)
      m.makeTranslation(p.x, p.y + 4.05, p.z)
      heads.setMatrixAt(i, m)
      m.makeTranslation(p.x, p.y + 0.06, p.z)
      pools.setMatrixAt(i, m)
      m.makeTranslation(p.x, p.y + 4.05, p.z)
      glows.setMatrixAt(i, m)
    })
    return { poles, heads, pools, glows }
  }, [])
  useFrame(() => {
    const on = THREE.MathUtils.smoothstep(env.night, 0.35, 0.8)
    ;(pools.material as THREE.MeshBasicMaterial).opacity = on * 0.5
    ;(glows.material as THREE.MeshBasicMaterial).opacity = on * 0.9
    ;(heads.material as THREE.MeshBasicMaterial).color.setScalar(0.45 + on * 0.6)
  })
  return (
    <group>
      <primitive object={poles} />
      <primitive object={heads} />
      <primitive object={pools} />
      <Billboards mesh={glows} />
    </group>
  )
}

/** Instanced billboards: rotate each instance to face the camera (cheap, ~40 lamps). */
function Billboards({ mesh }: { mesh: THREE.InstancedMesh }) {
  const base = useMemo(() => {
    const out: THREE.Vector3[] = []
    const m = new THREE.Matrix4()
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m)
      out.push(new THREE.Vector3().setFromMatrixPosition(m))
    }
    return out
  }, [mesh])
  useFrame(({ camera }) => {
    if (env.night < 0.3) return
    const m = new THREE.Matrix4()
    const one = new THREE.Vector3(1, 1, 1)
    base.forEach((p, i) => mesh.setMatrixAt(i, m.compose(p, camera.quaternion, one)))
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

/** The world outside: ground, PGP blocks, trees, lamps, distant ridge and skyline. Visible only through the windows. */
export function Scenery() {
  return (
    <group>
      <Ground />
      <Blocks />
      <Skyline />
      <Trees />
      <NearBough />
      <Lamps />
    </group>
  )
}
