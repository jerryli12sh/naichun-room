import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Focusable } from '../../scene/Focusable'
import { laptopScreens } from '../../content/letter'
import { nightness } from '../../content/layout'
import { useRoom } from '../../state/store'
import { HAND, useCanvasTexture } from './canvasTexture'
import { DX, DZ, SILL_Y, SILL_Z, TOP, slab } from './geometry'

// 13-inch class laptop, metres
const W = 0.304
const D = 0.212
const BASE_T = 0.011
const LID_T = 0.0055
const LID_H = 0.198
const TILT = 0.26 // lid leans back ~15° from vertical

const ALU = { color: '#c3c6cc', roughness: 0.32, metalness: 0.25, clearcoat: 0.25, clearcoatRoughness: 0.4 }

/** Laptop with the 数模 paper open at 3 am. Click cycles the screen. */
export function Laptop() {
  const [i, setI] = useState(0)
  const screen = useScreenTexture(i)
  const hour = useRoom((s) => s.timeOfDay)
  const glow = useRef<THREE.PointLight>(null)
  const night = useRef(nightness(hour))

  useFrame((_, dt) => {
    night.current += (nightness(hour) - night.current) * Math.min(1, dt * 1.5)
    if (glow.current) glow.current.intensity = 0.05 + night.current * 0.55
  })

  const base = useMemo(() => slab(W, D, BASE_T, 0.012), [])
  const lid = useMemo(() => slab(W, LID_H, LID_T, 0.011), [])

  // lid top must clear the window sill: hinge z minus its lean
  const pos: [number, number, number] = [DX, TOP, DZ + 0.02]
  if (import.meta.env.DEV) {
    const topZ = pos[2] - D / 2 - Math.sin(TILT) * LID_H
    const topY = TOP + BASE_T + Math.cos(TILT) * LID_H
    if (topY > SILL_Y && topZ < SILL_Z) console.warn('[desk] laptop lid clips the window sill', { topY, topZ })
  }

  return (
    <Focusable id="desk-laptop" position={pos} distance={0.85} onActivate={() => setI((k) => (k + 1) % laptopScreens.length)}>
      <group rotation-y={0.08}>
        {/* ---------- base ---------- */}
        <mesh geometry={base} castShadow receiveShadow>
          <meshPhysicalMaterial {...ALU} />
        </mesh>
        {/* rubber feet */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.02), 0.0005, sz * (D / 2 - 0.02)]}>
              <cylinderGeometry args={[0.005, 0.005, 0.001, 12]} />
              <meshStandardMaterial color="#222" roughness={0.9} />
            </mesh>
          )),
        )}
        <Keyboard />
        {/* trackpad: a slightly darker, glassier inset */}
        <mesh position={[0, BASE_T + 0.0002, D / 2 - 0.047]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[0.118, 0.072]} />
          <meshPhysicalMaterial color="#b7bac0" roughness={0.18} metalness={0.15} clearcoat={0.6} />
        </mesh>
        {/* front notch */}
        <mesh position={[0, BASE_T * 0.55, D / 2 + 0.0001]}>
          <planeGeometry args={[0.03, 0.004]} />
          <meshStandardMaterial color="#9a9da3" roughness={0.5} />
        </mesh>
        {/* hinge barrel */}
        <mesh position={[0, BASE_T, -D / 2 + 0.004]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.0042, 0.0042, W - 0.06, 16]} />
          <meshStandardMaterial color="#2a2b2f" roughness={0.5} />
        </mesh>

        {/* ---------- lid ---------- */}
        <group position={[0, BASE_T, -D / 2 + 0.004]} rotation-x={-TILT}>
          {/* lid slab stands up in XY: build it flat then rotate up */}
          <mesh geometry={lid} rotation-x={Math.PI / 2} position={[0, LID_H / 2, -LID_T]} castShadow receiveShadow>
            <meshPhysicalMaterial {...ALU} />
          </mesh>
          {/* black glass bezel */}
          <mesh position={[0, LID_H / 2, 0.0003]}>
            <planeGeometry args={[W - 0.006, LID_H - 0.006]} />
            <meshPhysicalMaterial color="#0d0e11" roughness={0.08} clearcoat={1} />
          </mesh>
          {/* the display itself */}
          <mesh position={[0, LID_H / 2 + 0.004, 0.0006]}>
            <planeGeometry args={[W - 0.022, LID_H - 0.03]} />
            <meshBasicMaterial map={screen} toneMapped={false} />
          </mesh>
          {/* camera dot */}
          <mesh position={[0, LID_H - 0.0055, 0.0006]}>
            <circleGeometry args={[0.0012, 12]} />
            <meshBasicMaterial color="#1d2a3a" />
          </mesh>
          {/* yellow sticky note on the bottom bezel */}
          <StickyNote />
          {/* soft spill from the screen onto the keyboard and desk */}
          <pointLight ref={glow} position={[0, LID_H * 0.45, 0.09]} color="#cfe0ff" distance={0.7} decay={2} />
        </group>
      </group>
    </Focusable>
  )
}

