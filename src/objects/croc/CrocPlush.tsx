import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { useRoom } from '../../state/store'
import { stickers } from '../../content/stickers'
import { palette } from '../../content/palette'
import { awardSticker, crocWorldPos, useCroc, CROC_SPOTS_Z } from './crocState'

const BELLY = '#cfe6a8'
const LINE = '#4f7d33'
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((p) => p[1])

/** Felt-like plush material: soft, no shine. */
function Felt({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={1} />
}

/** Sitting crocodile plush, about 0.3 tall, snout pointing +x (towards the open side of the room). */
function CrocModel({ squint }: { squint: React.MutableRefObject<number> }) {
  const eyes = useRef<THREE.Group[]>([])
  useFrame(() => {
    const k = THREE.MathUtils.lerp(eyes.current[0]?.scale.y ?? 1, squint.current ? 0.25 : 1, 0.25)
    eyes.current.forEach((g) => g && (g.scale.y = k))
  })
  return (
    <group>
      {/* body */}
      <mesh position={[0, 0.08, 0]} scale={[1.1, 0.9, 0.95]} castShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
        <Felt color={palette.croc} />
      </mesh>
      <mesh position={[0.045, 0.07, 0]} scale={[0.62, 0.72, 0.78]}>
        <sphereGeometry args={[0.1, 24, 16]} />
        <Felt color={BELLY} />
      </mesh>
      {/* tail */}
      <mesh position={[-0.13, 0.04, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]} castShadow>
        <coneGeometry args={[0.05, 0.16, 16]} />
        <Felt color={palette.croc} />
      </mesh>
      {/* back spikes */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.06 - i * 0.035, 0.17 - i * 0.03, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.018, 0.04, 8]} />
          <Felt color={LINE} />
        </mesh>
      ))}
      {/* head + long snout */}
      <mesh position={[0.02, 0.2, 0]} scale={[1, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.08, 32, 24]} />
        <Felt color={palette.croc} />
      </mesh>
      <mesh position={[0.11, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.85]} castShadow>
        <capsuleGeometry args={[0.05, 0.08, 8, 24]} />
        <Felt color={palette.croc} />
      </mesh>
      {/* nostrils */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.185, 0.222, s * 0.018]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshBasicMaterial color={LINE} />
        </mesh>
      ))}
      {/* smile */}
      <mesh position={[0.12, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.052, 0.004, 6, 24, Math.PI]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
      {/* big googly eyes on top */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[0.03, 0.27, s * 0.038]} ref={(g) => g && (eyes.current[i] = g)}>
          <mesh castShadow>
            <sphereGeometry args={[0.034, 24, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[0.026, 0.002, 0]}>
            <sphereGeometry args={[0.013, 16, 12]} />
            <meshBasicMaterial color="#2f2c26" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Croc plush on the bed. Each click pops a different sticker (unseen first, never the same twice in a row).
 * It hops to the other end of the bed, squinting in disgust, when the tomato comes close.
 */
export function CrocPlush() {
  const spot = useCroc((s) => s.spot)
  const line = useCroc((s) => s.line)
  const setFocus = useRoom((s) => s.setFocus)
  const bag = useRef<string[]>([])
  const last = useRef<string | null>(null)
  const busy = useRef(false)
  const hop = useRef<THREE.Group>(null)
  const squint = useRef(0)

  const { z, ry } = useSpring({
    z: CROC_SPOTS_Z[spot] - CROC_SPOTS_Z[0],
    ry: spot === 0 ? 0 : Math.PI, // turns its back on the tomato
    config: { tension: 170, friction: 16 },
  })

  useFrame(() => {
    const t = (performance.now() - useCroc.getState().disgustedAt) / 1000
    if (hop.current) hop.current.position.y = t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 0.18 : 0
    squint.current = t < 1.4 ? 1 : 0
  })

  const pop = () => {
    // Focusable focused the original spot; aim at where the croc actually is now.
    const [x, y, z] = crocWorldPos(useCroc.getState().spot)
    setFocus({ id: 'croc', position: [x, y + 0.15, z], distance: 1.4 })
    if (busy.current) return
    busy.current = true
    setTimeout(() => (busy.current = false), 700)
    const found = useRoom.getState().stickersFound
    if (!bag.current.length) {
      const pool = stickers.filter((s) => !s.hidden).map((s) => s.id)
      bag.current = [...shuffle(pool.filter((id) => !found.includes(id))), ...shuffle(pool.filter((id) => found.includes(id)))]
      if (bag.current[0] === last.current) bag.current.push(bag.current.shift()!)
    }
    last.current = bag.current.shift()!
    awardSticker(last.current)
  }

  return (
    <Focusable id="croc" position={crocWorldPos(0)} distance={1} onActivate={pop}>
      <animated.group position-z={z}>
        <group ref={hop}>
          <animated.group rotation-y={ry}>
            <CrocModel squint={squint} />
          </animated.group>
          {line && (
            <Html position={[0, 0.42, 0]} center zIndexRange={[30, 0]}>
              <div className="croc-bubble">{line}</div>
            </Html>
          )}
        </group>
      </animated.group>
    </Focusable>
  )
}
