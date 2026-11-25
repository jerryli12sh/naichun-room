import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useRoom } from '../../state/store'
import { startCrackle, startMusic, needle } from '../../audio/audio'
import { coverTexture, recordTexture, strobeTexture } from './textures'
import { Notes } from './Notes'

// ------------------------------------------------------------------ geometry (metres, turntable-local: front = +z, y 0 = console top)
const W = 0.44 // plinth width
const D = 0.34 // plinth depth
const FEET = 0.014
const PLINTH = 0.075
export const TOP = FEET + PLINTH + 0.004 // top plate surface
const S = { x: -0.055, z: 0 } // spindle
const PLATTER_R = 0.15
const PLATTER_H = 0.022
const REC_R = 0.1475
const REC_Y = TOP + 0.003 + PLATTER_H + 0.003 + 0.002 // record surface
const P = { x: 0.155, z: -0.1 } // tonearm pivot
const L = 0.225 // pivot → stylus
const ARM_Y = REC_Y + 0.02 // arm tube height with the stylus on the record
const LIFT = Math.atan(0.012 / L) // cue lift: 12 mm at the headshell
const LEAD_IN = 0.145
const RUN_OUT = 0.072
const SIDE_SECONDS = 360 // a side lasts 6 minutes, then the arm returns by itself
const RPM = (33.33 / 60) * Math.PI * 2

/** Arm yaw (rad, about the pivot) that puts the stylus at `r` from the spindle. Yaw 0 = on the rest, pointing +z. */
function yawFor(r: number) {
  const dist = (t: number) => Math.hypot(P.x + L * Math.sin(t) - S.x, P.z + L * Math.cos(t) - S.z)
  let lo = Math.atan2(S.x - P.x, S.z - P.z) // pointing at the spindle: distance ~0
  let hi = 0 // on the rest: farthest
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (dist(mid) > r) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}
const YAW_IN = yawFor(LEAD_IN)
const YAW_OUT = yawFor(RUN_OUT)

const approach = (v: number, target: number, rate: number, dt: number) => {
  const step = rate * dt
  return Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step
}
const smooth = (x: number) => x * x * (3 - 2 * x)

// ------------------------------------------------------------------ materials
function useMats() {
  return useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: '#a77d55', roughness: 0.55, metalness: 0 }),
      plate: new THREE.MeshStandardMaterial({ color: '#F1EADD', roughness: 0.5, metalness: 0 }),
      alu: new THREE.MeshStandardMaterial({ color: '#d4d7da', roughness: 0.28, metalness: 0 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#e6e8ea', roughness: 0.18, metalness: 0 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2b2b2d', roughness: 0.6, metalness: 0 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.95, metalness: 0 }),
      sage: new THREE.MeshStandardMaterial({ color: '#A7B59E', roughness: 0.6, metalness: 0 }),
      cart: new THREE.MeshStandardMaterial({ color: '#7E8E77', roughness: 0.45, metalness: 0 }),
      vinylSide: new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.4, metalness: 0 }),
      cover: new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false }),
    }),
    [],
  )
}

type Mats = ReturnType<typeof useMats>

// ------------------------------------------------------------------ parts
function Platter({ mats, spin }: { mats: Mats; spin: React.RefObject<THREE.Group> }) {
  const rec = useMemo(recordTexture, [])
  const strobe = useMemo(strobeTexture, [])
  const recordMats = useMemo(
    () => [mats.vinylSide, new THREE.MeshStandardMaterial({ map: rec, roughness: 0.32, metalness: 0 }), mats.vinylSide],
    [mats, rec],
  )
  const platterMats = useMemo(() => [new THREE.MeshStandardMaterial({ map: strobe, roughness: 0.3, metalness: 0 }), mats.alu, mats.alu], [mats, strobe])
  return (
    <group position={[S.x, 0, S.z]}>
      {/* bearing hub under the platter */}
      <mesh position-y={TOP + 0.0015} material={mats.dark}>
        <cylinderGeometry args={[0.04, 0.04, 0.003, 32]} />
      </mesh>
      <group ref={spin}>
        <mesh position-y={TOP + 0.003 + PLATTER_H / 2} material={platterMats} castShadow receiveShadow>
          <cylinderGeometry args={[PLATTER_R, PLATTER_R - 0.002, PLATTER_H, 96]} />
        </mesh>
        <mesh position-y={TOP + 0.003 + PLATTER_H + 0.0015} material={mats.rubber} receiveShadow>
          <cylinderGeometry args={[0.146, 0.146, 0.003, 96]} />
        </mesh>
        <mesh position-y={REC_Y - 0.001} material={recordMats} castShadow receiveShadow>
          <cylinderGeometry args={[REC_R, REC_R, 0.002, 128]} />
        </mesh>
        {/* spindle */}
        <mesh position-y={REC_Y + 0.006} material={mats.chrome}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.014, 16]} />
        </mesh>
      </group>
    </group>
  )
}

