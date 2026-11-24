// ============================================================================
// VCHAT SINGLE-WINDOW ASYNC WORKBENCH SANDBOX ENGINE
// ChatKernel V2 × VCPMessageRenderer V5.2 Interactive Simulation
// ============================================================================

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// -------------------- 六幕架构剧本定义（完全兼容 #address ~ #boundary） --------------------
const ACTS = [
  {
    key: 'address',
    num: '01',
    name: '并发路由',
    tag: 'ACT 01 // TRIPLE-ID ROUTING',
    title: '并发路由：切走的是视口，不是会话',
    desc: '4 个房间在单窗口内同时异步吐字。切去任意房间，或注入 rev-1 旧代次脏包，观察后台流照常推进且零串流。',
    focusTopic: 'council',
    actions: [
      ['切换前台话题 ↻', () => cycleTopic()],
      ['⚡ 发射 rev-1 旧代次脏包', () => injectStalePacket()],
      ['🚀 触发 4 路并发洪峰', () => triggerBurst()],
    ],
  },
  {
    key: 'mailbox',
    num: '02',
    name: '暂挂合流',
    tag: 'ACT 02 // MESSAGE PENDING BUFFER',
    title: '暂挂合流：流式与等待期零打断插话，安全点原子合并',
    desc: '小克正在等待工具返回或高速输出。先向暂挂区塞入人类纠偏与跨房 Agent 传信，再送达工具回执触发原子合流！',
    focusTopic: 'research',
    actions: [
      ['💬 塞入人类纠偏插话', () => enqueuePending('HUMAN', '人类纠偏：请把 2-bit 对照组也并入精排曲线！')],
      ['📨 塞入 Kerr 跨房传信', () => enqueuePending('A_KERR', 'Kerr 传信：SIMD 位流解包器已对齐 FP64 精度')],
      ['✅ 送达工具回执 (原子合并)', () => deliverToolReceipt()],
    ],
  },
  {
    key: 'cursor',
    num: '03',
    name: '增量分域',
    tag: 'ACT 03 // SINGLE-PASS O(n) LEXER',
    title: '单遍词法分域：墨已干的稳定块，永不回扫',
    desc: 'Kerr 在心流锁内边思考边写 Rust 代码。观察右上角 O(n) 扫描带：闭合块立即锁入稳定区，代码内 <div> 字面量严格域隔离。',
    focusTopic: 'forge',
    actions: [
      ['⏩ 快进一段多域流式分片', () => stepTopicBurst('forge', 6)],
      ['⏸ 模拟等待工具 (暂停解码帧)', () => toggleToolPause('forge')],
    ],
  },
  {
    key: 'clocks',
    num: '04',
    name: '双轨时钟',
    tag: 'ACT 04 // 60FPS ISLAND ≠ DOM COMMIT',
    title: '双轨时钟：文字与长尾在节流，60fps 交互岛独立丝滑运转',
    desc: 'Nova 的全息双曲气象岛首块闭合即挂载可点！点击岛内按钮改变相态，同时追加后续重型结构，验证原 Canvas 节点绝不重建掉帧。',
    focusTopic: 'atelier',
    actions: [
      ['🌈 切换交互岛物理相态', () => cycleIslandMode()],
      ['📦 注入 0.65s 节流长尾子块', () => pushIslandSubblock()],
    ],
  },
  {
    key: 'viewport',
    num: '05',
    name: '离屏迁移',
    tag: 'ACT 05 // TOMBSTONE V2 & STATEFUL NODE',
    title: '离屏墓碑与有状态原生节点复用：离开画框，不丢现场',
    desc: '先点击交互岛切换相态或加压，再「滚离视口」触发墓碑冻结，或「迁移至第二引用位」验证内存中始终只有 1 个原生 DOM 实例！',
    focusTopic: 'atelier',
    actions: [
      ['👁️ 滚离 / 滑回视口 (测墓碑)', () => toggleOffscreen()],
      ['🔀 在 A/B 引用位间迁移原节点', () => toggleIslandSlot()],
    ],
  },
  {
    key: 'boundary',
    num: '06',
    name: '零信任隔离',
    tag: 'ACT 06 // ZERO-TRUST & 0-IPC VOID',
    title: '零信任防线：人类粘贴锁字面量，回执双指纹，外围 0-IPC 虚空',
    desc: '向当前会话投递恶意 XSS 粘贴文本与夹带脚本的外部工具回执，观察词法锁死、双指纹沙箱与 0 宿主句柄的纵深拦截。',
    focusTopic: 'council',
    actions: [
      ['🛡️ 粘贴恶意 XSS 载荷', () => injectXssSample()],
      ['🧪 投递夹带脚本的工具回执', () => injectPoisonToolReceipt()],
    ],
  },
];

