import { RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { useRoom } from '../../state/store'
import { palette } from '../../content/palette'
import { BED_TOP } from './crocState'

/** Little green sticker notebook lying on the bed; opening it shows the croc sticker album. */
export function AlbumBook() {
  const cover = useTexture(`${import.meta.env.BASE_URL}stickers/hi.jpg`)
  cover.colorSpace = THREE.SRGBColorSpace
  const open = () => useRoom.getState().set({ albumOpen: true })
  return (
    <Focusable id="croc-album" position={[-0.72, BED_TOP + 0.012, 0.22]} distance={0.9} onActivate={open}>
      <group rotation-y={0.35}>
        <RoundedBox args={[0.2, 0.024, 0.15]} radius={0.008} castShadow>
          <meshStandardMaterial color={palette.croc} roughness={0.9} />
        </RoundedBox>
        {/* pages peeking out */}
        <mesh position={[0.004, 0, 0]}>
          <boxGeometry args={[0.192, 0.016, 0.142]} />
          <meshStandardMaterial color="#fbf5e8" />
        </mesh>
        {/* sticker on the cover */}
        <mesh position={[0.02, 0.0125, 0]} rotation={[-Math.PI / 2, 0, -0.15]}>
          <planeGeometry args={[0.08, 0.08]} />
          <meshStandardMaterial map={cover} roughness={0.8} />
        </mesh>
      </group>
    </Focusable>
  )
}
