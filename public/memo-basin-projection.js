/* RiverMemo V3：种子流域共享预算教学模型，非原生实现、非生产遥测。 */
(function (global) {
    'use strict';
    const { COLORS: C, SceneRunner, drawIndustrialGrid, drawVectorArrow, drawNodeBadge, drawPillTag } = global.RiverEngine;
    const edge = (a, b, weight) => ({ a, b, weight });
    const fixture = {
        core: [1, 2, 3, 4], roots: [1, 3],
        observed: [{ a: 1, b: 2, flow: .7 }, { a: 3, b: 4, flow: .15 }],
        energy: { 1: .6, 2: .3, 3: .06, 4: .04 },
        edges: [edge(1, 2, .8), edge(3, 4, .8), edge(2, 5, .92), edge(4, 15, .90)],
        local: [], transfer: [],
    };
    for (let id = 5; id < 14; id++) fixture.edges.push(edge(id, id + 1, .88));
    for (let id = 15; id < 24; id++) fixture.edges.push(edge(id, id + 1, .86));
    fixture.edges.push(edge(10, 25, .85), edge(20, 25, .85), edge(25, 26, .9),
        edge(26, 27, .9), edge(27, 28, .9), edge(8, 30, .8),
        edge(2, 14, .01), edge(4, 24, .01));
    for (let id = 1; id <= 30; id++) {
        fixture.local.push(id <= 4 ? .08 : id === 29 ? .12 : id === 30 ? 0 : id <= 14 ? .033 : .008);
        fixture.transfer.push(id <= 4 ? .035 : id === 29 ? .12 : id === 30 ? 0 : id >= 15 ? .036 : .014);
    }
    fixture.local[4] = .001; fixture.transfer[4] = .001; // 必须经过的正质量低谷桥
    function originalTarget(masses, eta) {
        const sorted = masses.filter(v => v > 0).slice().sort((a, b) => b - a);
        const total = sorted.reduce((a, b) => a + b, 0);
        let mass = 0;
        for (const value of sorted) { mass += value; if (mass >= eta * total - 1e-12) break; }
        return { total, mass };
    }
    // 稳定多源 BFS 只使用正观测流与真实 CSR 边；未分配核心单独保留。
    function buildBasins(data) {
        const core = [...new Set(data.core)].sort((a, b) => a - b), owners = new Map(), parents = new Map();
        const roots = [...new Set(data.roots)].filter(id => core.includes(id)).sort((a, b) => a - b);
        const queue = roots.slice();
        roots.forEach(id => owners.set(id, id));
        for (let i = 0; i < queue.length; i++) {
            const id = queue[i];
            data.observed.filter(e => e.a === id && e.flow > 0 && core.includes(e.b)
                && data.edges.some(c => c.a === e.a && c.b === e.b && c.weight > 0 && c.weight <= 1))
                .sort((a, b) => a.b - b.b).forEach(e => {
                    if (!owners.has(e.b)) {
                        owners.set(e.b, owners.get(id)); parents.set(e.b, id); queue.push(e.b);
                    }
                });
        }
        core.forEach(id => { if (!owners.has(id)) owners.set(id, id); });
        const basins = [...new Set(owners.values())].sort((a, b) => a - b).map(root => ({
            root, inner: core.filter(id => owners.get(id) === root),
            importance: core.filter(id => owners.get(id) === root).reduce((sum, id) => sum + (data.energy[id] || 0), 0),
        }));
        return { basins, parents, core };
    }
    function simulateProjection(k, options = {}) {
        if (!Number.isInteger(k) || k < 0) throw new Error('预算必须为非负整数');
        const data = options.data || fixture;
        const { basins, parents, core } = buildBasins(data);
        const limits = { popped: 8192, discovered: 8192, edges: 65536, ...options.limits };
        const union = new Set(core), events = [], work = { popped: 0, discovered: 0, edges: 0 };
        const specs = [data.local, data.transfer].map((masses, i) => ({
            masses, ...originalTarget(masses, i ? .9 : .8),
            selected: new Map(core.map(id => [id, { id, parent: parents.get(id) ?? null, core: true }])),
            current: core.reduce((sum, id) => sum + (masses[id - 1] || 0), 0),
            max: Math.max(0, ...masses), reason: '',
        }));
        const frontiers = [];
        let truncated = false, conflict = k > 0 && core.length > k;
        function snapshot(event) {
            events.push({ ...event, union: [...union].sort((a, b) => a - b),
                selected: specs.map(s => [...s.selected.keys()]), quality: specs.map(s => s.total ? s.current / s.total : 0),
                work: { ...work }, outer: frontiers.map(f => f.outer) });
        }
        snapshot({ kind: conflict ? 'conflict' : 'core', message: conflict
            ? `核心 ${core.length} 个 > K=${k}：显式预算冲突，不裁剪、不突破上限。`
            : `复用 ${core.length} 个活跃核心，稳定 BFS 划分 ${basins.length} 个内圈；两场都盖核心资格章。` });
        if (!conflict && core.length) {
            for (const basin of basins) for (let field = 0; field < 2; field++) {
                const f = { basin, field, heap: [], best: new Map(), settled: new Set(),
                    outer: 0, guarantee: 0, gain: 0, radius: 0, blocked: false };
                frontiers.push(f);
                for (const id of basin.inner) {
                    if (work.discovered >= limits.discovered) { truncated = true; break; }
                    f.best.set(id, 0); f.heap.push({ id, distance: 0, parent: null }); work.discovered++;
                }
            }
            function active(f) {
                return !f.blocked && f.heap.length && specs[f.field].current < specs[f.field].mass - 1e-12;
            }
            function advance(f, batch, phase) {
                const spec = specs[f.field];
                let opportunities = 0, gained = 0;
                while (opportunities < batch && active(f) && !truncated) {
                    if (work.popped >= limits.popped) { truncated = true; break; }
                    f.heap.sort((a, b) => a.distance - b.distance || a.id - b.id);
                    const item = f.heap.shift(); work.popped++;
                    if (item.distance !== f.best.get(item.id) || f.settled.has(item.id)) continue;
                    f.settled.add(item.id);
                    const isCore = core.includes(item.id);
                    if (!isCore) {
                        // 共享预算满后仍可接纳已在全局并集中的 ID，补全独立场资格。
                        if (!union.has(item.id) && k > 0 && union.size >= k) continue;
                        opportunities++; f.outer++;
                        if (phase === 'guarantee') f.guarantee++;
                        const newlyGlobal = !union.has(item.id);
                        union.add(item.id);
                        const newlyField = !spec.selected.has(item.id);
                        if (newlyField) {
                            spec.selected.set(item.id, { id: item.id, parent: item.parent, core: false,
                                basin: f.basin.root, distance: item.distance });
                            spec.current += spec.masses[item.id - 1];
                            gained += spec.total ? spec.masses[item.id - 1] / spec.total : 0;
                        }
                        f.radius = Math.max(f.radius, item.distance);
                        snapshot({ kind: 'accept', phase, field: f.field, root: f.basin.root,
                            id: item.id, parent: item.parent, distance: item.distance, newlyGlobal, newlyField,
                            message: `${f.basin.root === 1 ? '主主题 A' : '弱主题 B'} · ${f.field ? 'Transfer' : 'Local'}：${phase === 'guarantee' ? `轮转机会 ${f.guarantee}/2` : '收益批次 ≤4'} → 节点 ${item.id}，${newlyGlobal ? '扣 1 张共享票' : '复用 ID，不再扣票'}${newlyField ? '，新增本场资格' : '，本场质量不重复累计'}。` });
                    }
                    if (spec.current >= spec.mass - 1e-12) break;
                    const outgoing = data.edges.filter(e => e.a === item.id).sort((a, b) => a.b - b.b);
                    for (const e of outgoing) {
                        if (work.edges >= limits.edges) { truncated = true; break; }
                        work.edges++;
                        if (!(e.weight > 0 && e.weight <= 1)) continue;
                        const mass = spec.masses[e.b - 1] || 0;
                        if (!core.includes(e.b) && (mass <= 0 || mass < spec.max * 1e-12)) continue;
                        const distance = item.distance - Math.log(e.weight);
                        if (f.settled.has(e.b) || distance >= (f.best.get(e.b) ?? Infinity)) continue;
                        if (!f.best.has(e.b)) {
                            if (work.discovered >= limits.discovered) { truncated = true; break; }
                            work.discovered++;
                        }
                        f.best.set(e.b, distance);
                        f.heap.push({ id: e.b, distance, parent: item.id });
                    }
                }
                if (opportunities) f.gain = .5 * f.gain + .5 * gained / opportunities;
            }
            // 每前沿先轮转最多 2 个外圈机会，已有内圈不消耗机会。
            for (let round = 0; round < 2 && !truncated; round++)
                for (const f of frontiers) if (active(f) && !truncated) advance(f, 1, 'guarantee');
            while (!truncated) {
                const candidates = frontiers.filter(active);
                if (!candidates.length) break;
                candidates.sort((a, b) =>
                    Math.sqrt(b.basin.importance) * b.gain / (1 + b.outer / 2)
                    - Math.sqrt(a.basin.importance) * a.gain / (1 + a.outer / 2)
                    || a.basin.root - b.basin.root || a.field - b.field);
                advance(candidates[0], 4, 'gain');
            }
        }
        specs.forEach(s => {
            s.reason = conflict ? '核心预算冲突' : !core.length ? '空核心'
                : s.current >= s.mass - 1e-12 ? '质量目标'
                : truncated ? '工作限额' : k > 0 && union.size >= k ? '共享预算' : '前沿耗尽';
        });
        snapshot({ kind: 'finish', message: `停止：Local ${specs[0].reason} / Transfer ${specs[1].reason}。交汇不是流量汇聚，不修改 Sense、Ω 或河网形态。` });
        const missingVectors = new Set(options.missingVectors || []);
        const selected = specs.map(s => [...s.selected.values()]);
        const cached = options.cached || [];
        const ids = conflict ? [] : [...union].sort((a, b) => a - b);
        const missing = ids.filter(id => !cached.includes(id) && !missingVectors.has(id));
        const overlap = new Map();
        events.filter(e => e.kind === 'accept').forEach(e => {
            if (!overlap.has(e.id)) overlap.set(e.id, new Set());
            overlap.get(e.id).add(e.root);
        });
        return { conflict, basins, core, events, frontiers, work, truncated,
            union: ids, missing, batches: Math.ceil(missing.length / 128),
            overlap: [...overlap.values()].filter(roots => roots.size > 1).length,
            fields: specs.map((s, i) => ({ selected: selected[i], reason: s.reason,
                ratio: s.total ? s.current / s.total : 0, target: s.total ? s.mass / s.total : 0,
                valid: selected[i].filter(n => !missingVectors.has(n.id)) })) };
    }
    global.RiverMemoV2.simulateProjection = simulateProjection;
    global.RiverMemoV2.projectionFixture = fixture;
    global.RiverMemoV2.buildBasins = buildBasins;
    const presets = {
        normal: { note: '每通道先轮转最多两个外圈机会，再按收益调度；机会不保证得到两个新向量。' },
        bridge: { note: '节点 5 只有很少质量，却是必经桥。最短路不跳过低谷，不能直接瞬移到远端高峰。' },
        overlap: { note: '两流域在 25 相遇：全局只扣一次票；Local / Transfer 分别盖章，质量各算一次。交叠仅统计实际触达。' },
        work: { limits: { popped: 12, discovered: 24, edges: 14 },
            note: '为看清刹车，本实验将工作上限缩小为 12 出队 / 24 发现 / 14 扫边；生产为 8192 / 8192 / 65536。' },
        missing: { missingVectors: [5], note: '5 的原始向量缺失：不绕开桥全图补位。选点路径仍在，有效向量子集可能断开。' },
    };
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el && el.textContent !== value) el.textContent = value;
    }
    global.WaveScenes.createScene_ch6 = function (canvas) {
        let k = 24, preset = 'normal', view = 'both', result, cached = [1, 2, 3, 4], lastLoad = 0;
        let released = false, index = 0, playing = true, previous = null, accumulated = 0;
        const reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
        if (reduced) playing = false;
        function reset(fresh = true) {
            if (fresh) cached = [1, 2, 3, 4];
            result = simulateProjection(k, { ...presets[preset], cached });
            lastLoad = result.missing.length;
            if (result.conflict) cached = [];
            else cached = [...new Set([...cached, ...result.missing])];
            index = 0; accumulated = 0; released = false; previous = null;
        }
        reset();
        function playbackButtons() {
            const el = document.getElementById('projectionPlay');
            if (el) { el.textContent = playing ? 'Ⅱ 暂停讲解' : '▶ 继续探索'; el.setAttribute('aria-pressed', String(playing)); }
        }
        const runner = new SceneRunner(canvas, (ctx, width, height, t) => {
            if (previous !== null && playing && !released) {
                accumulated += Math.max(0, t - previous);
                if (accumulated >= .7) {
                    index = Math.min(result.events.length - 1, index + 1); accumulated = 0;
                }
            }
            previous = t;
            const event = result.events[index];
            const scale = Math.min(1, width / 650);
            ctx.save(); ctx.scale(scale, scale);
            const w = width / scale, h = height / scale;
            drawIndustrialGrid(ctx, w, h);
            const show = !released && !result.conflict;
            const union = show ? event.union : [];
            const fieldIds = show ? event.selected.map(ids => new Set(ids)) : [new Set(), new Set()];
            const visibleEvents = show ? result.events.slice(0, index + 1).filter(e => e.kind === 'accept') : [];
            drawPillTag(ctx, 20, 23, `共享票池 ${union.length} / ${k || '不限'} · 核心 ${result.core.length}`, result.conflict ? C.coral : C.amber);
            drawPillTag(ctx, w - 20, 23, `${index + 1}/${result.events.length} · ${event.phase === 'gain' ? '收益调度' : '轮转 / 内圈复用'}`, C.patina, 'right');
            // 两条真实内圈和两条长外圈，箭头都按历史方向。
            function position(id) {
                if (id === 1) return { x: w * .07, y: h * .24 };
                if (id === 2) return { x: w * .17, y: h * .24 };
                if (id === 3) return { x: w * .07, y: h * .54 };
                if (id === 4) return { x: w * .17, y: h * .54 };
                if (id <= 24) {
                    const weak = id >= 15, n = weak ? id - 15 : id - 5;
                    return { x: w * (.28 + (n % 5) * .12), y: h * ((weak ? .51 : .20) + Math.floor(n / 5) * .10) };
                }
                if (id <= 28) return { x: w * (.35 + (id - 25) * .13), y: h * .76 };
                return { x: w * (id === 29 ? .90 : .90), y: h * (id === 29 ? .25 : .57) };
            }
            fixture.edges.forEach(e => {
                const selected = union.includes(e.a) && union.includes(e.b);
                drawVectorArrow(ctx, position(e.a), position(e.b), {
                    color: C.muted, alpha: selected ? .40 : .10, width: 1, head: 4, arrowAt: .7,
                    dashed: e.weight < .1 ? [3, 4] : null });
            });
            visibleEvents.forEach(e => {
                if (view === 'local' && e.field || view === 'transfer' && !e.field) return;
                const color = e.field ? C.amber : C.patina;
                drawVectorArrow(ctx, position(e.parent), position(e.id), { color, alpha: .75, width: 1.6, head: 4, arrowAt: .65 });
            });
            for (let id = 1; id <= 30; id++) {
                const p = position(id), core = id <= 4, missing = preset === 'missing' && id === 5;
                const inL = fieldIds[0].has(id), inT = fieldIds[1].has(id);
                const selected = union.includes(id);
                drawNodeBadge(ctx, p, { color: missing || id >= 29 ? C.coral : core ? C.bone : id >= 15 && id <= 24 ? C.amber : C.patina,
                    radius: core ? 7 : selected ? 5 : 3, dimmed: !selected,
                    label: id === 29 ? '29 孤岛' : id === 30 ? '30 零质量' : id === 5 ? '5 低谷桥' : String(id),
                    offsetY: -12 });
                ctx.font = '10px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
                ctx.fillStyle = missing ? C.coral : C.bone;
                ctx.fillText(missing && selected ? '向量缺失' : `${inL && view !== 'transfer' ? 'L' : '·'} ${inT && view !== 'local' ? 'T' : '·'}`, p.x, p.y + 18);
                if (id === event.id && show) {
                    ctx.strokeStyle = C.amber; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
                }
            }
            const y = h - 76;
            drawPillTag(ctx, 20, y, 'A 主主题 90% 能量 · B 弱主题 10% 能量 · L/T 独立资格章', C.patina);
            ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.fillStyle = C.bone; ctx.textAlign = 'left';
            ctx.fillText(`SQL 行李池 ${cached.length} 节点 · 本次补读 ${lastLoad} · ${Math.ceil(lastLoad / 128)} 批 · 载荷 ${cached.length * 12} KiB`, 20, h - 45);
            ctx.fillText(`已回放工作：出队 ${event.work.popped} / 发现 ${event.work.discovered} / 扫边 ${event.work.edges}`, 20, h - 23);
            ctx.restore();
            setText('ch6Readout', result.conflict ? '核心预算冲突：4 个骨架不能塞入 K=1，拒绝执行'
                : `共享 K=${k || '不限'} · 回放并集 ${union.length} · 本次补读 ${lastLoad} · ${released ? '已释放' : event.kind === 'finish' ? '探索结束' : '教学回放'}`);
            setText('projectionStory', released ? '所有消费者结束：句柄注销，教学载荷归零；常驻 CSR 不清除。请新建请求再探索。'
                : `${event.message} ${presets[preset].note}`);
            setText('projectionDiagnostics', `最终选点并集 ${result.union.length}（含核心 ${result.core.length}）｜Local ${result.fields[0].selected.length} / ${(result.fields[0].ratio * 100).toFixed(1)}% / ${result.fields[0].reason}｜Transfer ${result.fields[1].selected.length} / ${(result.fields[1].ratio * 100).toFixed(1)}% / ${result.fields[1].reason}。实际跨流域重叠 ${result.overlap}，不是 Betti 数、完整球交叠或流量会师。选点/SQL 数为最终请求结果，地图按事件回放。`);
        });
        return {
            start() { runner.start(); playbackButtons(); }, stop() { runner.stop(); previous = null; },
            setFieldMode(value) { view = value; },
            setProjectionK(value) { k = value; reset(); },
            setProjectionPreset(value) { preset = presets[value] ? value : 'normal'; reset(); },
            projectionReplay() { index = 0; accumulated = 0; previous = null; playing = !reduced; playbackButtons(); },
            projectionStep() { playing = false; index = Math.min(result.events.length - 1, index + 1); playbackButtons(); },
            projectionToggle() { playing = !playing; playbackButtons(); return playing; },
            setPoolAction(action) {
                if (action === 'release') { released = true; cached = []; lastLoad = 0; }
                else if (action === 'fresh') reset();
                else if (!released && !result.conflict) { lastLoad = 0; }
            },
        };
    };
})(window);