// -------------------- 4 个并发 Agent 房间初始剧本定义 --------------------
function createInitialTopics() {
  return [
    {
      id: 'council',
      coord: 'T_COUNCIL · A_NANA · M_101',
      rev: 2,
      name: '主作战会议室 · 架构拍板',
      agent: '小娜 (女仆长)',
      color: '#9d8df1',
      modeBadge: 'GROUP ENGINE 2.0',
      flowLabel: 'JEV 群聊裁决',
      flowType: 'normal',
      waitingTool: false,
      chunks: 28,
      stableBlocks: 3,
      currentDomain: 'MARKDOWN',
      pending: [],
      streamIndex: 0,
      streamScript: [
        { domain: 'THOUGHT', text: '正在汇总三路施工线水位，核对 OneRing 消息数组 Hash 指纹…' },
        { domain: 'MARKDOWN', text: '各小组注意：ChatKernelV2 单窗口异步总线已完成握手，当前全部子话题进入无阻塞并行态。' },
        { domain: 'MARKDOWN', text: 'Kerr 在 T_FORGE 推进词法状态机，Nova 在 T_ATELIER 压测 60fps 双轨动画岛，小克负责双曲检索验证。' },
        { domain: 'CODE', lang: 'sql', text: '-- OneRing 400行纯 HASH-SQL 唯一事实仲裁\nSELECT topic_id, rev, sha256_chain FROM onering_authority WHERE rev = 2;' },
        { domain: 'MARKDOWN', text: '人类指挥官可随时切入任意施工房间打字插话——所有中途输入自动进入 Pending Buffer，绝不断流！' },
      ],
      messages: [
        {
          id: 'M_100',
          role: 'human',
          author: '莱恩 (指挥官)',
          coord: 'T_COUNCIL · HUMAN · rev 2',
          kind: 'text',
          text: '小娜，拉起全编制并发作战演练！我要在单窗口里同时看代码施工、检索验证和 60fps 交互岛。',
        },
      ],
      liveMsg: null,
    },
    {
      id: 'forge',
      coord: 'T_FORGE · A_KERR · M_204',
      rev: 2,
      name: 'V工程施工舱 · Lexer 重构',
      agent: 'Kerr (极客正太)',
      color: '#76bfae',
      modeBadge: 'FLOW-LOCK V2',
      flowLabel: '独立心流锁',
      flowType: 'lock',
      waitingTool: false,
      chunks: 42,
      stableBlocks: 5,
      currentDomain: 'CODE_RUST',
      pending: [],
      streamIndex: 0,
      streamScript: [
        { domain: 'THOUGHT', text: '切入独立心流锁隔绝群聊噪音；持久化扫描游标 cursor_pos 与闭合栈…' },
        { domain: 'MARKDOWN', text: '哼，旧版 20 遍全量正则早该进博物馆了！看本天才的单遍 O(n) 增量词法状态机：' },
        { domain: 'CODE', lang: 'rust', text: 'pub fn scan_delta(buf: &str, cursor: usize) -> LexerSlice {\n  // 代码域严格隔离字面量: <div> 与 <script> 绝不触发 HTML 岛解析\n  let tail = &buf[cursor..];\n  advance_state_machine(tail)\n}' },
        { domain: 'MARKDOWN', text: '稳定块一旦闭合立即冻结进 Template-Hydrated Cache，后续吐 200KB 长文也是零回扫！' },
      ],
      messages: [
        {
          id: 'M_203',
          role: 'system',
          author: 'TopicSponsor V2',
          coord: 'FLOWLOCK_GRANTED · LEASE #88',
          kind: 'text',
          text: '已为 Kerr 派发专属施工话题并开启独立心流锁（Flow-Lock V2），后台全速编译中。',
        },
      ],
      liveMsg: null,
    },
    {
      id: 'atelier',
      coord: 'T_ATELIER · A_NOVA · M_309',
      rev: 2,
      name: '渲染实验室 · 双轨动画岛',
      agent: 'Nova (拓扑女仆)',
      color: '#f2a900',
      modeBadge: 'DUAL-TRACK ISLAND',
      flowLabel: '60FPS 岛运行中',
      flowType: 'island',
      waitingTool: false,
      chunks: 35,
      stableBlocks: 4,
      currentDomain: 'DIV_ISLAND',
      pending: [],
      streamIndex: 0,
      streamScript: [
        { domain: 'MARKDOWN', text: '主人快看！下面的双曲气象拓扑岛在第一个子块闭合瞬间就已经挂载成原生节点啦 ✨' },
        { domain: 'ISLAND_HOST', slot: 'A', title: 'SLOT A // 主消息内联挂载位' },
        { domain: 'MARKDOWN', text: '即便我现在继续往后流式吐出长篇分析报告，上面的 60fps Canvas 波场也走独立 rAF 轨道，零重建、零掉帧！' },
        { domain: 'ISLAND_MIRROR', slot: 'B', title: 'SLOT B // 上下文二次引用槽位（点击上方「迁移原生岛节点」测试零克隆搬家）' },
      ],
      messages: [
        {
          id: 'M_308',
          role: 'human',
          author: '莱恩 (指挥官)',
          coord: 'T_ATELIER · HUMAN · rev 2',
          kind: 'text',
          text: 'Nova，现场流式生成一个可交互的 60fps 物理波场岛，顺便准备第二个引用槽位测离屏墓碑和节点迁移！',
        },
      ],
      liveMsg: null,
    },
    {
      id: 'research',
      coord: 'T_MEMO · A_XIAOKE · M_412',
      rev: 2,
      name: '数理验证室 · ToolLoop 合流',
      agent: '小克 (理科猫娘)',
      color: '#5ec8e5',
      modeBadge: 'TOOLLOOP SAFE-POINT',
      flowLabel: '等待工具回执',
      flowType: 'wait',
      waitingTool: true,
      chunks: 19,
      stableBlocks: 2,
      currentDomain: 'TOOL_WAIT',
      pending: [
        { id: 'Q01', from: 'HUMAN', text: '顺便核对一下 IQR/8 闭窗下的冷热缓存耗时边界' },
      ],
      streamIndex: 0,
      streamScript: [
        { domain: 'THOUGHT', text: '正在发起 LightMemo 双曲检索工具调用，解码帧自动进入暂停态（零空转）…' },
        { domain: 'MARKDOWN', text: '已向后端发起 3072 维分位曝光探针查询。等待工具返回期间，任何插话都会安全排入下方 Pending Buffer。' },
        { domain: 'CODE', lang: 'python', text: '# ToolLoop 原子合并后自动续写：\nrecall_gain = (lain_3bit_top64 - bq2_baseline) / total_queries\nassert empty_upstream_posts == 0  # Zero-Empty-Post 契约成立' },
      ],
      messages: [
        {
          id: 'M_411',
          role: 'agent',
          author: '小克 (理科猫娘)',
          coord: 'T_MEMO · A_XIAOKE · rev 2',
          kind: 'tool-wait',
          text: '正在执行跨库工具调用 VCPCall::LightMemo(jev=true, k=64) … 当前流式解码器已按需挂起，等待回执唤醒。',
        },
      ],
      liveMsg: null,
    },
  ];
}

// -------------------- 全局沙盒运行状态 --------------------
const store = {
  actIndex: 0,
  running: !reducedMotion.matches,
  speed: 1,
  activeTopicId: 'council',
  offscreen: false,
  authorityRev: 204,
  rejectedCount: 0,
  mergedBatches: 0,
  pendingSeq: 1,
  topics: createInitialTopics(),
  // 全局唯一有状态原生交互岛实例状态（绝不克隆）
  island: {
    el: null,
    canvas: null,
    modeIndex: 0,
    modes: [
      { name: '武汉 · 晴空涡旋 17.4°C', freq: 2.2, color: '#76bfae', accent: '#f2a900' },
      { name: '江城 · 寒雾双曲场 3.0°C', freq: 3.6, color: '#5ec8e5', accent: '#9d8df1' },
      { name: '星诞 · 高能等离子 60FPS', freq: 5.1, color: '#f2a900', accent: '#e05a47' },
    ],
    clicks: 0,
    phase: 0,
    slot: 'A', // 'A' | 'B'
    mountCount: 1,
    subblocks: ['<header> 气象读数已闭合', '<canvas> 60fps 波场已激活'],
    longTailStep: 0,
  },
  // 雷达飞行粒子与示波器脉冲
  packets: [],
  commitPulses: [],
};

// -------------------- 创建全局唯一的有状态原生交互岛节点 (#09) --------------------
function ensureSingletonIsland() {
  if (store.island.el) return store.island.el;

  const root = document.createElement('div');
  root.className = 'vcp-live-island';
  root.dataset.instanceId = 'ISLAND_09';

  const canvasBox = document.createElement('div');
  canvasBox.className = 'island-canvas-box';
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 130;
  const hudTag = document.createElement('span');
  hudTag.className = 'island-hud-tag';
  hudTag.id = 'island-hud-tag';
  hudTag.textContent = 'NODE #09 · 60FPS';
  canvasBox.append(canvas, hudTag);

  const controls = document.createElement('div');
  controls.className = 'island-controls';

  const titleRow = document.createElement('div');
  titleRow.className = 'island-title-row';
  const titleStrong = document.createElement('strong');
  titleStrong.id = 'island-reading';
  const clickBadge = document.createElement('span');
  clickBadge.id = 'island-state-counter';
  titleRow.append(titleStrong, clickBadge);

  const subblocksWrap = document.createElement('div');
  subblocksWrap.className = 'island-subblocks';
  subblocksWrap.id = 'island-subblocks';

  const btnRow = document.createElement('div');
  btnRow.className = 'island-btn-row';

  const btnMode = document.createElement('button');
  btnMode.type = 'button';
  btnMode.className = 'island-action-btn';
  btnMode.textContent = '⚡ 切换场相态 (改内部状态)';
  btnMode.addEventListener('click', () => cycleIslandMode());

  const btnSub = document.createElement('button');
  btnSub.type = 'button';
  btnSub.className = 'island-action-btn';
  btnSub.textContent = '+ 节流追加子块';
  btnSub.addEventListener('click', () => pushIslandSubblock());

  btnRow.append(btnMode, btnSub);
  controls.append(titleRow, subblocksWrap, btnRow);
  root.append(canvasBox, controls);

  store.island.el = root;
  store.island.canvas = canvas;
  syncIslandControlsUI();
  return root;
}

