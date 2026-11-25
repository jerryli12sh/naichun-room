import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useRoom } from '../state/store'

const HOME = { pos: [7, 6, 7] as const, target: [0, 0.8, 0] as const }

/** Free orbit limited to the room's open front; flies to whatever is focused. Esc goes home. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const focus = useRoom((s) => s.focus)
  const clearFocus = useRoom((s) => s.clearFocus)
  const dragging = useRoom((s) => s.dragging)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (focus) {
      const [x, y, z] = focus.position
      const d = focus.distance ?? 2
      c.setLookAt(x + d * 0.7, y + d * 0.5, z + d * 0.7, x, y, z, true)
    } else {
      c.setLookAt(...HOME.pos, ...HOME.target, true)
    }
  }, [focus])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clearFocus()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearFocus])

  return (
    <CameraControls
      ref={ref}
      enabled={!dragging}
      smoothTime={0.4}
      minDistance={1.2}
      maxDistance={14}
      minAzimuthAngle={-Math.PI / 12}
      maxAzimuthAngle={Math.PI / 2 + Math.PI / 12}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}
