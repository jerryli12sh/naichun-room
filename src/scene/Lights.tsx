import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRoom } from '../state/store'
import { nightness, PANEL, ROOM, SURFACES } from '../content/layout'
import { env, stepEnv } from './outside/env'

const lerp = THREE.MathUtils.lerp
const DAY_BG = new THREE.Color('#f5efe6')
const NIGHT_BG = new THREE.Color('#141a2b')
const SUN = new THREE.Color('#fff1d6')
const GOLD = new THREE.Color('#ffb877')
const MOON = new THREE.Color('#7d98e0')
const HEMI_DAY = new THREE.Color('#fff4e0')
const HEMI_NIGHT = new THREE.Color('#8fa6d8')

/**
 * Lighting and day/night. timeOfDay (store) sets the target; everything eases toward it,
 * so flipping the switch fades rather than cuts. Also paints the background.
 * The key light is the sun by day (direction follows the hour, see outside/env.ts) and the moon by night,
 * one shadow-casting light either way. The view outside and the beams are in scene/outside/.
 */
const COVE_X = (PANEL.x0 + PANEL.x1) / 2 - 0.15

export function Lights() {
  const hour = useRoom((s) => s.timeOfDay)
  const raining = useRoom((s) => s.isRaining)
  const n = useRef(nightness(hour))
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const cove = useRef<THREE.PointLight>(null)
  const coveUp = useRef<THREE.SpotLight>(null)
  const desk = useRef<THREE.PointLight>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const bg = useRef(new THREE.Color())

  useFrame((_, dt) => {
    const target = nightness(hour)
    n.current += (target - n.current) * Math.min(1, dt * 1.5)
    const t = n.current
    stepEnv(hour, raining, dt)
    const wet = env.rain
    hemi.current!.intensity = lerp(1.25, 0.35, t) * (1 - wet * 0.22) + env.flash * 1.5
    hemi.current!.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, t)
    const key = sun.current!
    key.target.updateMatrixWorld()
    key.position.copy(env.keyDir).multiplyScalar(8).add(key.target.position)
    key.intensity = (2.6 * env.sunUp + 0.55 * t) * (1 - wet * 0.85) + env.flash * 2
    key.color.copy(SUN).lerp(GOLD, env.golden).lerp(MOON, t)
    fill.current!.intensity = lerp(0.6, 0.08, t) * (1 - wet * 0.3)
    cove.current!.intensity = lerp(0.5, 3.2, t)
    coveUp.current!.intensity = lerp(0.6, 4, t)
    desk.current!.intensity = lerp(0, 1.8, t)
    glowMat.current!.color.setRGB(1, 0.84, 0.6).multiplyScalar(lerp(0.7, 1.3, t))
    bg.current.copy(DAY_BG).lerp(NIGHT_BG, t)
    scene.background = bg.current
  })

  return (
    <>
      <hemisphereLight ref={hemi} groundColor="#8a7560" />
      {/* sun (moon at night) comes in through the back window */}
      <directionalLight
        ref={sun}
        color="#fff1d6"
        position={[3, 5, -6]}
        target-position={[0.4, 0.8, -0.6]}
        castShadow
        shadow-radius={3}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <directionalLight ref={fill} position={[4, 4, 6]} />
      {/* warm cove light on the yellow panel */}
      <pointLight ref={cove} color="#ffc37a" position={[COVE_X, PANEL.lampY + 0.03, -ROOM.d / 2 + 0.45]} distance={4} decay={1.6} />
      <spotLight ref={coveUp} color="#ffc37a" position={[COVE_X, PANEL.lampY - 0.02, -ROOM.d / 2 + 0.16]} distance={2.5} angle={1.2} penumbra={0.8} decay={1}>
        <object3D attach="target" position={[COVE_X, PANEL.lampY + 0.8, -ROOM.d / 2 + 0.05]} />
      </spotLight>
      <mesh position={[COVE_X, PANEL.lampY + 0.043, -ROOM.d / 2 + 0.16]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.95, 0.03]} />
        <meshBasicMaterial ref={glowMat} toneMapped={false} />
      </mesh>
      {/* desk lamp */}
      <pointLight ref={desk} color="#ffd08a" position={[SURFACES.desk.x + 0.6, 1.05, -1.5]} distance={2.2} decay={1.5} />
    </>
  )
}
