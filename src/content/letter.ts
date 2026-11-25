// Words for branch 7 (desk + letter + ending). Edit freely; no scene code needs to change.

export const letter = {
  to: 'Dear 黄总：',
  paragraphs: [
    '很开心能在新加坡认识你！',
    '以后想起这段交换生活，应该还是会想起一起打数模的日子、在车上一起唱的歌，还有那些莫名其妙但真的很好笑的鳄鱼表情包。现在想想，很多当时觉得稀松平常的小事，居然也成了值得纪念的事情。',
    '希望以后的你依旧可以心安理得地睡懒觉，享受每一个下雨天，做自己喜欢的事情，成为自己想成为的人。',
    '世界很大，希望我们还有机会一起去看看。',
    '最后，祝黄总永远笑着过日子！',
    '后会有期！！',
  ],
  // optional sign-off lines under the body; leave empty to show none
  sign: '',
  date: '',
  doneHint: '读完了，点一下',
}

export const ending = {
  title: '笑着过日子',
  sub: '乃春 · PGPR 12/7/M',
  back: '房间一直在这里，随时回来',
}

/** Laptop screens, cycled by clicking the laptop. */
export const laptopScreens = [
  {
    kind: 'paper' as const,
    file: '数模论文_最终版_真的最终版_v7.docx',
    title: '基于多目标优化的 ×× 问题研究',
    lines: ['摘要', '本文针对……建立了……模型', '5.2 灵敏度分析（待补）', '参考文献（待补）'],
    clock: '03:47',
  },
  {
    kind: 'terminal' as const,
    file: 'model.m',
    title: '>> run model.m',
    lines: ['iter 4821   loss 0.0312', 'iter 4822   loss 0.0311', 'iter 4823   loss 0.0311', 'Elapsed time is 3:47:12 …'],
    clock: '04:12',
  },
  {
    kind: 'note' as const,
    file: '便利贴',
    title: '睡神请注意',
    lines: ['别睡！', '离交论文还有 2 小时', '（醒了记得叫我）'],
    clock: '05:30',
  },
]

/** The top sheet of the scratch-paper stack. Swap in the real team name / formula if you remember it. */
export const scratch = {
  formula: 'max  Σ wᵢ·fᵢ(x)',
  sub: 's.t.  g(x) ≤ 0',
  team: '队名：先睡一会儿再说',
  doodle: 'zZ',
}
