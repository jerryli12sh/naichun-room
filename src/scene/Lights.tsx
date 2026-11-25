import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRoom } from '../state/store'
import { nightness, PANEL, ROOM, SURFACES, WINDOWS } from '../content/layout'

const lerp = THREE.MathUtils.lerp
const DAY_BG = new THREE.Color('#f5efe6')
const NIGHT_BG = new THREE.Color('#141a2b')
const DAY_SKY = new THREE.Color('#9cc8ea')
const NIGHT_SKY = new THREE.Color('#1b2c52')
const HEMI_DAY = new THREE.Color('#fff4e0')
const HEMI_NIGHT = new THREE.Color('#8fa6d8')

/**
 * Lighting and day/night. timeOfDay (store) sets the target; everything eases toward it,
 * so flipping the switch fades rather than cuts. Also paints the background and the
 * plain sky behind the window openings (branch 5 draws rain/glass on top of it).
 */
const COVE_X = (PANEL.x0 + PANEL.x1) / 2 - 0.15

export function Lights() {
  const hour = useRoom((s) => s.timeOfDay)
  const n = useRef(nightness(hour))
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const moon = useRef<THREE.DirectionalLight>(null)
  const cove = useRef<THREE.PointLight>(null)
  const coveUp = useRef<THREE.SpotLight>(null)
  const desk = useRef<THREE.PointLight>(null)
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: DAY_SKY.clone(), toneMapped: false }), [])
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const bg = useRef(new THREE.Color())

  useFrame((_, dt) => {
    const target = nightness(hour)
    n.current += (target - n.current) * Math.min(1, dt * 1.5)
    const t = n.current
    hemi.current!.intensity = lerp(1.25, 0.35, t)
    hemi.current!.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, t)
    sun.current!.intensity = lerp(2.2, 0, t)
    fill.current!.intensity = lerp(0.6, 0.08, t)
    moon.current!.intensity = lerp(0, 0.45, t)
    cove.current!.intensity = lerp(0.5, 3.2, t)
    coveUp.current!.intensity = lerp(0.6, 4, t)
    desk.current!.intensity = lerp(0, 1.8, t)
    glowMat.current!.color.setRGB(1, 0.84, 0.6).multiplyScalar(lerp(0.7, 1.3, t))
    skyMat.color.copy(DAY_SKY).lerp(NIGHT_SKY, t)
    bg.current.copy(DAY_BG).lerp(NIGHT_BG, t)
    scene.background = bg.current
  })

  const backZ = -ROOM.d / 2 - ROOM.wall - 0.02
  return (
    <>
      <hemisphereLight ref={hemi} groundColor="#8a7560" />
      {/* sun comes in through the back windows */}
      <directionalLight
        ref={sun}
        color="#fff1d6"
        position={[3, 5, -6]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <directionalLight ref={fill} position={[4, 4, 6]} />
      <directionalLight ref={moon} color="#6f8fd6" position={[1, 4, -6]} />
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
      {/* plain sky behind the openings */}
      {Object.values(WINDOWS).map((o) => (
        <mesh key={o.cx} position={[o.cx, o.y0 + o.h / 2, backZ]} material={skyMat}>
          <planeGeometry args={[o.w + 0.02, o.h + 0.02]} />
        </mesh>
      ))}
    </>
  )
}
