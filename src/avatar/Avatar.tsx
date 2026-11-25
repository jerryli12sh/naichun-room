import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { AVATAR_HEIGHT } from '../content/layout'

const URL = `${import.meta.env.BASE_URL}models/naichun.glb`

/**
 * The image-to-3D model of 乃春, normalised: feet on y = 0, centred on x/z, facing +z, `height` tall.
 * Each call gets its own copy, so the door intro and the room can both show him.
 */
export function useAvatarModel(height = AVATAR_HEIGHT) {
  const { scene } = useGLTF(URL)
  return useMemo(() => {
    const model = scene.clone(true)
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      // The GLB leaves metalness out, so three.js uses the glTF default of 1 and he renders dark.
      // Same fix as the plain demo: metalness 0, roughness 0.65, original texture kept.
      for (const mat of [m.material].flat() as THREE.MeshStandardMaterial[]) {
        if (!('metalness' in mat)) continue
        mat.metalness = 0
        mat.roughness = 0.65
        mat.metalnessMap = null
        mat.needsUpdate = true
      }
    })
    model.rotation.y = Math.PI // the GLB faces -z
    const box = new THREE.Box3().setFromObject(model)
    model.scale.setScalar(height / box.getSize(new THREE.Vector3()).y)
    box.setFromObject(model)
    const c = box.getCenter(new THREE.Vector3())
    model.position.set(-c.x, -box.min.y, -c.z)
    const holder = new THREE.Group()
    holder.add(model)
    return { holder, depth: box.max.z - box.min.z, width: box.max.x - box.min.x }
  }, [scene, height])
}

/** Static model, feet on the origin. Use this anywhere he only needs to stand there (the door intro). */
export function Avatar({ height = AVATAR_HEIGHT }: { height?: number }) {
  const { holder } = useAvatarModel(height)
  return <primitive object={holder} />
}

useGLTF.preload(URL)