function Tonearm({ mats, yaw, pitch, cue }: { mats: Mats; yaw: React.RefObject<THREE.Group>; pitch: React.RefObject<THREE.Group>; cue: React.RefObject<THREE.Group> }) {
  const tube = L - 0.005
  return (
    <group>
      {/* base, bearing housing */}
      <group position={[P.x, 0, P.z]}>
        <mesh position-y={TOP + 0.003} material={mats.alu} castShadow>
          <cylinderGeometry args={[0.032, 0.034, 0.006, 40]} />
        </mesh>
        <mesh position-y={(TOP + 0.006 + ARM_Y - 0.008) / 2} material={mats.dark} castShadow>
          <cylinderGeometry args={[0.012, 0.014, ARM_Y - 0.008 - TOP - 0.006, 24]} />
        </mesh>
        <group ref={yaw} position-y={ARM_Y}>
          {/* gimbal ring turns with the arm */}
          <mesh material={mats.chrome} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.016, 24]} />
          </mesh>
          <group ref={pitch}>
            {/* arm tube */}
            <mesh position-z={-0.01 + tube / 2} rotation-x={Math.PI / 2} material={mats.chrome} castShadow>
              <cylinderGeometry args={[0.0034, 0.0034, tube, 12]} />
            </mesh>
            {/* rear stub + counterweight */}
            <mesh position-z={-0.035} rotation-x={Math.PI / 2} material={mats.chrome}>
              <cylinderGeometry args={[0.004, 0.004, 0.05, 12]} />
            </mesh>
            <mesh position-z={-0.047} rotation-x={Math.PI / 2} material={mats.dark} castShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.026, 32]} />
            </mesh>
            <mesh position-z={-0.0335} rotation-x={Math.PI / 2} material={mats.alu}>
              <cylinderGeometry args={[0.0165, 0.0165, 0.002, 32]} />
            </mesh>
            {/* headshell (offset angle) + cartridge; stylus tip sits at (0, -0.02, L) */}
            <group position-z={L - 0.012} rotation-y={-0.38}>
              <mesh position={[0, 0, 0.008]} material={mats.dark} castShadow>
                <boxGeometry args={[0.017, 0.004, 0.036]} />
              </mesh>
              {/* finger lift */}
              <mesh position={[0.014, 0.004, 0.012]} rotation-z={-0.6} material={mats.chrome}>
                <cylinderGeometry args={[0.0013, 0.0013, 0.02, 6]} />
              </mesh>
              <mesh position={[0, -0.009, 0.012]} material={mats.cart} castShadow>
                <boxGeometry args={[0.014, 0.014, 0.022]} />
              </mesh>
              <mesh position={[0, -0.017, 0.02]} rotation-x={0.6} material={mats.dark}>
                <coneGeometry args={[0.0018, 0.005, 6]} />
              </mesh>
            </group>
          </group>
        </group>
        {/* cue lever */}
        <group position={[0.036, 0, 0.035]}>
          <mesh position-y={TOP + 0.012} material={mats.dark}>
            <cylinderGeometry args={[0.005, 0.006, 0.024, 12]} />
          </mesh>
          <group ref={cue} position-y={TOP + 0.024}>
            <mesh position={[0, 0, 0.012]} rotation-x={Math.PI / 2} material={mats.chrome}>
              <cylinderGeometry args={[0.0022, 0.0022, 0.026, 8]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* arm rest: post + cradle under the tube when yaw = 0 */}
      <group position={[P.x, 0, P.z + L - 0.05]}>
        <mesh position-y={(TOP + ARM_Y + 0.012 * 0.78 - 0.0035) / 2} material={mats.dark}>
          <cylinderGeometry args={[0.0035, 0.0045, ARM_Y + 0.012 * 0.78 - 0.0035 - TOP, 10]} />
        </mesh>
        <mesh position-y={ARM_Y + 0.012 * 0.78 - 0.0035} rotation-z={Math.PI / 2} material={mats.rubber}>
          <torusGeometry args={[0.005, 0.0015, 6, 12, Math.PI]} />
        </mesh>
      </group>
    </group>
  )
}

