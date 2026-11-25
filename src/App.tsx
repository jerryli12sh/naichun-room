import { Canvas } from '@react-three/fiber'
import { Room } from './scene/Room'
import { CameraRig } from './scene/CameraRig'
import { Lights } from './scene/Lights'
import { useRoom } from './state/store'

export function App() {
  const clearFocus = useRoom((s) => s.clearFocus)
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [7, 6, 7], fov: 35 }}
      onPointerMissed={(e) => e.detail === 2 && clearFocus()}
    >
      <color attach="background" args={['#1e2b45']} />
      <Lights />
      <Room />
      <CameraRig />
    </Canvas>
  )
}
