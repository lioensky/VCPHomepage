/* RiverMemo V5：原技术页的黎曼双曲教学场景。非生产检索、测地求解或跑分。 */
(function (global) {
    'use strict';
    const { COLORS: C, SceneRunner, drawIndustrialGrid, hexToRgba, lerp } = global.RiverEngine;
    const clip = x => Math.max(0, Math.min(1, x));
    const routeRadius = (g, entropy, depth, rho = 1, layer = 0) => {
        const p0 = clip(.55 * clip(g) * (1 - clip(entropy)) + .30 * clip(depth));
        const p = layer === 0 ? p0 : p0 + .75 * (1 - p0) * (1 - clip(rho) ** .35);
        return .35 + .30 * p;
    };
    const chunkRadius = quantile => .35 + .30 * (1 - clip(quantile)) ** 1.10;
    const softInheritance = cosine => .75 * clip((cosine - .82) / .18);
    function intentCoverage(seeds, contacts) {
        const energy = new Map();
        seeds.forEach(s => { if (s.energy > 0) energy.set(s.id, Math.max(energy.get(s.id) || 0, s.energy)); });
        const total = [...energy.values()].reduce((a, b) => a + b, 0);
        if (!total) return 1;
        const usedTags = new Set(), usedSeeds = new Set();
        let hit = 0;
        contacts.filter(c => energy.has(c.seed) && (c.exact || c.similarity >= .72))
            .slice().sort((a, b) => Number(!!b.exact) - Number(!!a.exact)
                || b.similarity - a.similarity || a.seed - b.seed || a.tag - b.tag)
            .forEach(c => {
                if (usedTags.has(c.tag) || usedSeeds.has(c.seed)) return;
                usedTags.add(c.tag); usedSeeds.add(c.seed); hit += energy.get(c.seed);
            });
        return Math.max(.35, Math.min(1, Math.sqrt(hit / Math.max(.55 * total, ...energy.values()))));
    }
    function scoreCandidate(input = {}) {
        const intent = input.intent ?? 1;
        return { ...global.RiverMemoV4.scoreCandidate({ ...input, support: (input.support || 0) * intent }), intent };
    }
    global.RiverMemoV5 = { routeRadius, chunkRadius, softInheritance, intentCoverage, scoreCandidate };

    function text(ctx, x, y, value, color = C.bone, size = 12, align = 'left') {
        ctx.fillStyle = color;
        ctx.font = `${size}px "Microsoft YaHei", sans-serif`;
        ctx.textAlign = align;
        ctx.fillText(value, x, y);
    }
    function read(id, value) {
        const node = document.getElementById(id);
        if (node && node.textContent !== value) node.textContent = value;
    }
    function line(ctx, points, color, alpha = .5, width = 1) {
        ctx.beginPath();
        points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.strokeStyle = hexToRgba(color, alpha); ctx.lineWidth = width; ctx.stroke();
    }
    function dot(ctx, p, color, radius = 4) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    }
    // 壳层为抽象二维斜投影，不把画面上的欧氏长度冒充黎曼测地距离。
    function shellPoint(position, angle, flat = false) {
        const r = flat ? 150 : 60 + position * 210;
        return { x: 310 + Math.cos(angle) * r, y: 230 + Math.sin(angle) * r * .48 - (flat ? 0 : position * 70) };
    }
    function drawShells(ctx, flat, time, activeRadius) {
        for (let i = 0; i <= 9; i++) {
            const p = i / 9;
            const points = Array.from({ length: 97 }, (_, k) => shellPoint(p, k / 96 * Math.PI * 2, flat));
            line(ctx, points, i === 0 ? C.amber : C.patina, i === 0 ? .65 : .16 + p * .13);
        }
        for (let i = 0; i < 24; i++) {
            const angle = i / 24 * Math.PI * 2;
            line(ctx, Array.from({ length: 30 }, (_, k) => shellPoint(k / 29, angle, flat)), C.patina, .15);
        }
        const q = clip((activeRadius - .35) / .30);
        line(ctx, Array.from({ length: 97 }, (_, k) => shellPoint(q, k / 96 * Math.PI * 2, flat)), C.amber, .8, 2);
        const pulse = shellPoint(q, -time * .7, flat);
        dot(ctx, pulse, C.amber, 6);
        text(ctx, 36, 38, flat ? '平坦余弦 / 缺少径向层次（对照示意）' : 'H_AGS / 径向变曲率黎曼度规', C.amber, 16);
        text(ctx, 36, 62, 'ds² = dR² + φ(R)² dΩ²', C.bone, 14);
        text(ctx, 310, 335, '内壳：泛化干流  →  外壳：特异细节', C.patina, 12, 'center');
        text(ctx, 310, 358, '非零喉部 · 外壳曲率软化 · 非常曲率庞加莱球', C.muted, 11, 'center');
        text(ctx, 36, 410, '曲面、节点与光轨为教学投影；不计算生产测地线或真实召回率。', C.muted, 11);
    }
    function fit(ctx, w, h, draw) {
        const scale = Math.min(w / 960, h / 440);
        ctx.save(); ctx.translate((w - 960 * scale) / 2, (h - 440 * scale) / 2); ctx.scale(scale, scale);
        drawIndustrialGrid(ctx, 960, 440); draw(); ctx.restore();
    }
    const descriptions = {
        tag: 'Tag 场：同代均值轴部分剥离 β=0.7；入度分位与局部锥残差联合定径。构图、2-bit 导航与原件精排共用同一度规。标签名称与位置为教学预设。',
        flat: '平坦对照只说明缺少径向层次：不宣称所有余弦检索都会漏召回。切回双曲场可观察内壳干流与外壳细节的分离。',
        chunk: 'Chunk 场：绝对均值轴对齐度经过 64 点经验分位映射，同模型共享训练代几何。范围 ≤128 时精确评分，否则图导航；SQL 原件精排。两场共享内核，不共享同一径向规则。',
        intent: '多核意图：Hop-0 种子与候选标签一对一认领，只覆盖弱支线会折减标量场支持，不直接乘整个最终分。强同义继承仅作用于标量场势，不能伪造精确身份或拓扑边。',
    };
    global.WaveScenes.createScene_ch11 = function (canvas) {
        let mode = 'tag', playing = true, time = 0, previous = null;
        let reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
            if (previous !== null && playing && !reduced) time += Math.min(.1, Math.max(0, t - previous));
            previous = t;
            const stage = Math.floor(time / 3) % 3;
            const rho = [1, .30, .06][stage];
            const radius = routeRadius(.88, .25, .66, rho, stage);
            read('ch11Readout', `${mode.toUpperCase()} · R_query=${radius.toFixed(3)} · ${reduced ? '减少动态效果' : playing ? '教学回放' : '暂停'}`);
            read('v5GeometryStory', descriptions[mode]);
            fit(ctx, w, h, () => {
                drawShells(ctx, mode === 'flat', time, radius);
                const labels = ['技术', '数据库', '记忆', 'NNLS', 'F-35', 'EPA', '冷门事实', 'Clairaut'];
                labels.forEach((name, i) => {
                    const p = i < 3 ? .12 + i * .09 : .50 + (i - 3) * .10;
                    const angle = -.7 + i * .83;
                    const point = shellPoint(mode === 'chunk' ? (chunkRadius(i / 7) - .35) / .30 : p, angle, mode === 'flat');
                    dot(ctx, point, i < 3 ? C.muted : C.patina, 4);
                    text(ctx, point.x + 8, point.y - 9, mode === 'chunk' ? `Chunk ${i + 1}` : name, C.bone, 11);
                });
                const x = 620;
                text(ctx, x, 45, mode === 'intent' ? '联合读出 / 不让单腿意图刷分' : mode === 'chunk' ? 'Chunk / 全局共享几何' : 'Tag / 残差能量驱动外壳深潜', C.amber, 15);
                if (mode === 'intent') {
                    const seeds = [{ id: 1, energy: .8 }, { id: 2, energy: .2 }];
                    const weak = intentCoverage(seeds, [{ seed: 2, tag: 3, exact: true, similarity: 1 }]);
                    [['只命中弱支线', weak], ['同时覆盖两核', 1]].forEach(([name, value], i) => {
                        const y = 105 + i * 72;
                        text(ctx, x, y, `${name} · I_c = ${value.toFixed(2)}`);
                        ctx.fillStyle = hexToRgba(C.patina, .15); ctx.fillRect(x, y + 14, 285, 12);
                        ctx.fillStyle = i ? C.patina : C.coral; ctx.fillRect(x, y + 14, 285 * value, 12);
                    });
                    text(ctx, x, 267, 'F35 ⇢ F-35 · 示例 cos=0.94', C.patina);
                    text(ctx, x, 293, `缺失精确场势时折现继承 ${softInheritance(.94).toFixed(2)} × 来源场势`);
                    text(ctx, x, 328, '精确场势优先；不替代直接锚身份。', C.muted, 11);
                } else if (mode === 'chunk') {
                    text(ctx, x, 93, 'R = 0.35 + 0.30(1 − q)^1.10', C.patina, 14);
                    [0, .25, .5, .75, 1].forEach((q, i) => {
                        const y = 133 + i * 35;
                        text(ctx, x, y, `对齐度分位 q=${q.toFixed(2)}`, C.muted, 11);
                        ctx.fillStyle = C.patina; ctx.fillRect(x + 150, y - 9, (chunkRadius(q) - .30) * 160, 9);
                        text(ctx, x + 250, y, chunkRadius(q).toFixed(3), C.amber, 11);
                    });
                    text(ctx, x, 332, '实时成员同步 ≠ 每次查询重训全图', C.bone);
                    text(ctx, x, 357, '纯 ANN 展示负距离；V5 基础输入仍为查询余弦。', C.muted, 11);
                } else {
                    [1, .30, .06].forEach((r, i) => {
                        const y = 108 + i * 65;
                        const rr = routeRadius(.88, .25, .66, r, i);
                        text(ctx, x, y, `${i === stage ? '▶' : '·'} L${i}  ρ=${r.toFixed(2)} → R=${rr.toFixed(3)}`, i === stage ? C.amber : C.muted, 14);
                        ctx.fillStyle = hexToRgba(C.patina, .18); ctx.fillRect(x, y + 14, 285, 7);
                        ctx.fillStyle = i === stage ? C.amber : C.patina; ctx.fillRect(x, y + 14, 285 * (rr - .35) / .30, 7);
                    });
                    text(ctx, x, 333, '路由选双曲 Tag 池，NNLS 分解原始 Tag 列。', C.bone, 11);
                    text(ctx, x, 358, 'φ₀=1.5 · κ=2.0 · α=0.15 · R∈[.35,.65]', C.muted, 11);
                }
            });
        });
        return {
            start() { previous = null; runner.start(); },
            stop() { previous = null; runner.stop(); },
            setGeometryMode(value) { mode = descriptions[value] ? value : 'tag'; },
            geometryToggle() { playing = !playing; read('v5GeometryPlay', playing ? 'Ⅱ 暂停' : '▶ 继续'); return playing; },
            geometryReplay() { time = 0; playing = true; read('v5GeometryPlay', 'Ⅱ 暂停'); },
        };
    };

    // 原第四章直接升级，不额外开启一个页面。
    global.WaveScenes.createScene_ch4 = function (canvas) {
        let mode = 'focused';
        const presets = {
            focused: { g: .88, h: .25, d: .66, rho: [1, .30, .06] },
            cross: { g: .76, h: .60, d: .40, rho: [1, .52, .18] },
            ood: { g: .02, h: .95, d: .001, rho: [1, .94, .90] },
        };
        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            const p = presets[mode];
            const radii = p.rho.map((rho, i) => routeRadius(p.g, p.h, p.d, rho, i));
            const stage = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 2 : Math.floor(time / 2.5) % 3;
            read('ch4Readout', `g_Q=${p.g.toFixed(2)} · ρ=[${p.rho.join(', ')}] · R=[${radii.map(r => r.toFixed(3)).join(', ')}]`);
            fit(ctx, w, h, () => {
                drawShells(ctx, false, stage * 2.5, radii[stage]);
                text(ctx, 620, 47, 'EPA 定位 L0 → 残差能量驱动 L1+', C.amber, 15);
                p.rho.forEach((rho, i) => {
                    const y = 104 + i * 75;
                    text(ctx, 620, y, `${i === stage ? '▶' : '·'} L${i} · 输入残差能量比 ρ=${rho.toFixed(2)}`, i === stage ? C.amber : C.bone);
                    text(ctx, 620, y + 25, `双曲池 R=${radii[i].toFixed(3)} → 原 Tag NNLS`, C.patina);
                });
                text(ctx, 620, 347, mode === 'ood' ? '低域内门控不保证相关性；种子仍需通过门控。' : '残差能量越低，路由向特异外壳推进。', C.muted, 11);
                text(ctx, 620, 374, 'ρ 为输入残差能量比，不是本层解释能量。', C.muted, 11);
            });
        });
        return { start: () => runner.start(), stop: () => runner.stop(), setEpaMode: m => { mode = presets[m] ? m : 'focused'; } };
    };
})(window);