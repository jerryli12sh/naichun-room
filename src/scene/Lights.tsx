import { useRoom } from '../state/store'

/** Placeholder lighting. Branch 2 (room-look) owns the real setup and day/night. */
export function Lights() {
  const t = useRoom((s) => s.timeOfDay)
  const night = t < 7 || t >= 19
  return (
    <>
      <ambientLight intensity={night ? 0.35 : 0.7} />
      <directionalLight position={[5, 8, 4]} intensity={night ? 0.4 : 1.2} castShadow shadow-mapSize={[1024, 1024]} />
      {/* warm cove light above the bed panel */}
      <pointLight position={[-1.2, 2.3, -1.6]} color="#ffcf8a" intensity={night ? 6 : 2} distance={6} />
    </>
  )
}
