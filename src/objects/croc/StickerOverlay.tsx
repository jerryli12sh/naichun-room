import { useEffect } from 'react'
import { useRoom } from '../../state/store'
import { stickers, type Sticker } from '../../content/stickers'
import { crocSvg } from './stickerArt'
import './croc.css'

const svgCache = new Map<string, string>()
function StickerFace({ s }: { s: Sticker }) {
  if (s.image) return <img src={`${import.meta.env.BASE_URL}${s.image}`} alt={s.name} draggable={false} />
  if (!svgCache.has(s.id)) svgCache.set(s.id, crocSvg(s.art))
  return <div className="sticker-svg" dangerouslySetInnerHTML={{ __html: svgCache.get(s.id)! }} />
}

/** DOM layer above the canvas: the sticker card that pops out of the croc, and the album. */
export function StickerOverlay() {
  const pop = useRoom((s) => s.stickerPop)
  const found = useRoom((s) => s.stickersFound)
  const albumOpen = useRoom((s) => s.albumOpen)
  const set = useRoom((s) => s.set)

  useEffect(() => {
    if (!pop) return
    const id = setTimeout(() => useRoom.getState().stickerPop?.key === pop.key && set({ stickerPop: null }), 2300)
    return () => clearTimeout(id)
  }, [pop, set])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && set({ albumOpen: false })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  const popped = pop && stickers.find((s) => s.id === pop.id)
  const complete = found.length === stickers.length

  return (
    <>
      {popped && (
        <div className="sticker-pop" key={pop.key}>
          <div className="sticker-card" style={{ ['--tilt' as string]: `${((pop.key % 10) - 5).toFixed(0)}deg` }}>
            <StickerFace s={popped} />
            <span className={`sticker-tag ${pop.isNew ? '' : 'dup'}`}>{pop.isNew ? 'NEW!' : '又是你'}</span>
          </div>
          <div className="sticker-count">
            {complete && pop.isNew ? '🎉 全图鉴收集完成！' : `🐊 图鉴 ${found.length}/${stickers.length}`}
          </div>
        </div>
      )}

      {albumOpen && (
        <div className="album" onClick={(e) => e.target === e.currentTarget && set({ albumOpen: false })}>
          <div className="album-book">
            <h2>🐊 鳄鱼图鉴 <small>{found.length}/{stickers.length}</small></h2>
            <p>戳床上的鳄鱼收集表情包。有几张要在房间里做点别的事才会出现。</p>
            <div className="album-grid">
              {stickers.map((s) =>
                found.includes(s.id) ? (
                  <div className="album-cell" key={s.id}>
                    <StickerFace s={s} />
                    <div>{s.name}</div>
                  </div>
                ) : (
                  <div className="album-cell locked" key={s.id} title={s.hidden}>
                    <div className="q">{s.hidden ? '🍅' : '?'}</div>
                    <div>{s.hidden ? '隐藏款' : '???'}</div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
