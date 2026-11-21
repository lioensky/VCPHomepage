const $ = (id) => document.getElementById(id);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const visual = $('visual');
const deck = $('deck');

const topics = ['天气', '审稿', '归档'];
const codecParts = [
  ['武汉天气：', 0], ['晴。', 0, true], ['`', 1], ['<div>', 1],
  ['`', 1, true], ['<div>', 2], ['☼', 2], ['</div>', 2, true],
];
const boundaries = [
  ['01 / LITERAL', '粘贴样本', '样本文字：〈天气组件〉', '保留为文本，不交给标记解析器。'],
  ['02 / RECEIPT', '工具回执', '〔起始指纹〕天气摘录〔结束指纹〕', '按来源与批次识别回执；正文仍是不可信数据。'],
  ['03 / HOST', '宿主能力', '不向展示内容提供宿主接口', '这只是能力边界示意，没有执行或探测宿主。'],
];

const scenes = [
  {
    key: 'address', name: '并发路由', code: 'ADDRESS', domain: 'CHAT KERNEL / 三重身份',
    title: '切走的是视口，不是会话',
    cue: '三条流同时到达。切到审稿，观察后台天气流是否还在记账。',
    note: '话题、Agent、消息与代次决定分片归属；前台选择只改变投影。旧包停在入口，不改变任何一条流的计数。参见 §2.1–2.2。',
    actions: [['注入三路新分片', receive], ['切换前台', switchTopic], ['送入旧代次', reject]],
    beats: [receive, switchTopic, receive, reject, receive],
    mount: mountRouting,
  },
  {
    key: 'mailbox', name: '暂挂合流', code: 'MAILBOX', domain: 'CHAT KERNEL / 原子合并点',
    title: '纠偏到了，先别打断它',
    cue: '工具还没回来。先放两封信进暂挂区，再亲手送达回执。',
    note: '暂挂消息拿到队列号，但当前轮次不变。工具回执到达后，与本轮暂挂消息一次进入下一轮上下文。参见 §2.3。',
    actions: [['人类插话', () => enqueue('人类')], ['Agent 传信', () => enqueue('Agent')], ['送达回执', merge]],
    beats: [() => enqueue('人类'), () => enqueue('Agent'), merge],
    mount: mountMailbox,
  },
  {
    key: 'cursor', name: '增量分域', code: 'CURSOR', domain: 'RENDERER / 单遍增量扫描',
    title: '墨已干的地方，不再重描',
    cue: '观察正文、代码字面量、交互岛如何各自闭合；模拟工具等待，看看游标是否停住。',
    note: '预设分片只写入所属词法域，闭合块不回扫。代码里的标签是字面量；此处不执行分片内容，也不运行生产解析器。参见 §3.1–3.2。',
    actions: [['送入下一片', scan], ['切换工具等待 / 唤醒', toggleWaiting]],
    beats: codecParts.map(() => scan),
    mount: mountCodec,
  },
  {
    key: 'clocks', name: '双轨时钟', code: 'CLOCKS', domain: 'RENDERER / STRUCTURE ≠ ANIMATION',
    title: '文字还在写，太阳已经转起来',
    cue: '首块上屏后切换天气读数，再观察暂存脚本、长块节流是否会重建天气卡。',
    note: '结构轨按可提交边界上屏；已挂载动效单独运行。演示把长尾到达与提交分为两拍，自动走带时两拍相隔约 650 ms。参见 §3.2。',
    actions: [['送入下一段结构', structure]],
    beats: Array.from({length: 5}, () => structure),
    delays: [1400, 1500, 1450, 1400, 650],
    mount: mountClocks,
  },
  {
    key: 'viewport', name: '离屏迁移', code: 'VIEWPORT', domain: 'RENDERER / 原生节点生命周期',
    title: '离开画框，不丢现场',
    cue: '先点天气卡切换读数，再移出、返回原位或迁往第二处引用；检查节点和读数。',
    note: '此幕实际移动同一个按钮节点，不克隆。离屏只留等高占位；回来后恢复显示状态与动画相位，不模拟 GPU 或显存。参见 §3.4。',
    actions: [['移出 / 返回原位', () => migrate(state.position === 'off' ? 'a' : 'off')], ['迁往第二引用位', () => migrate('b')]],
    beats: [() => migrate('off'), () => migrate('a'), () => migrate('b')],
    mount: mountViewport,
  },
  {
    key: 'boundary', name: '输入隔离', code: 'BOUNDARY', domain: 'RENDERER / ZERO TRUST',
    title: '读到一段内容，不等于执行它',
    cue: '逐层检查粘贴文本、工具回执和宿主能力。每层负责不同的边界。',
    note: '文本化、回执归属、宿主能力隔离不能相互替代。所有内容都是固定文本，不解释成标记，也不调用宿主。参见 §3.5 与零信任输入防线。',
    actions: boundaries.map(([, name], index) => [`检查${name}`, () => inspectBoundary(index)]),
    beats: boundaries.map((_, index) => () => inspectBoundary(index)),
    mount: mountBoundary,
  },
];

