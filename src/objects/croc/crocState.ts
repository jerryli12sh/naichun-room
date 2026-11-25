import { create } from 'zustand'
import { useRoom } from '../../state/store'

/** Croc + tomato internals shared inside this branch only (other branches use the main store). */

/** The croc sits at one of two spots on the bed and hops to the other when a tomato comes near. */
export const BED_X = -0.95
export const BED_TOP = 0.455
export const CROC_SPOTS_Z = [-1.0, -0.15] as const
export const BED_RECT = { x0: -1.45, x1: -0.45, z0: -1.6, z1: 0.4 }

type CrocState = {
  spot: 0 | 1
  disgustedAt: number // performance.now() of the last flee, 0 = never
  line: string | null // speech bubble text
  flee: (line: string) => void
}

export const useCroc = create<CrocState>((set, get) => ({
  spot: 0,
  disgustedAt: 0,
  line: null,
  flee: (line) => {
    set({ spot: get().spot === 0 ? 1 : 0, disgustedAt: performance.now(), line })
    setTimeout(() => get().line === line && set({ line: null }), 1400)
  },
}))

export const crocWorldPos = (spot: 0 | 1): [number, number, number] => [BED_X, BED_TOP, CROC_SPOTS_Z[spot]]

/** Adds a sticker to the collection and shows the pop-up card. */
export function awardSticker(id: string) {
  const s = useRoom.getState()
  const isNew = !s.stickersFound.includes(id)
  s.set({
    stickersFound: isNew ? [...s.stickersFound, id] : s.stickersFound,
    stickerPop: { id, isNew, key: performance.now() },
  })
}
