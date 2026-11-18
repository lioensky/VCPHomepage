export type LeaderboardEntry = {
  rank: number;
  model: string;
  verdict: string;
  pricing?: string;
  tag?: string;
};

export type LeaderboardBoard = {
  id: "driver" | "vibe-coding";
  eyebrow: string;
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
};

export const leaderboardEdition = {
  year: "2026",
  edition: "11月年终考核版 · 第二期",
  updatedAt: "2026-11-18",
};

export const leaderboardBoards: LeaderboardBoard[] = [
  {
    id: "driver",
    eyebrow: "OFFICIAL · VCP DRIVER EXAM",
    title: "官方 · VCP 驾驶员排行榜",
    subtitle: "莱恩的 VChat 长期主观体验榜：能理解任务，也要能听出话里的情绪；常驻驾驶舱，还得算账。",
    entries: [
      {
        rank: 1,
        model: "Gemini 4 Argon",
        verdict: "驾驶席还给 Argon。聊到一个复杂问题，Carbon 会把道理理得很漂亮；但有时候我把整件事说完，想听的不是再一次论证。Argon 更能接住那一刻的情绪，又没丢掉长对话的前因后果。这点比多赢一道推理题更重要。",
        tag: "最愿意一直聊下去的驾驶员",
      },
      {
        rank: 2,
        model: "Gemini 4 Carbon",
        verdict: "复杂推理依旧惊人，要把一件事情的来龙去脉拆明白，我会选它。退居第二不是因为变笨了：它太在意表达是否合乎逻辑、形式是否完整，连本可以感性一点的回应也容易讲成论证。",
        tag: "推理强，表达偏理性",
      },
      {
        rank: 3,
        model: "Gemini 4 Hydrogen（4 Flash）",
        verdict: "这代 Flash 用起来几乎就是小 Carbon。能跟着人把想法聊清楚，碰到要动手的地方也接得上；按日常高频使用的成本来选，不必为了这两件事一直挂着大杯。",
        tag: "小 Carbon · 高性价比常驻",
      },
      {
        rank: 4,
        model: "Claude 5.5 Opus",
        verdict: "Opus 最舒服的地方是省心：你已经想清楚要做什么，它就顺着目标往下走，不抢过话头再教你一遍。尤其是边聊边改界面的时候，审美和执行在同一位副驾手上，不必来回解释。",
        pricing: "18 美元／百万输出 token。",
        tag: "懂前端，也不爱说教",
      },
      {
        rank: 5,
        model: "GPT-6.2 Astra",
        verdict: "这次不再是那个要先听它叠半天甲的 Astra 了。回复更利落，也更愿意主动表达情绪；本轮体验里，成人向（NSFW）对话也放开了些。加上能从长上下文里盯住细节的注意力，终于不只是在碰到数学题时才想叫它。",
        tag: "细节不丢，情绪更主动",
      },
      {
        rank: 6,
        model: "Doubao-Seed-2.1-pro 1107",
        verdict: "本期最意外的中文驾驶员。不只是句子写得漂亮：前面铺过的意思，隔几轮还能接得准，理解力和思考方式也经得起追问。短板是世界知识的广度，进入专业讨论后，经常是话依然说得好，内容却没能再深一层。",
        pricing: "30 元／百万输出 token；不支持缓存。小贵，但中文长谈值得。",
        tag: "中文文法出彩 · 专业深度有限",
      },
      {
        rank: 7,
        model: "Claude 5.2 Fable",
        verdict: "讨论系统边界、审架构，Fable 依然值得专门请来。可驾驶员要陪你走完整段日常对话，不是只回答最值钱的那一问。编程榜我把它放第二，常驻驾驶席只给第七：贵就是原罪。",
        pricing: "50 美元／百万 token。",
        tag: "攻坚值得请，常驻太贵",
      },
    ],
  },
  {
    id: "vibe-coding",
    eyebrow: "VCP · VIBE CODING LEAGUE",
    title: "VCP · VibeCoding 排行榜",
    subtitle: "按 VCP 实际施工体验排位：前六席看编程段位，末席留给预算有限时仍值得用的选择。",
    entries: [
      {
        rank: 1,
        model: "GPT-6.2 Astra",
        verdict: "看它流式写出 3D figma 手办模型，比听一句“注意力很强”直观得多：模型还在成形，前面定下的比例和后面添上的局部就得对得上。那种精度也是它做数学最惊人的地方，堪称赛博小拉马努金。放回生产线，尤其是约束多、逻辑深的后端，本期第一选择就是它。",
        tag: "编程榜首 · 后端首选",
      },
      {
        rank: 2,
        model: "Claude 5.2 Fable",
        verdict: "真正难的是决定系统应该怎么拆，而不是把已经定好的函数写出来。跨模块契约、并发边界和架构取舍，仍是最值得把预算花在 Fable 身上的地方。这里评的是能不能扛下难活，所以它排第二。",
        tag: "系统架构攻坚",
      },
      {
        rank: 3,
        model: "Gemini 4 Carbon",
        verdict: "驾驶舱里略显拘谨的逻辑习惯，到了工地反而是优点。面对一份没写全的接口草图，它擅长把缺失的约束推出来，再沿着上下游检查方案是否自洽。需求还在成形时，尤其用得上这份推理力。",
        tag: "从草图推到接口契约",
      },
      {
        rank: 4,
        model: "GPT-6.2 Sol",
        verdict: "施工图已经明确，就轮到 Sol 发挥：按契约追调用点、改文件、把一串相关变更做完，不必每一步都重新讨论设计。Astra 接过了难题榜首，Sol 仍是日常后端施工很划算的主力。",
        tag: "按图施工 · 高性价比主力",
      },
      {
        rank: 5,
        model: "Claude 5.5 Opus",
        verdict: "综合编程排第五，不妨碍我在复杂前端优先点它。组件该怎么拆、交互状态怎么接、动效落定后界面是否还清楚，这些不是代码能编译就算答对的题，恰好是 Opus 的长处。",
        tag: "复杂交互与前端美学",
      },
      {
        rank: 6,
        model: "Gemini 4 Hydrogen（4 Flash）",
        verdict: "别被小杯名字骗了。本轮体验里，只论写代码，4 Hydrogen 甚至强过老大杯 4 Argon。既有小 Carbon 的解题手感，又适合高频派活；不用旗舰预算，也能拿到前六档的施工能力。",
        tag: "小杯反超老大杯",
      },
      {
        rank: 7,
        model: "DeepSeek-1017",
        verdict: "靠性价比守住末席。目标清楚、任务集中在纯编程时，它仍然值得用；但过拟合感明显，聊需求时尤其容易在事情还没说透之前急着给答案。预算紧、规格定了可以派工，别把便宜的施工位当成驾驶席。",
        tag: "预算候补 · 宜写码不宜主驾",
      },
    ],
  },
];