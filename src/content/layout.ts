/**
 * Shared room layout (metres). Room spans x -1.5..1.5, z -1.8..1.8, open on +x and +z.
 * Feature branches read these so objects land on the right furniture.
 */
export const ROOM = { w: 3, d: 3.6, h: 2.8, wall: 0.08 } as const

/** Window openings in the back wall (-z). cx = centre x, y0 = sill height. */
export const WINDOWS = {
  narrow: { cx: -0.25, y0: 0.95, w: 0.4, h: 1.35 },
  wide: { cx: 0.78, y0: 0.95, w: 1.1, h: 1.35 },
} as const

/** Inner face of the back wall. */
export const BACK_Z = -ROOM.d / 2 + ROOM.wall / 2

/** Tops of furniture, for placing small objects. */
export const SURFACES = {
  cabinet: { x: -0.25, y: 0.52, z: -1.52 }, // bedside cabinet, under the narrow window
  desk: { x: 0.8, y: 0.78, z: -1.45 }, // desk along the back wall, under the wide window
  bed: { x: -0.98, y: 0.52, z: -0.75 }, // mattress top
} as const

/** Photo wall: centre of the photo area on the left wall (-x), between the yellow bed panel (ends z 0.44) and the light switch (z 1.55). */
export const PHOTO_WALL = { x: -ROOM.w / 2 + 0.04, y: 1.62, z: 1.0 } as const

/** Day/night: 0 = full day, 1 = full night. Ramps 17–20h and 5–8h. */
export function nightness(hour: number) {
  const h = ((hour % 24) + 24) % 24
  if (h >= 20 || h < 5) return 1
  if (h >= 8 && h < 17) return 0
  if (h >= 17) return (h - 17) / 3
  return 1 - (h - 5) / 3
}
