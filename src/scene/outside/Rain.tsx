import { useMemo } from 'react'
import * as THREE from 'three'
import { isLowEnd, outside, outsideUniforms, WALL_OUT_Z } from './env'

/** Falling rain outside, in a box from just beyond the glass out to ~16 m, so near drops move faster across the view. */
export function Rain() {
  const { geo, mat } = useMemo(() => {
    const n = isLowEnd ? 900 : 2200
    const seed = new Float32Array(n * 2 * 3)
    const end = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      const s = [Math.random(), Math.random(), Math.random()]
      // more drops close to the window
      s[2] = Math.pow(s[2], 1.7)
      for (let k = 0; k < 2; k++) {
        seed.set(s, (i * 2 + k) * 3)
        end[i * 2 + k] = k
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -9), 30)
    const mat = outside(
      new THREE.ShaderMaterial({
        uniforms: { ...outsideUniforms, uMin: { value: new THREE.Vector3(-5, -9, WALL_OUT_Z - 16) }, uSize: { value: new THREE.Vector3(11, 16, 15.6) } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform vec3 uMin; uniform vec3 uSize;
          attribute vec3 aSeed; attribute float aEnd;
          varying float vA;
          void main() {
            vec3 v = vec3(-1.4, -9.5, 0.6) * (0.85 + aSeed.x * 0.3);
            vec3 q = aSeed * uSize + v * uTime;
            vec3 p = uMin + mod(q, uSize);
            p -= v * 0.05 * aEnd;
            vA = (1.0 - aEnd * 0.8) * (0.4 + 0.6 * fract(aSeed.x * 17.0));
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uRain; uniform float uNight; uniform float uFlash;
          varying float vA;
          void main() {
            vec3 c = mix(vec3(0.86, 0.9, 0.96), vec3(0.42, 0.48, 0.6), uNight) + uFlash;
            gl_FragColor = vec4(c, vA * uRain * 0.55);
          }`,
        transparent: true,
        depthWrite: false,
      }),
      { haze: false },
    )
    mat.onBeforeCompile = () => {}
    return { geo, mat }
  }, [])
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />
}
