import { useEffect, useState } from 'react'
import { useIntro } from './introStore'
import { useRoom } from '../state/store'
import { nightness } from '../content/layout'
import { door } from '../content/door'
import './intro.css'

/** The few bits of HTML on top of the door scene: place name, hint + knock dots, replay and enter. */
export function IntroOverlay() {
  const entered = useRoom((s) => s.entered)
  const { phase, knocks, hint, ask } = useIntro()
  const visits = useRoom((s) => s.visits)
  const day = useRoom((s) => nightness(s.timeOfDay) < 0.5)
  const [gone, setGone] = useState(entered)

  // after walking in, let the hint fade, then drop the overlay entirely
  useEffect(() => {
    if (!entered) return
    const t = setTimeout(() => setGone(true), 1600)
    return () => clearTimeout(t)
  }, [entered])
  if (gone) return null

  const arrived = phase !== 'arriving'
  const showHint = !entered && (phase === 'idle' || phase === 'busy')
  const open = !entered && phase === 'open'

  return (
    <div className={`nc-intro${day ? ' day' : ''}`} data-phase={phase}>
      <div className="nc-vignette" />
      <div className={`nc-place${arrived && !entered ? ' show' : ''}`}>{door.place}</div>
      <div className={`nc-hint${showHint ? ' show' : ''}`}>
        <span>{knocks === 0 && visits > 1 ? door.hints.returning : hint}</span>
        <div className="nc-dots">
          {[0, 1, 2].map((i) => <i key={i} className={i < knocks ? 'on' : ''} />)}
        </div>
      </div>
      <button className={`nc-replay${open ? ' show' : ''}`} title={door.replay} aria-label={door.replay} onClick={() => ask('replay')}>↻</button>
      <button className={`nc-enter${open ? ' show' : ''}`} onClick={() => ask('enter')}>{door.enter}</button>
    </div>
  )
}