function Controls({ mats, led }: { mats: Mats; led: React.RefObject<THREE.MeshStandardMaterial> }) {
  return (
    <group>
      {/* start/stop + 33/45 */}
      <mesh position={[-0.185, TOP + 0.004, 0.142]} material={mats.alu} castShadow>
        <cylinderGeometry args={[0.013, 0.014, 0.008, 28]} />
      </mesh>
      {[-0.152, -0.128].map((x) => (
        <mesh key={x} position={[x, TOP + 0.003, 0.153]} material={mats.plate}>
          <boxGeometry args={[0.016, 0.006, 0.01]} />
        </mesh>
      ))}
      {/* pitch slider */}
      <mesh position={[0.192, TOP + 0.0005, 0.03]} material={mats.dark}>
        <boxGeometry args={[0.006, 0.001, 0.07]} />
      </mesh>
      <mesh position={[0.192, TOP + 0.004, 0.03]} material={mats.alu}>
        <boxGeometry args={[0.014, 0.007, 0.01]} />
      </mesh>
      {/* power LED */}
      <mesh position={[0.192, TOP + 0.001, 0.152]}>
        <cylinderGeometry args={[0.003, 0.003, 0.003, 12]} />
        <meshStandardMaterial ref={led} color="#3a3a3a" emissive="#ff6a3a" emissiveIntensity={0} roughness={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Hinged acrylic lid. Hinge at the top back edge; rotating it lifts the front. */
function DustCover({ mats, hinge }: { mats: Mats; hinge: React.RefObject<THREE.Group> }) {
  const h = 0.085
  const w = W - 0.004
  const d = D - 0.006
  const t = 0.003
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, TOP + h - 0.008, -D / 2 - 0.004]} material={mats.dark} castShadow>
          <boxGeometry args={[0.03, 0.016, 0.01]} />
        </mesh>
      ))}
      <group ref={hinge} position={[0, TOP + h, -D / 2 + 0.003]}>
        <group position-z={d / 2}>
          <mesh position-y={-t / 2} material={mats.cover}>
            <boxGeometry args={[w, t, d]} />
          </mesh>
          <mesh position={[0, -h / 2, d / 2 - t / 2]} material={mats.cover}>
            <boxGeometry args={[w, h, t]} />
          </mesh>
          <mesh position={[0, -h / 2, -d / 2 + t / 2]} material={mats.cover}>
            <boxGeometry args={[w, h, t]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - t / 2), -h / 2, 0]} material={mats.cover}>
              <boxGeometry args={[t, h, d]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/** Small bookshelf speaker; the woofer cone pumps while music plays. */
function Speaker({ x, toe, cone }: { x: number; toe: number; cone: React.RefObject<THREE.Group> }) {
  const w = 0.13
  const h = 0.21
  const d = 0.15
  return (
    <group position={[x, 0, 0.01]} rotation-y={toe}>
      <RoundedBox args={[w, h, d]} radius={0.008} smoothness={3} position-y={0.006 + h / 2} castShadow receiveShadow>
        <meshStandardMaterial color="#F1EADD" roughness={0.6} metalness={0} />
      </RoundedBox>
      {/* rubber feet */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.015), 0.003, sz * (d / 2 - 0.015)]}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 10]} />
            <meshStandardMaterial color="#2b2b2d" roughness={0.9} metalness={0} />
          </mesh>
        )),
      )}
      {/* baffle */}
      <mesh position={[0, 0.006 + h / 2, d / 2 + 0.0005]}>
        <planeGeometry args={[w - 0.016, h - 0.016]} />
        <meshStandardMaterial color="#7E8E77" roughness={0.85} metalness={0} />
      </mesh>
      {/* tweeter */}
      <group position={[0, 0.006 + h - 0.04, d / 2 + 0.001]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.017, 0.017, 0.003, 24]} />
          <meshStandardMaterial color="#2b2b2d" roughness={0.5} metalness={0} />
        </mesh>
        <mesh position-z={0.001} scale={[1, 1, 0.6]}>
          <sphereGeometry args={[0.01, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#d8dadb" roughness={0.3} metalness={0} />
        </mesh>
      </group>
      {/* woofer: surround ring, cone, dust cap */}
      <group position={[0, 0.006 + 0.075, d / 2 + 0.001]}>
        <mesh>
          <torusGeometry args={[0.042, 0.005, 10, 40]} />
          <meshStandardMaterial color="#2b2b2d" roughness={0.9} metalness={0} />
        </mesh>
        <group ref={cone}>
          <mesh rotation-x={-Math.PI / 2} position-z={-0.004}>
            <coneGeometry args={[0.039, 0.016, 40, 1, true]} />
            <meshStandardMaterial color="#F1EADD" roughness={0.75} metalness={0} side={THREE.DoubleSide} />
          </mesh>
          <mesh position-z={-0.012} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.012, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#d9cfbd" roughness={0.6} metalness={0} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ------------------------------------------------------------------ the deck + its little state machine

/** Mutable deck state shared with the click handler. `want` = the visitor asked for music. */
export const deck = { want: false }

/**
 * Turntable and speakers on top of the record console (turntable-local frame, y 0 = console top).
 * Click → lid lifts, platter spins up, arm cues over the lead-in and lowers; needle down = musicOn.
 * Click again → arm lifts, swings home, platter coasts to a stop. The arm tracks slowly inward;
 * at the run-out it returns by itself.
 */
export function Turntable() {
  const mats = useMats()
  const spin = useRef<THREE.Group>(null)
  const yaw = useRef<THREE.Group>(null)
  const pitch = useRef<THREE.Group>(null)
  const cue = useRef<THREE.Group>(null)
  const hinge = useRef<THREE.Group>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const coneL = useRef<THREE.Group>(null)
  const coneR = useRef<THREE.Group>(null)
  const musicOn = useRoom((s) => s.musicOn)

  const st = useRef({ lid: 0, speed: 0, yaw: 0, lift: 1, progress: 0, down: false, beat: 0 })

  // something else switched the music off (e.g. bedtime) → lift the arm
  useEffect(() => useRoom.subscribe((s, prev) => {
    if (prev.musicOn && !s.musicOn) deck.want = false
  }), [])
  useEffect(() => () => {
    deck.want = false
    useRoom.getState().set({ musicOn: false })
  }, [])

  useEffect(() => {
    if (!musicOn) return
    const stopMusic = startMusic()
    const stopCrackle = startCrackle()
    return () => (stopMusic(), stopCrackle())
  }, [musicOn])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const set = useRoom.getState().set
    const target = YAW_IN + (YAW_OUT - YAW_IN) * s.progress

    if (deck.want) {
      s.lid = approach(s.lid, 1, 1.4, dt)
      if (s.lid > 0.4) s.speed = approach(s.speed, 1, 0.9, dt)
      if (!s.down) {
        const there = Math.abs(s.yaw - target) < 1e-4
        if (!there) {
          s.lift = approach(s.lift, 1, 2.5, dt)
          if (s.lift === 1 && s.lid > 0.7) s.yaw = approach(s.yaw, target, 0.45, dt)
        } else if (s.speed > 0.85) {
          s.lift = approach(s.lift, 0, 0.9, dt) // cue lever lets it down gently
          if (s.lift === 0) {
            s.down = true
            needle(true)
            set({ musicOn: true })
          }
        }
      } else {
        s.progress = Math.min(1, s.progress + dt / SIDE_SECONDS)
        s.yaw = target
        if (s.progress >= 1) deck.want = false
      }
    } else {
      if (s.down) {
        s.down = false
        needle(false)
        set({ musicOn: false })
      }
      s.lift = approach(s.lift, 1, 2.5, dt)
      if (s.lift === 1) s.yaw = approach(s.yaw, 0, 0.55, dt)
      if (s.yaw === 0) {
        s.speed = approach(s.speed, 0, 0.35, dt)
        if (s.progress >= 1) s.progress = 0 // side finished: next play starts from the edge again
      }
    }

    spin.current!.rotation.y -= RPM * s.speed * dt
    yaw.current!.rotation.y = s.yaw
    pitch.current!.rotation.x = -LIFT * smooth(s.lift) + (s.down ? Math.sin(performance.now() / 260) * 0.0006 : 0) // tiny warp wobble
    cue.current!.rotation.x = -0.5 * smooth(s.lift)
    hinge.current!.rotation.x = -1.25 * smooth(s.lid)
    led.current!.emissiveIntensity = s.speed > 0.02 || deck.want ? 2.2 : 0

    // speakers breathe on the 120 bpm loop
    s.beat += dt
    const kick = s.down ? Math.exp(-((s.beat % 0.5) / 0.08)) : 0
    coneL.current!.position.z = coneR.current!.position.z = kick * 0.003
  })

  return (
    <group>
      <group position-z={0.02}>
        {/* feet */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.035), FEET / 2, sz * (D / 2 - 0.035)]} material={mats.rubber}>
              <cylinderGeometry args={[0.02, 0.023, FEET, 20]} />
            </mesh>
          )),
        )}
        {/* plinth + top plate */}
        <RoundedBox args={[W, PLINTH, D]} radius={0.008} smoothness={3} position-y={FEET + PLINTH / 2} material={mats.wood} castShadow receiveShadow />
        <RoundedBox args={[W - 0.012, 0.006, D - 0.012]} radius={0.003} smoothness={2} position-y={TOP - 0.003} material={mats.plate} receiveShadow />
        <Platter mats={mats} spin={spin} />
        <Tonearm mats={mats} yaw={yaw} pitch={pitch} cue={cue} />
        <Controls mats={mats} led={led} />
        <DustCover mats={mats} hinge={hinge} />
        <group position={[S.x, REC_Y + 0.05, S.z]}>
          <Notes on={musicOn} />
        </group>
      </group>
      <Speaker x={-0.392} toe={0.18} cone={coneL} />
      <Speaker x={0.392} toe={-0.18} cone={coneR} />
    </group>
  )
}

