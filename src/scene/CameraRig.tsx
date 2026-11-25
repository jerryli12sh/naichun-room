import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../state/store'

const HOME = { pos: [6.6, 5.9, 7.4] as const, target: [0, 0.8, 0] as const }
const DEFAULT_DIR: [number, number, number] = [0.7, 0.5, 0.7]
/**
 * Jerry: clicking should not zoom in so much. Every object's requested distance is pulled back to keep
 * the room around it in view. Wide shots (the ending, distance >= 5) are left alone.
 */
const PULL_BACK = 1.9
const MIN_FOCUS_DISTANCE = 2.2
export const focusDistance = (d = 2) => (d >= 5 ? d : Math.max(MIN_FOCUS_DISTANCE, d * PULL_BACK))
// Tried in order until the line from the target to the camera is clear: azimuth offsets (deg) x extra lift.
const SWINGS = [0, 20, -20, 40, -40, 60, -60, 80, -80]
const LIFTS = [0, 0.35, 0.7]

const raycaster = new THREE.Raycaster()
const up = new THREE.Vector3(0, 1, 0)

/** Does anything solid sit between the target and the camera spot? Hits within `ownRadius` of the target are its own mesh. */
function blocked(scene: THREE.Scene, camera: THREE.Camera, from: THREE.Vector3, to: THREE.Vector3, ownRadius: number) {
  const dir = to.clone().sub(from)
  const len = dir.length()
  raycaster.set(from, dir.normalize())
  raycaster.far = len
  raycaster.camera = camera // sprites need it
  return raycaster.intersectObjects(scene.children, true).some((h) => {
    if (h.distance < ownRadius) return false
    const m = (h.object as THREE.Mesh).material as THREE.Material | undefined
    if (!h.object.visible || (m && m.transparent && m.opacity < 0.5)) return false
    return true
  })
}

/** Pick a camera spot near `dir` from which the target is actually visible. */
export function clearViewpoint(scene: THREE.Scene, camera: THREE.Camera, target: THREE.Vector3, dir: THREE.Vector3, distance: number) {
  const base = dir.clone().normalize()
  for (const lift of LIFTS) {
    for (const deg of SWINGS) {
      const d = base.clone().applyAxisAngle(up, THREE.MathUtils.degToRad(deg))
      d.y += lift
      d.normalize()
      const cam = target.clone().addScaledVector(d, distance)
      if (!blocked(scene, camera, target, cam, Math.min(0.15, distance * 0.2))) return cam
    }
  }
  return target.clone().addScaledVector(base, distance)
}

/**
 * Free orbit limited to the room's open front; flies to whatever is focused. Esc goes home.
 * Focus approach: FocusTarget.dir if given, else the front diagonal; then swings around until nothing
 * (desk, bed, walls) blocks the view.
 */
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const focus = useRoom((s) => s.focus)
  const clearFocus = useRoom((s) => s.clearFocus)
  const dragging = useRoom((s) => s.dragging)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (focus) {
      const target = new THREE.Vector3(...focus.position)
      const cam = clearViewpoint(scene, camera, target, new THREE.Vector3(...(focus.dir ?? DEFAULT_DIR)), focusDistance(focus.distance))
      c.setLookAt(cam.x, cam.y, cam.z, target.x, target.y, target.z, true)
    } else {
      c.setLookAt(...HOME.pos, ...HOME.target, true)
    }
  }, [focus, scene, camera])

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
      minDistance={0.5}
      maxDistance={14}
      minAzimuthAngle={-Math.PI / 12}
      maxAzimuthAngle={Math.PI / 2 + Math.PI / 12}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}
