import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { palette } from '../../content/palette'
import { scratch } from '../../content/letter'
import { HAND, useCanvasTexture } from './canvasTexture'
import { DX, DZ, TOP, paperGeometry, slab } from './geometry'

const SHEET_W = 0.148
const SHEET_D = 0.21
const SHEET_GAP = 0.0007 // vertical spacing between stacked sheets

// ---------------------------------------------------------------- scratch paper + pen
/** A small stack of A5 scratch sheets with the pen lying on top. Click fans the sheets out. */
export function Scratch() {
  const [fanned, setFanned] = useState(false)
  const sheets = useRef<THREE.Group>(null)
  const tex = useScratchTexture()
  const flat = useMemo(() => paperGeometry(SHEET_W, SHEET_D, 0, 0.0002), [])
  const curled = useMemo(() => paperGeometry(SHEET_W, SHEET_D, 0.022, 0.0005), [])
  const base = [0.18, -0.12, 0] // resting yaw of each sheet

  useFrame((_, dt) => {
    sheets.current?.children.forEach((m, k) => {
      const target = base[k] + (fanned ? (k - 2) * -0.32 : 0)
      m.rotation.y += (target - m.rotation.y) * Math.min(1, dt * 7)
    })
  })

  const top = 3 * SHEET_GAP
  return (
    <Focusable id="desk-scratch" position={[DX - 0.44, TOP, DZ + 0.17]} distance={0.6} onActivate={() => setFanned((f) => !f)}>
      <group rotation-y={0.12}>
        <group ref={sheets}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} geometry={k === 2 ? curled : flat} position-y={(k + 1) * SHEET_GAP} receiveShadow castShadow={k === 2}>
              {k === 2 ? (
                <meshStandardMaterial map={tex} roughness={0.92} side={THREE.DoubleSide} />
              ) : (
                <meshStandardMaterial color={k ? '#f6f2e8' : '#efe9dc'} roughness={0.95} side={THREE.DoubleSide} />
              )}
            </mesh>
          ))}
        </group>
        <Pen position={[-0.015, top + 0.0006, -0.02]} rotation-y={0.75} />
      </group>
    </Focusable>
  )
}

