const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('public/vcp-rivermemo-engine.html', 'utf8');
const elements = new Map();
const buttons = [];
const sections = [];
const observers = [];
const runners = [];
const noop = () => {};
const gradient = { addColorStop: noop };
const ctx = new Proxy({
    measureText: text => ({ width: text.length * 6 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
}, { get: (object, key) => key in object ? object[key] : noop });

function element(attrs = '') {
    const attributes = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const classes = new Set((attributes.class || '').split(' '));
    const listeners = {};
    return {
        attributes,
        dataset: Object.fromEntries(Object.entries(attributes).filter(([k]) => k.startsWith('data-'))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])),
        textContent: '', innerHTML: '',
        classList: {
            contains: key => classes.has(key),
            remove: key => classes.delete(key),
            toggle(key, value) {
                const active = value === undefined ? !classes.has(key) : value;
                if (active) classes.add(key); else classes.delete(key);
            },
        },
        setAttribute: (key, value) => { attributes[key] = value; },
        addEventListener: (key, fn) => { listeners[key] = fn; },
        click() { assert(listeners.click, `Unbound button: ${attrs}`); listeners.click(); },
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width: 900, height: 340 }),
        querySelectorAll: () => [],
    };
}
for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) elements.set(match[1], element(match[0]));
for (const match of html.matchAll(/<button\b([^>]*)>/g)) {
    const button = element(match[1]);
    buttons.push(button);
    if (button.attributes.id) elements.set(button.attributes.id, button);
}
for (let id = 0; id <= 10; id++) {
    const canvas = elements.get(id === 0 ? 'heroCanvas' : `ch${id}Canvas`);
    const section = element(`data-chapter="${id}"`);
    section.querySelector = () => canvas;
    canvas.closest = () => section;
    sections.push(section);
}
function queryAll(selector) {
    if (selector === '.chapter') return sections;
    const match = selector.match(/^\[data-([\w-]+)\]$/);
    if (match) return buttons.filter(button => `data-${match[1]}` in button.attributes);
    return [];
}
const sandbox = {
    window: { addEventListener: noop, removeEventListener: noop },
    document: {
        readyState: 'complete', hidden: false,
        getElementById: id => elements.get(id) || null,
        querySelectorAll: queryAll,
        querySelector: () => sections[0],
    },
    IntersectionObserver: class {
        constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
        observe(target) { this.targets.push(target); }
    },
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
    console: { ...console, error(...args) { throw new Error(args.join(' ')); } },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/river-engine.js', 'utf8'), sandbox);
const RealRunner = sandbox.window.RiverEngine.SceneRunner;
sandbox.window.RiverEngine.SceneRunner = class {
    constructor(canvas, draw, options = {}) { Object.assign(this, { canvas, draw, options, time: 0 }); runners.push(this); }
    start() { this.running = true; this.options.onResize?.({ w: 900, h: 340 }); this.tick(0); }
    stop() { this.running = false; }
    tick(dt) { this.time += dt; this.draw(ctx, 900, 340, this.time); }
};
for (const path of ['public/scenes.js', 'public/rivermemo-v2.js', 'public/memo-basin-projection.js', 'public/rivermemo-v3.js', 'public/rivermemo-wormhole-lab.js', 'public/rivermemo-v4.js', 'public/main.js']) vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox);
const observer = observers[0];
assert.equal(observer.targets.length, 11);
for (const target of observer.targets) observer.callback([{ target, isIntersecting: true, intersectionRatio: 0.001 }]);
assert.equal(runners.length, 12);
for (const button of buttons) {
    button.click();
    for (const runner of runners) runner.tick(0.1);
    if (Object.keys(button.dataset).length) assert.equal(button.attributes['aria-pressed'], 'true');
}
const star = queryAll('[data-star-mode]');
star[1].click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('ch2Readout').textContent.includes('Single Anchor'));
star[0].click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('ch2Readout').textContent.includes('Star Mixture'));
const sense = runners.find(runner => runner.canvas === elements.get('ch5Canvas'));
sense.tick(3);
elements.get('ch5FireBtn').click();
sense.tick(0.01);
assert(elements.get('ch5Readout').textContent.includes('Hop 0/4'));
assert(elements.get('finaleScoreTable').innerHTML.includes('OneRing'));
const cycle = elements.get('ch1CycleBtn');
queryAll('[data-ags-step]')[0].click();
assert.equal(cycle.attributes['aria-pressed'], 'false');
cycle.click();
assert.equal(cycle.attributes['aria-pressed'], 'true');
cycle.click();
assert.equal(cycle.attributes['aria-pressed'], 'false');

