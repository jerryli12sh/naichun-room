import { RoundedBox } from '@react-three/drei'
import { Shell } from './room/Shell'
import { Furniture } from './room/Furniture'
import { LightSwitch } from './room/LightSwitch'
import { SURFACES, WINDOWS } from '../content/layout'
import { Focusable } from './Focusable'
import { palette } from '../content/palette'
import { Suspense } from 'react'
import { Avatar } from '../avatar/Avatar'
import { Windows } from '../objects/Windows'
import { CdPlayer } from '../objects/CdPlayer'
import { AlarmClock } from '../objects/AlarmClock'
import { beep } from '../audio/audio'
import { useRoom } from '../state/store'

/**
 * PGPR Type C room (3 x 3.6 m, open on +x and +z like a diorama).
 * Shell + Furniture + LightSwitch are the room look (branch 2); positions come from content/layout.ts.
 * Each Focusable placeholder below is replaced by its feature branch.
 */
export function Room() {
  const set = useRoom((s) => s.set)
  return (
    <group>
      <Shell />
      <Furniture />
      <LightSwitch />

      {/* placeholders: one per feature branch */}
      <Focusable id="photo-wall" position={[-1.44, 1.55, 0.95]} distance={1.6}>
        <mesh><boxGeometry args={[0.04, 0.8, 1]} /><meshStandardMaterial color="#cfc6b8" /></mesh>
      </Focusable>
      <Windows />
      <Focusable id="cd-player" position={[SURFACES.cabinet.x - 0.1, SURFACES.cabinet.y, SURFACES.cabinet.z - 0.06]} distance={1} onActivate={() => set({ musicOn: !useRoom.getState().musicOn })}>
        <CdPlayer />
      </Focusable>
      <Focusable id="alarm-clock" position={[SURFACES.cabinet.x + 0.13, SURFACES.cabinet.y + 0.1, SURFACES.cabinet.z + 0.12]} distance={0.9} onActivate={() => (beep(), set({ alarmRangAt: Date.now() }))}>
        <AlarmClock />
      </Focusable>
      <Focusable id="croc" position={[SURFACES.bed.x + 0.15, SURFACES.bed.y + 0.06, -1.35]} distance={1}>
        <RoundedBox args={[0.3, 0.12, 0.14]} radius={0.05}><meshStandardMaterial color={palette.croc} /></RoundedBox>
      </Focusable>
      <Focusable id="letter" position={[SURFACES.desk.x - 0.1, SURFACES.desk.y + 0.005, SURFACES.desk.z + 0.12]} distance={0.8}>
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
