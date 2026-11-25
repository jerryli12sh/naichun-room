import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { palette } from '../../content/palette'
import { PANEL, ROOM, WINDOWS } from '../../content/layout'
import { makePanelTexture, makePlankTexture } from './textures'

/** Back wall with the two window openings cut out (extruded shape). */
function BackWall() {
  const geo = useMemo(() => {
    const w = ROOM.w + ROOM.wall * 2
    const s = new THREE.Shape()
    s.moveTo(-w / 2, 0)
    s.lineTo(w / 2, 0)
    s.lineTo(w / 2, ROOM.h)
    s.lineTo(-w / 2, ROOM.h)
    s.closePath()
    for (const o of Object.values(WINDOWS)) {
      const p = new THREE.Path()
      p.moveTo(o.cx - o.w / 2, o.y0)
      p.lineTo(o.cx + o.w / 2, o.y0)
      p.lineTo(o.cx + o.w / 2, o.y0 + o.h)
      p.lineTo(o.cx - o.w / 2, o.y0 + o.h)
      p.closePath()
      s.holes.push(p)
    }
    return new THREE.ExtrudeGeometry(s, { depth: ROOM.wall, bevelEnabled: false })
  }, [])
  return (
    <mesh geometry={geo} position={[0, 0, -ROOM.d / 2 - ROOM.wall / 2]} castShadow receiveShadow>
      <meshStandardMaterial color={palette.cream} roughness={0.92} />
    </mesh>
  )
}

/** Plinth, floor, walls, skirting, the yellow wood panel with its grey lower band, and the cove lamp bar. */
export function Shell() {
  const plank = useMemo(makePlankTexture, [])
  const grain = useMemo(makePanelTexture, [])
  const panelW = PANEL.x1 - PANEL.x0
  const panelX = (PANEL.x0 + PANEL.x1) / 2
  const wallZ = -ROOM.d / 2
  return (
    <group>
      {/* plinth: the "figurine base" */}
      <RoundedBox args={[ROOM.w + 0.6, 0.24, ROOM.d + 0.6]} radius={0.1} smoothness={4} position={[0.15, -0.12, 0.15]} receiveShadow>
        <meshStandardMaterial color={palette.plinth} roughness={0.55} />
      </RoundedBox>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial map={plank} roughness={0.55} />
      </mesh>

      <BackWall />
      {/* left wall */}
      <mesh position={[-ROOM.w / 2 - ROOM.wall / 2, ROOM.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROOM.wall, ROOM.h, ROOM.d]} />
        <meshStandardMaterial color={palette.cream} roughness={0.92} />
      </mesh>
      {/* wall top caps: a darker edge so the cut-away reads as a model */}
      <mesh position={[0, ROOM.h + 0.005, -ROOM.d / 2 - ROOM.wall / 2]}>
        <boxGeometry args={[ROOM.w + ROOM.wall * 2, 0.01, ROOM.wall]} />
        <meshStandardMaterial color={palette.capEdge} />
      </mesh>
      <mesh position={[-ROOM.w / 2 - ROOM.wall / 2, ROOM.h + 0.005, 0]}>
        <boxGeometry args={[ROOM.wall, 0.01, ROOM.d]} />
        <meshStandardMaterial color={palette.capEdge} />
      </mesh>

      {/* skirting */}
      <mesh position={[0, 0.05, -ROOM.d / 2 + 0.012]} receiveShadow>
        <boxGeometry args={[ROOM.w, 0.1, 0.02]} />
        <meshStandardMaterial color={palette.skirting} roughness={0.6} />
      </mesh>
      <mesh position={[-ROOM.w / 2 + 0.012, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.02, 0.1, ROOM.d]} />
        <meshStandardMaterial color={palette.skirting} roughness={0.6} />
      </mesh>

      {/* PGPR yellow wood panel on the back wall above the bed head, grey lower band behind the bed */}
      <RoundedBox args={[panelW, PANEL.y1 - PANEL.y0, 0.05]} radius={0.012} position={[panelX, (PANEL.y0 + PANEL.y1) / 2, wallZ + 0.025]} receiveShadow castShadow>
        <meshStandardMaterial color={palette.pgprYellow} map={grain} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[panelW, PANEL.y0 - 0.18, 0.06]} radius={0.012} position={[panelX, (PANEL.y0 + 0.18) / 2, wallZ + 0.03]} receiveShadow>
        <meshStandardMaterial color={palette.panelGrey} roughness={0.85} />
      </RoundedBox>
      {/* cove lamp bar on the panel; its light lives in <Lights/> */}
      <RoundedBox args={[1.0, 0.08, 0.12]} radius={0.025} position={[panelX - 0.15, PANEL.lampY, wallZ + 0.11]} castShadow>
        <meshStandardMaterial color="#26262a" roughness={0.4} />
      </RoundedBox>
    </group>
  )
}