const { evaluateWormholes, evaluateProjection } = sandbox.window.RiverMemoV2;
const rescued = evaluateWormholes();
assert.equal(rescued.selected, 2);
assert.equal(rescued.promoted, 2);
assert.equal(rescued.rows.filter(e => e.selected).length, 3);
assert.equal(rescued.rows.find(e => e.id === 6).candidate, true);
assert.equal(rescued.rows.find(e => e.id === 6).dynamic, false);
assert.equal(evaluateWormholes({ energy: 0.1 }).fired, 0);
assert.equal(evaluateWormholes({ sourceLayer: 2 }).selected, 0);
assert.equal(evaluateWormholes({ acceptedLayers: 1 }).selected, 0);
const tail = evaluateWormholes({ acceptedLayers: 1, tailEnergyRatio: .08 });
assert.equal(tail.tailAppended, true);
assert.equal(tail.routingResidualCount, 2);
assert(tail.selected > 0);
for (const options of [
    { tailEnergyRatio: .019 }, { tailEnergyRatio: .08, tailEnergy: 0 },
    { tailEnergyRatio: .08, tailEnergy: Infinity }, { tailEnergyRatio: .08, acceptedLayers: 0 },
]) assert.equal(evaluateWormholes({ acceptedLayers: 1, ...options }).tailAppended, false);
assert.equal(evaluateWormholes({ acceptedLayers: 1, tailEnergyRatio: .02 }).tailAppended, true);
assert.equal(evaluateWormholes({ enabled: false, tailEnergyRatio: .08 }).routingResidualCount, 0);
assert.equal(evaluateWormholes({ enabled: false }).rows.find(e => e.id === 2).fired, true);
assert.equal(evaluateWormholes({ maxTargets: 3 }).budgetExhausted, true);
assert.equal(evaluateWormholes({ maxTargets: 3 }).selected, 0);
assert.equal(evaluateWormholes({ returnFactor: 0.15 }).fired, 0);
for (const k of [0, 1, 3, 64, 128, 193, 256, 512]) {
    const p = evaluateProjection(k);
    if (k) {
        assert(p.local.selected.length <= k);
        assert(p.transfer.selected.length <= k);
        assert(p.union.length <= 2 * k);
    }
    assert.equal(evaluateProjection(k, p.union).missing.length, 0);
    for (const field of [p.local, p.transfer]) {
        const selectedIds = new Set(field.selected.map(n => n.id));
        assert.equal(selectedIds.size, field.selected.length);
        assert.equal(field.selected[0].id, 1);
        assert(!selectedIds.has(11), '高质量孤岛不能入选');
        assert(!selectedIds.has(12), '零质量节点不能占位');
        const prefix = new Set([1]);
        for (const node of field.selected.slice(1)) {
            assert(prefix.has(node.parent), '新增节点必须连接已选前缀');
            assert(sandbox.window.RiverMemoV2.projectionEdges.some(e =>
                e.a === node.parent && e.b === node.id && e.weight > 0));
            prefix.add(node.id);
            const visited = new Set([node.id]), queue = [node.id];
            while (queue.length) {
                const id = queue.shift();
                for (const e of sandbox.window.RiverMemoV2.projectionEdges) {
                    if (e.a === id && e.weight > 0 && selectedIds.has(e.b) && !visited.has(e.b)) {
                        visited.add(e.b); queue.push(e.b);
                    }
                }
            }
            assert(visited.has(1), '教学支持集内存在返回核心的真实路径');
        }
    }
}
assert(evaluateProjection(0).union.length < 12);
assert.notDeepEqual(Array.from(evaluateProjection(3).local.selected, n => n.id),
    Array.from(evaluateProjection(3).transfer.selected, n => n.id));
