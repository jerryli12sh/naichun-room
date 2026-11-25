import { RoundedBox } from '@react-three/drei'
import { Shell } from './room/Shell'
import { Furniture } from './room/Furniture'
import { LightSwitch } from './room/LightSwitch'
import { PHOTO_WALL, SURFACES, WINDOWS } from '../content/layout'
import { Focusable } from './Focusable'
import { palette } from '../content/palette'
import { Suspense } from 'react'
import { Desk } from '../objects/desk/Desk'
import { Letter } from '../objects/letter/Letter'
import { PhotoWall, PHOTO_WALL_ID } from '../objects/photo-wall/PhotoWall'
import { RoomAvatar } from '../avatar/RoomAvatar'
import { Windows } from '../objects/Windows'
import { CdPlayer } from '../objects/CdPlayer'
import { AlarmClock } from '../objects/AlarmClock'
import { beep } from '../audio/audio'
import { useRoom } from '../state/store'
import { CrocCorner } from '../objects/croc'

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
      <Focusable id={PHOTO_WALL_ID} position={[PHOTO_WALL.x, PHOTO_WALL.y, PHOTO_WALL.z]} distance={2.1} dir={[1, 0.1, 0.15]} hoverLift={0} squash={false}>
        <PhotoWall />
      </Focusable>
      <Windows />
      <Focusable id="cd-player" position={[SURFACES.cabinet.x - 0.1, SURFACES.cabinet.y, SURFACES.cabinet.z - 0.06]} distance={1} onActivate={() => set({ musicOn: !useRoom.getState().musicOn })}>
        <CdPlayer />
      </Focusable>
      <Focusable id="alarm-clock" position={[SURFACES.cabinet.x + 0.13, SURFACES.cabinet.y + 0.1, SURFACES.cabinet.z + 0.12]} distance={0.9} onActivate={() => (beep(), set({ alarmRangAt: Date.now() }))}>
        <AlarmClock />
      </Focusable>
      <CrocCorner />
      {/* desk-top props + letter + ending (branch 7) */}
      <Desk />
      <Letter />
      {/* the avatar moves around, so it handles its own click and camera focus */}
      <Suspense fallback={null}>
        <RoomAvatar />
      </Suspense>
    </group>
  )
}
