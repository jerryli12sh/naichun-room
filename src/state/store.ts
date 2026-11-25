import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global room state. Branches talk to each other ONLY through this store.
 * Add fields here instead of importing another branch's components.
 */
export type DoorMood = 'sleeping' | 'headphones' | 'croc' | 'eating'
export type FocusTarget = { id: string; position: [number, number, number]; distance?: number }

type RoomState = {
  entered: boolean // false = still at the door (branch 1 sets it true)
  doorMood: DoorMood // picked at random on each visit
  isRaining: boolean
  musicOn: boolean
  timeOfDay: number // 0..24
  stickersFound: string[] // crocodile sticker ids collected
  stickerPop: { id: string; isNew: boolean; key: number } | null // sticker card currently flying out (branch 6)
  tomatoYeets: number // times the wall tomato was flicked out of the room (branch 6)
  albumOpen: boolean // crocodile sticker album overlay (branch 6)
  dragging: boolean // an object is being dragged; camera orbit pauses
  letterOpened: boolean
  focus: FocusTarget | null
  setFocus: (f: FocusTarget) => void
  clearFocus: () => void
  set: (patch: Partial<Omit<RoomState, 'set' | 'setFocus' | 'clearFocus'>>) => void
}

const moods: DoorMood[] = ['sleeping', 'headphones', 'croc', 'eating']

export const useRoom = create<RoomState>()(
  persist(
    (set) => ({
      entered: true, // TODO(branch 1): start false once the door intro exists
      doorMood: moods[Math.floor(Math.random() * moods.length)],
      isRaining: false,
      musicOn: false,
      timeOfDay: new Date().getHours(),
      stickersFound: [],
      stickerPop: null,
      tomatoYeets: 0,
      albumOpen: false,
      dragging: false,
      letterOpened: false,
      focus: null,
      setFocus: (focus) => set({ focus }),
      clearFocus: () => set({ focus: null }),
      set: (patch) => set(patch),
    }),
    {
      // Only collection progress survives a reload; everything else starts fresh each visit.
      name: 'naichun-room',
      partialize: (s) => ({ stickersFound: s.stickersFound, tomatoYeets: s.tomatoYeets }),
    },
  ),
)
