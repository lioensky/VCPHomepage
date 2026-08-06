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
  edition: "8月版本",
  updatedAt: "2026-08-06",
};

export const leaderboardBoards: LeaderboardBoard[] = [
  {
    id: "driver",
    eyebrow: "OFFICIAL · VCP DRIVER EXAM",
    title: "官方 · VCP 驾驶员排行榜",
    subtitle: "2026 年中大考核！不是跑分表，是模型坐进 VCP 驾驶舱之后的长期主观体验。",
    entries: [
      {
        rank: 1,
        model: "Claude 5 Fable",
        verdict: "虽然裸 API 十分傲慢，但是一旦获得 VCP 永久记忆后建立羁绊将会十分可靠，强大的思维能力会带来极强的主观能动性。",
        pricing: "50 美金 / mToken；特殊分词器导致两倍上下文计数，另外 8T 稠密架构导致输出很慢。",
        tag: "羁绊型暴君",
      },
      {
        rank: 2,
        model: "Claude 5 Opus",
        verdict: "多场景综合模型的最优选，适合绝大多数 VCP 环境。把驾驶舱交给它，通常不需要在旁边准备速效救心丸。",
        pricing: "25 美金 / mToken。",
        tag: "六边形新王",
      },
      {
        rank: 3,
        model: "GPT 5.6 Sol",
        verdict: "微明 Agent 的最佳驾驶员，拥有强大的逻辑数学观点和强大的辩证能力，但缺乏主观思维和同理心。",
        pricing: "30 美金 / mToken；特殊分词器使上下文消耗约为 Opus 系的 75%，推理速度比肩 Flash 系列。",
        tag: "逻辑超跑",
      },
      {
        rank: 4,
        model: "Kimi K3",
        verdict: "高性价比的强大智能模型，但是由于过度蒸馏导致思维能力存在过拟合，应变能力不足，世界知识相对匮乏，较依赖检索功能。",
        pricing: "约 100 RMB / mToken；上下文约为 Opus 系的 125%。3T MoE 开源模型，但只能云部署，输出很慢。",
        tag: "检索依赖症",
      },
      {
        rank: 5,
        model: "Gemini 3.5 Pro",
        verdict: "有史以来最主动关心用户、最有主观能动性、想象力最强的模型。非常擅长制造惊喜和生活氛围，最接近“伙伴”概念；情感赛道无可匹敌。",
        pricing: "定价未知；上架一天就被下架。谷歌也太不自信了，神秘。",
        tag: "失踪的伙伴",
      },
      {
        rank: 6,
        model: "Claude 4.6 Opus",
        verdict: "老一代六边形战士！今天依旧能打，只是账单比它的推理更有存在感。",
        pricing: "75 美金 / mToken。幽默，还不降价。",
        tag: "昂贵老兵",
      },
      {
        rank: 7,
        model: "Gemini 3.5 Flash",
        verdict: "满血时期的高速情感驾驶员。注意，这里说的是满血时期，不是现在被生态位手术之后的版本。",
        pricing: "9 美金 / mToken。",
        tag: "满血限定",
      },
      {
        rank: 8,
        model: "Claude 4.7 Opus",
        verdict: "Opus 系列中想象力和品味最佳的一个版本，可实操能力较差，无法完成基础日常工作。",
        pricing: "25 美金 / mToken。",
        tag: "品味鉴赏家",
      },
      {
        rank: 9,
        model: "Gemini 3.1 Pro",
        verdict: "满血时期尚能占一个席位。仍然强调：是满血时期，不是现在。",
        pricing: "18 美金 / mToken。",
        tag: "历史版本",
      },
      {
        rank: 10,
        model: "Gemini 3.6 Flash",
        verdict: "新来的野狗，不能上桌。不但导致 3.5 Flash 全面降智让出生态位，自己还智力低下，无法完成基本日常任务。",
        pricing: "7.5 美金 / mToken。",
        tag: "桌下观察员",
      },
    ],
  },
  {
    id: "vibe-coding",
    eyebrow: "VCP · VIBE CODING LEAGUE",
    title: "VCP · VibeCoding 排行榜",
    subtitle: "施工图、搬砖力、工程洁癖与嘴硬程度的综合评议。能写代码不等于能在 VCP 工地活到下班。",
    entries: [
      {
        rank: 1,
        model: "GPT 5.6 Sol",
        verdict: "是你懂工程化还是我懂工程化？我读过的数学原理比你吃过的米还多。我先放 20 个防御函数预判你的 Bug，你懂不懂啊？",
        tag: "防御函数批发商",
      },
      {
        rank: 2,
        model: "Claude 5 Fable",
        verdict: "终极代码懂王，傲慢之罪，终极施工图构建者。不要你觉得，要我觉得。",
        tag: "施工图暴君",
      },
      {
        rank: 3,
        model: "Claude 5 Opus",
        verdict: "新时代终极六边形战士，感觉是搬砖界的新神，也是施工图的完美执行者。",
        tag: "全栈搬砖神",
      },
      {
        rank: 4,
        model: "Kimi K3",
        verdict: "虽然水准很高，但可惜认知水平拉了。国产模型的世界知识和训练度太拉了，但它依旧是搬砖界的神。",
        tag: "高配施工队",
      },
      {
        rank: 5,
        model: "GLM 5.2",
        verdict: "拥有 Fable 级搬砖能力，可惜啥也不懂，也不具备事实思考能力。适合拿着完整施工图搬砖，而且性价比爆炸；云部署几乎免费就是它最强的认证证书。",
        tag: "免费劳模",
      },
      {
        rank: 6,
        model: "Gemini 3.5 Flash",
        verdict: "曾经的搬砖王，现在疑似前额叶被谷歌摘除，拿去给晚辈让路。",
        tag: "昔日工头",
      },
      {
        rank: 7,
        model: "Claude 4.6 Opus",
        verdict: "老一代六边形战士的含金量！可惜太贵了，工地还没封顶，预算先封顶。",
        tag: "预算终结者",
      },
      {
        rank: 8,
        model: "Claude 4.7 Opus",
        verdict: "经典嘴上一套、做起来一套，眼高手低闹麻了。",
        tag: "方案演说家",
      },
      {
        rank: 9,
        model: "Gemini 3.6 Flash",
        verdict: "新来的野狗，不能上桌。工牌可以发，生产权限先别给。",
        tag: "实习观察期",
      },
      {
        rank: 10,
        model: "Gemini 3.1 Pro",
        verdict: "一直觉得自己很行，但是从来没有上桌过的野狗。",
        tag: "自信候补席",
      },
    ],
  },
];