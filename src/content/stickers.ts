import type { CrocArt } from '../objects/croc/stickerArt'

/**
 * Crocodile sticker collection. Clicking the croc plush pops these one by one (unseen first).
 * `hidden` stickers never come from the plush; they are unlocked by doing something in the room.
 *
 * Only "hi" is one of his real stickers. The rest are placeholder drawings of his in-jokes:
 * replace `art` with `image: 'stickers/<file>'` (a file in public/stickers/) once the real pack arrives.
 */
export type Sticker = {
  id: string
  name: string
  image?: string // path under public/
  art?: CrocArt
  hidden?: string // how to unlock, shown as a hint in the album
}

export const stickers: Sticker[] = [
  { id: 'hi', name: 'Hi~', image: 'stickers/hi.jpg' },
  { id: 'sleep', name: '睡神上线', art: { eyes: 'closed', mouth: 'wavy', text: '睡神上线', bg: '#eef0fb', props: ['nightcap'] } },
  {
    id: 'owl',
    name: '凌晨三点',
    art: { eyes: 'wide', mouth: 'flat', text: '凌晨三点 精神抖擞', fontSize: 19, bg: '#2e3350', textColor: '#ffe9a8', props: ['moon'] },
  },
  { id: 'rain', name: '下雨啦', art: { eyes: 'happy', mouth: 'big', blush: true, text: '下雨啦！', bg: '#e3eef8', props: ['rain'] } },
  { id: 'sing', name: '车上K歌', art: { eyes: 'closed', mouth: 'sing', text: '车上 K 歌 ing', bg: '#fdf0e0', props: ['mic'] } },
  { id: 'math', name: '数模第三天', art: { eyes: 'spiral', mouth: 'o', text: '数模 第三天', bg: '#f2f2f2', props: ['laptop'] } },
  { id: 'smile', name: '笑着过日子', art: { eyes: 'happy', mouth: 'big', blush: true, text: '笑着过日子', bg: '#fff6d8' } },
  { id: 'boss', name: '黄总驾到', art: { text: '黄总驾到', bg: '#f6e2a2', props: ['shades'] } },
  { id: 'bday', name: '10.18', art: { eyes: 'happy', mouth: 'big', text: '10.18 生日快乐', fontSize: 20, bg: '#fde4ea', props: ['party'] } },
  { id: 'ok', name: '收到', art: { text: '收到~', bg: '#e9f4df', props: ['okhand'] } },
  {
    id: 'notomato',
    name: '拒绝番茄',
    hidden: '把小番茄拖到鳄鱼旁边',
    art: { eyes: 'disgust', mouth: 'wavy', text: '拒 绝 番 茄', bg: '#fde8e2', textColor: '#c0392b', props: ['notomato'] },
  },
  {
    id: 'yeet',
    name: '番茄退散',
    hidden: '把墙上的番茄贴纸弹出房间三次',
    art: { eyes: 'happy', mouth: 'big', text: '番茄退散！', props: ['yeet'] },
  },
]

/** Lines the croc says when the tomato gets too close, and the wall tomato says when flicked. */
export const crocDisgust = ['噫~', '拿走拿走！', '我不吃番茄！！']
export const tomatoYeetLines = ['走你！', '番茄退散', '禁止入内']
