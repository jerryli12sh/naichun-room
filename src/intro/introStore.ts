import { create } from 'zustand'
import { door } from '../content/door'
import { useRoom } from '../state/store'

/**
 * Local state of the door intro, shared by the 3D scene and the HTML overlay.
 * Only this branch uses it; the rest of the site only sees `entered` in the room store.
 */
export type IntroPhase = 'arriving' | 'idle' | 'busy' | 'opening' | 'open' | 'leaving' | 'done'

type IntroState = {
  phase: IntroPhase
  knocks: number
  hint: string
  bubble: boolean
  /** bumps when the overlay asks the scene to do something */
  request: { kind: 'knock' | 'replay' | 'enter'; n: number } | null
  set: (p: Partial<Omit<IntroState, 'set' | 'ask'>>) => void
  ask: (kind: 'knock' | 'replay' | 'enter') => void
}

export const useIntro = create<IntroState>((set, get) => ({
  phase: useRoom.getState().entered ? 'done' : 'arriving', // `?room` skips the door
  knocks: 0,
  hint: door.hints.start, // IntroOverlay swaps in `returning` for repeat visits
  bubble: false,
  request: null,
  set: (p) => set(p),
  ask: (kind) => set({ request: { kind, n: (get().request?.n ?? 0) + 1 } }),
}))
