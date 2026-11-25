import { Suspense } from 'react'
import { CrocPlush } from './CrocPlush'
import { AlbumBook } from './AlbumBook'
import { RoamingTomato, WallTomato } from './Tomatoes'

export { StickerOverlay } from './StickerOverlay'

/** Branch 6: croc plush + sticker album on the bed, the 番茄禁区 wall sticker, and the roaming tomato. */
export function CrocCorner() {
  return (
    <>
      <CrocPlush />
      <Suspense fallback={null}>
        <AlbumBook />
      </Suspense>
      <WallTomato />
      <RoamingTomato />
    </>
  )
}