/** Individual keys, instanced. */
function Keyboard() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const keys = useMemo(() => {
    const out: { x: number; z: number; w: number }[] = []
    const u = 0.0168 // key pitch
    const kw = 0.0148
    const z0 = -D / 2 + 0.035
    const left = -7 * u
    // function row: half-height keys
    for (let k = 0; k < 14; k++) out.push({ x: left + (k + 0.5) * u, z: z0, w: kw })
    // main rows: widths in key units, each row 14u wide
    const rows = [
      Array(14).fill(1),
      [1.5].concat(Array(11).fill(1), 1.5),
      [1.75].concat(Array(11).fill(1), 1.25),
      [2.25].concat(Array(10).fill(1), 1.75),
    ]
    rows.forEach((row, r) => {
      const z = z0 + (r + 1) * u
      let cursor = left
      row.forEach((b) => {
        out.push({ x: cursor + (b * u) / 2, z, w: b * u - (u - kw) })
        cursor += b * u
      })
    })
    // bottom row with the space bar
    const zb = z0 + 5 * u
    const bottom = [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1]
    const total = bottom.reduce((a, b) => a + b, 0)
    let cursor = -(total * u) / 2
    bottom.forEach((b) => {
      out.push({ x: cursor + (b * u) / 2, z: zb, w: b * u - (u - kw) })
      cursor += b * u
    })
    return out
  }, [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    keys.forEach((k, i) => {
      const fn = i < 14
      m.compose(
        new THREE.Vector3(k.x, BASE_T + 0.0009, k.z),
        new THREE.Quaternion(),
        new THREE.Vector3(k.w / 0.0148, 1, fn ? 0.55 : 1),
      )
      ref.current!.setMatrixAt(i, m)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [keys])

  const keyGeo = useMemo(() => slab(0.0148, 0.0148, 0.0012, 0.0025, 0.0004), [])
  return (
    <>
      {/* keyboard well */}
      <mesh position={[0, BASE_T + 0.0001, -D / 2 + 0.035 + 0.0168 * 2.4]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.245, 0.104]} />
        <meshStandardMaterial color="#9fa3aa" roughness={0.6} />
      </mesh>
      <instancedMesh ref={ref} args={[keyGeo, undefined, keys.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#26272b" roughness={0.55} />
      </instancedMesh>
    </>
  )
}

function StickyNote() {
  const tex = useCanvasTexture(
    192,
    192,
    (c) => {
      c.fillStyle = '#ffe58a'
      c.fillRect(0, 0, 192, 192)
      c.fillStyle = 'rgba(0,0,0,0.06)'
      c.fillRect(0, 0, 192, 30) // glue strip
      c.fillStyle = '#4a3b1c'
      c.font = `44px ${HAND}`
      c.textAlign = 'center'
      c.fillText('DDL', 96, 86)
      c.font = `40px ${HAND}`
      c.fillText('9:00 !!', 96, 140)
    },
    [],
  )
  return (
    <mesh position={[W / 2 - 0.032, 0.012, 0.0012]} rotation-z={0.09}>
      <planeGeometry args={[0.036, 0.036]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

// ---------------------------------------------------------------- screen content
function useScreenTexture(i: number) {
  const s = laptopScreens[i]
  return useCanvasTexture(
    1280,
    800,
    (c) => {
      c.save()
      c.scale(2, 2)
      const dark = s.kind === 'terminal'
      const bg = dark ? '#121a26' : s.kind === 'note' ? '#24324d' : '#eef0f3'
      c.fillStyle = bg
      c.fillRect(0, 0, 640, 400)
      if (s.kind === 'note') {
        // desktop wallpaper: soft gradient night sky
        const g = c.createLinearGradient(0, 0, 0, 400)
        g.addColorStop(0, '#22345a')
        g.addColorStop(1, '#4b4f7a')
        c.fillStyle = g
        c.fillRect(0, 0, 640, 400)
      }
      // menu bar
      c.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'
      c.fillRect(0, 0, 640, 16)
      c.fillStyle = dark || s.kind === 'note' ? '#c9d3e3' : '#333'
      c.font = '600 9px ui-sans-serif, system-ui, sans-serif'
      c.fillText('  ', 10, 11)
      c.font = '9px ui-sans-serif, system-ui, sans-serif'
      c.textAlign = 'right'
      c.fillText(`周四  ${s.clock}`, 630, 11)
      c.textAlign = 'left'

      if (s.kind === 'note') {
        c.translate(320, 212)
        c.rotate(-0.04)
        c.shadowColor = 'rgba(0,0,0,0.35)'
        c.shadowBlur = 18
        c.shadowOffsetY = 6
        c.fillStyle = '#ffe27a'
        c.fillRect(-140, -120, 280, 240)
        c.shadowColor = 'transparent'
        c.fillStyle = '#3a2f1a'
        c.font = `36px ${HAND}`
        c.textAlign = 'center'
        c.fillText(s.title, 0, -62)
        c.font = `28px ${HAND}`
        s.lines.forEach((l, k) => c.fillText(l, 0, -10 + k * 44))
        c.restore()
        return
      }

      // window
      const wx = 24
      const wy = 28
      const ww = 592
      const wh = 360
      c.shadowColor = 'rgba(0,0,0,0.25)'
      c.shadowBlur = 16
      c.shadowOffsetY = 4
      c.fillStyle = dark ? '#18222f' : '#ffffff'
      roundRect(c, wx, wy, ww, wh, 8)
      c.fill()
      c.shadowColor = 'transparent'
      c.fillStyle = dark ? '#223042' : '#e6e8ec'
      roundRect(c, wx, wy, ww, 24, 8)
      c.fill()
      c.fillRect(wx, wy + 16, ww, 8)
      ;['#ff5f57', '#febc2e', '#28c840'].forEach((col, k) => {
        c.fillStyle = col
        c.beginPath()
        c.arc(wx + 14 + k * 15, wy + 12, 4.5, 0, Math.PI * 2)
        c.fill()
      })
      c.fillStyle = dark ? '#8fa2bd' : '#666'
      c.font = '10px ui-sans-serif, system-ui, sans-serif'
      c.textAlign = 'center'
      c.fillText(s.file, wx + ww / 2, wy + 16)
      c.textAlign = 'left'

      if (dark) {
        c.font = '12px ui-monospace, Menlo, monospace'
        c.fillStyle = '#7ee3a1'
        c.fillText(s.title, wx + 18, wy + 56)
        c.fillStyle = '#b9c7da'
        s.lines.forEach((l, k) => c.fillText(l, wx + 18, wy + 82 + k * 20))
        // a little loss curve
        c.strokeStyle = '#5fb7ff'
        c.lineWidth = 1.5
        c.beginPath()
        for (let x = 0; x <= 220; x += 4) c.lineTo(wx + 340 + x, wy + 80 + 140 * Math.exp(-x / 45) + Math.sin(x / 5) * 2)
        c.stroke()
        c.strokeStyle = '#3a4a60'
        c.strokeRect(wx + 336, wy + 60, 228, 180)
        c.fillStyle = '#7ee3a1'
        c.fillRect(wx + 18, wy + 82 + s.lines.length * 20 - 10, 7, 12)
      } else {
        // a page on a grey canvas
        c.fillStyle = '#d9dce2'
        c.fillRect(wx, wy + 24, ww, wh - 24)
        c.fillStyle = '#ffffff'
        c.fillRect(wx + 136, wy + 34, 320, wh - 34)
        c.fillStyle = '#1c1c1c'
        c.font = `bold 15px ${HAND}`
        c.textAlign = 'center'
        c.fillText(s.title, wx + 296, wy + 64)
        c.textAlign = 'left'
        c.font = `11px ${HAND}`
        c.fillStyle = '#333'
        s.lines.forEach((l, k) => c.fillText(l, wx + 156, wy + 92 + k * 46))
        c.fillStyle = '#c9ccd3'
        for (let k = 0; k < 4; k++)
          for (let r = 0; r < 3; r++) c.fillRect(wx + 156, wy + 102 + k * 46 + r * 9, 250 - ((k * 37 + r * 53) % 90), 3)
        // equation
        c.fillStyle = '#222'
        c.font = 'italic 12px "Times New Roman", serif'
        c.fillText('min  Σᵢ wᵢ fᵢ(x)    s.t.  gⱼ(x) ≤ 0', wx + 196, wy + 300)
        // blinking caret
        c.fillStyle = '#2f6fed'
        c.fillRect(wx + 300, wy + 318, 1.5, 12)
        // word count bar
        c.fillStyle = '#7a7f88'
        c.font = '9px ui-sans-serif, system-ui, sans-serif'
        c.fillText('第 17 页，共 23 页   12,408 字', wx + 10, wy + wh - 8)
      }
      // dock
      c.fillStyle = 'rgba(255,255,255,0.35)'
      roundRect(c, 236, 388, 168, 10, 4)
      c.fill()
      c.restore()
    },
    [i],
  )
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