const { growField } = sandbox.window.RiverMemoV2;
assert.equal(evaluateProjection(1).local.reason, '预算用尽');
assert.equal(evaluateProjection(256).local.reason, '质量达标');
assert.equal(evaluateProjection(256).transfer.reason, '前沿耗尽');
const directedEdges = [
    { a: 1, b: 2, weight: 1 }, { a: 2, b: 3, weight: 1 },
    { a: 1, b: 4, weight: 0 }, { a: 5, b: 1, weight: 1 },
];
const directed = growField([.1, .1, .4, .2, .2], .9, 0, [1], directedEdges);
assert.deepEqual(Array.from(directed.selected, n => n.id), [1, 2, 3]);
assert.equal(directed.reason, '前沿耗尽');
const zeroBridge = growField([.1, 0, .9], .9, 0, [1], directedEdges);
assert.deepEqual(Array.from(zeroBridge.selected, n => n.id), [1]);
const ranked = growField([.1, .2, .5, .2], .9, 3, [1], [
    { a: 1, b: 2, weight: .1 }, { a: 1, b: 4, weight: .9 },
    { a: 2, b: 3, weight: .1 }, { a: 4, b: 3, weight: .1 },
]);
assert.deepEqual(Array.from(ranked.selected, n => n.id), [1, 2, 3], '先比较前沿场质量，不按边权或全局质量跳选');
for (const k of [-1, 1.5, NaN, Infinity, '3']) assert.throws(() => evaluateProjection(k));
assert(html.includes('page=docs&doc=rivermemo-topology-v3'));
queryAll('[data-pool-action]').find(b => b.dataset.poolAction === 'fresh').click();
queryAll('[data-pool-action]').find(b => b.dataset.poolAction === 'reuse').click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('ch6Readout').textContent.includes('本次补读 0'));
queryAll('[data-pool-action]').find(b => b.dataset.poolAction === 'release').click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('projectionStory').textContent.includes('载荷归零'));

const { simulateProjection, projectionFixture, buildBasins } = sandbox.window.RiverMemoV2;
assert.equal(simulateProjection(1).conflict, true);
assert.equal(simulateProjection(1).union.length, 0);
for (const k of [0, 4, 8, 24, 64, 128, 193, 256, 512]) {
    const result = simulateProjection(k);
    if (k) assert(result.union.length <= k, '共享并集不能超过 K');
    assert(result.core.every(id => result.union.includes(id)));
    assert(!result.union.includes(29));
    assert(!result.union.includes(30));
    for (const field of result.fields) {
        const prefix = new Set(result.core);
        for (const node of field.selected.filter(n => !n.core)) {
            assert(prefix.has(node.parent), '外圈必须有同场已选前驱');
            assert(projectionFixture.edges.some(e => e.a === node.parent && e.b === node.id && e.weight > 0 && e.weight <= 1));
            prefix.add(node.id);
        }
        assert.equal(field.selected.length, new Set(field.selected.map(n => n.id)).size);
    }
    assert(result.frontiers.every(f => f.guarantee <= 2));
    assert(result.work.popped <= 8192 && result.work.discovered <= 8192 && result.work.edges <= 65536);
    assert.equal(simulateProjection(k, { cached: result.union }).missing.length, 0);
    assert.equal(JSON.stringify(result.events), JSON.stringify(simulateProjection(k).events), '回放必须确定');
}
const unlimited = simulateProjection(0);
assert(unlimited.events.some(e => e.phase === 'gain'), '长外圈必须演示收益阶段');
assert(unlimited.events.some(e => e.kind === 'accept' && !e.newlyGlobal && e.newlyField), '同 ID 需独立场接纳');
assert(unlimited.overlap > 0, '演示实际跨流域触达');
const lowBridge = unlimited.fields[0].selected;
assert(lowBridge.findIndex(n => n.id === 5) < lowBridge.findIndex(n => n.id === 6));
const limited = simulateProjection(0, { limits: { popped: 12, discovered: 24, edges: 14 } });
assert(limited.truncated);
assert(limited.fields.some(f => f.reason === '工作限额'));
assert(limited.work.popped <= 12 && limited.work.discovered <= 24 && limited.work.edges <= 14);
const missingVector = simulateProjection(0, { missingVectors: [5] });
assert(missingVector.fields[0].selected.some(n => n.id === 5));
assert(!missingVector.fields[0].valid.some(n => n.id === 5));
assert(!missingVector.union.includes(29), '缺失向量不能用孤岛补位');
const forest = buildBasins({ ...projectionFixture, roots: [1], observed: projectionFixture.observed });
assert(forest.basins.some(b => b.inner.includes(3)), '未分配核心独立保留');
const projection = runners.find(r => r.canvas === elements.get('ch6Canvas'));
elements.get('projectionStep').click();
projection.tick(.1);
assert.equal(elements.get('projectionPlay').attributes['aria-pressed'], 'false');
for (const [w, h] of [[390, 560], [650, 560], [1200, 560]]) {
    projection.draw(ctx, w, h, 5);
}

