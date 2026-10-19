/* RiverMemo v2 教学模型：非原生引擎、非性能基准。 */
(function (global) {
    'use strict';
    const { COLORS: C, SceneRunner, drawIndustrialGrid, drawNodeBadge,
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
            slots = 2, neighborLimit = 3, returnFactor = 1, threshold = 0.2 } = options;
        const staticTop = history.slice(0, neighborLimit);
        const available = enabled && slots > 0 && maxTargets > 0 && sourceLayer < 2;
        const evaluated = available ? history.slice().sort((a, b) => a.id - b.id).slice(0, maxTargets) : [];
        const ids = new Set(evaluated.map(e => e.id));
        const rows = history.map(edge => {
            const resonance = ids.has(edge.id) ? Math.max(0, ...edge.resonance.slice(sourceLayer + 1)) : 0;
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
            evaluated: evaluated.length, budgetExhausted: available && evaluated.length < history.length };
    }
    const localMass = [0.34, 0.24, 0.16, 0.10, 0.05, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01];
    const transferMass = [0.14, 0.08, 0.07, 0.06, 0.20, 0.17, 0.11, 0.07, 0.04, 0.03, 0.02, 0.01];
    function selectField(masses, eta, k) {
        const sorted = masses.map((mass, id) => ({ id: id + 1, mass }))
            .sort((a, b) => b.mass - a.mass || a.id - b.id);
        const total = masses.reduce((a, b) => a + b, 0);
        let sum = 0;
        const domain = [];
        for (const node of sorted) {
            domain.push(node);
            sum += node.mass;
            if (sum >= total * eta - 1e-12) break;
        }
        const selected = k === 0 ? domain : domain.slice(0, k);
        return { domain, selected, ratio: selected.reduce((a, n) => a + n.mass, 0) / total };
    }
    function evaluateProjection(k, cached = []) {
        if (!Number.isInteger(k) || k < 0) throw new Error('预算必须为非负整数');
        const local = selectField(localMass, 0.8, k);
        const transfer = selectField(transferMass, 0.9, k);
        const union = [...new Set([...local.selected, ...transfer.selected].map(n => n.id))].sort((a, b) => a - b);
        const missing = union.filter(id => !cached.includes(id));
        return { local, transfer, union, missing, batches: Math.ceil(missing.length / 128) };
    }
    global.RiverMemoV2 = { evaluateWormholes, evaluateProjection };
    const wormPresets = {
        rescue: { story: 'D、E 原本排在静态 Top-3 之外。深层残差点亮旧桥：先拿动态席位，再用 A 补齐，总名额仍是 3。' },
        weak: { energy: 0.10, story: '投缘不等于通电！共鸣候选仍存在，但电流 = 源能量 × 历史导电率 × 0.70，低于 0.01 就不能拿动态席位。静态路线仍独立检查。' },
        last: { sourceLayer: 2, story: '来源已经是最后一层，没有更深层残差支援。传播继承来源层，不会重新运行金字塔；单层分析也不会产生动态支持。' },
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
            text('ch5Readout', `Hop 0/4 · 教学单源选边 · 候选 ${result.candidates} → 入选 ${result.selected} → 动态注入 ${result.fired} · 尾部提升 ${result.promoted}`);
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
            drawNodeBadge(ctx, src, { color: C.amber, radius: 10, label: preset === 'last' ? '来源 L2' : '来源 L0',
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
            const step = Math.min(3, Math.floor(((t - epoch) % 12) / 3));
            text('ch6Readout', `教学 K=${k === 0 ? '不限量' : k} · Local ${result.local.selected.length} / Transfer ${result.transfer.selected.length} · 去重 ${result.union.length} · 本次补读 ${lastLoad}`);
            text('projectionStory', released
                ? '所有消费者结束：句柄注销，教学载荷归零，常驻 CSR 仍在。新请求必须新建上下文，不复用旧请求结果。'
                : `${['① 全图标量水位先算完', '② 两场在各自质量域内独立选前 K', '③ 两张名单合并去重，只补读差集', '④ 各场只投影自己的乘客，绝不串场'][step]}。Local 选点质量 ${(result.local.ratio * 100).toFixed(0)}%，Transfer ${(result.transfer.ratio * 100).toFixed(0)}%；本例向量均有效。K=0 仍只在质量域内选点。`);
            drawPillTag(ctx, 18, 24, '标量水位保留 / 高维行李按需读', C.patina);
            const idsL = new Set(result.local.selected.map(n => n.id));
            const idsT = new Set(result.transfer.selected.map(n => n.id));
            const domainL = new Set(result.local.domain.map(n => n.id));
            const domainT = new Set(result.transfer.domain.map(n => n.id));
            const left = 36, gap = (w - 72) / 12;
            [0, 1].forEach(row => {
                if (mode === 'local' && row === 1 || mode === 'transfer' && row === 0) return;
                const masses = row ? transferMass : localMass;
                const domain = row ? domainT : domainL;
                const chosen = row ? idsT : idsL;
                const y = row ? h * 0.59 : h * 0.32;
                const col = row ? C.amber : C.patina;
                drawPillTag(ctx, 18, y - 52, row ? '迁移场 / 90% 质量域' : '局部场 / 80% 质量域', col);
                masses.forEach((mass, i) => {
                    const id = i + 1, x = left + gap * (i + 0.5);
                    ctx.fillStyle = domain.has(id) ? col : C.dim;
                    ctx.globalAlpha = chosen.has(id) ? 1 : 0.35;
                    ctx.fillRect(x - gap * 0.27, y - mass * 95, gap * 0.54, mass * 95 + 3);
                    ctx.globalAlpha = 1;
                    drawNodeBadge(ctx, { x, y: y + 18 }, { color: col, radius: chosen.has(id) ? 6 : 3,
                        dimmed: !chosen.has(id), label: `${id}`, offsetY: 21 });
                    if (chosen.has(id) && !released && step >= 2) {
                        const p = ((t - epoch) * 0.65 + i * 0.13) % 1;
                        ctx.fillStyle = col;
                        ctx.beginPath(); ctx.arc(x, lerp(y + 29, h - 58, p), 2, 0, Math.PI * 2); ctx.fill();
                    }
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