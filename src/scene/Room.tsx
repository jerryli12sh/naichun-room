import { RoundedBox } from '@react-three/drei'
import { Focusable } from './Focusable'
import { palette } from '../content/palette'
import { Suspense } from 'react'
import { Avatar } from '../avatar/Avatar'
import { CrocCorner } from '../objects/croc'

/**
 * Grey-box PGPR Type C room (about 3 x 3.6 m, open on +x and +z like a diorama).
 * Each placeholder below is replaced by its feature branch.
 */
export function Room() {
  return (
    <group>
      {/* base plinth */}
      <RoundedBox args={[4.2, 0.2, 4.8]} radius={0.08} position={[0.3, -0.1, 0.3]} receiveShadow>
        <meshStandardMaterial color="#e9e2d6" roughness={0.9} />
      </RoundedBox>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[3, 3.6]} />
        <meshStandardMaterial color={palette.wood} roughness={0.8} />
      </mesh>
      {/* back wall (-z) and left wall (-x) */}
      <mesh position={[0, 1.4, -1.8]} receiveShadow>
        <boxGeometry args={[3, 2.8, 0.08]} />
        <meshStandardMaterial color={palette.cream} />
      </mesh>
      <mesh position={[-1.5, 1.4, 0]} receiveShadow>
        <boxGeometry args={[0.08, 2.8, 3.6]} />
        <meshStandardMaterial color={palette.cream} />
      </mesh>
      {/* yellow wall panel + grey-blue lower panel behind the bed */}
      <mesh position={[-1.44, 1.7, -0.6]}>
        <boxGeometry args={[0.04, 1.2, 2.2]} />
        <meshStandardMaterial color={palette.pgprYellow} />
      </mesh>
      <mesh position={[-1.44, 0.8, -0.6]}>
        <boxGeometry args={[0.04, 0.6, 2.2]} />
        <meshStandardMaterial color={palette.bedBlue} />
      </mesh>

      {/* bed (branch 2) */}
      <RoundedBox args={[1, 0.45, 2]} radius={0.06} position={[-0.95, 0.23, -0.6]} castShadow>
        <meshStandardMaterial color={palette.bedBlue} />
      </RoundedBox>
      {/* desk along the back wall (branch 2 / 7) */}
      <RoundedBox args={[1.6, 0.06, 0.6]} radius={0.02} position={[0.6, 0.75, -1.45]} castShadow>
        <meshStandardMaterial color={palette.wood} />
      </RoundedBox>

      {/* placeholders: one per feature branch */}
      <Focusable id="photo-wall" position={[-1.4, 1.6, 0.8]} distance={1.6}>
        <mesh><boxGeometry args={[0.04, 0.8, 1]} /><meshStandardMaterial color="#cfc6b8" /></mesh>
      </Focusable>
      <Focusable id="window" position={[0.6, 1.7, -1.75]} distance={2}>
        <mesh><boxGeometry args={[1, 1, 0.04]} /><meshStandardMaterial color={palette.night} /></mesh>
      </Focusable>
      <Focusable id="cd-player" position={[-1.25, 0.6, 0.55]} distance={1}>
        <RoundedBox args={[0.25, 0.1, 0.25]} radius={0.03}><meshStandardMaterial color="#bbbbbb" /></RoundedBox>
      </Focusable>
      <Focusable id="alarm-clock" position={[-1.25, 0.7, 0.55]} distance={0.9}>
        <mesh><sphereGeometry args={[0.07, 24, 16]} /><meshStandardMaterial color={palette.pgprYellow} /></mesh>
      </Focusable>
      <CrocCorner />
      <Focusable id="letter" position={[0.9, 0.79, -1.35]} distance={0.8}>
        <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[0.22, 0.14]} /><meshStandardMaterial color="#fffaf0" /></mesh>
      </Focusable>
      <Focusable id="avatar" position={[0.3, 0, 0.3]} distance={1.4}>
        <Suspense fallback={null}>
          <Avatar />
        </Suspense>
      </Focusable>
    </group>
  )
}