const { scoreCandidate, branchCoverage, alignContacts, densityCredit, examples } = sandbox.window.RiverMemoV3;
const evidence = examples[0].input;
const full = scoreCandidate(evidence);
const weak = scoreCandidate({ ...evidence, omega: .08 });
assert.equal(full.path, weak.path);
assert.equal(full.anchor, weak.anchor);
assert(weak.graph < full.graph);
assert.equal(scoreCandidate({ ...evidence, implicitOnly: true }).anchor, 0);
assert.equal(scoreCandidate({ query: .7, field: .2, support: 1 }).base, .7);
assert.equal(scoreCandidate({ query: .7, field: 1, support: 0 }).resonance, 0);
assert(Math.abs(scoreCandidate({ query: .5, field: 1, support: .1 }).resonance - .003) < 1e-12);
assert.equal(branchCoverage(.35, .20).combined, 1);
assert.equal(branchCoverage(.35, 0, false, false).combined, .35);
assert.equal(densityCredit(20, 20), 1);
assert(densityCredit(20, 1) < 1);
const contacts = alignContacts([
    { queryId: 1, tagId: 1, exact: true, weight: .1, quality: .1 },
    { queryId: 1, tagId: 2, exact: false, weight: 1, quality: 1 },
    { queryId: 2, tagId: 1, exact: false, weight: 1, quality: 1 },
    { queryId: 2, tagId: 2, exact: false, weight: .5, quality: .8 },
]);
assert.equal(contacts.length, 2);
assert(contacts[0].exact);
assert.equal(new Set(contacts.map(p => p.queryId)).size, 2);
assert.equal(new Set(contacts.map(p => p.tagId)).size, 2);
for (let i = 0; i <= 100; i++) {
    const r = scoreCandidate({ ...evidence, query: i / 100, pathQuality: i / 100 });
    assert(r.path + r.graph <= .08 + 1e-12);
    assert(r.anchor <= .10);
    assert(r.score >= i / 100);
    assert(Math.abs(r.base + r.path + r.graph + r.anchor - r.clipping - r.score) < 1e-12);
}
const clipped = scoreCandidate({ ...evidence, query: .99 });
assert(clipped.clipping > 0);
assert.equal(clipped.score, 1);
const before = JSON.stringify(scoreCandidate(evidence));
[evidence, { query: .1 }, { query: .99 }].map(scoreCandidate);
assert.equal(JSON.stringify(scoreCandidate(evidence)), before);
assert(elements.get('finaleScoreTable').innerHTML.includes('P+G='));
const scoring = runners.find(r => r.canvas === elements.get('ch9Canvas'));
const { fuse, wormholeFixture, gateWitness } = sandbox.window.RiverMemoV3;
const proofFixture = wormholeFixture();
const fused = fuse(proofFixture.candidates, proofFixture.routes, proofFixture.observation);
assert(fused.enabled);
assert.equal(fused.rows[0].id, 12);
assert.equal(fused.rows[0].baseRank, 12);
assert(Math.abs(fused.rows[0].contribution - (.12 / .10 * .72) / 61) < 1e-12);
const repeated = fuse(proofFixture.candidates, [...proofFixture.routes, ...proofFixture.routes], proofFixture.observation);
assert.equal(JSON.stringify(repeated.rows), JSON.stringify(fused.rows), '重复路线不叠加');
// V3 历史教学模型的函数级契约仍保留（页面第 9 章已由 V4 水闸接管）。
for (const mode of ['proof', 'isolated', 'duplicate', 'weak', 'ungrounded', 'incomplete', 'w']) {
    const f = wormholeFixture(mode);
    const result = fuse(f.candidates, f.routes, f.observation);
    assert.equal(result.enabled, mode === 'proof');
    if (!result.enabled) {
        result.rows.forEach((c, i) => {
            assert.equal(c.final, c.baseline);
            assert.equal(c.baseRank, i + 1);
        });
    }
}
assert.equal(gateWitness([...proofFixture.observation.files, ...Array(127).fill(proofFixture.observation.files[0])], 1, 2, [1, 4]), null);

