import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global room state. Branches talk to each other ONLY through this store.
 * Add fields here instead of importing another branch's components.
 *
 * Persistence: one localStorage key ('naichun-room'). To remember a field across visits,
 * add its name to PERSISTED. Do not write your own localStorage keys.
 */
export type DoorMood = 'sleeping' | 'headphones' | 'croc' | 'eating'
export type FocusTarget = {
  id: string
  position: [number, number, number]
  distance?: number
  /** Preferred direction from the target to the camera (any length). Default: the front diagonal. */
  dir?: [number, number, number]
}

type Actions = 'set' | 'setFocus' | 'clearFocus'
export type RoomState = {
  entered: boolean // false = still at the door (branch 1 sets it true)
  doorMood: DoorMood // picked at random on each visit
  isRaining: boolean
  musicOn: boolean
  timeOfDay: number // 0..24
  stickersFound: string[] // crocodile sticker ids collected
  stickerPop: { id: string; isNew: boolean; key: number } | null // sticker card currently flying out (branch 6)
  tomatoYeets: number // times the wall tomato was flicked out of the room (branch 6)
  albumOpen: boolean // crocodile sticker album overlay (branch 6)
  letterOpened: boolean
  dragging: boolean // something is being dragged; camera orbit pauses
  alarmRangAt: number // Date.now() of the last alarm ring, 0 = never (branch 3: avatar goes to bed / wakes up)
  lastMood: DoorMood | null // door mood of the previous visit, so the next one differs
  visits: number // how many times the site has been opened (door intro says 又来啦 after the first)
  focus: FocusTarget | null
  setFocus: (f: FocusTarget) => void
  clearFocus: () => void
  set: (patch: Partial<Omit<RoomState, Actions>>) => void
}

/** Fields kept across visits. Everything else starts fresh. */
export const PERSISTED: (keyof RoomState)[] = ['stickersFound', 'tomatoYeets', 'letterOpened', 'lastMood', 'visits']

export const moods: DoorMood[] = ['sleeping', 'headphones', 'croc', 'eating']

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)

/** Random door mood, never `last`. `?mood=croc` forces one (for debugging). */
export function pickMood(last: DoorMood | null = null): DoorMood {
  const forced = params.get('mood') as DoorMood | null
  if (forced && moods.includes(forced)) return forced
  const pool = moods.filter((m) => m !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useRoom = create<RoomState>()(
  persist(
    (set) => ({
      // `?room` skips the door (handy while working on other branches)
      entered: params.has('room'),
      doorMood: pickMood(),
      isRaining: false,
      musicOn: false,
      timeOfDay: new Date().getHours(),
      stickersFound: [],
      stickerPop: null,
      tomatoYeets: 0,
      albumOpen: false,
      letterOpened: false,
      dragging: false,
      alarmRangAt: 0,
      lastMood: null,
      visits: 0,
      focus: null,
      setFocus: (focus) => set({ focus }),
      clearFocus: () => set({ focus: null }),
      set: (patch) => set(patch),
    }),
    {
      name: 'naichun-room',
      partialize: (s) => Object.fromEntries(PERSISTED.map((k) => [k, s[k]])) as Partial<RoomState>,
      // once the saved state is back: count this visit and pick a mood unlike last time's
      onRehydrateStorage: () => (s) => {
        if (!s) return
        const doorMood = pickMood(s.lastMood)
        s.set({ doorMood, lastMood: doorMood, visits: s.visits + 1 })
      },
    },
  ),
)

// poke state from the console while developing: __room.getState(), __room.setState({...})
if (import.meta.env.DEV) (window as unknown as { __room: typeof useRoom }).__room = useRoom
