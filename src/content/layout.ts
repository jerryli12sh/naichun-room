/**
 * Shared room layout (metres). Room spans x -2.1..2.1, z -1.8..1.8, open on +x and +z.
 * Arrangement follows the earlier frank-room version: bed along the left wall with its head on the back wall,
 * the yellow panel (photo board) on the back wall above the bed head, the bedside cabinet next to it,
 * one window on the back right with the desk under it, and open floor (rug) in the middle.
 * Feature branches read these so objects land on the right furniture.
 */
export const ROOM = { w: 4.2, d: 3.6, h: 2.8, wall: 0.08 } as const

/** Window openings in the back wall (-z). cx = centre x, y0 = sill height. One window, above the desk. */
export const WINDOWS = {
  wide: { cx: 1.0, y0: 0.95, w: 1.3, h: 1.35 },
} as const

/** Inner face of the back wall. */
export const BACK_Z = -ROOM.d / 2 + ROOM.wall / 2

/** PGPR yellow wood panel on the back wall, behind the bed head and the cabinet (x0..x1). Cove lamp bar at lampY. */
export const PANEL = { x0: -ROOM.w / 2, x1: -0.4, y0: 0.8, y1: 2.3, lampY: 2.12 } as const

/** Tops of furniture, for placing small objects. */
export const SURFACES = {
  cabinet: { x: -0.72, y: 0.52, z: -1.52 }, // bedside cabinet, between the bed head and the desk
  desk: { x: 1.0, y: 0.78, z: -1.45 }, // desk along the back wall, under the window
  bed: { x: -1.6, y: 0.52, z: -0.75 }, // mattress top (bed against the left wall)
} as const

/**
 * Photo wall: a pinboard above the bed. x/y/z is the centre of the board's back face, on the wall's surface
 * (the yellow panel on the back wall, panel front at z -1.75). w/h is the board size along the wall.
 * Keep the top below the cove lamp bar (PANEL.lampY).
 */
export const PHOTO_WALL = { wall: 'back' as 'left' | 'back', x: (PANEL.x0 + PANEL.x1) / 2, y: 1.52, z: -ROOM.d / 2 + 0.05, w: 1.5, h: 0.8 } as const

/** Open floor in the middle of the room. */
export const RUG = { x: 0.1, z: 0.35, w: 1.6, d: 1.1 } as const

/** Day/night: 0 = full day, 1 = full night. Ramps 17–20h and 5–8h. */
export function nightness(hour: number) {
  const h = ((hour % 24) + 24) % 24
  if (h >= 20 || h < 5) return 1
  if (h >= 8 && h < 17) return 0
  if (h >= 17) return (h - 17) / 3
  return 1 - (h - 5) / 3
}

/**
 * 乃春's standing height in metres, everywhere he appears (room and door intro).
 * Human-sized next to the furniture: the desk top (0.78) is about at his waist.
 */
export const AVATAR_HEIGHT = 1.5

/**
 * Record console (turntable corner): low cabinet against the left wall at the foot of the bed,
 * between the bed (ends z ~0.24) and the light switch (z 1.55). x/z = centre on the floor; the long side
 * (len) runs along the wall, the front faces +x. h = height of the top surface.
 */
export const RECORD_CONSOLE = { x: -ROOM.w / 2 + 0.22, z: 0.92, len: 0.92, depth: 0.4, h: 0.53 } as const

/** Where the avatar can stand to listen while a record plays (facing the console, i.e. -x). */
export const LISTEN_SPOT = { x: -ROOM.w / 2 + 0.75, z: 0.95, yaw: -Math.PI / 2 } as const
