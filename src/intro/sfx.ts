/** Every sound in the intro is synthesised with WebAudio, so there are no audio files. */
let ctx: AudioContext | null = null
function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

export function knock(delay = 0, vol = 1) {
  const a = ac(), t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(190, t)
  o.frequency.exponentialRampToValueAtTime(70, t + 0.12)
  env(g, t, 0.7 * vol, 0.005, 0.17)
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.2)
  // the woody "tock"
  const n = a.createBufferSource(), buf = a.createBuffer(1, a.sampleRate * 0.06, a.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4)
  n.buffer = buf
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2
  const ng = a.createGain(); ng.gain.value = 0.5 * vol
  n.connect(f).connect(ng).connect(a.destination); n.start(t)
}

export function step(delay: number, vol = 0.25) {
  const a = ac(), t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter()
  o.type = 'triangle'
  o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1)
  f.type = 'lowpass'; f.frequency.value = 300
  env(g, t, vol, 0.01, 0.13)
  o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + 0.16)
}

export function creak(delay = 0) {
  const a = ac(), t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(240, t + 1.1)
  lfo.frequency.value = 22; lg.gain.value = 30; lfo.connect(lg).connect(o.frequency)
  f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 6
  env(g, t, 0.05, 0.15, 1.05)
  o.connect(f).connect(g).connect(a.destination)
  o.start(t); lfo.start(t); o.stop(t + 1.25); lfo.stop(t + 1.25)
}

export function latch(delay = 0) {
  const a = ac(), t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain()
  o.type = 'square'; o.frequency.value = 1800
  env(g, t, 0.08, 0.003, 0.037)
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.05)
}

/** a little music-box phrase when the door is open */
export function chime() {
  const a = ac()
  ;[72, 76, 79, 84, 79, 83].forEach((m, i) => {
    const t = a.currentTime + 0.2 + i * 0.17, o = a.createOscillator(), g = a.createGain()
    o.type = 'sine'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12)
    env(g, t, 0.07, 0.01, 0.89)
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 1)
  })
}
