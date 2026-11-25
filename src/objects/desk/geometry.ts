import * as THREE from 'three'
import { SURFACES } from '../../content/layout'

/** Desk-top anchor. The slab top sits 4 mm under the nominal SURFACES.desk.y, so props rest on it rather than float. */
export const DX = SURFACES.desk.x
export const DZ = SURFACES.desk.z
export const TOP = SURFACES.desk.y - 0.004

/**
 * Clearance under the window sill: the sill sticks out from the back wall to about z = -1.62 at y ≈ 0.93.
 * Anything taller than SILL_Y - TOP must stay in front of SILL_Z.
 */
export const SILL_Z = -1.6
export const SILL_Y = 0.93

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/**
 * A flat slab with rounded corners and softly bevelled edges, lying in the XZ plane,
 * bottom face at y = 0, top at y = thickness.
 */
export function slab(w: number, d: number, thickness: number, r: number, bevel = Math.min(thickness * 0.35, 0.002)) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, d - bevel * 2, Math.max(0.0005, r - bevel)), {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  })
  // extrude runs along +z; lay it down so thickness runs along +y
  g.rotateX(-Math.PI / 2)
  g.translate(0, bevel, 0)
  g.computeVertexNormals()
  return g
}

/** A sheet of paper in the XZ plane with an optional curled corner (+x, +z) and a faint wave. */
export function paperGeometry(w: number, d: number, curl = 0, wave = 0.0006) {
  const g = new THREE.PlaneGeometry(w, d, 16, 20)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / w + 0.5
    const v = p.getZ(i) / d + 0.5
    const corner = Math.max(0, u + v - 1.45)
    p.setY(i, curl * corner * corner + wave * Math.sin(u * 7.1 + v * 3.3) * (u * (1 - u) * 4))
  }
  g.computeVertexNormals()
  return g
}
