import { useState, type ReactNode } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type { ThreeEvent } from '@react-three/fiber'
import { useRoom } from '../state/store'

type Props = {
  id: string
  position: [number, number, number]
  distance?: number
  onActivate?: () => void
  children: ReactNode
}

/**
 * Shared "clickable object" behaviour: hover lifts it a little, a click squashes,
 * flies the camera over, then calls onActivate. Every object branch wraps its mesh in this.
 */
export function Focusable({ id, position, distance, onActivate, children }: Props) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const setFocus = useRoom((s) => s.setFocus)
  const { y, scale } = useSpring({
    y: position[1] + (hover ? 0.04 : 0),
    scale: pressed ? [1.08, 0.88, 1.08] : [1, 1, 1],
    config: { tension: 320, friction: 14 },
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setPressed(true)
    setTimeout(() => setPressed(false), 120)
    setFocus({ id, position, distance })
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
