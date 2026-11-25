import { audio } from '../../audio/audio'

/** Short noise burst through a band-pass: paper sliding / unfolding. */
export function paperRustle(duration = 0.5, gain = 0.09) {
  const a = audio()
  const len = Math.floor(a.sampleRate * duration)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  // crackly: sparse bursts rather than flat noise
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.35 ? 1 : 0.2)
  const src = a.createBufferSource()
  src.buffer = buf
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 3200
  bp.Q.value = 0.7
  const g = a.createGain()
  const t = a.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  src.connect(bp).connect(g).connect(a.destination)
  src.start()
}

/** The wax seal popping off. */
export function sealPop() {
  const a = audio()
  const o = a.createOscillator()
  const g = a.createGain()
  const t = a.currentTime
  o.type = 'sine'
  o.frequency.setValueAtTime(520, t)
  o.frequency.exponentialRampToValueAtTime(180, t + 0.12)
  g.gain.setValueAtTime(0.18, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + 0.16)
}

/** Soft music-box arpeggio for the ending title (C major pentatonic, rising). */
export function endingChime() {
  const a = audio()
  const notes = [72, 76, 79, 84, 81, 79, 84, 88]
  notes.forEach((m, i) => {
    const t = a.currentTime + 1.2 + i * 0.42
    const f = 440 * Math.pow(2, (m - 69) / 12)
    const o = a.createOscillator()
    const o2 = a.createOscillator()
    const g = a.createGain()
    o.type = 'sine'
    o2.type = 'triangle'
    o.frequency.value = f
    o2.frequency.value = f * 2
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8)
    o.connect(g)
    o2.connect(g)
    g.connect(a.destination)
    o.start(t)
    o2.start(t)
    o.stop(t + 1.9)
    o2.stop(t + 1.9)
  })
}
