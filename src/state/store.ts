import { create } from 'zustand'

/**
 * Global room state. Branches talk to each other ONLY through this store.
 * Add fields here instead of importing another branch's components.
 */
export type DoorMood = 'sleeping' | 'headphones' | 'croc' | 'eating'
export type FocusTarget = {
  id: string
  position: [number, number, number]
  distance?: number
  /** Direction from the target to the camera (any length). Default is the diagonal [0.7, 0.5, 0.7]. */
  dir?: [number, number, number]
}

type RoomState = {
  entered: boolean // false = still at the door (branch 1 sets it true)
  doorMood: DoorMood // picked at random on each visit
  isRaining: boolean
  musicOn: boolean
  timeOfDay: number // 0..24
  stickersFound: string[] // crocodile sticker ids collected
  letterOpened: boolean
  focus: FocusTarget | null
  setFocus: (f: FocusTarget) => void
  clearFocus: () => void
  set: (patch: Partial<Omit<RoomState, 'set' | 'setFocus' | 'clearFocus'>>) => void
}

const moods: DoorMood[] = ['sleeping', 'headphones', 'croc', 'eating']

export const useRoom = create<RoomState>((set) => ({
  entered: true, // TODO(branch 1): start false once the door intro exists
  doorMood: moods[Math.floor(Math.random() * moods.length)],
  isRaining: false,
  musicOn: false,
  timeOfDay: new Date().getHours(),
  stickersFound: [],
  letterOpened: false,
  focus: null,
  setFocus: (focus) => set({ focus }),
  clearFocus: () => set({ focus: null }),
  set: (patch) => set(patch),
}))

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__room = useRoom
