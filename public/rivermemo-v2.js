/* RiverMemo V3 虫洞教学模型；保留历史文件名与全局接口，非原生引擎、非性能基准。 */
(function (global) {
    'use strict';
    const { COLORS: C, SceneRunner, drawIndustrialGrid, drawNodeBadge, drawVectorArrow,
        drawPillTag, RiverPath, lerp } = global.RiverEngine;
    function text(id, value) {
        const el = document.getElementById(id);
        if (el && el.textContent !== value) el.textContent = value;
    }
    const history = [
        { id: 1, name: '主航道 A', weight: 0.30, resonance: [0.9, 0.10, 0.08] },
        { id: 2, name: '静态虫洞 B', weight: 0.24, resonance: [0.8, 0.12, 0.10], staticWorm: true },
        { id: 3, name: '老航道 C', weight: 0.17, resonance: [0.7, 0.15, 0.09] },
        { id: 4, name: '尾部小桥 D', weight: 0.08, resonance: [0.1, 0.92, 0.65] },
        { id: 5, name: '尾部小桥 E', weight: 0.04, resonance: [0.1, 0.50, 0.89] },
        { id: 6, name: '细线小桥 F', weight: 0.006, resonance: [0.1, 0.99, 0.98] },
    ];
    function evaluateWormholes(options = {}) {
        const { enabled = true, sourceLayer = 0, energy = 1, maxTargets = 4096,
            slots = 2, neighborLimit = 3, returnFactor = 1, threshold = 0.2,
            acceptedLayers = 3, tailEnergyRatio = 0, tailEnergy = tailEnergyRatio } = options;
        const tailAppended = enabled && acceptedLayers > 0 && Number.isFinite(tailEnergy)
            && tailEnergy > 1e-12 && Number.isFinite(tailEnergyRatio) && tailEnergyRatio >= 0.02;
        const routingResidualCount = enabled ? acceptedLayers + Number(tailAppended) : 0;
        const staticTop = history.slice(0, neighborLimit);
        const available = enabled && slots > 0 && maxTargets > 0 && sourceLayer + 1 < routingResidualCount;
        const evaluated = available ? history.slice().sort((a, b) => a.id - b.id).slice(0, maxTargets) : [];
        const ids = new Set(evaluated.map(e => e.id));
        const rows = history.map(edge => {
            // 预设余弦仅表示路由输入的教学测量，不执行真实高维正交消元。
            const resonance = ids.has(edge.id)
                ? Math.max(0, ...edge.resonance.slice(sourceLayer + 1, routingResidualCount)) : 0;
            const current = energy * edge.weight * 0.70 * returnFactor;
            return { ...edge, resonance, current, score: edge.weight * resonance ** 4,
                candidate: ids.has(edge.id) && resonance >= threshold,
                evaluated: ids.has(edge.id) };
        });
        const dynamic = rows.filter(e => e.candidate && e.current >= 0.01)
            .sort((a, b) => b.score - a.score || b.weight - a.weight || a.id - b.id)
            .slice(0, Math.min(slots, neighborLimit));
        const chosen = new Set(dynamic.map(e => e.id));
        const selected = [...dynamic, ...rows.filter(e => !chosen.has(e.id))
            .slice(0, Math.max(0, neighborLimit - dynamic.length))];
        const dynamicIds = new Set(dynamic.map(e => e.id));
        const selectedIds = new Set(selected.map(e => e.id));
        rows.forEach(e => {
            e.dynamic = dynamicIds.has(e.id);
            e.selected = selectedIds.has(e.id);
            e.injectedCurrent = energy * e.weight * (e.dynamic || e.staticWorm ? 0.70 : 0.25) * returnFactor;
            e.fired = e.selected && e.injectedCurrent >= 0.01;
        });
        return { rows, candidates: rows.filter(e => e.candidate).length,
            selected: dynamic.length, fired: rows.filter(e => e.dynamic && e.fired).length,
            promoted: dynamic.filter(e => !staticTop.some(s => s.id === e.id)).length,
            evaluated: evaluated.length, budgetExhausted: available && evaluated.length < history.length,
            routingResidualCount, tailAppended };
    }
    const localMass = [0.25, 0.18, 0.12, 0.10, 0.07, 0.05, 0.04, 0.03, 0.02, 0.02, 0.12, 0];
    const transferMass = [0.12, 0.06, 0.05, 0.05, 0.18, 0.16, 0.12, 0.08, 0.03, 0.03, 0.12, 0];
    // 教学核心只有 1 个节点，使所有 K>=1 示例均能完整锁定骨架。
    const projectionCore = [1];
    const links = [[1,2], [1,5], [2,3], [2,4], [3,4], [4,6],
        [5,6], [5,7], [6,7], [6,8], [7,8], [8,9], [9,10], [8,12]];
    // 每个方向均为独立存在的真实教学边；不将单向边自动视作可逆。
    const projectionEdges = links.flatMap(([a,b]) => [{ a,b,weight:0.1 }, { a:b,b:a,weight:0.08 }]);
    function growField(masses, eta, k, core = projectionCore, edges = projectionEdges) {
        const total = masses.reduce((a,b) => a + b, 0);
        const selected = [], seen = new Set(), frontier = new Map();
        const limit = k === 0 ? Infinity : k;
        function expose(id) {
            edges.filter(e => e.a === id && e.weight > 0).forEach(e => {
                if (!seen.has(e.b) && masses[e.b - 1] > 0 && !frontier.has(e.b))
                    frontier.set(e.b, id);
            });
        }
        for (const id of core) {
            if (selected.length >= limit) break;
            if (masses[id - 1] > 0 && !seen.has(id)) {
                selected.push({ id, mass: masses[id - 1], parent: null });
                seen.add(id);
            }
        }
        selected.forEach(n => expose(n.id));
        let sum = selected.reduce((a,n) => a + n.mass, 0);
        while (sum < eta * total - 1e-12 && selected.length < limit && frontier.size) {
            const id = [...frontier.keys()].sort((a,b) => masses[b-1] - masses[a-1] || a-b)[0];
            const parent = frontier.get(id);
            frontier.delete(id);
            seen.add(id);
            selected.push({ id, mass: masses[id-1], parent });
            sum += masses[id-1];
            expose(id);
        }
        const reason = sum >= eta * total - 1e-12 ? '质量达标'
            : selected.length >= limit ? '预算用尽' : '前沿耗尽';
        return { selected, ratio: total ? sum / total : 0, reason,
            frontier: [...frontier.keys()], target: eta };
    }
    function evaluateProjection(k, cached = []) {
        if (!Number.isInteger(k) || k < 0) throw new Error('预算必须为非负整数');
        const local = growField(localMass, 0.8, k);
        const transfer = growField(transferMass, 0.9, k);
        const union = [...new Set([...local.selected, ...transfer.selected].map(n => n.id))].sort((a, b) => a - b);
        const missing = union.filter(id => !cached.includes(id));
        return { local, transfer, union, missing, batches: Math.ceil(missing.length / 128) };
    }
    global.RiverMemoV2 = { evaluateWormholes, evaluateProjection, growField, projectionEdges, projectionCore };
    const wormPresets = {
        rescue: { story: 'D、E 原本排在静态 Top-3 之外。深层残差点亮旧桥：先拿动态席位，再用 A 补齐，总名额仍是 3。' },
        weak: { energy: 0.10, story: '投缘不等于通电！共鸣候选仍存在，但电流 = 源能量 × 历史导电率 × 0.70，低于 0.01 就不能拿动态席位。静态路线仍独立检查。' },
        last: { sourceLayer: 0, acceptedLayers: 1, story: '只接受 L0，且没有满足追加条件的尾残差：路由输入仅 1 个，来源层后没有可用输入，动态席位无法激活。' },
        tail: { sourceLayer: 0, acceptedLayers: 1, tailEnergyRatio: 0.08, story: '只接受 L0，但尾残差能量比例 8% 达到 2% 门槛：路由输入变为 2 个，尾部可支持选边。它不新增种子层、不改解释能量，也不保证注入。' },
        budget: { maxTargets: 3, story: '教学预算缩小为 3：按图内索引确定性评估 A、B、C；D、E、F 跳过动态判定。静态路线照走，不是假装已覆盖所有邻居。' },
        off: { enabled: false, story: '关闭的是动态调度，不是历史河道。A、B、C 按静态顺序入选，已有静态虫洞 B 仍可通电。' },
    };
    global.WaveScenes.createScene_ch5 = function (canvas) {
        let preset = 'rescue', view = 'river', epoch = null, paused = false, frozenAge = 0;
        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            ctx.save();
            const scale = Math.min(1, w / 580);
            ctx.scale(scale, scale);
            w /= scale;
            h /= scale;
            if (epoch === null) epoch = t;
            const age = paused ? frozenAge : (t - epoch) % 10;
            frozenAge = age;
            const phase = Math.min(3, Math.floor(age / 2));
            const result = evaluateWormholes(wormPresets[preset]);
            drawIndustrialGrid(ctx, w, h);
            text('ch5Readout', `Hop 0/4 · 路由残差 ${result.routingResidualCount} · 尾部${result.tailAppended ? '已追加' : '未追加'} · 候选 ${result.candidates} → 入选 ${result.selected} → 注入 ${result.fired}`);
            text('wormholeStory', `${['① 深层残差扫描旧桥', '② 共鸣达标，还要验电流', '③ 两席动态优先，静态补齐', '④ 只把成功注入画进河网'][phase]}。${wormPresets[preset].story} 计数为本轮单源事件，不是准确率。`);
            const sx = w * 0.13, tx = w * 0.43;
            const src = { x: sx, y: h * 0.51 };
            drawPillTag(ctx, 18, 23, '历史桥不变 / 临时通行证', C.amber);
            drawPillTag(ctx, w - 18, 23, `评估 ${result.evaluated}/6${result.budgetExhausted ? ' · 预算耗尽' : ''}`, C.patina, 'right');
            result.rows.forEach((e, i) => {
                const y = 67 + i * (h - 108) / 6;
                const dst = { x: tx, y };
                const visible = view === 'all' || phase < 3 || e.fired;
                const col = e.dynamic ? C.amber : e.staticWorm ? C.coral : C.patina;
                if (visible) {
                    const path = new RiverPath(src, { x: sx + 60, y: src.y },
                        { x: tx - 60, y }, dst,
                        { color: col, width: e.fired && phase >= 2 ? 3 : 1,
                            opacity: phase >= 2 && !e.fired ? 0.18 : 0.65,
                            dashed: !e.selected || phase < 2 ? [4, 5] : null });
                    path.draw(ctx);
                    if (phase >= 2 && e.fired) {
                        const p = path.sample((age * 0.65 + i * 0.17) % 1);
                        ctx.fillStyle = col;
                        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
                    }
                }
                drawNodeBadge(ctx, dst, { color: col, radius: 5, label: e.name,
                    offsetY: -10, dimmed: phase >= 2 && !e.fired });
                ctx.font = '11px "Microsoft YaHei", sans-serif';
                ctx.fillStyle = e.dynamic ? C.amber : C.bone;
                ctx.textAlign = 'left';
                const status = !e.evaluated ? '未动态评估' : e.candidate && e.current < 0.01 ? '电流不足'
                    : e.dynamic ? '动态席位 ✓' : e.selected ? '静态补齐 ✓' : '未获席位';
                ctx.fillText(`P=${e.weight.toFixed(3)}  共鸣=${e.resonance.toFixed(2)}`, w * 0.55, y - 8);
                ctx.fillText(`I=${e.current.toFixed(4)}  ${status}`, w * 0.55, y + 9);
            });
            drawNodeBadge(ctx, src, { color: C.amber, radius: 10, label: '来源 L0',
                sub: `能量 ${preset === 'weak' ? '0.10' : '1.00'}` });
            drawPillTag(ctx, 18, h - 24, '排名 P × 共鸣⁴ ≠ 注入电流 · 不加能量', C.amber);
            ctx.restore();
        });
        return { start: () => runner.start(), stop: () => runner.stop(),
            setWormPreset(key) { preset = wormPresets[key] ? key : 'rescue'; epoch = null; paused = false; },
            setViewMode(mode) { view = mode; },
            trigger() { epoch = null; frozenAge = 0; paused = false; },
            togglePause() { paused = !paused; return paused; } };
    };
    global.WaveScenes.createScene_ch6 = function (canvas) {
        let k = 3, mode = 'both', cached = [1, 2], released = false, lastLoad = 0, epoch = null;
        let result;
        function load() {
            result = evaluateProjection(k, cached);
            lastLoad = result.missing.length;
            cached = [...new Set([...cached, ...result.union])];
        }
        load();
        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            ctx.save();
            const scale = Math.min(1, w / 580);
            ctx.scale(scale, scale);
            w /= scale;
            h /= scale;
            if (epoch === null) epoch = t;
            drawIndustrialGrid(ctx, w, h);
            const age = (t - epoch) % 14;
            text('ch6Readout', `区域生长 K=${k === 0 ? '不限量' : k} · L ${result.local.selected.length} / T ${result.transfer.selected.length} · 去重 ${result.union.length} · 本次补读 ${lastLoad}`);
            text('projectionStory', released
                ? '所有消费者结束：句柄注销，教学载荷归零，常驻 CSR 仍在。新请求必须新建上下文，不复用旧请求结果。'
                : `核心 1 先锁定，两场沿正权重出边各自扩张：Local ${(result.local.ratio*100).toFixed(0)}% / ${result.local.reason}；Transfer ${(result.transfer.ratio*100).toFixed(0)}% / ${result.transfer.reason}。孤岛 11 质量虽高也不能跳入，12 质量为零不占位；K=0 不取消连通约束。教学图每对箭头均有独立历史边，支持集内可沿边回到核心。`);
            drawPillTag(ctx, 18, 22, '沿河铺路 / 核心 → 前沿 → 连通区域', C.patina);
            const positions = [[.10,.5],[.26,.25],[.43,.14],[.43,.45],[.26,.78],[.57,.65],
                [.43,.90],[.72,.65],[.85,.40],[.85,.82],[.73,.13],[.70,.94]];
            [0, 1].forEach(row => {
                if (mode === 'local' && row === 1 || mode === 'transfer' && row === 0) return;
                const field = row ? result.transfer : result.local;
                const masses = row ? transferMass : localMass;
                const col = row ? C.amber : C.patina;
                const top = 65 + row * (h - 165) / 2;
                const height = (h - 200) / 2;
                const points = positions.map(([x,y]) => ({ x: 20 + x*(w-50), y: top + y*height }));
                const count = released ? 0 : Math.min(field.selected.length, 1 + Math.floor(age / .8));
                const visible = field.selected.slice(0,count);
                const chosen = new Set(visible.map(n => n.id));
                const frontier = new Set(projectionEdges.filter(e => chosen.has(e.a) && !chosen.has(e.b)
                    && masses[e.b-1] > 0 && e.weight > 0).map(e => e.b));
                drawPillTag(ctx, 18, top - 14, `${row ? 'Transfer 90%' : 'Local 80%'} · ${field.reason}`, col);
                projectionEdges.forEach(e => {
                    const active = chosen.has(e.a) && chosen.has(e.b);
                    drawVectorArrow(ctx, points[e.a-1], points[e.b-1],
                        { color: col, alpha: active ? .65 : .12, width: active ? 1.8 : 1, arrowAt:.65, head:4 });
                });
                points.forEach((p,i) => {
                    const id = i+1, isCore = id === 1;
                    drawNodeBadge(ctx, p, { color: id >= 11 ? C.coral : col,
                        radius: isCore ? 8 : chosen.has(id) ? 6 : 4,
                        dimmed: !chosen.has(id) && !frontier.has(id),
                        label: id === 11 ? '11 孤岛' : id === 12 ? '12 零质量' : isCore ? '1 核心' : `${id}`,
                        offsetY:-10, sub: `${(masses[i]*100).toFixed(0)}%` });
                    if (frontier.has(id)) {
                        ctx.strokeStyle = col; ctx.setLineDash([2,3]);
                        ctx.beginPath(); ctx.arc(p.x,p.y,11,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
                    }
                });
                visible.filter(n => n.parent !== null).forEach(n => {
                    const a = points[n.parent-1], b = points[n.id-1], pulse = (age*.6) % 1;
                    ctx.fillStyle = col; ctx.beginPath();
                    ctx.arc(lerp(a.x,b.x,pulse),lerp(a.y,b.y,pulse),2.5,0,Math.PI*2); ctx.fill();
                });
            });
            ctx.fillStyle = '#171C20';
            ctx.fillRect(14, h - 72, w - 28, 58);
            drawPillTag(ctx, 24, h - 53, released ? '请求向量池 / 已释放' : '请求向量池 / FP32 共享行李', C.amber);
            ctx.fillStyle = C.bone;
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`池内 ${cached.length} 节点 · 载荷 ${(cached.length * 3072 * 4 / 1024).toFixed(0)} KiB · 本次 SQL ${Math.ceil(lastLoad / 128)} 批`, 24, h - 28);
            ctx.restore();
        });
        return { start: () => runner.start(), stop: () => runner.stop(),
            setFieldMode(value) { mode = value; },
            setProjectionK(value) {
                k = value; released = false; cached = [1, 2]; load(); epoch = null;
                document.querySelectorAll('[data-pool-action]').forEach(button => {
                    const active = button.dataset.poolAction === 'fresh';
                    button.classList.toggle('active', active);
                    button.setAttribute('aria-pressed', String(active));
                });
            },
            setPoolAction(action) {
                if (action === 'release') { cached = []; lastLoad = 0; released = true; }
                else if (action === 'fresh') { cached = [1, 2]; released = false; load(); epoch = null; }
                else if (!released) load();
                else {
                    document.querySelectorAll('[data-pool-action]').forEach(button => {
                        const active = button.dataset.poolAction === 'release';
                        button.classList.toggle('active', active);
                        button.setAttribute('aria-pressed', String(active));
                    });
                }
            } };
    };
})(window);