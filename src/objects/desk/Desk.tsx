import { Laptop } from './Laptop'
import { Mug, Phone, Scratch } from './DeskBits'

/**
 * Everything on the desk top except the letter: laptop (数模 at 3 am), scratch paper + pen, mug on a coaster, phone.
 * The desk slab, books and lamp are room-look's (scene/room/Furniture.tsx). Positions hang off SURFACES.desk
 * (see geometry.ts), and nothing overlaps: books x < 0.4, lamp around x 1.45, window sill z < -1.6.
 */
export function Desk() {
  return (
    <group>
      <Laptop />
      <Scratch />
      <Mug />
      <Phone />
    </group>
  )
}
