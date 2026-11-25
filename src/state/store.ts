import { create } from 'zustand'

/**
 * Global room state. Branches talk to each other ONLY through this store.
 * Add fields here instead of importing another branch's components.
 */
export type DoorMood = 'sleeping' | 'headphones' | 'croc' | 'eating'
/** sealed → opening (flap lifts) → reading (overlay) → ending (pull-back + 笑着过日子) → done */
export type LetterPhase = 'sealed' | 'opening' | 'reading' | 'ending' | 'done'
export type FocusTarget = { id: string; position: [number, number, number]; distance?: number }

type RoomState = {
  entered: boolean // false = still at the door (branch 1 sets it true)
  doorMood: DoorMood // picked at random on each visit
  isRaining: boolean
  musicOn: boolean
  timeOfDay: number // 0..24
  stickersFound: string[] // crocodile sticker ids collected
  letterOpened: boolean // remembered across visits (localStorage)
  letterPhase: LetterPhase // branch 7; other branches may react, e.g. avatar waves during 'ending'
  focus: FocusTarget | null
  setFocus: (f: FocusTarget) => void
  clearFocus: () => void
  set: (patch: Partial<Omit<RoomState, 'set' | 'setFocus' | 'clearFocus'>>) => void
}

const readFlag = (k: string) => {
  try {
    return localStorage.getItem(k) === '1'
  } catch {
    return false
  }
}

const moods: DoorMood[] = ['sleeping', 'headphones', 'croc', 'eating']

export const useRoom = create<RoomState>((set) => ({
  entered: true, // TODO(branch 1): start false once the door intro exists
  doorMood: moods[Math.floor(Math.random() * moods.length)],
  isRaining: false,
  musicOn: false,
  timeOfDay: new Date().getHours(),
  stickersFound: [],
  letterOpened: readFlag('naichun.letterOpened'),
  letterPhase: 'sealed',
  focus: null,
  setFocus: (focus) => set({ focus }),
  clearFocus: () => set({ focus: null }),
  set: (patch) => set(patch),
}))

// handy for poking state from the console while developing
if (import.meta.env.DEV) (window as unknown as { __room: typeof useRoom }).__room = useRoom