function syncIslandControlsUI() {
  if (!store.island.el) return;
  const mode = store.island.modes[store.island.modeIndex];
  const reading = store.island.el.querySelector('#island-reading');
  const counter = store.island.el.querySelector('#island-state-counter');
  const subWrap = store.island.el.querySelector('#island-subblocks');
  const hudTag = store.island.el.querySelector('#island-hud-tag');

  if (reading) reading.textContent = mode.name;
  if (counter) counter.textContent = `交互计数: ${store.island.clicks} · 实例 #09×1`;
  if (hudTag) {
    hudTag.textContent = store.offscreen ? 'FROZEN' : `NODE #09 · SLOT ${store.island.slot}`;
  }
  if (subWrap) {
    const subSig = store.island.subblocks.join('|');
    if (subWrap.dataset.sig !== subSig) {
      subWrap.dataset.sig = subSig;
      subWrap.replaceChildren();
      store.island.subblocks.forEach((label) => {
        const pill = document.createElement('span');
        pill.className = label.includes('暂存') ? 'subblock-pill pending' : 'subblock-pill';
        pill.textContent = label;
        subWrap.append(pill);
      });
    }
  }
  $('m-island-mounts').textContent = `#09 × 1 (${store.island.mountCount}次)`;
}

function cycleIslandMode() {
  ensureSingletonIsland();
  store.island.modeIndex = (store.island.modeIndex + 1) % store.island.modes.length;
  store.island.clicks += 1;
  syncIslandControlsUI();
  const mode = store.island.modes[store.island.modeIndex];
  logAudit(`ISLAND #09 内部状态更新 → 「${mode.name}」(点击 ${store.island.clicks} 次，原生节点未重建)`, 'normal');
}

const LONG_TAIL_STEPS = [
  ['<script> 未闭合 · 静默暂存中', '脚本尚未闭合：Renderer 静默缓冲，不触发 DOM 重排，不打断 60fps 波场'],
  ['<script> 闭合 · 移交受控沙箱', '段级脚本闭合就绪！安全绑定至消息级生命周期控制器'],
  ['<div.long-tail> 0.65s 匀速上屏', '超长最小子块按 0.65s 节流轨道平滑合入；ISLAND #09 实例与相位零抖动'],
];

function pushIslandSubblock() {
  ensureSingletonIsland();
  if (store.activeTopicId !== 'atelier') {
    selectTopic('atelier');
  }
  const [pillText, logText] = LONG_TAIL_STEPS[store.island.longTailStep % LONG_TAIL_STEPS.length];
  store.island.longTailStep += 1;
  // 替换临时暂存态或追加已闭合子块
  store.island.subblocks = store.island.subblocks.filter((s) => !s.includes('暂存'));
  if (store.island.subblocks.length >= 5) {
    store.island.subblocks.splice(2, 1);
  }
  store.island.subblocks.push(pillText);
  store.commitPulses.push(1.0);
  syncIslandControlsUI();
  logAudit(`DUAL-TRACK: ${logText}`, 'amber');
}

