/**
 * Photo wall entries. Edit words here; no scene code needs to change.
 *
 * - file: name under public/photos/ (null = an empty slot waiting for a future photo)
 * - date: shown on the back. null prints "日期待补".
 * - place: small heading on the back, and the caption under the photo on the front.
 * - note: handwritten note on the back (draft by Claude, for Jerry to rewrite).
 * - focus: which part of the photo to keep when cropping to the square polaroid (0..1, default centre).
 */
export type PhotoEntry = {
  file: string | null
  date: string | null
  place: string
  note: string
  focus?: [number, number]
}

export const photoSign = '—— 我们'

export const photos: PhotoEntry[] = [
  { file: 'p00.jpg', date: null, place: '科莫多 · 船尾', note: '船一开起来，风比我们还吵。\n头发：已放弃管理。', focus: [0.55, 0.45] },
  { file: 'p01.jpg', date: null, place: '科莫多 · 粉沙滩', note: '墨镜一戴，谁也不爱。\n耶。', focus: [0.5, 0.6] },
  { file: 'p02.jpg', date: null, place: '科莫多 · 沙滩排球', note: '球在天上，人在发呆。\n这一球最后落哪了？\n没人记得。' },
  { file: 'p03.jpg', date: null, place: '科莫多 · 船上', note: '那天的天空是紫色的，\n我们是开心的。' },
  { file: 'p04.jpg', date: null, place: '剪影', note: '五个人，十只手，\n一个太阳。' },
  { file: 'p05.jpg', date: null, place: 'Night Safari', note: '夜间动物园打卡。\n后来你的 Q 版手办，\n就是照着这张做的。', focus: [0.65, 0.5] },
  { file: 'p06.jpg', date: null, place: 'PGPR 楼下', note: '楼下的台球桌。\n谁赢了不重要。\n（是我）' },
  { file: 'p07.jpg', date: null, place: '饭桌上', note: '双手合十：\n拜托拜托，\n下一块留给我。' },
  { file: 'p08.jpg', date: null, place: '峡谷公路', note: '站在石头缝里，\n酷是你的，晒是我们的。', focus: [0.5, 0.65] },
  { file: 'p09.jpg', date: null, place: '日落', note: '抱着手臂看太阳下山，\n像在等它说再见。', focus: [0.5, 0.6] },
  { file: 'p10.jpg', date: null, place: '晚饭', note: '一大桌人，一大桌菜，\n一大堆笑声。' },
  { file: 'p11.jpg', date: null, place: '海边', note: '海风把头发吹乱了，\n笑没乱。', focus: [0.65, 0.5] },
  { file: 'p12.jpg', date: null, place: '瀑布', note: '走进水雾里，\n回头就看不清你了。', focus: [0.5, 0.55] },
  { file: 'p13.jpg', date: null, place: 'GWK', note: '人很小，雕像很大，\n笑容刚刚好。', focus: [0.5, 0.65] },
  { file: 'p14.jpg', date: null, place: '马六甲', note: '海上清真寺前，\n蹲下来拍才对称。', focus: [0.5, 0.7] },
  { file: null, date: null, place: '留给下一张', note: '下次见面，\n一起拍一张放这里。' },
  { file: null, date: null, place: '留给毕业那天', note: '学士帽扔上天的那张，\n记得留给我。' },
  { file: null, date: null, place: '留给以后', note: '笑着过日子。\n剩下的，慢慢贴满。' },
]