let scene;
let state;
let card;
let mountCount;
let beat = 0;
let playing = !motion.matches;
let animationPaused = false;
let visible = !('IntersectionObserver' in window);
let timer;
const pad = (number) => String(number).padStart(2, '0');
const canAnimate = () => visible && !document.hidden && !motion.matches;
const canAdvance = () => playing && visible && !document.hidden && !state.waiting && beat < scene.beats.length;

function append(parent, tag, text, className = '') {
  const item = document.createElement(tag);
  item.textContent = text;
  if (className) item.className = className;
  parent.append(item);
  return item;
}

function event(message, metrics) {
  const previous = $('receipt').textContent;
  if (previous) {
    const item = document.createElement('li');
    item.textContent = previous;
    $('history').prepend(item);
    if ($('history').children.length > 3) $('history').lastElementChild.remove();
  }
  $('receipt').textContent = message;
  $('metrics').replaceChildren();
  for (const [label, value] of metrics) {
    const entry = append($('metrics'), 'div', '');
    append(entry, 'dt', label);
    append(entry, 'dd', value);
  }
  if (!playing) $('announcement').textContent = message;
}

function mountRouting() {
  topics.forEach((name, index) => {
    const lane = append(visual, 'div', '', 'lane');
    lane.id = `lane${index}`;
    const source = append(lane, 'div', '');
    append(source, 'strong', name);
    append(source, 'small', `T${index + 1} / A${index + 1} / M${pad(index + 9)}`);
    const track = append(lane, 'div', '', 'track');
    track.setAttribute('aria-hidden', 'true');
    const target = append(lane, 'div', '', 'lane-count');
    target.id = `lane-count${index}`;
  });
  routingView([], '等待分片。当前前台：天气。');
}

function routingView(active, message, rejected = false) {
  topics.forEach((_, index) => {
    const lane = $(`lane${index}`);
    lane.classList.toggle('front', index === state.front);
    lane.classList.toggle('reject', rejected && active.includes(index));
    $(`lane-count${index}`).textContent = `${state.counts[index]} 片 · ${index === state.front ? '前台' : '后台'}`;
    lane.querySelector('.track').replaceChildren();
    if (active.includes(index)) append(lane.querySelector('.track'), 'i', '', `spark ${canAnimate() ? 'fly' : 'landed'}`);
  });
  event(message, [['前台投影', topics[state.front]], ['有效代次', 'rev 2'], ['累计接收', state.counts.reduce((a, b) => a + b, 0)], ['拒收旧包', state.rejected]]);
}
function receive() {
  state.counts = state.counts.map((n) => n + 1);
  routingView([0, 1, 2], '三条地址各收到一片。后台与前台都在推进。');
}
function switchTopic() {
  state.front = (state.front + 1) % topics.length;
  routingView([], `已切到${topics[state.front]}。原话题继续保留计数。`);
}
function reject() {
  state.rejected++;
  routingView([0], '天气流旧包停在入口：rev 1 ≠ rev 2，接收计数未改写。', true);
}

function mountMailbox() {
  const grid = append(visual, 'div', '', 'cells');
  ['暂挂队列', '工具回执', '下一轮上下文'].forEach((label, index) => {
    const cell = append(grid, 'div', '', 'cell');
    append(cell, 'small', ['01 / PENDING', '02 / TOOL EDGE', '03 / NEXT TURN'][index]);
    append(cell, 'strong', label);
    append(cell, 'div', '', 'chips').id = `cell${index}`;
  });
  mailboxView(1, '当前轮次正在等待天气工具。');
}