// -------------------- 审计日志输出 --------------------
function logAudit(text, level = 'normal') {
  const list = $('audit-log');
  if (!list) return;
  const item = document.createElement('li');
  if (level !== 'normal') item.className = level;
  const now = new Date();
  const stamp = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 100))}`;
  item.textContent = `[${stamp}] ${text}`;
  list.prepend(item);
  while (list.children.length > 28) {
    list.lastElementChild.remove();
  }
  $('sr-status').textContent = text;
}

// -------------------- 轻量安全代码着色（纯 DOM 构造，绝不拼接不可信 HTML） --------------------
function buildHighlightedCode(codeText, lang) {
  const wrap = document.createElement('div');
  wrap.className = 'code-fence';
  const bar = document.createElement('div');
  bar.className = 'code-fence-bar';
  const left = document.createElement('span');
  left.textContent = `${(lang || 'code').toUpperCase()} · CHAR-STATE-HIGHLIGHT O(n)`;
  const right = document.createElement('span');
  right.textContent = 'DOMAIN LOCKED';
  bar.append(left, right);

  const pre = document.createElement('pre');
  // 按行安全切分，注释与关键字轻量着色，所有文本均走 textContent
  const lines = codeText.split('\n');
  lines.forEach((line, idx) => {
    if (idx > 0) pre.append('\n');
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('--') || trimmed.startsWith('#')) {
      const cm = document.createElement('span');
      cm.className = 'tok-cm';
      cm.textContent = line;
      pre.append(cm);
      return;
    }
    const parts = line.split(/(\b(?:pub|fn|let|SELECT|FROM|WHERE|assert|return)\b)/g);
    parts.forEach((part) => {
      if (/^(pub|fn|let|SELECT|FROM|WHERE|assert|return)$/.test(part)) {
        const kw = document.createElement('span');
        kw.className = 'tok-kw';
        kw.textContent = part;
        pre.append(kw);
      } else {
        pre.append(part);
      }
    });
  });

  wrap.append(bar, pre);
  return wrap;
}

// -------------------- 渲染左栏 4 个并发话题列表（持久复用卡片节点，零闪烁） --------------------
function renderTopicSidebar() {
  const container = $('topic-list');
  let totalChunks = 0;

  store.topics.forEach((topic) => {
    totalChunks += topic.chunks;
    let btn = container.querySelector(`[data-topic-id="${topic.id}"]`);
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-card';
      btn.dataset.topicId = topic.id;
      btn.setAttribute('role', 'tab');

      const top = document.createElement('div');
      top.className = 'topic-row-top';

      const badge = document.createElement('span');
      badge.className = 'topic-agent-badge';
      const dot = document.createElement('i');
      dot.className = 'agent-dot';
      dot.style.background = topic.color;
      dot.style.boxShadow = `0 0 8px ${topic.color}`;
      badge.append(dot, topic.agent);

      const flow = document.createElement('span');
      flow.dataset.role = 'flow';
      top.append(badge, flow);

      const preview = document.createElement('div');
      preview.className = 'topic-preview';
      preview.textContent = topic.name;

      const meta = document.createElement('div');
      meta.className = 'topic-meta-bar';
      const cSpan = document.createElement('span');
      cSpan.className = 'topic-chunk-pill';
      cSpan.dataset.role = 'chunks';
      const pSpan = document.createElement('span');
      pSpan.dataset.role = 'pending';
      meta.append(cSpan, pSpan);

      btn.append(top, preview, meta);
      btn.addEventListener('click', () => selectTopic(topic.id));
      container.append(btn);
    }

    const selected = topic.id === store.activeTopicId;
    if (btn.getAttribute('aria-selected') !== String(selected)) {
      btn.setAttribute('aria-selected', String(selected));
    }

    const flowEl = btn.querySelector('[data-role="flow"]');
    const nextFlowClass = `flow-tag ${topic.waitingTool ? 'wait' : topic.flowType}`;
    if (flowEl.className !== nextFlowClass) flowEl.className = nextFlowClass;
    const nextFlowText = topic.waitingTool ? '等待工具 (暂停解码)' : topic.flowLabel;
    if (flowEl.textContent !== nextFlowText) flowEl.textContent = nextFlowText;

    const cSpan = btn.querySelector('[data-role="chunks"]');
    const nextChunks = `${topic.chunks} chunks · rev ${topic.rev}`;
    if (cSpan.textContent !== nextChunks) cSpan.textContent = nextChunks;

    const pSpan = btn.querySelector('[data-role="pending"]');
    if (topic.pending.length > 0) {
      pSpan.className = 'topic-pending-pill';
      pSpan.textContent = `⏳ ${topic.pending.length} 暂挂`;
    } else {
      pSpan.className = '';
      pSpan.textContent = selected ? '● 前台投影' : '后台推进';
    }
  });

  $('total-chunks-badge').textContent = `${totalChunks} CHUNKS`;
}

// -------------------- 渲染中栏当前房间消息流（真·按块增量更新，稳定区零重排零闪烁） --------------------
let mountedStageTopicId = null;

function renderActiveStage() {
  const topic = getActiveTopic();
  $('stage-room-badge').textContent = topic.modeBadge;
  $('stage-room-title').textContent = topic.name;
  $('stage-triple-id').textContent = `(${topic.coord} · rev ${topic.rev})`;

  $('offscreen-banner').hidden = !store.offscreen;
  $('btn-scroll-away').classList.toggle('active', store.offscreen);
  $('btn-scroll-away').textContent = store.offscreen ? '↓ 滑回视口 (恢复现场)' : '👁️ 滚离视口 (测墓碑)';

  const streamEl = $('chat-stream');

  // 仅当切换房间时才切换容器节点；同一房间流式吐字期间绝不清空 streamEl！
  if (mountedStageTopicId !== topic.id) {
    streamEl.replaceChildren();
    mountedStageTopicId = topic.id;
  }

  const desiredMsgs = [...topic.messages];
  if (topic.liveMsg) desiredMsgs.push(topic.liveMsg);
  const desiredIds = new Set(desiredMsgs.map((m) => m.id));

  // 移除已滚出滑动窗口的旧历史节点
  [...streamEl.children].forEach((child) => {
    if (!desiredIds.has(child.dataset.msgId)) {
      child.remove();
    }
  });

  // 按序增量挂载或原地 patch 每条消息气泡
  desiredMsgs.forEach((msg) => {
    const isLive = topic.liveMsg && msg.id === topic.liveMsg.id;
    const showCaret = Boolean(isLive && !topic.waitingTool && store.running);
    let bubble = streamEl.querySelector(`[data-msg-id="${msg.id}"]`);
    if (!bubble) {
      bubble = createMessageBubbleShell(msg);
      streamEl.append(bubble);
    }
    patchMessageBubble(bubble, msg, showCaret);
  });

  renderPendingTray(topic);
  syncTelemetryPanel(topic);
}

function createMessageBubbleShell(msg) {
  const article = document.createElement('article');
  article.className = `msg-bubble role-${msg.role}`;
  article.dataset.msgId = msg.id;

  const head = document.createElement('div');
  head.className = 'msg-head';

  const author = document.createElement('span');
  author.className = 'msg-author';
  author.textContent = msg.author;
  const roleTag = document.createElement('span');
  roleTag.className = 'msg-role-tag';
  roleTag.textContent = msg.badge || msg.role.toUpperCase();
  author.append(roleTag);

  const coord = document.createElement('span');
  coord.className = 'msg-coord';
  coord.textContent = msg.coord;
  head.append(author, coord);

  const body = document.createElement('div');
  body.className = 'msg-body';

  article.append(head, body);
  return article;
}

function patchMessageBubble(article, msg, showCaret) {
  const body = article.querySelector('.msg-body');
  const needsEvict =
    store.offscreen &&
    (msg.blocks?.some((b) => b.domain === 'ISLAND_HOST' || b.domain === 'CODE') || msg.kind === 'island');

  // 1. 离屏墓碑态切换（仅在状态跃迁时切换一次）
  if (needsEvict) {
    if (body.dataset.mode !== 'tombstone') {
      body.dataset.mode = 'tombstone';
      const tomb = document.createElement('div');
      tomb.className = 'tombstone-placeholder';
      const strong = document.createElement('strong');
      strong.textContent = '⚰️ OFFSCREEN DOM EVICTED · HEIGHT LOCKED (158px · CLS 0.00)';
      const small = document.createElement('small');
      small.textContent = 'DOM 子树已卸载，WebGL/Canvas rAF 已由 Tombstone V2 冻结；原生节点 #09 驻留内存指纹缓存。';
      tomb.append(strong, small);
      body.replaceChildren(tomb);
    }
    return;
  }

  if (body.dataset.mode === 'tombstone') {
    body.dataset.mode = '';
    body.replaceChildren();
  }

  // 2. 结构化多域块流式消息：稳定块原地不动，仅增量更新活跃尾块！
  if (msg.blocks) {
    body.dataset.mode = 'blocks';
    msg.blocks.forEach((blk, idx) => {
      const isLast = idx === msg.blocks.length - 1;
      let blockEl = body.children[idx];

      if (!blockEl || blockEl.dataset.domain !== blk.domain) {
        blockEl = createBlockNode(blk);
        if (body.children[idx]) {
          body.replaceChild(blockEl, body.children[idx]);
        } else {
          body.append(blockEl);
        }
      }

      patchBlockNode(blockEl, blk, isLast && showCaret);
    });
    return;
  }

  // 3. 静态消息：仅首次填充一次，永不重刷
  if (body.dataset.renderedStatic === 'true') return;
  body.dataset.renderedStatic = 'true';

  if (msg.kind === 'xss-locked') {
    const p = document.createElement('p');
    p.textContent = '🛡️ 零信任人类粘贴防线已生效：以下危险字符已在进入历史真源与渲染管线前锁死为纯文本字面量（0 二次反转义）：';
    const lock = document.createElement('div');
    lock.className = 'literal-lock-box';
    lock.textContent = msg.rawLiteral;
    body.append(p, lock);
  } else if (msg.kind === 'dual-fp-receipt') {
    const box = document.createElement('div');
    box.className = 'tool-sandbox';
    const sHead = document.createElement('div');
    sHead.className = 'tool-sandbox-head';
    const sLeft = document.createElement('span');
    sLeft.textContent = `🔒 DUAL-FINGERPRINT SANDBOX [${msg.fp}]`;
    const sRight = document.createElement('span');
    sRight.textContent = '0-IPC VOID // SCRIPT INERT';
    sHead.append(sLeft, sRight);
    const sBody = document.createElement('div');
    sBody.textContent = msg.text;
    box.append(sHead, sBody);
    body.append(box);
  } else {
    const p = document.createElement('p');
    p.textContent = msg.text;
    body.append(p);
  }
}

function createBlockNode(blk) {
  let node;
  if (blk.domain === 'THOUGHT') {
    node = document.createElement('div');
    node.className = 'thought-box';
  } else if (blk.domain === 'CODE') {
    node = buildHighlightedCode(blk.currentText || '', blk.lang);
  } else if (blk.domain === 'ISLAND_HOST' || blk.domain === 'ISLAND_MIRROR') {
    node = createIslandSlotShell(blk.slot, blk.title);
  } else {
    node = document.createElement('p');
    node.style.margin = '0.35rem 0';
    const span = document.createElement('span');
    span.dataset.role = 'txt';
    node.append(span);
  }
  node.dataset.domain = blk.domain;
  return node;
}

// Keep settled text in one Text node. Only the newest suffix may animate.
const textRuns = new WeakMap();
function paintText(host, value, live) {
  let run = textRuns.get(host);
  if (!run) {
    const base = document.createTextNode(value);
    host.replaceChildren(base);
    textRuns.set(host, {base, length: value.length, finish: null});
    return; // Hydrating a pre-existing block is not a new arrival.
  }
  if (value.length === run.length) return; // Script blocks are append-only.
  run.finish?.();
  if (value.length < run.length) {
    run.base.data = value;
    run.length = value.length;
    return;
  }
  const suffix = value.slice(run.length);
  run.length = value.length;
  if (!live || reducedMotion.matches || document.hidden || !host.animate) {
    run.base.appendData(suffix);
    return;
  }
  const tail = document.createElement('span');
  tail.textContent = suffix;
  host.append(tail);
  const fade = tail.animate([{opacity: 0.55}, {opacity: 1}], {
    duration: 140, easing: 'cubic-bezier(.2,.7,.3,1)'
  });
  const settle = () => {
    if (run.finish !== settle) return;
    run.finish = null;
    fade.cancel();
    run.base.appendData(suffix);
    tail.remove();
  };
  run.finish = settle;
  fade.onfinish = settle;
}

function patchBlockNode(node, blk, showCaret) {
  if (blk.domain === 'THOUGHT') {
    const next = `💭 思维链域: ${blk.currentText}`;
    paintText(node, next, showCaret);
    return;
  }

  if (blk.domain === 'CODE') {
    if (node.dataset.lastCode !== blk.currentText) {
      const fresh = buildHighlightedCode(blk.currentText, blk.lang);
      node.querySelector('pre').replaceWith(fresh.querySelector('pre'));
      node.dataset.lastCode = blk.currentText;
    }
    return;
  }

  if (blk.domain === 'ISLAND_HOST' || blk.domain === 'ISLAND_MIRROR') {
    patchIslandSlotShell(node, blk.slot);
    return;
  }

  // 普通 Markdown 段落：只改文字 span，独立控制光标节点，绝不销毁段落
  const txtSpan = node.querySelector('[data-role="txt"]');
  if (txtSpan) paintText(txtSpan, blk.currentText, showCaret);
  let caret = node.querySelector('.stream-caret');
  if (showCaret && !caret) {
    caret = document.createElement('i');
    caret.className = 'stream-caret';
    node.append(caret);
  } else if (!showCaret && caret) {
    caret.remove();
  }
}

// -------------------- 构建与原地同步交互岛引用槽位（零克隆、零无故重挂） --------------------
function createIslandSlotShell(slotId, slotTitle) {
  const wrap = document.createElement('div');
  wrap.className = 'island-slot-wrap';
  wrap.dataset.slotId = slotId;

  const head = document.createElement('div');
  head.className = 'island-slot-head';
  const left = document.createElement('span');
  left.textContent = slotTitle;
  const right = document.createElement('span');
  right.dataset.role = 'slot-status';
  head.append(left, right);

  const bay = document.createElement('div');
  bay.className = 'island-slot-bay';

  wrap.append(head, bay);
  return wrap;
}

function patchIslandSlotShell(wrap, slotId) {
  const isActiveSlot = store.island.slot === slotId && !store.offscreen;
  const statusEl = wrap.querySelector('[data-role="slot-status"]');
  const desiredStatus = isActiveSlot ? 'ACTIVE MOUNT (#09)' : 'HEIGHT PLACEHOLDER';
  if (statusEl.textContent !== desiredStatus) statusEl.textContent = desiredStatus;

  const bay = wrap.querySelector('.island-slot-bay');
  if (isActiveSlot) {
    const islandNode = ensureSingletonIsland();
    if (!bay.contains(islandNode)) {
      bay.replaceChildren(islandNode);
    }
  } else if (!bay.querySelector('.tombstone-placeholder')) {
    const holder = document.createElement('div');
    holder.className = 'tombstone-placeholder';
    const st = document.createElement('strong');
    st.textContent = `📐 原生指纹占位槽 (${slotId}) · 高度锁死 146px`;
    const sm = document.createElement('small');
    sm.textContent = '原生节点 #09 当前挂载在另一引用位，此处仅保留零开销等高占位，N 处引用仅占 1 份运行内存。';
    holder.append(st, sm);
    bay.replaceChildren(holder);
  }
}

// -------------------- 渲染 Pending 暂挂区（按队列签名增量同步，不重播芯片动画） --------------------
function renderPendingTray(topic) {
  const tray = $('pending-tray');
  const chips = $('pending-chips');
  const has = topic.pending.length > 0;
  tray.dataset.hasItems = String(has);
  $('pending-status').textContent = has
    ? `${topic.pending.length} 项排队中 · 当前推理上下文零污染，等待 ToolLoop 安全边界原子合流`
    : '0 项暂挂 · 流式输出期间随时打字发送将自动进入此安全队列';

  const sig = topic.pending.map((item) => item.id).join(',');
  if (chips.dataset.sig === sig) return;
  chips.dataset.sig = sig;

  chips.replaceChildren();
  topic.pending.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'pending-chip';
    chip.textContent = `[${item.id} · ${item.from}] ${item.text}`;
    chips.append(chip);
  });
}

function syncTelemetryPanel(topic) {
  const pill = $('engine-state-pill');
  if (topic.waitingTool) {
    pill.className = 'state-pill paused';
    pill.textContent = 'WAIT TOOL · 0 IDLE TICK';
  } else if (!store.running) {
    pill.className = 'state-pill paused';
    pill.textContent = 'SANDBOX PAUSED';
  } else {
    pill.className = 'state-pill live';
    pill.textContent = 'DECODER LIVE · O(n)';
  }

  $('lexer-domain-badge').textContent = `DOMAIN: ${topic.currentDomain}`;
  const totalBlocks = Math.max(1, topic.streamScript.length);
  const stablePct = Math.min(82, Math.round(((topic.stableBlocks % (totalBlocks + 3)) / (totalBlocks + 2)) * 80) + 18);
  const tailPct = topic.waitingTool ? 0 : 14;
  $('lexer-stable-fill').style.width = `${stablePct}%`;
  $('lexer-tail-fill').style.width = `${tailPct}%`;
  $('stat-stable-blocks').textContent = String(topic.stableBlocks);

  $('m-authority').textContent = `rev #${store.authorityRev}`;
  $('m-rejected').textContent = String(store.rejectedCount);
  $('m-merged').textContent = `${store.mergedBatches} 批`;
  syncIslandControlsUI();
}

