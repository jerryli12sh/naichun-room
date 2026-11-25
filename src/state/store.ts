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
/** Letter flow (branch 7): sealed → opening (flap lifts) → reading (overlay) → ending (pull-back + 笑着过日子) → done */
export type LetterPhase = 'sealed' | 'opening' | 'reading' | 'ending' | 'done'
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
  letterOpened: boolean
  letterPhase: LetterPhase // not persisted; other branches may react, e.g. the avatar waves during 'ending'
  dragging: boolean // something is being dragged; camera orbit pauses
  focus: FocusTarget | null
  setFocus: (f: FocusTarget) => void
  clearFocus: () => void
  set: (patch: Partial<Omit<RoomState, Actions>>) => void
}

/** Fields kept across visits. Everything else starts fresh. */
export const PERSISTED: (keyof RoomState)[] = ['stickersFound', 'letterOpened']

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
      letterOpened: false,
      letterPhase: 'sealed',
      dragging: false,
      focus: null,
      setFocus: (focus) => set({ focus }),
      clearFocus: () => set({ focus: null }),
      set: (patch) => set(patch),
    }),
    {
      name: 'naichun-room',
      partialize: (s) => Object.fromEntries(PERSISTED.map((k) => [k, s[k]])) as Partial<RoomState>,
    },
  ),
)

// poke state from the console while developing: __room.getState(), __room.setState({...})
if (import.meta.env.DEV) (window as unknown as { __room: typeof useRoom }).__room = useRoom