function mailboxView(active, message) {
  [state.queue, [state.batch.length ? '已送达' : '等待中'], state.batch].forEach((items, index) => {
    const zone = $(`cell${index}`);
    zone.replaceChildren();
    zone.parentElement.classList.toggle('hot', index === active);
    for (const value of items) append(zone, 'span', value, index === active ? 'enter' : '');
  });
  event(message, [['暂挂数量', state.queue.length], ['工具状态', state.batch.length ? '已回执' : '等待'], ['上下文轮次', state.batch.length ? '02' : '01'], ['同批合并', state.batch.length]]);
}
function enqueue(source) {
  if (state.batch.length) return false;
  const id = `Q${pad(++state.sequence)} / ${source}`;
  state.queue.push(id);
  mailboxView(0, `${id} 进入暂挂区；当前推理上下文未变。`);
  return true;
}
function merge() {
  if (state.batch.length) return false;
  state.batch = ['天气回执', ...state.queue];
  state.queue = [];
  for (const button of $('actions').children) button.disabled = true;
  mailboxView(2, `原子合并：${state.batch.length} 项同时进入下一轮。`);
  return true;
}

function mountCodec() {
  ['01 / 正文', '02 / 代码字面量', '03 / 交互岛'].forEach((name, index) => {
    const row = append(visual, 'div', '', 'codec');
    append(row, 'small', name);
    append(row, 'div', '', 'codec-line').id = `codec${index}`;
  });
  codecEvent('增量游标等候首片。');
}
function codecEvent(message) {
  event(message, [['分片游标', `${state.cursor} / ${codecParts.length}`], ['闭合块', state.stable], ['解码', state.waiting ? '暂停' : '就绪'], ['稳定块回扫', 0]]);
}
function scan() {
  if (state.waiting || state.cursor === codecParts.length) return false;
  const [part, lane, closes] = codecParts[state.cursor++];
  const line = $(`codec${lane}`);
  append(line, 'span', part, 'live enter');
  if (closes) {
    state.stable++;
    for (const token of line.children) token.className = 'stable';
  }
  codecEvent(`读入「${part}」${closes ? '，所属块闭合，进入稳定区。' : '，只追加到当前尾区。'}`);
  if (state.cursor === codecParts.length) {
    $('actions').children[0].disabled = true;
    $('actions').children[1].disabled = true;
  }
  return true;
}
function toggleWaiting() {
  state.waiting = !state.waiting;
  $('actions').children[0].disabled = state.waiting;
  $('actions').children[1].setAttribute('aria-pressed', String(state.waiting));
  codecEvent(state.waiting ? '等工具：没有新分片，不安排解码拍。' : '已唤醒：从原游标继续，不重扫稳定区。');
}

function makeWeather() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'weather';
  // Only static, authored SVG; event samples are always rendered as text.
  button.innerHTML = `<svg class="sun" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="8" fill="currentColor"/><path d="M24 3v8m0 26v8M3 24h8m26 0h8M9 9l6 6m18 18 6 6M39 9l-6 6M15 33l-6 6" stroke="currentColor" stroke-width="2"/></svg><span><strong></strong><small>ISLAND #09 · 切换读数</small></span>`;
  const reading = button.querySelector('strong');
  function update() {
    reading.textContent = state.wind ? '武汉 · 东南风' : '武汉 · 晴 17°C';
  }
  button.addEventListener('click', () => {
    state.wind = !state.wind;
    update();
    if (scene.key === 'viewport') viewportEvent('天气卡读数已切换。移出再回来，检查读数是否保留。');
  });
  update();
  return button;
}

function mountClocks() {
  const grid = append(visual, 'div', '', 'clocks');
  const left = append(grid, 'div', '', 'clock');
  append(left, 'span', 'A / 结构提交');
  append(left, 'p', '等待首个子块').id = 'structure-status';
  append(left, 'div', '', 'chips').id = 'commits';
  const right = append(grid, 'div', '', 'clock');
  append(right, 'span', 'B / 独立动画');
  const wave = append(right, 'div', '');
  wave.innerHTML = '<svg class="wave" viewBox="0 0 180 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10H23L27 3 34 17 39 10H65L70 3 77 17 82 10H108L114 3 120 17 126 10H153L158 3 165 17 170 10H180"/></svg>';
  wave.hidden = true;
  append(right, 'div', '', 'bay').id = 'clock-bay';
  $('clock-bay').dataset.empty = '首块上屏后，动画轨就绪';
  clockEvent('等待首个结构块。');
}

