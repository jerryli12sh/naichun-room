/** One shared WebAudio context, created on first user gesture. All sounds are synthesised (no audio files). */
let ctx: AudioContext | null = null

export function audio() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Looping filtered noise for rain. Returns a stop function that fades out. */
export function startRain() {
  const a = audio()
  const len = a.sampleRate * 2
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  src.loop = true
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1400
  const g = a.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.12, a.currentTime + 1.5)
  src.connect(lp).connect(g).connect(a.destination)
  src.start()
  return () => {
    g.gain.cancelScheduledValues(a.currentTime)
    g.gain.setValueAtTime(g.gain.value, a.currentTime)
    g.gain.linearRampToValueAtTime(0, a.currentTime + 1)
    setTimeout(() => src.stop(), 1100)
  }
}

// A gentle, generic lo-fi loop: Cmaj7 – Am7 – Fmaj7 – G6 pads with a soft pentatonic melody. No playlist.
const CHORDS = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 64],
]
const MELODY = [76, 74, 72, 69, 72, 74, 76, 79, 76, 74, 72, 74, 72, 69, 67, 69]
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/** Starts the ambient loop; returns a stop function. */
export function startMusic() {
  const a = audio()
  const master = a.createGain()
  master.gain.value = 0
  master.gain.linearRampToValueAtTime(0.1, a.currentTime + 1)
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  master.connect(lp).connect(a.destination)
  const beat = 0.5
  let next = a.currentTime + 0.05
  let bar = 0
  const schedule = () => {
    while (next < a.currentTime + 2) {
      const chord = CHORDS[bar % CHORDS.length]
      for (const n of chord) {
        const o = a.createOscillator()
        o.type = 'sine'
        o.frequency.value = hz(n)
        const g = a.createGain()
        g.gain.setValueAtTime(0, next)
        g.gain.linearRampToValueAtTime(0.18, next + 0.3)
        g.gain.linearRampToValueAtTime(0, next + beat * 4)
        o.connect(g).connect(master)
        o.start(next)
        o.stop(next + beat * 4 + 0.05)
      }
      for (let i = 0; i < 4; i++) {
        const t = next + i * beat
        const o = a.createOscillator()
        o.type = 'triangle'
        o.frequency.value = hz(MELODY[(bar * 4 + i) % MELODY.length])
        const g = a.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.35, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.95)
        o.connect(g).connect(master)
        o.start(t)
        o.stop(t + beat)
      }
      next += beat * 4
      bar++
    }
  }
  schedule()
  const id = setInterval(schedule, 500)
  return () => {
    clearInterval(id)
    master.gain.cancelScheduledValues(a.currentTime)
    master.gain.setValueAtTime(master.gain.value, a.currentTime)
    master.gain.linearRampToValueAtTime(0, a.currentTime + 0.6)
    setTimeout(() => master.disconnect(), 3000)
  }
}

/** Classic double-beep alarm, about 1.5 s. */
export function beep() {
  const a = audio()
  let t = a.currentTime
  for (let i = 0; i < 8; i++) {
    const o = a.createOscillator()
    o.type = 'square'
    o.frequency.value = 1800
    const g = a.createGain()
    g.gain.setValueAtTime(0.05, t)
    g.gain.setValueAtTime(0, t + 0.07)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + 0.08)
    t += i % 2 ? 0.25 : 0.1
  }
}

/** Soft thump + tick when the stylus touches down (or a click when it lifts). */
export function needle(down = true) {
  const a = audio()
  const t = a.currentTime
  const o = a.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(down ? 90 : 160, t)
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  const g = a.createGain()
  g.gain.setValueAtTime(down ? 0.25 : 0.08, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + 0.2)
}

/** Vinyl surface noise: a soft hiss bed with random crackles and the odd pop. Returns a stop function. */
export function startCrackle() {
  const a = audio()
  const len = a.sampleRate * 4
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    let v = (Math.random() * 2 - 1) * 0.04 // hiss
    if (Math.random() < 0.0009) v += (Math.random() * 2 - 1) * 0.9 // crackle
    if (Math.random() < 0.00004) for (let k = 0; k < 60 && i + k < len; k++) d[i + k] += Math.exp(-k / 9) * 0.8 // pop
    d[i] += v
  }
  const src = a.createBufferSource()
  src.buffer = buf
  src.loop = true
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2500
  bp.Q.value = 0.6
  const g = a.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.22, a.currentTime + 0.3)
  src.connect(bp).connect(g).connect(a.destination)
  src.start()
  return () => {
    g.gain.cancelScheduledValues(a.currentTime)
    g.gain.setValueAtTime(g.gain.value, a.currentTime)
    g.gain.linearRampToValueAtTime(0, a.currentTime + 0.4)
    setTimeout(() => src.stop(), 500)
  }
}