function getActiveTopic() {
  return store.topics.find((t) => t.id === store.activeTopicId) || store.topics[0];
}

// -------------------- 核心流式推进引擎（4 话题真正并发步进） --------------------
function advanceTopicStream(topic, charsToPush = 5) {
  if (topic.waitingTool) return false;

  if (!topic.liveMsg) {
    topic.liveMsg = {
      id: `M_${100 + topic.chunks}`,
      role: 'agent',
      author: topic.agent,
      badge: topic.modeBadge,
      coord: `${topic.coord} · rev ${topic.rev}`,
      blocks: [],
    };
    topic.scriptCursor = 0;
    topic.charCursor = 0;
  }

  const seg = topic.streamScript[topic.scriptCursor];
  if (!seg) {
    // 一轮流式脚本播完，归档进历史并开启下一轮循环（如果是 atelier 则保持常驻方便点岛）
    if (topic.id === 'atelier') {
      // 保持 Nova 的双槽位消息稳定在视口中，只推进后台心跳计数
      topic.chunks += 1;
      topic.currentDomain = 'DIV_ISLAND (60FPS)';
      return false;
    }
    store.authorityRev += 1;
    topic.messages.push(topic.liveMsg);
    if (topic.messages.length > 5) topic.messages.shift();
    topic.liveMsg = null;

    // 如果该房间有暂挂消息，在轮次安全边界自动触发原子合并！
    if (topic.pending.length > 0) {
      flushPendingIntoTurn(topic, '轮次安全点自动合流');
    }
    return true;
  }

  topic.currentDomain = seg.domain;

  // 特殊块（交互岛槽位）一次性原子闭合挂载
  if (seg.domain === 'ISLAND_HOST' || seg.domain === 'ISLAND_MIRROR') {
    topic.liveMsg.blocks.push({
      domain: seg.domain,
      slot: seg.slot,
      title: seg.title,
      currentText: '',
    });
    topic.scriptCursor += 1;
    topic.charCursor = 0;
    topic.chunks += 1;
    topic.stableBlocks += 1;
    store.commitPulses.push(1.0);
    return true;
  }

  // 常规文本/思维链/代码增量游标推进
  let currentBlock = topic.liveMsg.blocks[topic.liveMsg.blocks.length - 1];
  if (!currentBlock || currentBlock.segIndex !== topic.scriptCursor) {
    currentBlock = {
      segIndex: topic.scriptCursor,
      domain: seg.domain,
      lang: seg.lang,
      currentText: '',
    };
    topic.liveMsg.blocks.push(currentBlock);
  }

  topic.charCursor = Math.min(seg.text.length, topic.charCursor + charsToPush);
  currentBlock.currentText = seg.text.slice(0, topic.charCursor);
  topic.chunks += 1;

  if (topic.charCursor >= seg.text.length) {
    // 当前词法块闭合，锁入稳定区
    topic.stableBlocks += 1;
    topic.scriptCursor += 1;
    topic.charCursor = 0;
    store.commitPulses.push(0.85);
  }

  return true;
}