const structurePhases = [
  ['首个子块闭合', '天气岛', '首块提交。天气卡已可操作，不必等外层结构闭合。'],
  ['脚本未闭合 · 暂存', null, '只暂存示意分片；本拍不提交，天气卡也不重建。'],
  ['脚本边界闭合 · 就绪', '结构边界', '闭合后结构进入就绪态。演示不执行样本脚本。'],
  ['长尾到达 · 等待节拍', null, '长尾已到达，DOM 提交暂缓。观察右侧动画轨。'],
  ['长尾释放 · 提交', '长尾块', '长尾按节拍合入；原天气卡与交互状态仍在。'],
];
function structure() {
  if (state.structure === structurePhases.length) return false;
  const [status, chip, message] = structurePhases[state.structure++];
  $('structure-status').textContent = status;
  if (chip) append($('commits'), 'span', chip, 'enter');
  if (!card) {
    card = makeWeather();
    $('clock-bay').append(card);
    $('clock-bay').previousElementSibling.hidden = false;
  }
  clockEvent(message);
  if (state.structure === structurePhases.length) $('actions').firstElementChild.disabled = true;
  return true;
}
function clockEvent(message) {
  event(message, [['结构拍', `${state.structure} / 5`], ['DOM 提交', $('commits').childElementCount], ['天气节点', card ? '#09 / 保留' : '未挂载'], ['长尾阈值', '650 ms']]);
}

function mountViewport() {
  const slots = append(visual, 'div', '', 'slots');
  for (const [id, title] of [['a', 'A / 原引用位'], ['b', 'B / 第二引用位']]) {
    const slot = append(slots, 'div', '', 'slot');
    append(slot, 'span', title, 'slot-label');
    const bay = append(slot, 'div', '', 'bay');
    bay.id = `bay-${id}`;
    bay.dataset.empty = id === 'a' ? '保留原高度 · 未挂载' : '等待同一节点迁入';
  }
  card = makeWeather();
  $('bay-a').append(card);
  mountCount = 1;
  viewportEvent('天气岛 #09 已挂载。点卡片切换读数，然后试试移出或迁移。');
}
function migrate(position) {
  if (position === state.position) return true;
  const animation = card.querySelector('.sun').getAnimations()[0];
  if (animation?.currentTime != null) state.phase = animation.currentTime;
  if (position === 'off') {
    card.remove();
  } else {
    $(`bay-${position}`).append(card);
    const restored = card.querySelector('.sun').getAnimations()[0];
    if (restored) restored.currentTime = state.phase;
    mountCount++;
  }
  state.position = position;
  viewportEvent({
    a: '回到原位：重新挂载的是原节点，读数与动画相位保留。',
    b: '迁入第二引用位：未克隆；原位保留高度。',
    off: '节点离屏，动画不再运行；原位仍保留高度。',
  }[position]);
  return true;
}
function viewportEvent(message) {
  event(message, [['节点实例', '#09 × 1'], ['挂载次数', mountCount], ['当前引用', state.position === 'off' ? '离屏' : state.position.toUpperCase()], ['显示读数', state.wind ? '东南风' : '晴 17°C']]);
}

function mountBoundary() {
  boundaries.forEach(([code, name], index) => {
    const row = append(visual, 'div', '', 'boundary');
    row.id = `boundary${index}`;
    append(row, 'small', `${code} / ${name}`);
    append(row, 'p', '等待检查');
  });
  event('选择一个边界，查看样本如何呈现。', [['检查层数', '0 / 3'], ['样本执行', '无']]);
}
function inspectBoundary(index) {
  state.checked.add(index);
  boundaries.forEach(([, , sample], row) => {
    const node = $(`boundary${row}`);
    node.classList.toggle('hot', row === index);
    node.lastElementChild.textContent = state.checked.has(row) ? sample : '等待检查';
  });
  const row = $(`boundary${index}`).lastElementChild;
  row.classList.remove('enter');
  void row.offsetWidth;
  row.classList.add('enter');
  event(boundaries[index][3], [['检查层数', `${state.checked.size} / 3`], ['样本执行', '无']]);
  return true;
}