// ------------------------------------------------------------------ the console itself (furniture, not clickable)

const SLEEVE_COLORS = ['#F1EADD', '#A7B59E', '#D99A3E', '#5B6B86', '#c9b79a', '#7E8E77', '#e4d6bf', '#8fa1b8', '#b86b4b', '#2f3a33', '#efe6d2', '#d8c27a']

/**
 * Low sage record console: wooden top, tapered legs, an open cubby full of LPs on the left,
 * two doors on the right. Plus a picture ledge on the wall above with two sleeves on show.
 * Local frame: long side along x, front = +z, y 0 = floor. `len`/`depth`/`h` come from RECORD_CONSOLE.
 */
export function RecordConsole({ len, depth, h }: { len: number; depth: number; h: number }) {
  const covers = useMemo(() => [coverTexture('smile'), coverTexture('rain')], [])
  const sleeves = useMemo(() => {
    let seed = 5
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const out: { x: number; t: number; s: number; tilt: number; dz: number; color: string }[] = []
    let x = -len / 2 + 0.018 + 0.004
    const end = -0.009 - 0.004
    while (true) {
      const t = 0.004 + r() * 0.004
      if (x + t > end) break
      out.push({ x: x + t / 2, t, s: 0.3 + r() * 0.012, tilt: (r() - 0.5) * 0.012, dz: (r() - 0.5) * 0.012, color: SLEEVE_COLORS[Math.floor(r() * SLEEVE_COLORS.length)] })
      x += t + 0.0008 + r() * 0.0015
    }
    return out
  }, [len])

  const legH = 0.12
  const topT = 0.03
  const bodyTop = h - topT
  const bodyH = bodyTop - legH
  const p = 0.018 // panel thickness
  const sage = <meshStandardMaterial color="#A7B59E" roughness={0.6} metalness={0} />
  const back = -depth / 2

  return (
    <group>
      {/* tapered, splayed legs */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (len / 2 - 0.06), legH / 2, sz * (depth / 2 - 0.06)]} rotation={[sz * 0.07, 0, -sx * 0.07]} castShadow>
            <cylinderGeometry args={[0.017, 0.011, legH + 0.01, 16]} />
            <meshStandardMaterial color="#B8916A" roughness={0.55} metalness={0} />
          </mesh>
        )),
      )}
      {/* carcass: bottom, sides, back, divider */}
      <RoundedBox args={[len, p, depth]} radius={0.004} position-y={legH + p / 2} castShadow receiveShadow>{sage}</RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[p, bodyH, depth]} radius={0.004} position={[s * (len / 2 - p / 2), legH + bodyH / 2, 0]} castShadow receiveShadow>{sage}</RoundedBox>
      ))}
      <mesh position={[0, legH + bodyH / 2, back + 0.006]} receiveShadow>
        <boxGeometry args={[len - 2 * p, bodyH, 0.012]} />
        <meshStandardMaterial color="#93a28b" roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, legH + p + (bodyH - p) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[p, bodyH - p, depth - 0.02]} />
        <meshStandardMaterial color="#A7B59E" roughness={0.6} metalness={0} />
      </mesh>
      {/* two doors on the right, with wooden knobs */}
      {[0, 1].map((i) => {
        const dw = (len / 2 - p - 0.009 - 0.004) / 2 - 0.002
        const cx = 0.009 + 0.002 + dw / 2 + i * (dw + 0.004)
        return (
          <group key={i}>
            <RoundedBox args={[dw, bodyH - p - 0.006, p]} radius={0.004} position={[cx, legH + p + (bodyH - p) / 2, depth / 2 - p / 2]} castShadow receiveShadow>
              <meshStandardMaterial color="#b3c0aa" roughness={0.6} metalness={0} />
            </RoundedBox>
            <mesh position={[cx + (i === 0 ? dw / 2 - 0.025 : -dw / 2 + 0.025), legH + bodyH * 0.55, depth / 2 + 0.008]} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.011, 0.008, 0.016, 16]} />
              <meshStandardMaterial color="#B8916A" roughness={0.5} metalness={0} />
            </mesh>
          </group>
        )
      })}
      {/* LPs standing in the cubby (spines facing out) */}
      {sleeves.map((s, i) => (
        <mesh key={i} position={[s.x, legH + p + s.s / 2 + 0.0005, back + 0.012 + s.s / 2 + 0.01 + s.dz]} rotation-z={s.tilt} castShadow receiveShadow>
          <boxGeometry args={[s.t, s.s, s.s]} />
          <meshStandardMaterial color={s.color} roughness={0.8} metalness={0} />
        </mesh>
      ))}
      {/* wooden top */}
      <RoundedBox args={[len + 0.02, topT, depth + 0.02]} radius={0.008} smoothness={3} position-y={bodyTop + topT / 2} castShadow receiveShadow>
        <meshStandardMaterial color="#D9B98C" roughness={0.5} metalness={0} />
      </RoundedBox>

      {/* picture ledge on the wall, two sleeves on show */}
      <group position={[0.07, 0, back - 0.02]}>
        <mesh position={[0, 1.0, 0.035]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.018, 0.07]} />
          <meshStandardMaterial color="#D9B98C" roughness={0.5} metalness={0} />
        </mesh>
        <mesh position={[0, 1.018, 0.066]} castShadow>
          <boxGeometry args={[0.72, 0.03, 0.008]} />
          <meshStandardMaterial color="#D9B98C" roughness={0.5} metalness={0} />
        </mesh>
        {[
          { x: -0.175, tex: covers[0], rot: 0 },
          { x: 0.175, tex: covers[1], rot: 0 },
        ].map((c) => (
          <group key={c.x} position={[c.x, 1.009, 0.045]} rotation-x={-0.09}>
            <mesh position-y={0.155} castShadow>
              <boxGeometry args={[0.31, 0.31, 0.004]} />
              <meshStandardMaterial attach="material-0" color="#e8e0d0" roughness={0.8} />
              <meshStandardMaterial attach="material-1" color="#e8e0d0" roughness={0.8} />
              <meshStandardMaterial attach="material-2" color="#e8e0d0" roughness={0.8} />
              <meshStandardMaterial attach="material-3" color="#e8e0d0" roughness={0.8} />
              <meshStandardMaterial attach="material-4" map={c.tex} roughness={0.7} metalness={0} />
              <meshStandardMaterial attach="material-5" color="#e8e0d0" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// dev: __deck.want = true from the console
if (import.meta.env.DEV) (window as unknown as { __deck: typeof deck }).__deck = deck