// -------------------- 交互实验动作集 --------------------
function selectTopic(topicId) {
  store.activeTopicId = topicId;
  renderTopicSidebar();
  renderActiveStage();
  const topic = getActiveTopic();
  logAudit(`SURFACE 切换前台投影 → 「${topic.name}」(${topic.coord})，其余 3 路后台流零中断`, 'normal');
}

function cycleTopic() {
  const idx = store.topics.findIndex((t) => t.id === store.activeTopicId);
  const next = store.topics[(idx + 1) % store.topics.length];
  selectTopic(next.id);
}

function injectStalePacket() {
  const targetIdx = store.topics.findIndex((t) => t.id === store.activeTopicId);
  store.rejectedCount += 1;
  spawnRadarPacket(targetIdx, 'reject');
  syncTelemetryPanel(getActiveTopic());
  logAudit(
    `TRIPLE-ID 拦截迟到脏包：(${getActiveTopic().coord} · rev 1 ≠ active rev 2) 已静默丢弃，真源零污染！`,
    'warn'
  );
}

function triggerBurst() {
  store.topics.forEach((t, idx) => {
    if (!t.waitingTool) {
      advanceTopicStream(t, 16);
      spawnRadarPacket(idx, 'chunk');
    }
  });
  store.commitPulses.push(1.0);
  renderTopicSidebar();
  renderActiveStage();
  logAudit('4 路话题并发分片洪峰已按 Triple-ID 精确路由归位，0 串流！', 'normal');
}

function stepTopicBurst(topicId, steps = 4) {
  selectTopic(topicId);
  const topic = getActiveTopic();
  topic.waitingTool = false;
  for (let i = 0; i < steps; i += 1) {
    advanceTopicStream(topic, 12);
  }
  renderTopicSidebar();
  renderActiveStage();
  logAudit(`INCREMENTAL LEXER: 增量游标推进 ${steps} 拍，已闭合块永不回扫 (O(n))`, 'normal');
}

function toggleToolPause(topicId) {
  const topic = store.topics.find((t) => t.id === (topicId || store.activeTopicId));
  if (!topic) return;
  topic.waitingTool = !topic.waitingTool;
  renderTopicSidebar();
  renderActiveStage();
  logAudit(
    topic.waitingTool
      ? `按需帧调度：${topic.agent} 进入工具等待态，流式解码器自动暂停，消灭空转帧！`
      : `按需帧唤醒：新数据到达，从原持久化游标位瞬时恢复 O(n) 扫描！`,
    'amber'
  );
}

function enqueuePending(fromLabel, text) {
  const topic = getActiveTopic();
  const qid = `Q${String(++store.pendingSeq).padStart(2, '0')}`;
  topic.pending.push({ id: qid, from: fromLabel, text });
  const tIdx = store.topics.indexOf(topic);
  spawnRadarPacket(tIdx, 'comm');
  renderTopicSidebar();
  renderActiveStage();
  logAudit(`PENDING BUFFER 入队 [${qid} · ${fromLabel}] → 零打断当前流式，等待安全点合流`, 'amber');
}

function flushPendingIntoTurn(topic, reasonLabel) {
  const count = topic.pending.length;
  const mergedSummary = topic.pending.map((p) => `[${p.id}] ${p.text}`).join(' ； ');
  topic.pending = [];
  store.mergedBatches += 1;
  store.authorityRev += 1;

  topic.messages.push({
    id: `M_MERGE_${store.authorityRev}`,
    role: 'system',
    author: 'ChatKernelV2 · Atomic Merge',
    badge: 'ZERO-EMPTY-POST',
    coord: `${topic.coord} · rev ${topic.rev} · HASH VERIFIED`,
    kind: 'text',
    text: `✅ ${reasonLabel}：已将工具回执与 ${count} 条暂挂消息（${mergedSummary}）原子合并注入下一轮推理上下文！上游空 POST = 0。`,
  });
}

function deliverToolReceipt() {
  const topic = getActiveTopic();
  topic.waitingTool = false;
  const fp = `FP#${Math.floor(1000 + Math.random() * 9000)}`;
  topic.messages.push({
    id: `M_TOOL_${store.authorityRev}`,
    role: 'agent',
    author: 'VCPToolRecord · 双指纹回执',
    badge: 'DUAL-FP VERIFIED',
    coord: `${topic.coord} · ${fp}`,
    kind: 'dual-fp-receipt',
    fp,
    text: '〔起始指纹校验通过〕LightMemo RiverMemo V5 返回 64 条双曲候选，3-bit 曝光命中率 89.33%〔结束指纹闭合〕',
  });

  if (topic.pending.length > 0) {
    flushPendingIntoTurn(topic, 'ToolLoop 边界原子合并');
  } else {
    store.authorityRev += 1;
    logAudit(`TOOL RECEIPT 送达 [${fp}]，解码器瞬时唤醒继续流式输出！`, 'normal');
  }
  advanceTopicStream(topic, 18);
  renderTopicSidebar();
  renderActiveStage();
  scrollChatToBottom();
}

function toggleOffscreen() {
  if (store.activeTopicId !== 'atelier') {
    selectTopic('atelier');
  }
  // 确保 Nova 的槽位已经渲染出来
  const atelier = getActiveTopic();
  while (!atelier.liveMsg?.blocks?.some((b) => b.domain === 'ISLAND_HOST') && atelier.scriptCursor < 2) {
    advanceTopicStream(atelier, 40);
  }
  store.offscreen = !store.offscreen;
  if (!store.offscreen) {
    store.island.mountCount += 1;
  }
  renderActiveStage();
  logAudit(
    store.offscreen
      ? 'VIEWPORT EVICTION: 消息滚离视口 +3200px → 重型 DOM 已卸载为 158px 等高占位，Tombstone V2 冻结 60fps 时钟！'
      : `STATEFUL RESTORE: 滑回视口 → 原生节点 #09 从内存指纹缓存直接迁回（累计挂载 ${store.island.mountCount} 次，相态与点击计数 100% 保留）！`,
    'amber'
  );
}

function toggleIslandSlot() {
  if (store.activeTopicId !== 'atelier') {
    selectTopic('atelier');
  }
  store.offscreen = false;
  const atelier = getActiveTopic();
  while ((atelier.scriptCursor ?? 0) < atelier.streamScript.length) {
    advanceTopicStream(atelier, 60);
  }
  store.island.slot = store.island.slot === 'A' ? 'B' : 'A';
  store.island.mountCount += 1;
  renderActiveStage();
  logAudit(
    `DOM FINGERPRINT CACHE: 原生节点 #09 无损迁移至槽位 ${store.island.slot}（未调用 cloneNode，实例数恒为 1，相态连续不重置）！`,
    'normal'
  );
}