/** Retractable ballpoint lying on its side, resting on y = 0 of its group. */
function Pen(props: JSX.IntrinsicElements['group']) {
  const r = 0.0048
  const L = 0.138
  return (
    <group {...props}>
      {/* axis along local x, centred */}
      <group position-y={r} rotation-z={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[r, r, L * 0.72, 20]} />
          <meshPhysicalMaterial color="#26355e" roughness={0.3} clearcoat={0.8} />
        </mesh>
        {/* rubber grip */}
        <mesh position-y={-L * 0.3}>
          <cylinderGeometry args={[r * 1.06, r * 1.06, L * 0.16, 20]} />
          <meshStandardMaterial color="#1b1d22" roughness={0.85} />
        </mesh>
        {/* cone to the tip */}
        <mesh position-y={-L * 0.36 - 0.009} castShadow>
          <cylinderGeometry args={[r * 1.0, r * 0.35, 0.018, 20]} />
          <meshStandardMaterial color="#d6d8dc" roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position-y={-L * 0.36 - 0.0195}>
          <sphereGeometry args={[r * 0.3, 10, 8]} />
          <meshStandardMaterial color="#888" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* clicker */}
        <mesh position-y={L * 0.36 + 0.006}>
          <cylinderGeometry args={[r * 0.6, r * 0.7, 0.012, 16]} />
          <meshStandardMaterial color="#d6d8dc" roughness={0.25} metalness={0.6} />
        </mesh>
        {/* clip, on the upward side */}
        <mesh position={[r * 0.95, L * 0.24, 0]}>
          <boxGeometry args={[0.0016, 0.045, 0.0032]} />
          <meshStandardMaterial color="#d6d8dc" roughness={0.25} metalness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

function useScratchTexture() {
  return useCanvasTexture(
    740,
    1050,
    (c) => {
      c.save()
      c.scale(740 / 420, 1050 / 596)
      c.fillStyle = '#fbf8f0'
      c.fillRect(0, 0, 420, 596)
      // faint grid
      c.strokeStyle = 'rgba(120,150,200,0.22)'
      c.lineWidth = 1
      for (let y = 20; y < 596; y += 18) {
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(420, y)
        c.stroke()
      }
      for (let x = 12; x < 420; x += 18) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, 596)
        c.stroke()
      }
      const ink = '#22306a'
      c.fillStyle = ink
      c.font = `30px ${HAND}`
      c.fillText(scratch.formula, 30, 82)
      c.fillText(scratch.sub, 30, 124)
      // crossed-out attempt
      c.font = `22px ${HAND}`
      c.fillText('λ = 0.3 ?  0.35 ?', 30, 166)
      c.strokeStyle = ink
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(26, 160)
      c.lineTo(210, 154)
      c.stroke()
      // plot
      c.lineWidth = 2.5
      c.beginPath()
      c.moveTo(40, 360)
      c.lineTo(40, 210)
      c.moveTo(40, 360)
      c.lineTo(260, 360)
      c.stroke()
      c.beginPath()
      for (let x = 0; x <= 200; x += 4) c.lineTo(45 + x, 350 - 110 * (1 - Math.exp(-x / 50)) + Math.sin(x / 9) * 3)
      c.stroke()
      c.font = `16px ${HAND}`
      c.fillText('t', 264, 366)
      c.fillText('f(t)', 18, 206)
      // circled answer
      c.beginPath()
      c.ellipse(320, 140, 56, 26, -0.1, 0, Math.PI * 2)
      c.stroke()
      c.font = `22px ${HAND}`
      c.fillText('≈ 0.87', 284, 148)
      // croc doodle
      c.save()
      c.translate(330, 300)
      c.strokeStyle = palette.croc
      c.lineWidth = 3.5
      c.beginPath()
      c.ellipse(0, 0, 46, 22, 0, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.arc(-16, -21, 8, 0, Math.PI * 2)
      c.moveTo(16, -21)
      c.arc(8, -21, 8, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = ink
      c.fillRect(-19, -24, 4, 4)
      c.fillRect(5, -24, 4, 4)
      c.beginPath()
      c.moveTo(-20, 6)
      c.quadraticCurveTo(0, 14, 22, 4)
      c.stroke()
      c.restore()
      c.fillStyle = '#7a8aa8'
      c.font = `34px ${HAND}`
      c.fillText(scratch.doodle, 352, 236)
      c.fillStyle = palette.tomato
      c.font = `24px ${HAND}`
      c.fillText(scratch.team, 30, 470)
      // coffee ring stain
      c.strokeStyle = 'rgba(140,95,50,0.22)'
      c.lineWidth = 5
      c.beginPath()
      c.arc(330, 520, 44, 0.3, Math.PI * 1.8)
      c.stroke()
      c.restore()
    },
    [],
  )
}

// ---------------------------------------------------------------- mug
const mugProfile = [
  [0, 0],
  [0.031, 0],
  [0.0335, 0.002],
  [0.0345, 0.01],
  [0.0355, 0.08],
  [0.0362, 0.0885],
  [0.0352, 0.09],
  [0.0322, 0.0885],
  [0.0312, 0.012],
  [0.028, 0.008],
  [0, 0.008],
].map(([x, y]) => new THREE.Vector2(x, y))

/** Ceramic mug with a croc-green band, a proper handle, coffee inside and a curl of steam. Sits on a cork coaster. */
export function Mug() {
  const body = useMemo(() => new THREE.LatheGeometry(mugProfile, 64), [])
  const handle = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.033, 0.072, 0),
      new THREE.Vector3(0.056, 0.074, 0),
      new THREE.Vector3(0.064, 0.05, 0),
      new THREE.Vector3(0.055, 0.026, 0),
      new THREE.Vector3(0.033, 0.022, 0),
    ])
    return new THREE.TubeGeometry(curve, 32, 0.0055, 12, false)
  }, [])
  const CT = 0.004 // coaster thickness
  return (
    <group position={[DX + 0.55, TOP, DZ + 0.06]} rotation-y={-2.4}>
      <mesh position-y={CT / 2} receiveShadow castShadow>
        <cylinderGeometry args={[0.048, 0.048, CT, 40]} />
        <meshStandardMaterial color="#c49a6c" roughness={1} />
      </mesh>
      <group position-y={CT}>
        <mesh geometry={body} castShadow receiveShadow>
          <meshPhysicalMaterial color="#f4efe6" roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} side={THREE.DoubleSide} />
        </mesh>
        <mesh position-y={0.062}>
          <cylinderGeometry args={[0.0361, 0.036, 0.011, 64, 1, true]} />
          <meshPhysicalMaterial color={palette.croc} roughness={0.3} clearcoat={0.8} />
        </mesh>
        <mesh geometry={handle} castShadow>
          <meshPhysicalMaterial color="#f4efe6" roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
        <mesh position-y={0.074} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.0316, 40]} />
          <meshPhysicalMaterial color="#3b2416" roughness={0.12} clearcoat={1} />
        </mesh>
        <Steam />
      </group>
    </group>
  )
}

