import { Canvas } from '@react-three/fiber'
import { Room } from './scene/Room'
import { CameraRig } from './scene/CameraRig'
import { Lights } from './scene/Lights'
import { DoorIntro } from './intro/DoorIntro'
import { IntroOverlay } from './intro/IntroOverlay'
import { useRoom } from './state/store'
import { useIntro } from './intro/introStore'
import { LetterOverlay } from './objects/letter/LetterOverlay'
import { StickerOverlay } from './objects/croc'

export function App() {
  const clearFocus = useRoom((s) => s.clearFocus)
  const entered = useRoom((s) => s.entered)
  const introDone = useIntro((s) => s.phase === 'done')
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [7, 6, 7], fov: 35 }}
        gl={{ preserveDrawingBuffer: import.meta.env.DEV, stencil: true }}
        onPointerMissed={(e) => entered && e.detail === 2 && clearFocus()}
      >
        {/* one world: the room is always there; the door intro is built onto its front wall */}
        <Lights />
        <Room />
        {!introDone && <DoorIntro />}
        {entered && <CameraRig />}
      </Canvas>
      <IntroOverlay />
      {entered && <StickerOverlay />}
      <LetterOverlay />
    </>
  )
}