// ---------------- RiverMemo V4 ----------------
const V4 = sandbox.window.RiverMemoV4;
// 非负锥：第三条支流只能倒流 → 锁零；无约束解出现负系数。
const k3 = V4.coneStep(3);
assert(k3.cone.x.every(v => v >= 0));
assert(k3.cone.x[2] < 1e-9, 'IPC 支流应被锁零');
assert(k3.free.x[2] < 0, '无约束解应依赖倒流');
assert(k3.free.residual < k3.cone.residual, '倒流相消会伪造更小残差');
for (const key of ['dual', 'complementarity', 'energy']) assert(k3.cone.kkt[key] < 1e-9);
for (let k = 1; k <= 3; k++) assert(V4.coneStep(k).cone.residual <= V4.coneStep(k - 1).cone.residual + 1e-12);
assert(Math.abs(V4.coneStep(0).cone.residual - 1) < 1e-12, 'K=0 时整块目标都是残差');
assert(Math.abs(V4.anchorGain(0) - .75) < 1e-12 && V4.anchorGain(10) === 2);
// 互补：对称、单项为零保留另一项、有界。
for (const [g, t] of [[0, .03], [.03, 0], [.05, .06], [.08, .08], [.2, .2]]) {
    const m = V4.complement(g, t);
    assert(Math.abs(m - V4.complement(t, g)) < 1e-15);
    assert(m <= V4.C_T + 1e-15);
    assert(m >= Math.min(V4.C_T, Math.max(g, t)) - 1e-15);
}
assert(Math.abs(V4.complement(0, .03) - .03) < 1e-15);
assert.equal(V4.complement(.05, .05, 0), 0);
// 统一泛函：Ω 同时门控路径与图，直接锚独立；账目闭合，排序分 = 展示分。
const ev = { ...V4.sharedEvidence, transport: .2 };
const hi = V4.scoreCandidate({ ...ev, omega: .8 }), lo = V4.scoreCandidate({ ...ev, omega: .1 });
assert(lo.path < hi.path && lo.graph < hi.graph);
assert.equal(lo.anchor, hi.anchor);
for (let i = 0; i <= 50; i++) {
    const r = V4.scoreCandidate({ ...ev, query: i / 50, omega: i / 50, transport: (i % 7) / 6 });
    assert(r.path + r.graph <= V4.C_T + 1e-12);
    assert(r.anchor <= .10 + 1e-12);
    assert.equal(r.rankingScore, r.finalScore);
    assert(Math.abs(r.base + r.path + r.graph + r.anchor - r.clipping - r.score) < 1e-12);
}
// 种差：无种差时恢复原查询分；混合上限 0.5。
assert.equal(V4.calibrateQuery(.7, null, 1).value, .7);
assert.equal(V4.calibrateQuery(.7, .1, 5).mix, .5);
// 见证：孤立两端拒绝；单焦点需种差或特异性。
const baseObs = V4.makeObservation();
assert(V4.gateWitness(baseObs.files, 1, 2, [1, 4]));
assert.equal(V4.gateWitness([{ id: 1, checksum: 'a', tags: [1, 6] }, { id: 2, checksum: 'b', tags: [2, 6] }], 1, 2, [1, 4]), null);
assert.equal(V4.gateWitness([{ id: 1, checksum: 'a', tags: [1, 2, 6] }, { id: 2, checksum: 'a', tags: [1, 2, 6] }], 1, 2, [1, 4]), null);
assert.equal(V4.gateWitness(baseObs.files, 1, 2, [1]), null);
assert(V4.gateWitness(baseObs.files, 1, 2, [1], { specificity: .7 }).singleFocus);
assert(V4.gateWitness(baseObs.files, 1, 2, [1], { differentia: .3 }));
assert.equal(V4.transportEvidence(V4.makeObservation({ complete: false }), V4.focusCandidate).value, 0);
// 场景预设：溢出、退潮、拦水与种差翻转都必须真实发生。
const tab = key => V4.buildTab(key);
assert(tab('transport').focus.result.overflow > 0, '跨文件见证页应演示满闸溢出');
assert(tab('transport').evidence.xw > 0 && tab('reject').evidence.xw === 0);
assert(tab('omega').focus.result.path < tab('ledger').focus.result.path);
assert.equal(tab('differentia').rows[0].focus, true);
assert(tab('differentia').rows.find(r => !r.focus && r.name.includes('综述')).result.queryHat
    < tab('differentia').rows.find(r => !r.focus && r.name.includes('综述')).input.query);