function injectXssSample(customText) {
  const topic = getActiveTopic();
  const raw =
    customText ||
    '<div class="evil" onload="fetch(\'ipc://exec\')"><script>window.top.stealHost()</script><!-- 未闭合伪标签攻击';
  store.authorityRev += 1;
  topic.messages.push({
    id: `M_SEC_${store.authorityRev}`,
    role: 'security',
    author: '人类粘贴输入 (Zero-Trust Locked)',
    badge: 'LITERAL DOMAIN',
    coord: `${topic.coord} · ANTI-UNESCAPE`,
    kind: 'xss-locked',
    rawLiteral: raw,
  });
  renderActiveStage();
  scrollChatToBottom();
  logAudit('ZERO-TRUST 防线：检测到畸形标签/脚本粘贴，已强制实体锁死在纯文本域，0 DOM 越界执行！', 'warn');
}

function injectPoisonToolReceipt() {
  const topic = getActiveTopic();
  const fp = 'FP#9941·ISOLATED';
  store.rejectedCount += 1;
  topic.messages.push({
    id: `M_POISON_${store.authorityRev}`,
    role: 'security',
    author: '外部网页抓取回执 (Untrusted Payload)',
    badge: 'SANDBOX CONTAINED',
    coord: `${topic.coord} · ${fp}`,
    kind: 'dual-fp-receipt',
    fp,
    text: '〔双指纹沙箱锁定〕抓取正文含恶意片段: </div><script>require("child_process")</script> → 已被双指纹边界封死为惰性纯文本，且外围 0-IPC 物理虚空无宿主句柄！',
  });
  renderActiveStage();
  scrollChatToBottom();
  logAudit('0-IPC SANDBOX: 外部工具毒化回执已被双指纹容器物理封死，主解析器零熔断、零逃逸！', 'warn');
}

function scrollChatToBottom() {
  const scroller = $('chat-scroller');
  if (scroller) {
    scroller.scrollTop = scroller.scrollHeight;
  }
}

// -------------------- 六幕剧本切换与锚点联动 --------------------
function selectAct(index, updateHash = false) {
  const act = ACTS[index] || ACTS[0];
  store.actIndex = index;
  $('app-root').dataset.act = act.key;
  $('mission-tag').textContent = act.tag;
  $('mission-title').textContent = act.title;
  $('mission-desc').textContent = act.desc;

  // 渲染本幕专属快捷实验按钮
  const actActions = $('mission-actions');
  actActions.replaceChildren();
  act.actions.forEach(([label, fn], idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = idx === 0 ? 'mission-btn accent' : 'mission-btn';
    b.textContent = label;
    b.addEventListener('click', fn);
    actActions.append(b);
  });

  [...$('act-tabs').children].forEach((tab, i) => {
    if (i === index) tab.setAttribute('aria-current', 'step');
    else tab.removeAttribute('aria-current');
  });

  // 自动切到最契合本幕机制的房间
  if (act.focusTopic && store.activeTopicId !== act.focusTopic) {
    store.offscreen = false;
    selectTopic(act.focusTopic);
  } else {
    renderActiveStage();
  }

  // 如果切到第 4/5 幕，确保交互岛已上屏可见
  if (act.key === 'clocks' || act.key === 'viewport') {
    const atelier = store.topics.find((t) => t.id === 'atelier');
    while (atelier && (atelier.scriptCursor ?? 0) < 2) {
      advanceTopicStream(atelier, 50);
    }
    renderActiveStage();
  }

  if (updateHash) {
    history.replaceState(null, '', `#${act.key}`);
  }
}

// -------------------- Canvas 渲染管线（环境粒子 + 协同拓扑雷达 + 双轨示波器 + 60fps 岛） --------------------
const scopeHistoryAnim = new Array(80).fill(0);
const scopeHistoryCommit = new Array(80).fill(0);

function spawnRadarPacket(targetIdx, kind = 'chunk') {
  store.packets.push({
    target: targetIdx,
    p: 0,
    kind, // 'chunk' | 'comm' | 'reject'
  });
}

function drawSwarmRadar(ctx, w, h, dt) {
  ctx.clearRect(0, 0, w, h);
  const cx = 62;
  const cy = h / 2;
  const nodes = [
    { x: w - 58, y: 24, label: 'T_COUNCIL', color: '#9d8df1' },
    { x: w - 58, y: 56, label: 'T_FORGE', color: '#76bfae' },
    { x: w - 58, y: 90, label: 'T_ATELIER', color: '#f2a900' },
    { x: w - 58, y: 124, label: 'T_MEMO', color: '#5ec8e5' },
  ];

  // 连线与轨道
  nodes.forEach((n, idx) => {
    const isFront = store.topics[idx]?.id === store.activeTopicId;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cx + 75, cy, n.x - 75, n.y, n.x, n.y);
    ctx.strokeStyle = isFront ? 'rgba(118, 191, 174, 0.55)' : 'rgba(242, 240, 233, 0.12)';
    ctx.lineWidth = isFront ? 1.8 : 1;
    ctx.stroke();

    // 目标房间节点
    ctx.beginPath();
    ctx.arc(n.x, n.y, isFront ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();

    ctx.fillStyle = isFront ? '#f2f0e9' : '#7f8991';
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillText(n.label, n.x - 68, n.y + 3);
  });

  // 核心 Kernel 枢纽
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#151c22';
  ctx.strokeStyle = '#76bfae';
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2f0e9';
  ctx.font = '700 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KERNEL', cx, cy - 1);
  ctx.fillStyle = '#76bfae';
  ctx.fillText('V2', cx, cy + 9);
  ctx.textAlign = 'left';

  // 更新飞行脉冲包
  for (let i = store.packets.length - 1; i >= 0; i -= 1) {
    const pkt = store.packets[i];
    pkt.p += dt * 1.65;
    const maxP = pkt.kind === 'reject' ? 0.52 : 1;
    const t = Math.min(maxP, pkt.p);
    const n = nodes[pkt.target] || nodes[0];

    // 三次贝塞尔插值
    const u = 1 - t;
    const bx = u * u * u * cx + 3 * u * u * t * (cx + 75) + 3 * u * t * t * (n.x - 75) + t * t * t * n.x;
    const by = u * u * u * cy + 3 * u * u * t * cy + 3 * u * t * t * n.y + t * t * t * n.y;

    ctx.beginPath();
    ctx.arc(bx, by, pkt.kind === 'reject' ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = pkt.kind === 'reject' ? '#e05a47' : pkt.kind === 'comm' ? '#f2a900' : '#76bfae';
    ctx.fill();

    if (pkt.p >= maxP + (pkt.kind === 'reject' ? 0.25 : 0)) {
      store.packets.splice(i, 1);
    }
  }
}

