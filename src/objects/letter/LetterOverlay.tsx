import { useEffect, useState } from 'react'
import { useRoom } from '../../state/store'
import { ending, letter } from '../../content/letter'
import './letter.css'

const STEP = 0.9 // seconds between paragraphs

/** HTML layer above the canvas: reading the letter, then the ending card. Mounted once in App. */
export function LetterOverlay() {
  const phase = useRoom((s) => s.letterPhase)
  const set = useRoom((s) => s.set)
  const setFocus = useRoom((s) => s.setFocus)
  const clearFocus = useRoom((s) => s.clearFocus)
  const [skipped, setSkipped] = useState(false)
  const [finished, setFinished] = useState(false)
  const [canLeave, setCanLeave] = useState(false)

  const total = letter.paragraphs.length + 2 // + sign + date

  // reading: unlock the "done" hint once every paragraph has faded in
  useEffect(() => {
    if (phase !== 'reading') return
    setSkipped(false)
    setFinished(false)
    const t = window.setTimeout(() => setFinished(true), (total * STEP + 0.8) * 1000)
    return () => window.clearTimeout(t)
  }, [phase, total])

  // ending: pull the camera far back, let the title write itself, then allow leaving
  useEffect(() => {
    if (phase !== 'ending') return
    setCanLeave(false)
    setFocus({ id: 'ending', position: [0.2, 0.2, 0.2], distance: 10 })
    const t = window.setTimeout(() => setCanLeave(true), 5200)
    return () => window.clearTimeout(t)
  }, [phase, setFocus])

  // Esc while reading just closes the letter (no ending)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const p = useRoom.getState().letterPhase
      if (p === 'reading' || p === 'ending') {
        set({ letterPhase: 'done' })
        clearFocus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set, clearFocus])

  if (phase === 'reading') {
    const done = finished || skipped
    return (
      <div
        className="nc-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            set({ letterPhase: 'done' })
            clearFocus()
          }
        }}
      >
        <article
          onAnimationStart={(e) => {
            // keep the newest paragraph in view as it fades in
            const el = e.target as HTMLElement
            if (el.classList.contains('nc-line') && !skipped) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }}
          className={`nc-paper${skipped ? ' nc-skip' : ''}`}
          onClick={() => {
            if (!done) setSkipped(true)
            else {
              clearFocus()
              set({ letterPhase: 'ending' })
            }
          }}
        >
          <p className="nc-line nc-to" style={{ animationDelay: '0.2s' }}>
            {letter.to}
          </p>
          {letter.paragraphs.map((p, i) => (
            <p key={i} className="nc-line" style={{ animationDelay: `${0.6 + i * STEP}s` }}>
              {p}
            </p>
          ))}
          <p className="nc-line nc-sign" style={{ animationDelay: `${0.6 + letter.paragraphs.length * STEP}s` }}>
            {letter.sign}
          </p>
          <p className="nc-line nc-date" style={{ animationDelay: `${0.6 + (letter.paragraphs.length + 1) * STEP}s` }}>
            {letter.date}
          </p>
        </article>
        <div
          className={`nc-hint${done ? ' nc-show' : ''}`}
          onClick={() => {
            if (!done) return
            clearFocus()
            set({ letterPhase: 'ending' })
          }}
        >
          {letter.doneHint}
        </div>
      </div>
    )
  }

  if (phase === 'ending') {
    return (
      <div
        className={`nc-ending${canLeave ? ' nc-leave' : ''}`}
        onClick={() => {
          if (!canLeave) return
          set({ letterPhase: 'done' })
          clearFocus()
        }}
      >
        <h1 className="nc-title">
          {[...ending.title].map((ch, i) => (
            <span key={i} style={{ animationDelay: `${1.2 + i * 0.45}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <p className="nc-sub">{ending.sub}</p>
        <p className="nc-back">{ending.back}</p>
      </div>
    )
  }
  return null
}
