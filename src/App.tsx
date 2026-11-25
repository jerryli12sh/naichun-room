import { Canvas } from '@react-three/fiber'
import { Room } from './scene/Room'
import { CameraRig } from './scene/CameraRig'
import { Lights } from './scene/Lights'
import { useRoom } from './state/store'
import { LetterOverlay } from './objects/letter/LetterOverlay'
import { StickerOverlay } from './objects/croc'

export function App() {
  const clearFocus = useRoom((s) => s.clearFocus)
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [7, 6, 7], fov: 35 }}
        onPointerMissed={(e) => e.detail === 2 && clearFocus()}
      >
        <Lights />
        <Room />
        <CameraRig />
      </Canvas>
      <StickerOverlay />
      <LetterOverlay />
    </>
  )
}