function Steam() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32)
    grd.addColorStop(0, 'rgba(255,255,255,0.9)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const group = useRef<THREE.Group>(null)
  const mats = useMemo(
    () => [0, 1, 2, 3, 4].map(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })),
    [tex],
  )
  const parentQ = useMemo(() => new THREE.Quaternion(), [])
  useFrame(({ clock, camera }) => {
    if (!group.current) return
    group.current.getWorldQuaternion(parentQ).invert().multiply(camera.quaternion)
    group.current.children.forEach((b, k) => {
      const t = (clock.elapsedTime * 0.28 + k / 5) % 1
      b.position.set(Math.sin(t * 5 + k * 1.7) * 0.012 * t, 0.085 + t * 0.12, Math.cos(t * 4 + k) * 0.006 * t)
      b.scale.setScalar(0.02 + t * 0.05)
      b.quaternion.copy(parentQ) // face the camera
      mats[k].opacity = Math.sin(t * Math.PI) * 0.22
    })
  })
  return (
    <group ref={group}>
      {mats.map((m, k) => (
        <mesh key={k} material={m}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- phone
/** Phone lying face down: you can see the camera bump. */
export function Phone() {
  const body = useMemo(() => slab(0.0715, 0.147, 0.0078, 0.011, 0.0018), [])
  const bump = useMemo(() => slab(0.032, 0.034, 0.0016, 0.007, 0.0005), [])
  return (
    <group position={[DX - 0.2, TOP, DZ + 0.27]} rotation-y={1.32}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial color="#2c3440" roughness={0.35} clearcoat={0.6} />
      </mesh>
      <group position={[-0.0145, 0.0078, -0.0505]}>
        <mesh geometry={bump} castShadow>
          <meshPhysicalMaterial color="#323b48" roughness={0.25} clearcoat={0.8} />
        </mesh>
        {[
          [-0.0075, -0.008],
          [0.0075, -0.008],
          [-0.0075, 0.008],
        ].map(([x, z], k) => (
          <mesh key={k} position={[x, 0.0018, z]}>
            <cylinderGeometry args={[0.0052, 0.0052, 0.0008, 24]} />
            <meshPhysicalMaterial color="#0b0d10" roughness={0.05} clearcoat={1} />
          </mesh>
        ))}
        <mesh position={[0.0075, 0.0018, 0.008]}>
          <cylinderGeometry args={[0.0022, 0.0022, 0.0006, 16]} />
          <meshStandardMaterial color="#f3e6c4" emissive="#4a3c20" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}
