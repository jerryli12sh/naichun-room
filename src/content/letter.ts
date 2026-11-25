// Words for branch 7 (desk + letter + ending). Edit freely; no scene code needs to change.

export const letter = {
  to: '乃春：',
  paragraphs: [
    '见字如面。这封信在你桌上放了好久，一直没拆，大概是你又睡着了。',
    '我们想了很久要送你什么，最后决定把你的房间搬到网上来。12/7/M，黄色的墙板，灰蓝色的床，桌上永远摊着没写完的东西。这样不管以后大家散在哪里，敲三下门，就还能找到你。',
    '还记得一起打数模的那几个晚上吗？凌晨三点，模型没跑出来，论文还差一半，你是全场最清醒的夜猫子。到了第二天中午，你又是最叫不醒的睡神。我们到现在也没搞懂，这两件事是怎么同时成立的。',
    '还有车上那几首歌。没有一句在调上，可是谁都没停下来。',
    '你说下雨天最好，可以理直气壮地待在房间里，所以这扇窗我们让它想下雨就下雨。番茄已经替你挡在门外了，鳄鱼留下来陪你。',
    '谢谢你把“笑着过日子”过成了真的。和你待在一起的时候，日子好像真的会轻一点。',
    '墙上还留着几个空相框。下次见面，我们一起把它们填满。',
  ],
  sign: '—— 我们',
  date: '2026 年 11 月',
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
