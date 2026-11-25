import type { DoorMood } from '../state/store'

/** Words for the door intro. Edit freely; scene code reads them from here. */
export const door = {
  place: "PRINCE GEORGE'S PARK · SINGAPORE",
  plate: '12/7/M',
  hanger: { title: '睡神', sub: '营业中' },
  hints: {
    start: '轻轻敲门',
    returning: '又来啦～轻轻敲门',
    afterFirst: '……没反应。再敲敲？',
    afterSecond: '门后好像有人在睡觉……再敲一次',
    coming: '来了来了……',
  },
  enter: '进 屋 看 看',
  replay: '关上门，换一种开门方式',
  skip: '直接进屋 »',
  skipHint: '跳过开场（Esc）',
} as const

/** What 乃春 says when he opens the door, per mood. */
export const doorLines: Record<DoorMood, string> = {
  sleeping: '嗯……？谁呀……\n（揉眼睛）几点了现在',
  headphones: '啊？你说啥？\n我在听歌🎵',
  croc: 'Hi~',
  eating: '在吃饭呢，进来坐\n番茄我已经挑出去了',
}
