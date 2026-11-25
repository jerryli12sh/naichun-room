import { useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useRoom } from '../../state/store'
import { nightness, ROOM } from '../../content/layout'

/** Wall switch by the open side: flips between afternoon (14h) and night (22h). */
export function LightSwitch() {
  const hour = useRoom((s) => s.timeOfDay)
  const set = useRoom((s) => s.set)
  const [hover, setHover] = useState(false)
  const isNight = nightness(hour) > 0.5
  return (
    <group
      position={[-ROOM.w / 2 + 0.012, 1.15, ROOM.d / 2 - 0.1]}
      onClick={(e) => (e.stopPropagation(), set({ timeOfDay: isNight ? 14 : 22 }))}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
      onPointerOut={() => (setHover(false), (document.body.style.cursor = 'auto'))}
    >
      <RoundedBox args={[0.02, 0.12, 0.08]} radius={0.006}>
        <meshStandardMaterial color="#f6f4ef" emissive="#ffd59a" emissiveIntensity={hover ? 0.4 : 0} />
      </RoundedBox>
      <RoundedBox args={[0.02, 0.05, 0.04]} radius={0.006} position={[0.012, 0, 0]} rotation-z={isNight ? 0.3 : -0.3}>
        <meshStandardMaterial color="#e0ded8" />
      </RoundedBox>
    </group>
  )
}
