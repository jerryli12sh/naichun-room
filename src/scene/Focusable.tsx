import { useState, type ReactNode } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { ThreeEvent } from '@react-three/fiber'
import { useRoom } from '../state/store'

type Props = {
  id: string
  position: [number, number, number]
  distance?: number
  /** Camera direction when focused, see FocusTarget.dir. */
  dir?: [number, number, number]
  /** How far it rises on hover. Use 0 for things fixed to a wall. */
  hoverLift?: number
  /** Squash on click. Turn off for big flat things like walls. */
  squash?: boolean
  onActivate?: () => void
  children: ReactNode
}

/**
 * Shared "clickable object" behaviour: hover lifts it a little, a click squashes,
 * flies the camera over, then calls onActivate. Every object branch wraps its mesh in this.
 */
export function Focusable({ id, position, distance, dir, hoverLift = 0.04, squash = true, onActivate, children }: Props) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const setFocus = useRoom((s) => s.setFocus)
  const { y, scale } = useSpring({
    y: position[1] + (hover ? hoverLift : 0),
    scale: pressed ? [1.08, 0.88, 1.08] : [1, 1, 1],
    config: { tension: 320, friction: 14 },
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (squash) {
      setPressed(true)
      setTimeout(() => setPressed(false), 120)
    }
    if (useRoom.getState().focus?.id !== id) setFocus({ id, position, distance, dir })
    onActivate?.()
  }

  return (
    <animated.group
      position-x={position[0]}
      position-y={y}
      position-z={position[2]}
      scale={scale as unknown as [number, number, number]}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
      onPointerOut={() => (setHover(false), (document.body.style.cursor = 'auto'))}
      onClick={click}
    >
      {children}
    </animated.group>
  )
}