function transport() {
  clearTimeout(timer);
  const running = canAdvance();
  deck.dataset.running = String(!animationPaused && canAnimate());
  $('play').textContent = playing ? '暂停走带' : beat === scene.beats.length ? '重新走带' : '继续走带';
  $('step').disabled = beat === scene.beats.length || state.waiting;
  $('transport-status').textContent = state.waiting ? '等待工具 / 解码停驻'
    : beat === scene.beats.length ? '本幕走带结束'
    : !playing ? '手动 / 暂停'
    : running ? '自动走带 / LIVE' : '待进入视口';
  $('beat-index').textContent = `${pad(beat)} / ${pad(scene.beats.length)}`;
  $('progress').value = beat;
  [...$('ticks').children].forEach((tick, index) => tick.classList.toggle('done', index <= beat));
  if (running) timer = setTimeout(advance, scene.delays?.[beat] ?? 1250);
}
function advance() {
  if (beat < scene.beats.length && !state.waiting) {
    scene.beats[beat]();
    beat++;
  }
  transport();
}

function manual(action) {
  if (action !== toggleWaiting) playing = false;
  const result = action();
  if (playing) $('announcement').textContent = $('receipt').textContent;
  if (result !== false) {
    // Finite, ordered scripts use the same cursor for automatic and manual input.
    if (scene.key === 'cursor') beat = state.cursor;
    if (scene.key === 'clocks') beat = state.structure;
    if (scene.key === 'mailbox' && state.batch.length) beat = scene.beats.length;
  }
  transport();
}

function select(index, updateHash = false) {
  clearTimeout(timer);
  scene = scenes[index];
  state = {
    front: 0, counts: [0, 0, 0], rejected: 0, queue: [], batch: [], sequence: 0,
    waiting: false, cursor: 0, stable: 0, structure: 0, position: 'a', phase: 0,
    wind: false, checked: new Set(),
  };
  beat = 0;
  card = null;
  mountCount = 0;
  $('slate').textContent = `ACT ${pad(index + 1)} / ${scene.code}`;
  $('scene-domain').textContent = scene.domain;
  $('scene-title').textContent = scene.title;
  $('scene-cue').textContent = scene.cue;
  $('note').textContent = scene.note;
  $('history').replaceChildren();
  $('receipt').textContent = '';
  $('announcement').textContent = '';
  visual.replaceChildren();
  $('actions').replaceChildren();
  scene.actions.forEach(([label, action], n) => {
    const button = append($('actions'), 'button', label, `button ${n === 0 ? 'primary' : 'outline'}`);
    button.type = 'button';
    if (action === toggleWaiting) button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => manual(action));
  });
  [...$('chapters').children].forEach((button, n) => {
    if (index === n) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  $('progress').max = scene.beats.length;
  $('ticks').replaceChildren();
  for (let n = 0; n <= scene.beats.length; n++) append($('ticks'), 'span', pad(n));
  scene.mount();
  if (updateHash) history.replaceState(null, '', `#${scene.key}`);
  transport();
}

scenes.forEach(({name}, index) => {
  const button = append($('chapters'), 'button', '', '');
  button.type = 'button';
  append(button, 'span', pad(index + 1));
  button.append(name);
  button.addEventListener('click', () => select(index, true));
});

$('play').addEventListener('click', () => {
  animationPaused = playing;
  if (!playing && beat === scene.beats.length) {
    playing = true;
    select(scenes.indexOf(scene));
  } else {
    playing = !playing;
    transport();
  }
});
$('step').addEventListener('click', () => { playing = false; advance(); });
$('reset').addEventListener('click', () => select(scenes.indexOf(scene)));
$('next').addEventListener('click', () => select((scenes.indexOf(scene) + 1) % scenes.length, true));
document.addEventListener('visibilitychange', transport);
motion.addEventListener('change', () => {
  if (motion.matches) playing = false;
  transport();
});

const getHashIndex = () => scenes.findIndex(({key}) => `#${key}` === location.hash);
const initial = getHashIndex();
select(Math.max(0, initial));
if (initial >= 0) requestAnimationFrame(() => $('theater').scrollIntoView());
window.addEventListener('hashchange', () => {
  const index = getHashIndex();
  if (index >= 0) {
    select(index);
    $('theater').scrollIntoView();
  }
});
if ('IntersectionObserver' in window) {
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    transport();
  });
  visibility.observe(visual);
  new IntersectionObserver(([entry]) => {
    entry.target.classList.toggle('offscreen', !entry.isIntersecting);
  }).observe(document.querySelector('.hero-figure'));
}