import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const URL = `${import.meta.env.BASE_URL}models/naichun.glb`

/**
 * Static image-to-3D model of 乃春 (about 1 unit tall, centred on the origin, faces -Z).
 * Branch 3 adds rigging, animations and the behaviour state machine.
 */
export function Avatar({ height = 0.6 }: { height?: number }) {
  const { scene } = useGLTF(URL)
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      const mat = m.material as THREE.MeshStandardMaterial
      if ('metalness' in mat) mat.metalness = 0
    })
  }, [scene])
  return <primitive object={scene} scale={height} position-y={height / 2} rotation-y={Math.PI} />
}

useGLTF.preload(URL)
