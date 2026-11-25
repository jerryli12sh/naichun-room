import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { palette } from '../../content/palette'
import { laptopScreens, scratch } from '../../content/letter'
import { HAND, useCanvasTexture } from './canvasTexture'
import { SURFACES } from '../../content/layout'

// Desk slab, books and lamp are room-look's (scene/room/Furniture.tsx); this branch owns the rest of the desk top.
const { x: DX, y: TOP, z: DZ } = SURFACES.desk

/** Everything that sits on the desk except the letter: laptop (数模 at 3 am), scratch paper, mug, pen. */
export function Desk() {
  return (
    <group>
      <Laptop />
      <Scratch />
      <Mug position={[DX + 0.5, TOP, DZ + 0.08]} />
      {/* pen lying across the scratch paper */}
      <mesh position={[DX - 0.36, TOP + 0.012, DZ + 0.2]} rotation={[0, 0.9, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.14, 10]} />
        <meshStandardMaterial color="#2f3d63" roughness={0.5} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- laptop
function Laptop() {
  const [i, setI] = useState(0)
  const s = laptopScreens[i]
  const tex = useCanvasTexture(
    640,
    400,
    (c) => {
      const dark = s.kind === 'terminal'
      c.fillStyle = dark ? '#16202e' : s.kind === 'note' ? '#2a3550' : '#f7f7f4'
      c.fillRect(0, 0, 640, 400)
      // title bar
      c.fillStyle = dark ? '#243246' : '#dfe3ea'
      c.fillRect(0, 0, 640, 34)
      ;['#ef6b5e', '#f5be4f', '#61c454'].forEach((col, k) => {
        c.fillStyle = col
        c.beginPath()
        c.arc(20 + k * 22, 17, 7, 0, Math.PI * 2)
        c.fill()
      })
      c.fillStyle = dark ? '#9fb2cc' : '#556'
      c.font = '16px ui-sans-serif, system-ui, sans-serif'
      c.fillText(s.file, 92, 23)
      c.textAlign = 'right'
      c.fillText(s.clock, 626, 23)
      c.textAlign = 'left'

      if (s.kind === 'note') {
        // a yellow sticky note in the middle of a dark desktop
        c.save()
        c.translate(320, 215)
        c.rotate(-0.05)
        c.fillStyle = '#ffe27a'
        c.fillRect(-150, -130, 300, 260)
        c.fillStyle = '#3a2f1a'
        c.font = `38px ${HAND}`
        c.textAlign = 'center'
        c.fillText(s.title, 0, -72)
        c.font = `30px ${HAND}`
        s.lines.forEach((l, k) => c.fillText(l, 0, -18 + k * 46))
        c.restore()
        return
      }
      c.fillStyle = dark ? '#7ee3a1' : '#222'
      c.font = dark ? '22px ui-monospace, Menlo, monospace' : `bold 26px ${HAND}`
      c.fillText(s.title, 36, 82)
      c.font = dark ? '20px ui-monospace, Menlo, monospace' : `20px ${HAND}`
      c.fillStyle = dark ? '#b9c7da' : '#444'
      s.lines.forEach((l, k) => c.fillText(l, 36, 130 + k * 40))
      if (!dark) {
        // fake body text
        c.fillStyle = '#d6d8de'
        for (let k = 0; k < 5; k++) c.fillRect(36, 300 + k * 16, 420 + ((k * 97) % 140), 6)
      } else {
        c.fillStyle = '#7ee3a1'
        c.fillRect(36, 300, 14, 22) // cursor
      }
    },
    [i],
  )

  return (
    <Focusable
      id="desk-laptop"
      position={[DX - 0.08, TOP, DZ - 0.08]}
      distance={0.9}
      onActivate={() => setI((k) => (k + 1) % laptopScreens.length)}
    >
      <group rotation-y={0.22}>
        {/* base */}
        <RoundedBox args={[0.36, 0.016, 0.24]} radius={0.006} position={[0, 0.008, 0]} castShadow>
          <meshStandardMaterial color="#c9ccd3" roughness={0.45} />
        </RoundedBox>
        {/* keyboard well */}
        <mesh position={[0, 0.0165, 0.02]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.3, 0.11]} />
          <meshStandardMaterial color="#8d929c" roughness={0.7} />
        </mesh>
        {/* lid, hinged at the back edge and tilted back a little */}
        <group position={[0, 0.016, -0.12]} rotation-x={-0.22}>
          <RoundedBox args={[0.36, 0.23, 0.01]} radius={0.006} position={[0, 0.115, -0.005]} castShadow>
            <meshStandardMaterial color="#c9ccd3" roughness={0.45} />
          </RoundedBox>
          <mesh position={[0, 0.118, 0.001]}>
            <planeGeometry args={[0.33, 0.206]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Focusable>
  )
}

// ---------------------------------------------------------------- scratch paper
function Scratch() {
  const [fanned, setFanned] = useState(false)
  const g = useRef<THREE.Group>(null)
  const tex = useCanvasTexture(
    420,
    560,
    (c) => {
      c.fillStyle = '#fbf8f0'
      c.fillRect(0, 0, 420, 560)
      c.strokeStyle = '#d7e0ee'
      c.lineWidth = 2
      for (let y = 60; y < 560; y += 34) {
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(420, y)
        c.stroke()
      }
      c.fillStyle = '#2b3a67'
      c.font = `34px ${HAND}`
      c.fillText(scratch.formula, 34, 120)
      c.fillText(scratch.sub, 34, 170)
      // a quick plot
      c.strokeStyle = '#2b3a67'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(40, 360)
      c.lineTo(40, 220)
      c.moveTo(40, 360)
      c.lineTo(250, 360)
      c.stroke()
      c.beginPath()
      for (let x = 0; x <= 200; x += 5) c.lineTo(45 + x, 350 - 110 * (1 - Math.exp(-x / 50)) + Math.sin(x / 9) * 4)
      c.stroke()
      // croc doodle
      c.save()
      c.translate(320, 300)
      c.strokeStyle = palette.croc
      c.lineWidth = 4
      c.beginPath()
      c.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.arc(-18, -24, 9, 0, Math.PI * 2)
      c.arc(8, -24, 9, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = '#2b3a67'
      c.fillRect(-21, -27, 5, 5)
      c.fillRect(5, -27, 5, 5)
      c.restore()
      c.fillStyle = '#7a8aa8'
      c.font = `40px ${HAND}`
      c.fillText(scratch.doodle, 330, 230)
      c.fillStyle = palette.tomato
      c.font = `28px ${HAND}`
      c.fillText(scratch.team, 34, 470)
    },
    [],
  )

  useFrame((_, dt) => {
    if (!g.current) return
    g.current.children.forEach((m, k) => {
      const target = fanned ? (k - 1) * 0.35 : (k - 1) * 0.08
      m.rotation.y += (target - m.rotation.y) * Math.min(1, dt * 8)
    })
  })

  return (
    <Focusable id="desk-scratch" position={[DX - 0.42, TOP, DZ + 0.16]} distance={0.7} onActivate={() => setFanned((f) => !f)}>
      <group ref={g}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation-x={-Math.PI / 2} position-y={0.001 + k * 0.0015} receiveShadow>
            <planeGeometry args={[0.15, 0.2]} />
            {k === 2 ? <meshStandardMaterial map={tex} roughness={0.95} /> : <meshStandardMaterial color="#f4efe3" roughness={0.95} />}
          </mesh>
        ))}
      </group>
    </Focusable>
  )
}

// ---------------------------------------------------------------- mug with a little steam
function Mug({ position }: { position: [number, number, number] }) {
  const steam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    steam.current?.children.forEach((m, k) => {
      const t = (clock.elapsedTime * 0.35 + k / 3) % 1
      m.position.y = 0.1 + t * 0.09
      m.position.x = Math.sin(t * 6 + k) * 0.008
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(t * Math.PI) * 0.35
      m.scale.setScalar(0.6 + t)
    })
  })
  return (
    <group position={position}>
      <mesh position-y={0.045} castShadow>
        <cylinderGeometry args={[0.035, 0.032, 0.09, 24]} />
        <meshStandardMaterial color={palette.cream} roughness={0.5} />
      </mesh>
      <mesh position={[0.034, 0.048, 0]} rotation-z={-Math.PI / 2}>
        <torusGeometry args={[0.018, 0.005, 8, 16, Math.PI]} />
        <meshStandardMaterial color={palette.cream} roughness={0.5} />
      </mesh>
      <mesh position-y={0.086} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.031, 20]} />
        <meshStandardMaterial color="#5a3a24" roughness={0.3} />
      </mesh>
      <group ref={steam}>
        {[0, 1, 2].map((k) => (
          <mesh key={k}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