assert.equal(tab('anchor').rows.find(r => r.name.includes('隐式')).result.anchor, 0);
for (const t of V4.tabs) tab(t).rows.forEach((r, i, a) => i && assert(a[i - 1].result.rankingScore >= r.result.rankingScore));
// 页面交互：第 9 章按钮切换水闸场景，账页同源。
for (const key of V4.tabs) {
    const button = queryAll('[data-ch9-tab]').find(b => b.dataset.ch9Tab === key);
    assert(button, `缺少第 9 章按钮 ${key}`);
    button.click();
    for (const width of [390, 650, 1200]) scoring.draw(ctx, width, 460, 5);
    elements.get('wormStep').click();
    scoring.tick(.1);
    assert(elements.get('v4LedgerTable').innerHTML.includes('排序分 = 展示分'));
    assert(elements.get('ch9Readout').textContent.includes('Ω^γ'));
}
elements.get('wormReplay').click();
scoring.tick(.1);
assert(elements.get('v4LedgerStory').textContent.includes('教学预设'));
assert(elements.get('ch1Readout').textContent.includes('NNLS'));
const ch1 = runners.find(r => r.canvas === elements.get('ch1Canvas'));
for (const step of [0, 1, 2, 3]) {
    queryAll('[data-ags-step]')[step].click();
    for (const [w, h] of [[390, 340], [900, 340]]) ch1.draw(ctx, w, h, 3);
}
assert(!html.includes('1/(60+r₀(c))'), '首屏不得残留倒数名次公式');

const times = [];
let queued;
sandbox.requestAnimationFrame = callback => { queued = callback; return 1; };
const clock = new RealRunner(elements.get('ch5Canvas'), (_ctx, _w, _h, t) => times.push(t));
clock.start();
queued(1000);
queued(1050);
clock.stop();
clock.start();
queued(9000);
assert.equal(times.at(-1), 0.05);
sandbox.document.hidden = true;
queued(9100);
sandbox.document.hidden = false;
queued(20000);
assert.equal(times.at(-1), 0.05);
clock.stop();
console.log(`PASS: ${buttons.length} buttons, 12 scenes, low-ratio visibility, mode readouts, pulse replay, finale table and pause/resume clock.`);