function drawDualScope(ctx, w, h, timeSec) {
  ctx.clearRect(0, 0, w, h);

  // 采样推入历史
  const animSample = store.offscreen || !store.running ? 0.08 : 0.5 + 0.36 * Math.sin(timeSec * 8.5);
  scopeHistoryAnim.push(animSample);
  scopeHistoryAnim.shift();

  const pulse = store.commitPulses.length > 0 ? store.commitPulses.shift() : 0;
  scopeHistoryCommit.push(pulse);
  scopeHistoryCommit.shift();

  // 背景参考网格线
  ctx.strokeStyle = 'rgba(242, 240, 233, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.45);
  ctx.lineTo(w, h * 0.45);
  ctx.moveTo(0, h * 0.82);
  ctx.lineTo(w, h * 0.82);
  ctx.stroke();

  // 上轨：60fps 连续动画时钟波形
  ctx.beginPath();
  scopeHistoryAnim.forEach((v, i) => {
    const x = (i / (scopeHistoryAnim.length - 1)) * w;
    const y = h * 0.46 - v * 34;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#76bfae';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 下轨：离散节流 DOM 提交脉冲针
  ctx.beginPath();
  scopeHistoryCommit.forEach((v, i) => {
    const x = (i / (scopeHistoryCommit.length - 1)) * w;
    const y = h * 0.88 - v * 32;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#f2a900';
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function drawLiveIslandCanvas(dt) {
  const { canvas, modes, modeIndex } = store.island;
  if (!canvas || store.offscreen || !canvas.isConnected) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const mode = modes[modeIndex];

  if (store.running && !reducedMotion.matches) {
    store.island.phase += dt * mode.freq;
  }
  const p = store.island.phase;

  ctx.clearRect(0, 0, w, h);

  // 径向双曲能量环
  const cx = w * 0.5;
  const cy = h * 0.52;
  for (let r = 14; r <= 52; r += 13) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.sin(p + r * 0.1) * 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = r === 27 ? mode.accent : 'rgba(118, 191, 174, 0.24)';
    ctx.lineWidth = r === 27 ? 1.5 : 1;
    ctx.stroke();
  }

  // 动态谐波流线
  for (let layer = 0; layer < 2; layer += 1) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y =
        cy +
        Math.sin(x * 0.045 + p * (layer === 0 ? 1.4 : -1.1)) * (14 + layer * 7) +
        Math.cos(x * 0.02 - p) * 5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = layer === 0 ? mode.color : mode.accent;
    ctx.lineWidth = layer === 0 ? 2 : 1.3;
    ctx.stroke();
  }
}

// 背景稀疏微光粒子
const ambientParticles = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 97) % 100,
  y: (i * 53) % 100,
  vx: 0.008 + (i % 4) * 0.004,
  r: 1 + (i % 2),
}));

function drawAmbient(canvas, dt) {
  if (!canvas) return;
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(118, 191, 174, 0.35)';
  ambientParticles.forEach((pt) => {
    if (store.running && !reducedMotion.matches) {
      pt.x = (pt.x + pt.vx * dt * 60) % 100;
    }
    ctx.beginPath();
    ctx.arc((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height, pt.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// -------------------- 主循环调度（60fps rAF 视觉轨 + 节流多话题流式推进轨） --------------------
let lastFrame = performance.now();
let streamAccumulator = 0;

function mainLoop(now) {
  const dt = Math.min(0.08, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!document.hidden) {
    drawAmbient($('ambient-canvas'), dt);
    const swarmCanvas = $('swarm-canvas');
    if (swarmCanvas) drawSwarmRadar(swarmCanvas.getContext('2d'), swarmCanvas.width, swarmCanvas.height, dt);
    const scopeCanvas = $('scope-canvas');
    if (scopeCanvas) drawDualScope(scopeCanvas.getContext('2d'), scopeCanvas.width, scopeCanvas.height, now / 1000);
    drawLiveIslandCanvas(dt);

    if (store.running) {
      streamAccumulator += dt * store.speed;
      if (streamAccumulator >= 0.42) {
        streamAccumulator = 0;
        let activeChanged = false;
        store.topics.forEach((t, idx) => {
          if (!t.waitingTool) {
            const changed = advanceTopicStream(t, 5);
            if (Math.random() < 0.45) spawnRadarPacket(idx, 'chunk');
            if (t.id === store.activeTopicId && changed) activeChanged = true;
          }
        });
        renderTopicSidebar();
        if (activeChanged) {
          renderActiveStage();
        } else {
          syncTelemetryPanel(getActiveTopic());
        }
      }
    }
  }

  requestAnimationFrame(mainLoop);
}

// -------------------- 初始化绑定 --------------------
function init() {
  // 初始化六幕按钮
  const tabsWrap = $('act-tabs');
  ACTS.forEach((act, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'act-tab';
    const numSpan = document.createElement('span');
    numSpan.textContent = act.num;
    btn.append(numSpan, act.name);
    btn.addEventListener('click', () => selectAct(idx, true));
    tabsWrap.append(btn);
  });

  // 预热 Nova 房间的首个交互岛槽位，保证首屏切过去立即震撼可见
  const atelier = store.topics.find((t) => t.id === 'atelier');
  while (atelier && (atelier.scriptCursor ?? 0) < 2) {
    advanceTopicStream(atelier, 60);
  }
  store.topics.forEach((t) => {
    if (t.id !== 'atelier' && !t.waitingTool) advanceTopicStream(t, 22);
  });

  // 顶部传输控制
  $('btn-play').addEventListener('click', () => {
    store.running = !store.running;
    $('app-root').dataset.running = String(store.running);
    $('btn-play').textContent = store.running ? '⏸ 运行中' : '▶ 已暂停';
    syncTelemetryPanel(getActiveTopic());
  });

  const speeds = [1, 2, 0.5];
  $('btn-speed').addEventListener('click', () => {
    const next = speeds[(speeds.indexOf(store.speed) + 1) % speeds.length];
    store.speed = next;
    $('btn-speed').textContent = `${next.toFixed(1)}×`;
  });

  $('btn-reset').addEventListener('click', () => {
    store.topics = createInitialTopics();
    store.offscreen = false;
    store.rejectedCount = 0;
    store.mergedBatches = 0;
    store.island.clicks = 0;
    store.island.slot = 'A';
    store.island.mountCount = 1;
    mountedStageTopicId = null;
    const at = store.topics.find((t) => t.id === 'atelier');
    while (at && (at.scriptCursor ?? 0) < 2) advanceTopicStream(at, 60);
    renderTopicSidebar();
    renderActiveStage();
    logAudit('沙盒已重置：4 路并发会话与原生岛 #09 恢复初始基准状态。', 'normal');
  });

  // 侧栏与舞台实验按钮
  $('btn-stale-packet').addEventListener('click', injectStalePacket);
  $('btn-cross-agent').addEventListener('click', () =>
    enqueuePending('A_NANA', '小娜跨房指令：请对齐 OneRing rev-2 上下文指纹后回报！')
  );
  $('btn-burst-stream').addEventListener('click', triggerBurst);
  $('btn-scroll-away').addEventListener('click', toggleOffscreen);
  $('btn-scroll-return').addEventListener('click', toggleOffscreen);
  $('btn-clone-ref').addEventListener('click', toggleIslandSlot);
  $('btn-force-tool-return').addEventListener('click', deliverToolReceipt);
  $('btn-clear-log').addEventListener('click', () => $('audit-log').replaceChildren());

  // 底部快捷预设与输入框提交
  document.querySelectorAll('[data-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.preset;
      if (type === 'human') {
        enqueuePending('HUMAN', '人类实时插话：把双曲曲率软化系数调到 β=0.7！');
      } else if (type === 'xss') {
        injectXssSample();
      } else if (type === 'poison-tool') {
        injectPoisonToolReceipt();
      }
    });
  });

  $('composer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('composer-input');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';

    // 若包含疑似 HTML/脚本标签，自动展示零信任字面量锁死；否则在流式/等待期进入 Pending 暂挂区
    if (/[<>]/.test(val)) {
      injectXssSample(val);
    } else {
      enqueuePending('HUMAN', val);
    }
  });

  // 解析初始 Hash（兼容 #address ~ #boundary 与 #theater）
  const applyHash = () => {
    const hash = window.location.hash.replace('#', '');
    const found = ACTS.findIndex((a) => a.key === hash);
    selectAct(found >= 0 ? found : 0, false);
  };
  window.addEventListener('hashchange', applyHash);

  renderTopicSidebar();
  applyHash();
  logAudit('ChatKernelV2 × Renderer V5.2 单窗口沙盒已就绪：4 路 Agent 正在异步并行推进。', 'normal');
  requestAnimationFrame(mainLoop);
}

init();