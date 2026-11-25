import { RoundedBox } from '@react-three/drei'
import { palette } from '../../content/palette'
import { useMemo } from 'react'
import * as THREE from 'three'
import { ROOM, RUG, SURFACES } from '../../content/layout'
import { FONT_HAND } from '../../content/fonts'

const BACK = -ROOM.d / 2

/** Single bed along the left wall, head against the back wall. */
function Bed() {
  const x = SURFACES.bed.x
  const len = 2.0
  const z = BACK + len / 2 + 0.04
  return (
    <group>
      <RoundedBox args={[0.98, 0.3, len]} radius={0.03} position={[x, 0.17, z]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.wood} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.94, 0.18, len - 0.04]} radius={0.07} smoothness={4} position={[x, 0.41, z]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.bedBlue} roughness={0.95} />
      </RoundedBox>
      {/* headboard */}
      <RoundedBox args={[1.0, 0.8, 0.05]} radius={0.02} position={[x, 0.5, BACK + 0.04]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.woodLight} roughness={0.55} />
      </RoundedBox>
      {/* pillow */}
      <RoundedBox args={[0.62, 0.11, 0.32]} radius={0.05} smoothness={4} position={[x, 0.55, BACK + 0.28]} castShadow>
        <meshStandardMaterial color="#eef0f4" roughness={1} />
      </RoundedBox>
      {/* folded duvet at the foot */}
      <RoundedBox args={[0.96, 0.09, 0.55]} radius={0.04} smoothness={4} position={[x, 0.54, z + len / 2 - 0.4]} castShadow>
        <meshStandardMaterial color="#e8e2d4" roughness={1} />
      </RoundedBox>
    </group>
  )
}

/** White bedside cabinet with a drawer, under the narrow window. */
function Cabinet() {
  const { x, z } = SURFACES.cabinet
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[0.42, 0.5, 0.42]} radius={0.03} position={[0, 0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.white} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.34, 0.212]}>
        <boxGeometry args={[0.3, 0.014, 0.01]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Long light-wood desk under the wide window, with a back upstand and white legs. */
function Desk() {
  const { x, z } = SURFACES.desk
  const w = 1.5
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, 0.05, 0.62]} radius={0.015} position={[0, 0.75, 0.04]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.wood} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[w - 0.04, 0.12, 0.56]} radius={0.01} position={[0, 0.66, 0.04]} castShadow>
        <meshStandardMaterial color={palette.woodDark} roughness={0.6} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.04, 0.72, 0.55]} radius={0.01} position={[s * (w / 2 - 0.03), 0.36, 0.04]} castShadow>
          <meshStandardMaterial color={palette.white} roughness={0.45} />
        </RoundedBox>
      ))}
      {/* books + desk lamp (laptop, scratch paper and mug belong to feat/desk-letter) */}
      {['#c9524a', '#4b7bb5', '#e2b04a', '#5c9a6b'].map((c, i) => (
        <RoundedBox key={c} args={[0.26, 0.04, 0.18]} radius={0.008} position={[-0.55, 0.795 + i * 0.042, -0.08]} rotation-y={0.15} castShadow>
          <meshStandardMaterial color={c} roughness={0.7} />
        </RoundedBox>
      ))}
      <group position={[0.65, 0, -0.12]}>
        <mesh position={[0, 0.785, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.02, 20]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0, 0.94, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.32, 8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[-0.05, 1.1, 0.03]} rotation-z={0.6}>
          <coneGeometry args={[0.07, 0.08, 20, 1, true]} />
          <meshStandardMaterial color="#2b6e66" side={2} />
        </mesh>
      </group>
    </group>
  )
}

/** Grey plastic chair, pulled out a little from the desk. */
function Chair() {
  return (
    <group position={[SURFACES.desk.x + 0.05, 0, SURFACES.desk.z + 0.64]} rotation-y={-0.12}>
      <RoundedBox args={[0.42, 0.04, 0.42]} radius={0.03} position={[0, 0.45, 0]} castShadow>
        <meshStandardMaterial color={palette.chair} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.36, 0.04]} radius={0.02} position={[0, 0.68, 0.2]} rotation-x={0.1} castShadow>
        <meshStandardMaterial color={palette.chair} roughness={0.45} />
      </RoundedBox>
      {[[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
          <meshStandardMaterial color={palette.chair} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}


/** Woven rug: the open floor in the middle of the room. */
function Rug() {
  return (
    <group position={[RUG.x, 0, RUG.z]}>
      <RoundedBox args={[RUG.w, 0.016, RUG.d]} radius={0.007} position={[0, 0.01, 0]} receiveShadow>
        <meshStandardMaterial color="#e7dfcd" roughness={1} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.019, s * (RUG.d / 2 - 0.08)]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[RUG.w - 0.2, 0.025]} />
          <meshStandardMaterial color="#a9b294" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Slippers waiting at the foot of the bed. */
function Slippers() {
  const { x, z } = SURFACES.bed
  return (
    <group position={[x + 0.62, 0, z + 1.2]} rotation-y={0.25}>
      {[-0.08, 0.08].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <RoundedBox args={[0.11, 0.03, 0.26]} radius={0.012} position={[0, 0.016, 0]} castShadow>
            <meshStandardMaterial color="#d9c9a5" roughness={0.9} />
          </RoundedBox>
          <RoundedBox args={[0.11, 0.045, 0.09]} radius={0.02} position={[0, 0.04, -0.06]} castShadow>
            <meshStandardMaterial color={palette.croc} roughness={0.9} />
          </RoundedBox>
        </group>
      ))}
    </group>
  )
}

/** Small paper poster on the left wall above the bed: 笑着过日子. */
function Poster() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 320
    const g = c.getContext('2d')!
    g.fillStyle = '#f7f1e3'
    g.fillRect(0, 0, 256, 320)
    g.fillStyle = '#6d7a58'
    g.textAlign = 'center'
    g.font = `56px ${FONT_HAND}`
    g.fillText('笑着', 128, 105)
    g.fillText('过日子', 128, 175)
    g.font = `30px ${FONT_HAND}`
    g.fillText('10.18', 128, 260)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <mesh position={[-ROOM.w / 2 + 0.006, 1.55, SURFACES.bed.z + 0.35]} rotation-y={Math.PI / 2} rotation-z={0.03}>
      <planeGeometry args={[0.4, 0.5]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

/** Canvas tote bag leaning by the desk. */
function Tote() {
  return (
    <group position={[SURFACES.desk.x + 0.62, 0, SURFACES.desk.z + 0.58]} rotation-y={-0.5} rotation-z={-0.06}>
      <RoundedBox args={[0.34, 0.4, 0.12]} radius={0.04} position={[0, 0.2, 0]} castShadow>
        <meshStandardMaterial color="#e6d8b4" roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.09, 0.008, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#b6a784" />
      </mesh>
    </group>
  )
}

export function Furniture() {
  return (
    <group>
      <Bed />
      <Cabinet />
      <Desk />
      <Chair />
      <Rug />
      <Slippers />
      <Poster />
      <Tote />
    </group>
  )
}
