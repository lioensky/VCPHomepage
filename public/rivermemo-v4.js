/* ==========================================================================
   rivermemo-v4.js
   RiverMemo V4 教学模型：原 Tag 非负锥、查询种差校准与连续统一读出泛函。
   全部数值为教学预设，不连接生产 Rust 引擎，也不代表检索质量或实测性能。
   ========================================================================== */
(function (global) {
    'use strict';

    const RE = global.RiverEngine;
    const { COLORS: C, hexToRgba, clamp, lerp, drawIndustrialGrid, drawPillTag, SceneRunner } = RE;

    // ---------------------------------------------------------------------
    // 1. 小型线性代数（教学用：3 维、≤4 列）
    // ---------------------------------------------------------------------
    const clip = x => Math.min(1, Math.max(0, x));
    const smooth = x => { const v = clip(x); return v * v * (3 - 2 * v); };
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const norm = a => Math.sqrt(dot(a, a));
    const unit = a => { const n = norm(a); return a.map(v => v / n); };
    const sub = (a, b) => a.map((v, i) => v - b[i]);

    function solveLinear(matrix, rhs) {
        const n = rhs.length;
        const m = matrix.map((row, i) => [...row, rhs[i]]);
        for (let col = 0; col < n; col++) {
            let pivot = col;
            for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
            if (Math.abs(m[pivot][col]) < 1e-12) return null;
            [m[col], m[pivot]] = [m[pivot], m[col]];
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const f = m[r][col] / m[col][col];
                for (let k = col; k <= n; k++) m[r][k] -= f * m[col][k];
            }
        }
        return m.map((row, i) => row[n] / row[i]);
    }

    function leastSquares(cols, target, subset) {
        const gram = subset.map(i => subset.map(j => dot(cols[i], cols[j])));
        const rhs = subset.map(i => dot(cols[i], target));
        return solveLinear(gram, rhs);
    }

    function reconstruct(cols, x) {
        const out = new Array(cols[0] ? cols[0].length : 0).fill(0);
        cols.forEach((c, i) => c.forEach((v, k) => { out[k] += x[i] * v; }));
        return out;
    }

    /**
     * 非负最小二乘：教学版枚举被动集（列数极少时与主动集解一致）。
     * 生产实现为 QR 小核 + 主动集 / SVD，不构造正规方程；此处仅用于演示几何。
     */
    function nnls(cols, target) {
        const n = cols.length;
        let best = { x: new Array(n).fill(0), residual: norm(target) };
        for (let mask = 1; mask < (1 << n); mask++) {
            const subset = [];
            for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(i);
            const xs = leastSquares(cols, target, subset);
            if (!xs || xs.some(v => v < -1e-12)) continue;
            const x = new Array(n).fill(0);
            subset.forEach((idx, k) => { x[idx] = Math.max(0, xs[k]); });
            const r = norm(sub(target, reconstruct(cols, x)));
            if (r < best.residual - 1e-12) best = { x, residual: r };
        }
        const fit = n ? reconstruct(cols, best.x) : target.map(() => 0);
        const res = sub(target, fit);
        const grad = cols.map(c => dot(c, res));
        const kkt = {
            nonneg: best.x.every(v => v >= 0),
            dual: Math.max(0, ...grad.map((g, i) => best.x[i] > 1e-12 ? Math.abs(g) : Math.max(0, g))),
            complementarity: Math.max(0, ...best.x.map((v, i) => Math.abs(v * grad[i]))),
            energy: Math.abs(dot(target, target) - dot(fit, fit) - dot(res, res)),
        };
        return { x: best.x, residual: best.residual, fit, res, grad, kkt };
    }

    function unconstrained(cols, target) {
        if (!cols.length) return { x: [], residual: norm(target), fit: target.map(() => 0) };
        const x = leastSquares(cols, target, cols.map((_, i) => i));
        if (!x) return null;
        const fit = reconstruct(cols, x);
        return { x, residual: norm(sub(target, fit)), fit };
    }

    const anchorGain = r => clamp(0.75 + 1.25 * r, 0.5, 2.0);

    // 教学夹具：目标 Tag 的一部分语义“低于河床”，任何顺流支流都无法正向解释。
    const coneColumns = [
        { name: 'OneRing', v: unit([1, 0.25, 0.08]), color: C.patina },
        { name: 'SQLite', v: unit([0.2, 1, 0.1]), color: C.amber },
        { name: 'IPC', v: unit([0.15, 0.1, 1]), color: C.mint },
    ];
    const coneTarget = unit([0.66, 0.6, -0.3]);

    function coneStep(k) {
        const cols = coneColumns.slice(0, k).map(c => c.v);
        const cone = nnls(cols, coneTarget);
        const free = unconstrained(cols, coneTarget);
        return { k, cone, free, gain: anchorGain(cone.residual) };
    }

    // ---------------------------------------------------------------------
    // 2. V4 连续统一读出泛函
    // ---------------------------------------------------------------------
    const C_T = 0.08;

    function branchCoverage(node, edge, atomic = false, hasEdges = true) {
        const nodes = clip(node / 0.35), edges = clip(edge / 0.20);
        return { nodes, edges, combined: atomic ? nodes : hasEdges ? 0.70 * edges + 0.30 * nodes : 0.35 * nodes };
    }

    /** 有界互补算子：对称、幂等地从原始证据重算，单项为零时保留另一项，结果不超过 c。 */
    function complement(g, t, c = C_T) {
        if (!(c > 0)) return 0;
        const a = clip(g / c), b = clip(t / c);
        return c * (1 - (1 - a) * (1 - b));
    }

    function calibrateQuery(query, perp, confidence) {
        const mix = perp === null || perp === undefined ? 0 : 0.5 * clip(confidence);
        return { mix, value: (1 - mix) * clip(query) + mix * clip(perp ?? 0) };
    }

    function scoreCandidate(input = {}) {
        const {
            query = 0.7, perp = null, differentia = 0,
            field = query, fieldWeight = 0.3, support = 0,
            pathQuality = 0, scalarPath = 0, graphScore = 0,
            nodeCoverage = 0, edgeCoverage = 0, closure = 0, alignment = 0, direction = 0,
            hasEdges = true, atomic = false, precision = 1,
            omega = 0, gamma = 1, transport = 0, budget = C_T,
            anchorStrength = 0, implicitOnly = false,
        } = input;
        const calibrated = calibrateQuery(query, perp, differentia);
        const qHat = calibrated.value;
        const resonance = Math.min(Math.min(0.03, clip(fieldWeight) * Math.max(0, field - qHat)) * clip(support), 1 - qHat);
        const base = qHat + resonance;
        const gate = Math.pow(clip(omega), gamma);
        const branch = branchCoverage(nodeCoverage, edgeCoverage, atomic, hasEdges);
        const confidence = Math.sqrt(branch.combined * clip(closure) * clip(alignment));
        const pathRaw = Math.min(budget, budget * clip(0.625 * pathQuality + 0.375 * scalarPath)
            * Math.sqrt(clip(pathQuality / 0.15) * clip(query)));
        const path = pathRaw * gate;
        const graphSelf = Math.min(budget, budget * clip(graphScore) * confidence
            * (hasEdges ? 0.25 + 0.75 * clip(direction) : 0.25) * clip(precision));
        const graphRequested = graphSelf * gate;
        const transportRequested = Math.min(budget, budget * clip(transport));
        const merged = complement(graphRequested, transportRequested, budget);
        const graph = Math.min(merged, Math.max(0, budget - path));
        const strength = implicitOnly ? Math.min(0.035, anchorStrength) : anchorStrength;
        const anchor = 0.10 * smooth((strength - 0.05) / 0.15);
        const sum = base + path + graph + anchor;
        const score = clip(sum);
        return {
            queryHat: qHat, mix: calibrated.mix, base, resonance, gate,
            pathRaw, path, graphSelf, graphRequested, transportRequested, merged,
            overflow: Math.max(0, merged - graph), graph, anchor,
            score, rankingScore: score, finalScore: score, clipping: sum - score, branch, confidence,
        };
    }

    function rank(items) {
        return items.map((item, index) => ({ ...item, index, result: scoreCandidate(item.input) }))
            .sort((a, b) => b.result.rankingScore - a.result.rankingScore || a.index - b.index);
    }

    // ---------------------------------------------------------------------
    // 3. 传输证据：普通 Hop-1 代理与跨文件联合见证虫洞（XW）
    // ---------------------------------------------------------------------
    function specificity(obs, source) {
        const inbound = obs.inbound?.[source];
        if (!Number.isFinite(inbound) || !(obs.maxInbound > 0)) return null;
        return 1 - Math.sqrt(clip(inbound / obs.maxInbound));
    }

    function gateWitness(files, source, target, focuses, options = {}) {
        if (files.length > 128 || files.some(f => f.tags.length > 128)) return null;
        const joint = files.filter(f => f.tags.includes(source) && f.tags.includes(target))
            .sort((a, b) => a.id - b.id);
        const others = focuses.filter(t => t !== source && t !== target);
        const single = focuses.length === 1 && focuses[0] === source
            && (options.differentia > 0 || (options.specificity ?? -1) >= 0.65);
        for (let i = 0; i < joint.length; i++) for (let j = i + 1; j < joint.length; j++) {
            const a = joint[i], b = joint[j];
            if (!a.checksum || !b.checksum || a.checksum === b.checksum) continue;
            const third = a.tags.filter(t => b.tags.includes(t) && t !== source && t !== target && !focuses.includes(t))
                .sort((x, y) => x - y)[0];
            const focus = others.filter(t => a.tags.includes(t) || b.tags.includes(t)).sort((x, y) => x - y)[0];
            if (third !== undefined && (focus !== undefined || single)) {
                return { files: [a.id, b.id], third, focus: focus ?? null, singleFocus: focus === undefined };
            }
        }
        return null;
    }

    function hop1Evidence(obs, candidate) {
        if (!obs.complete) return 0;
        const gate = Math.pow(clip(obs.omega), obs.gamma ?? 1);
        let best = 0;
        for (const e of obs.edges || []) {
            const ok = !e.wormhole && !e.returning && e.flow > 0 && obs.focuses.includes(e.source)
                && obs.hop?.[e.target] === 1 && e.P > 0 && e.P >= 0.5 * e.rowMax
                && candidate.tags.includes(e.target);
            if (!ok) continue;
            best = Math.max(best, e.P / e.rowSum * Math.max(0, candidate.cos?.[e.target] ?? 0) * gate);
        }
        return best;
    }

    function xwEvidence(obs, candidate) {
        const traces = [];
        if (!obs.complete || !(obs.omega > 0)) return { value: 0, traces };
        const gate = Math.pow(clip(obs.omega), obs.gamma ?? 1);
        let best = 0;
        for (const r of obs.routes || []) {
            const real = r.flow > 0 && r.source !== r.target && !r.returning && r.csr;
            const rho = obs.maxFlow > 0 ? r.flow / obs.maxFlow : 0;
            const witness = real ? gateWitness(obs.files, r.source, r.target, obs.focuses, {
                differentia: obs.differentiaConfidence, specificity: specificity(obs, r.source),
            }) : null;
            const strong = Boolean(real && witness && obs.focuses.includes(r.source) && rho >= 0.5);
            const tagSim = candidate.tags.includes(r.target) ? 1 : (candidate.tagSim?.[r.target] ?? 0);
            const grounded = strong && (candidate.cos?.[r.target] ?? 0) > 0 && tagSim > 0.48 && candidate.bodyPositive;
            const value = grounded ? rho * clip(candidate.cos[r.target]) * gate : 0;
            best = Math.max(best, value);
            traces.push({ real, rho, witness, strong, grounded, value });
        }
        return { value: best, traces };
    }

    function transportEvidence(obs, candidate) {
        const hop1 = hop1Evidence(obs, candidate);
        const xw = xwEvidence(obs, candidate);
        return { hop1, xw: xw.value, traces: xw.traces, value: Math.max(hop1, xw.value) };
    }

    function makeObservation(overrides = {}) {
        return {
            complete: true, omega: 0.78, gamma: 1, focuses: [1, 4],
            hop: { 1: 0, 3: 1, 2: 2 }, maxFlow: 0.14,
            edges: [{ source: 1, target: 3, P: 0.32, rowSum: 0.80, rowMax: 0.40, flow: 0.11 }],
            routes: [],
            files: [
                { id: 1, checksum: 'a1', tags: [1, 2, 6, 4] },
                { id: 2, checksum: 'b2', tags: [1, 2, 6, 5] },
            ],
            inbound: { 1: 3 }, maxInbound: 40, differentiaConfidence: 0,
            ...overrides,
        };
    }

    const focusCandidate = { tags: [2, 3, 7], cos: { 2: 0.90, 3: 0.71 }, tagSim: {}, bodyPositive: true };
    const sharedEvidence = {
        query: 0.72, field: 0.86, fieldWeight: 0.30, support: 0.90,
        pathQuality: 0.42, scalarPath: 0.35, graphScore: 0.85,
        nodeCoverage: 0.35, edgeCoverage: 0.20, closure: 0.90, alignment: 0.90, direction: 0.90,
        anchorStrength: 0.16,
    };
    const route = { source: 1, target: 2, flow: 0.12, csr: true, returning: false };

    const TABS = {
        ledger: {
            title: '完整账本', badge: '一张账页 · 四项同源',
            metaphor: '三股来水都先过 Ω 潮汐闸，再注入同一座容量为 C_T 的水闸：路径先落底，图与传输按互补律合流，满了就从闸顶溢出，溢出的水不入账。',
            obs: () => makeObservation(),
        },
        omega: {
            title: 'Ω 退潮', badge: '河网未成形 · 同步退潮',
            metaphor: '河网观测稀疏时 Ω 像退潮：闸门只开一道缝，路径与图一起变浅（V3 中路径不受 Ω 影响，V4 已统一门控）；直接锚走独立快线，水位不变。',
            obs: () => makeObservation({ omega: 0.15 }), ghostOmega: 0.78,
        },
        transport: {
            title: '跨文件见证', badge: 'X 型交叉见证 · 准入',
            metaphor: '两份内容不同的日记同时写到路线两端，还共享第三个标签——像两位互不抄袭的证人指认同一座桥。见证通过后，传输证据才作为第三股水并入同一水闸，而不是另开一本倒数名次账。',
            obs: () => makeObservation({ routes: [route] }),
        },
        reject: {
            title: '见证失败', badge: '两端孤立 · 拒绝',
            metaphor: '两端各自出现过，却没有任何一份日记把它们写在一起：这是“幻觉桥”。虫洞来水被闸门拦下，普通 Hop-1 代理仍按自己的条件进入，排序不会被孤立证据改写。',
            obs: () => makeObservation({
                routes: [route],
                files: [{ id: 1, checksum: 'a1', tags: [1, 6, 4] }, { id: 2, checksum: 'b2', tags: [2, 6, 5] }],
            }),
        },
        differentia: {
            title: '种差校准', badge: '揭开泛称描图纸',
            metaphor: '“数据库”这类泛称父词像一层盖在查询上的描图纸：它让所有沾边的记录看起来都差不多。揭掉被主概念覆盖的泛称方向，露出的种差纹理才区分出真正说到专名的那一篇。',
            obs: () => makeObservation(),
        },
        anchor: {
            title: '直接锚快线', badge: '独立通道 · 不过 Ω 闸',
            metaphor: '直接锚像一条专用快线：只有真实的显式精确接触才能上车，限额 0.10，不受潮汐影响；只靠隐式相似的乘客最多拿到 0.035，到不了发车阈值。',
            obs: () => makeObservation({ omega: 0.22 }),
        },
    };

    function buildTab(key) {
        const tab = TABS[key] || TABS.ledger;
        const obs = tab.obs();
        const evidence = transportEvidence(obs, focusCandidate);
        const focusInput = { ...sharedEvidence, omega: obs.omega, transport: evidence.value };
        let items;
        if (key === 'differentia') {
            items = [
                { name: '数据库通用选型综述', input: { ...focusInput, query: 0.74, field: 0.8, perp: 0.12, differentia: 0.8, transport: 0, pathQuality: 0.2, anchorStrength: 0 } },
                { name: 'Cone-AGS 选列与 NNLS 细节', input: { ...focusInput, query: 0.70, field: 0.82, perp: 0.78, differentia: 0.8 }, focus: true },
                { name: '向量索引冷启动记录', input: { ...focusInput, query: 0.66, perp: 0.35, differentia: 0.8, transport: 0, pathQuality: 0.15, anchorStrength: 0 } },
                { name: 'SQLite 事务说明', input: { ...focusInput, query: 0.63, perp: 0.30, differentia: 0.8, transport: 0, pathQuality: 0.1, anchorStrength: 0 } },
            ];
        } else if (key === 'anchor') {
            items = [
                { name: '显式精确接触 · 配置常量记录', input: { ...focusInput, anchorStrength: 0.20 }, focus: true },
                { name: '仅隐式相似 · 同主题笔记', input: { ...focusInput, query: 0.73, implicitOnly: true, anchorStrength: 0.20, transport: 0 } },
                { name: '主题邻居', input: { ...focusInput, query: 0.70, anchorStrength: 0, transport: 0, pathQuality: 0.12 } },
                { name: '背景记录', input: { ...focusInput, query: 0.66, anchorStrength: 0, transport: 0, pathQuality: 0.05 } },
            ];
        } else {
            items = [
                { name: '目标事件记录', input: focusInput, focus: true },
                { name: '表面相似综述', input: { ...focusInput, query: 0.765, transport: 0, pathQuality: 0.12, anchorStrength: 0, nodeCoverage: 0.12, edgeCoverage: 0.03 } },
                { name: '同主题背景 A', input: { ...focusInput, query: 0.745, transport: 0, pathQuality: 0.2, anchorStrength: 0.05 } },
                { name: '同主题背景 B', input: { ...focusInput, query: 0.70, transport: 0, pathQuality: 0.3, anchorStrength: 0 } },
            ];
        }
        const rows = rank(items);
        const focus = rows.find(r => r.focus) || rows[0];
        const ghost = tab.ghostOmega
            ? scoreCandidate({ ...focus.input, omega: tab.ghostOmega,
                transport: transportEvidence(makeObservation({ omega: tab.ghostOmega }), focusCandidate).value })
            : null;
        return { key, tab, obs, evidence, rows, focus, ghost };
    }

    global.RiverMemoV4 = {
        C_T, nnls, unconstrained, anchorGain, coneColumns, coneTarget, coneStep,
        complement, calibrateQuery, scoreCandidate, rank, branchCoverage,
        gateWitness, hop1Evidence, xwEvidence, transportEvidence, makeObservation,
        focusCandidate, sharedEvidence, buildTab, tabs: Object.keys(TABS),
    };

    // ---------------------------------------------------------------------
    // 4. 绘制工具
    // ---------------------------------------------------------------------
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el && el.textContent !== value) el.textContent = value;
    }
    function label(ctx, x, y, text, color = C.bone, size = 12, align = 'center', weight = '') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${weight}${size}px "Microsoft YaHei", "Inter", sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    function mono(ctx, x, y, text, color = C.bone, size = 10, align = 'left') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${size}px "JetBrains Mono", monospace`;
        ctx.textAlign = align;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    function glowLine(ctx, points, color, width, alpha = 0.9, dash = null) {
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = dash ? 0 : 12;
        ctx.shadowColor = hexToRgba(color, 0.55);
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
    }
    function arrowHead(ctx, from, to, color, size = 8) {
        const a = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - Math.cos(a - 0.42) * size, to.y - Math.sin(a - 0.42) * size);
        ctx.lineTo(to.x - Math.cos(a + 0.42) * size, to.y - Math.sin(a + 0.42) * size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    function dotAt(ctx, p, r, color, alpha = 1) {
        ctx.save();
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    function alongPolyline(points, s) {
        const lens = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            lens.push(l); total += l;
        }
        let d = clip(s) * total;
        for (let i = 0; i < lens.length; i++) {
            if (d <= lens[i] || i === lens.length - 1) {
                const f = lens[i] ? clip(d / lens[i]) : 0;
                return { x: lerp(points[i].x, points[i + 1].x, f), y: lerp(points[i].y, points[i + 1].y, f) };
            }
            d -= lens[i];
        }
        return points[0];
    }
    function panel(ctx, x, y, w, h, stroke = C.patina) {
        ctx.save();
        ctx.fillStyle = 'rgba(18, 22, 26, 0.9)';
        ctx.strokeStyle = hexToRgba(stroke, 0.3);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // ---------------------------------------------------------------------
    // 5. 第 1 章：支流只许顺流汇入
    // ---------------------------------------------------------------------
    global.WaveScenes.createScene_ch1 = function (canvas) {
        let stepK = 3, autoCycle = false, lastSwitch = 0, shown = 3;

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            if (autoCycle && t - lastSwitch > 2.4) {
                stepK = (stepK + 1) % 4;
                lastSwitch = t;
                document.querySelectorAll('[data-ags-step]').forEach(btn => {
                    const active = parseInt(btn.dataset.agsStep, 10) === stepK;
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-pressed', String(active));
                });
            }
            shown = lerp(shown, stepK, 0.08);
            drawIndustrialGrid(ctx, w, h, 42);
            const step = coneStep(stepK);
            const { cone, free } = step;
            const freeNeg = free && free.x.some(v => v < -1e-9);
            setText('ch1Readout', `K = ${stepK} 条原 Tag 列 · NNLS r_t = ${cone.residual.toFixed(3)} · a_t = ${step.gain.toFixed(2)}`
                + (freeNeg ? ` · 无约束 r = ${free.residual.toFixed(3)}（含倒流系数）` : ''));

            // 左侧：三维斜投影的“汇水扇面”
            const cx = w * 0.27, cy = h * 0.40;
            const R = Math.min(w * 0.30, h * 0.42);
            const P = v => ({ x: cx + (v[0] * 0.92 - v[1] * 0.52) * R, y: cy + (v[0] * 0.32 + v[1] * 0.38 - v[2] * 0.95) * R });
            const O = P([0, 0, 0]);

            // 河床水面：xy 平面的淡色菱形
            ctx.save();
            const bed = [P([-0.2, -0.2, 0]), P([1.1, -0.2, 0]), P([1.1, 1.1, 0]), P([-0.2, 1.1, 0])];
            const grad = ctx.createLinearGradient(bed[0].x, bed[0].y, bed[2].x, bed[2].y);
            grad.addColorStop(0, hexToRgba(C.turquoise, 0.16));
            grad.addColorStop(1, hexToRgba(C.patina, 0.04));
            ctx.fillStyle = grad;
            ctx.beginPath();
            bed.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
            ctx.fill();
            // 水面波纹
            ctx.strokeStyle = hexToRgba(C.patina, 0.12);
            for (let k = 1; k <= 4; k++) {
                const a = P([k * 0.22, -0.15, 0]), b = P([k * 0.22, 1.05, 0]);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y + Math.sin(t * 1.4 + k) * 1.5);
                ctx.lineTo(b.x, b.y + Math.sin(t * 1.4 + k + 1) * 1.5);
                ctx.stroke();
            }
            ctx.restore();
            label(ctx, P([1.08, 1.05, 0]).x, P([1.08, 1.05, 0]).y + 18, '河床平面（顺流可达）', hexToRgba(C.patina, 0.7), 10);

            // 已选列张成的非负锥扇面
            const active = coneColumns.slice(0, stepK);
            if (active.length >= 2) {
                ctx.save();
                ctx.fillStyle = hexToRgba(C.patina, 0.1 + 0.04 * Math.sin(t * 2));
                ctx.beginPath();
                ctx.moveTo(O.x, O.y);
                active.forEach(c => { const p = P(c.v); ctx.lineTo(p.x, p.y); });
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // 候选支流（未选为虚线）
            coneColumns.forEach((c, i) => {
                const tip = P(c.v);
                const on = i < stepK;
                const locked = on && cone.x[i] < 1e-9;
                glowLine(ctx, [O, tip], locked ? C.coral : c.color, on ? 1.6 : 1, on ? 0.55 : 0.2, on ? null : [3, 5]);
                arrowHead(ctx, O, tip, hexToRgba(locked ? C.coral : c.color, on ? 0.8 : 0.3), 7);
                label(ctx, tip.x + (i === 1 ? -6 : 8), tip.y - 8, `${c.name}${locked ? ' · 锁零' : ''}`,
                    hexToRgba(locked ? C.coral : c.color, on ? 0.95 : 0.4), 11, i === 1 ? 'right' : 'left');
            });

            // 目标 t（虚线）
            const T = P(coneTarget);
            glowLine(ctx, [O, T], C.bone, 1.4, 0.45, [5, 5]);
            dotAt(ctx, T, 5, C.bone);
            label(ctx, T.x + 10, T.y + 16, '目标 Tag t（一部分沉在河床下）', C.bone, 11, 'left');

            // 无约束幽灵路径：靠倒流相消
            if (freeNeg) {
                const pts = [O];
                let acc = [0, 0, 0];
                free.x.forEach((v, i) => { acc = acc.map((a, k) => a + v * coneColumns[i].v[k]); pts.push(P(acc)); });
                glowLine(ctx, pts, C.coral, 1.3, 0.55, [2, 4]);
                const last = pts[pts.length - 1], prev = pts[pts.length - 2];
                const mid = { x: (last.x + prev.x) / 2, y: (last.y + prev.y) / 2 };
                drawPillTag(ctx, mid.x + 10, mid.y, `倒流 x₃ = ${free.x[2].toFixed(2)} ✗`, C.coral);
            }

            // NNLS 顺流汇水路径：支流首尾相接
            const flow = [O];
            let acc = [0, 0, 0];
            cone.x.forEach((v, i) => {
                if (v <= 1e-9) return;
                acc = acc.map((a, k) => a + v * coneColumns[i].v[k]);
                flow.push(P(acc));
            });
            if (flow.length > 1) {
                glowLine(ctx, flow, C.patina, 4, 0.95);
                for (let k = 0; k < 7; k++) dotAt(ctx, alongPolyline(flow, ((t * 0.32) + k / 7) % 1), 2.4, C.mint, 0.9);
                const F = flow[flow.length - 1];
                dotAt(ctx, F, 5, C.amber);
                label(ctx, F.x + 9, F.y - 8, '重构点 Ax*', C.amber, 11, 'left');
                // 礁石：残差
                glowLine(ctx, [F, T], C.cinnabar, 3, 0.95);
                const mid = { x: (F.x + T.x) / 2, y: (F.y + T.y) / 2 };
                ctx.save();
                ctx.fillStyle = hexToRgba(C.cinnabar, 0.85);
                ctx.beginPath();
                ctx.moveTo(mid.x - 9, mid.y + 6);
                ctx.lineTo(mid.x - 3, mid.y - 7);
                ctx.lineTo(mid.x + 4, mid.y - 3);
                ctx.lineTo(mid.x + 10, mid.y + 6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                label(ctx, mid.x - 14, mid.y + 4, `礁石 r_t = ${cone.residual.toFixed(3)}`, C.coral, 11, 'right');
            } else {
                label(ctx, O.x, O.y + 26, 'K = 0：尚无支流，整块目标都露在水面外', C.coral, 11);
            }
            dotAt(ctx, O, 4, C.amber);

            // 右侧：系数与 KKT 账页
            const px = w * 0.60, pw = w * 0.37, py = h * 0.06, ph = h * 0.88;
            panel(ctx, px, py, pw, ph);
            mono(ctx, px + 14, py + 22, '96 候选 → AGS 提名 ≤24 列 → QR 小核 NNLS', C.muted, 9.5);
            mono(ctx, px + 14, py + 38, '教学夹具：3 列 · 3 维 · 预设向量', C.dim, 9);
            coneColumns.forEach((c, i) => {
                const y = py + 64 + i * 30;
                const on = i < stepK;
                const x = on ? cone.x[i] : 0;
                const locked = on && x < 1e-9;
                label(ctx, px + 14, y, `x_${c.name}`, on ? C.bone : C.dim, 11, 'left');
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                ctx.fillRect(px + 96, y - 9, pw - 170, 9);
                ctx.fillStyle = locked ? C.coral : c.color;
                ctx.fillRect(px + 96, y - 9, (pw - 170) * clip(x), 9);
                mono(ctx, px + pw - 14, y, on ? (locked ? '0 · 锁零' : x.toFixed(3)) : '未提名',
                    locked ? C.coral : on ? c.color : C.dim, 10, 'right');
            });
            const bars = [
                ['重构能量 1 − r_t²', 1 - cone.residual ** 2, 1, C.patina, `${((1 - cone.residual ** 2) * 100).toFixed(1)}%`],
                ['礁石 · 残差范数比 r_t', cone.residual, 1, C.cinnabar, cone.residual.toFixed(3)],
                ['锚增益 a_t ∈ [0.5, 2.0]', step.gain, 2, C.amber, `${step.gain.toFixed(2)}×`],
            ];
            bars.forEach(([name, v, max, color, text], i) => {
                const y = py + 170 + i * 36;
                label(ctx, px + 14, y, name, C.bone, 11, 'left');
                mono(ctx, px + pw - 14, y, text, color, 10, 'right');
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                ctx.fillRect(px + 14, y + 6, pw - 28, 8);
                ctx.fillStyle = color;
                ctx.fillRect(px + 14, y + 6, (pw - 28) * clip(v / max), 8);
            });
            const checks = [
                ['非负 x ≥ 0', cone.kkt.nonneg],
                [`对偶 ${cone.kkt.dual.toExponential(1)}`, cone.kkt.dual < 1e-9],
                [`互补 ${cone.kkt.complementarity.toExponential(1)}`, cone.kkt.complementarity < 1e-9],
                [`能量闭合 ${cone.kkt.energy.toExponential(1)}`, cone.kkt.energy < 1e-9],
            ];
            checks.forEach(([name, ok], i) => {
                const x = px + 14 + (i % 2) * (pw / 2 - 7);
                const y = py + ph - 40 + Math.floor(i / 2) * 18;
                mono(ctx, x, y, `${ok ? '✓' : '×'} ${name}`, ok ? C.patina : C.coral, 9.5);
            });
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setStep: (k) => { autoCycle = false; stepK = clamp(k, 0, 3); },
            toggleCycle: () => { autoCycle = !autoCycle; return autoCycle; },
        };
    };

    // ---------------------------------------------------------------------
    // 6. 第 9 章：统一水闸
    // ---------------------------------------------------------------------
    global.WaveScenes.createScene_ch9 = function (canvas) {
        let key = 'ledger', model = buildTab(key), fill = 0, playing = true, previous = null, lastPanel = '';

        function reset(value = key) {
            key = TABS[value] ? value : 'ledger';
            model = buildTab(key);
            fill = 0;
            lastPanel = '';
        }

        function updatePanel() {
            const signature = key;
            if (signature === lastPanel) return;
            lastPanel = signature;
            const r = model.focus.result;
            setText('ch9Readout', `${model.tab.title} · Ω^γ = ${r.gate.toFixed(2)} · P + G = ${(r.path + r.graph).toFixed(4)} ≤ C_T · S = ${r.score.toFixed(4)}`);
            setText('v4LedgerStory', `${model.tab.metaphor} 画面与数字均为教学预设，非生产遥测。`);
            const trace = model.evidence.traces[0];
            setText('v4GateStatus', `Hop-1 代理 ${model.evidence.hop1.toFixed(3)} ｜XW 见证 ${trace ? (trace.witness ? '通过' : '拒绝') : '无路线'} ${model.evidence.xw.toFixed(3)} ｜传输请求 ${r.transportRequested.toFixed(4)} ｜互补合并 ${r.merged.toFixed(4)} ｜溢出 ${r.overflow.toFixed(4)}`);
            const table = document.getElementById('v4LedgerTable');
            if (table) {
                table.innerHTML = '<table><caption>排序与展示读取同一列 S · 4 个教学候选</caption><thead><tr><th>名次 / 候选</th><th>B̂</th><th>P</th><th>G</th><th>A</th><th>S = 排序分 = 展示分</th></tr></thead><tbody>'
                    + model.rows.map((row, i) => {
                        const x = row.result;
                        return `<tr${row.focus ? ' class="worm-target"' : ''}><td>#${i + 1} ${row.name}<small>${x.mix > 0 ? `种差混合 m = ${x.mix.toFixed(2)}` : '无种差校准'}</small></td><td>${x.base.toFixed(4)}</td><td>${x.path.toFixed(4)}</td><td>${x.graph.toFixed(4)}</td><td>${x.anchor.toFixed(4)}</td><td><strong>${x.rankingScore.toFixed(4)}</strong></td></tr>`;
                    }).join('') + '</tbody></table>';
            }
        }

        function stream(ctx, from, to, width, color, time, speed, alpha = 0.85) {
            const c1 = { x: lerp(from.x, to.x, 0.5), y: from.y };
            const c2 = { x: lerp(from.x, to.x, 0.5), y: to.y };
            ctx.save();
            ctx.strokeStyle = hexToRgba(color, alpha * 0.55);
            ctx.lineWidth = Math.max(1, width);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = hexToRgba(color, 0.5);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y);
            ctx.stroke();
            ctx.restore();
            if (width < 1.2) return;
            for (let k = 0; k < 5; k++) {
                const s = (time * speed + k / 5) % 1;
                const p = RE.cubicBezierPoint(s, from, c1, c2, to);
                dotAt(ctx, { x: p.x, y: p.y + Math.sin(time * 4 + k) * width * 0.15 }, Math.max(1.2, width * 0.22), color, alpha);
            }
        }

        function drawDifferentia(ctx, time) {
            const r0 = model.rows.find(r => !r.focus) || model.rows[0];
            const focus = model.focus;
            const peel = smooth(fill * 1.3);
            const O = { x: 70, y: 330 };
            const q = { x: 300, y: 130 };
            const parent = { x: 330, y: 250 };
            // 泛称方向与查询方向
            glowLine(ctx, [O, parent], C.muted, 2, 0.6, [4, 4]);
            arrowHead(ctx, O, parent, hexToRgba(C.muted, 0.7));
            label(ctx, parent.x + 4, parent.y + 18, '泛称父词「数据库」方向', C.muted, 11, 'right');
            glowLine(ctx, [O, q], C.bone, 2.2, 0.85);
            arrowHead(ctx, O, q, C.bone);
            label(ctx, q.x + 6, q.y - 6, '查询 q', C.bone, 12, 'left');
            // 种差方向 q⊥：随揭纸渐显
            const dx = parent.x - O.x, dy = parent.y - O.y;
            const qx = q.x - O.x, qy = q.y - O.y;
            const k = (qx * dx + qy * dy) / (dx * dx + dy * dy);
            const foot = { x: O.x + k * dx, y: O.y + k * dy };
            const perpTip = { x: O.x + (q.x - foot.x), y: O.y + (q.y - foot.y) };
            glowLine(ctx, [O, { x: lerp(O.x, perpTip.x, peel), y: lerp(O.y, perpTip.y, peel) }], C.amber, 3, peel);
            if (peel > 0.6) {
                arrowHead(ctx, O, perpTip, C.amber);
                label(ctx, perpTip.x + 6, perpTip.y, '种差 q⊥（专名纹理）', C.amber, 12, 'left');
            }
            // 描图纸
            ctx.save();
            ctx.translate(lerp(60, -260, peel), lerp(90, 40, peel));
            ctx.rotate(lerp(0, -0.35, peel));
            ctx.globalAlpha = 1 - peel * 0.85;
            ctx.fillStyle = 'rgba(242, 240, 233, 0.22)';
            ctx.strokeStyle = 'rgba(242, 240, 233, 0.45)';
            ctx.beginPath();
            ctx.roundRect(0, 0, 300, 230, 6);
            ctx.fill();
            ctx.stroke();
            for (let row = 0; row < 7; row++) {
                label(ctx, 150, 34 + row * 30, '数据库 · 数据库 · 数据库', 'rgba(242,240,233,0.35)', 12);
            }
            ctx.restore();
            // 底部：两位候选的 q 与 q̂
            [[r0, '泛称综述'], [focus, '专名细节']].forEach(([row, tag], i) => {
                const y = 372 + i * 30;
                label(ctx, 40, y, tag, row.focus ? C.amber : C.muted, 11, 'left');
                const base = row.input.query, hat = row.result.queryHat;
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(110, y - 10, 240, 8);
                ctx.fillStyle = hexToRgba(C.muted, 0.6);
                ctx.fillRect(110, y - 10, 240 * base, 4);
                ctx.fillStyle = row.focus ? C.amber : C.patina;
                ctx.fillRect(110, y - 6, 240 * lerp(base, hat, peel), 4);
                mono(ctx, 356, y - 2, `q ${base.toFixed(2)} → q̂ ${lerp(base, hat, peel).toFixed(2)}`, C.bone, 9.5);
            });
            void time;
        }

        const runner = new SceneRunner(canvas, (ctx, width, height, time) => {
            const dt = previous === null ? 0 : clamp(time - previous, 0, 0.1);
            previous = time;
            if (playing) fill = Math.min(1, fill + dt / 2.4);
            updatePanel();
            const scale = Math.min(width / 900, height / 460);
            ctx.save();
            ctx.translate((width - 900 * scale) / 2, 0);
            ctx.scale(scale, scale);
            drawIndustrialGrid(ctx, 900, 460);
            const r = model.focus.result;
            const ease = smooth(fill);
            label(ctx, 30, 34, `${model.tab.title}`, C.amber, 18, 'left', '600 ');
            drawPillTag(ctx, 30 + 14 + model.tab.title.length * 18, 29, model.tab.badge, C.patina);

            // ---- 水闸几何 ----
            const tank = { x: 420, y: 110, w: 150, h: 250 };
            const toH = v => v / C_T * tank.h;
            const inlet = { x: tank.x + 12, y: tank.y + 16 };

            if (key === 'differentia') {
                drawDifferentia(ctx, time);
            } else {
                // Ω 潮汐闸
                const gateX = 250;
                ctx.save();
                ctx.fillStyle = 'rgba(16,20,23,0.9)';
                ctx.strokeStyle = hexToRgba(C.amber, 0.5);
                ctx.beginPath();
                ctx.roundRect(gateX - 10, 80, 20, 250, 4);
                ctx.fill();
                ctx.stroke();
                const plate = 250 * (1 - r.gate);
                ctx.fillStyle = hexToRgba(C.amber, 0.25);
                ctx.fillRect(gateX - 8, 82, 16, plate * ease + (1 - ease) * 250 * 0.5);
                ctx.restore();
                label(ctx, gateX, 72, `Ω 潮汐闸 · 开度 ${r.gate.toFixed(2)}`, C.amber, 11);
                if (model.ghost) label(ctx, gateX, 350, `满潮时开度 ${model.ghost.gate.toFixed(2)}`, C.muted, 10);

                const gate = r.gate || 1e-9;
                const transportRaw = r.gate > 0 ? Math.min(C_T, r.transportRequested / gate) : 0;
                const xwTrace = model.evidence.traces[0];
                const sources = [
                    { name: '路径 P', raw: r.pathRaw, gated: r.path, color: C.patina, y: 120 },
                    { name: '图 g', raw: r.graphSelf, gated: r.graphRequested, color: C.mint, y: 205 },
                    { name: key === 'transport' ? '传输 t · XW 见证' : '传输 t · Hop-1', raw: transportRaw, gated: r.transportRequested, color: C.coral, y: 290 },
                ];
                sources.forEach((s, i) => {
                    const wRaw = 1.5 + s.raw / C_T * 18, wGate = 1.5 + s.gated / C_T * 18 * ease;
                    stream(ctx, { x: 40, y: s.y }, { x: gateX - 12, y: s.y }, wRaw, s.color, time, 0.35);
                    stream(ctx, { x: gateX + 12, y: s.y }, { x: inlet.x, y: inlet.y + i * 10 }, wGate, s.color, time, 0.45);
                    label(ctx, 40, s.y - 14 - wRaw / 2, s.name, s.color, 11, 'left');
                    mono(ctx, 40, s.y + 18 + wRaw / 2, `原始 ${s.raw.toFixed(4)} → 过闸 ${s.gated.toFixed(4)}`, C.muted, 9);
                });
                if ((key === 'reject' || key === 'transport') && xwTrace) {
                    const ok = Boolean(xwTrace.witness);
                    drawPillTag(ctx, 150, 336, ok ? '✓ 两份不同日记交叉见证' : '✗ 两端孤立 · 虫洞来水被拦', ok ? C.patina : C.coral, 'center');
                }
            }

            // 水闸本体
            ctx.save();
            ctx.strokeStyle = hexToRgba(C.bone, 0.55);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tank.x, tank.y);
            ctx.lineTo(tank.x, tank.y + tank.h);
            ctx.lineTo(tank.x + tank.w, tank.y + tank.h);
            ctx.lineTo(tank.x + tank.w, tank.y);
            ctx.stroke();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = hexToRgba(C.amber, 0.8);
            ctx.beginPath();
            ctx.moveTo(tank.x - 6, tank.y);
            ctx.lineTo(tank.x + tank.w + 6, tank.y);
            ctx.stroke();
            ctx.restore();
            label(ctx, tank.x + tank.w / 2, tank.y - 10, `共享拓扑预算 C_T = ${C_T.toFixed(2)}`, C.amber, 11);

            const bottom = tank.y + tank.h;
            const pH = toH(r.path) * ease, gH = toH(r.graph) * ease;
            const wave = (x, base) => base + Math.sin(time * 2.2 + x * 0.06) * 2.2;
            // 路径层
            ctx.save();
            ctx.fillStyle = hexToRgba(C.patina, 0.75);
            ctx.fillRect(tank.x + 2, bottom - pH, tank.w - 4, pH);
            // 图 / 传输互补层
            const g2 = ctx.createLinearGradient(0, bottom - pH - gH, 0, bottom - pH);
            g2.addColorStop(0, hexToRgba(r.transportRequested > 0 ? C.coral : C.mint, 0.7));
            g2.addColorStop(1, hexToRgba(C.mint, 0.7));
            ctx.fillStyle = g2;
            ctx.beginPath();
            const top = bottom - pH - gH;
            ctx.moveTo(tank.x + 2, bottom - pH);
            for (let x = 0; x <= tank.w - 4; x += 6) ctx.lineTo(tank.x + 2 + x, gH > 3 ? wave(x, top) : top);
            ctx.lineTo(tank.x + tank.w - 2, bottom - pH);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            if (pH > 12) label(ctx, tank.x + tank.w / 2, bottom - pH / 2 + 4, `P ${r.path.toFixed(4)}`, '#101417', 11, 'center', '600 ');
            if (gH > 12) label(ctx, tank.x + tank.w / 2, bottom - pH - gH / 2 + 4, `G ${r.graph.toFixed(4)}`, '#101417', 11, 'center', '600 ');

            // 满潮幽灵水位（Ω 退潮页）
            if (model.ghost) {
                const ghostTop = bottom - toH(model.ghost.path + model.ghost.graph);
                glowLine(ctx, [{ x: tank.x - 4, y: ghostTop }, { x: tank.x + tank.w + 4, y: ghostTop }], C.bone, 1, 0.5, [3, 4]);
                mono(ctx, tank.x + tank.w + 8, ghostTop + 3, `满潮水位 ${(model.ghost.path + model.ghost.graph).toFixed(4)}`, C.muted, 9);
            }

            // 溢出：互补合并请求超过剩余预算
            if (r.overflow > 1e-6 && ease > 0.9) {
                for (let k = 0; k < 6; k++) {
                    const s = (time * 0.7 + k / 6) % 1;
                    dotAt(ctx, { x: tank.x + tank.w + 6 + s * 18, y: tank.y + s * s * 70 }, 2.2, C.coral, 1 - s);
                }
                mono(ctx, tank.x + tank.w + 12, tank.y + 92, `溢出 ${r.overflow.toFixed(4)}`, C.coral, 9.5);
                mono(ctx, tank.x + tank.w + 12, tank.y + 106, '不入账', C.coral, 9.5);
            }
            // 若直接相加的虚线（说明互补而非叠加）
            const naive = r.graphRequested + r.transportRequested;
            if (r.transportRequested > 0) {
                const ny = Math.max(tank.y - 30, bottom - pH - toH(naive));
                glowLine(ctx, [{ x: tank.x + 10, y: ny }, { x: tank.x + tank.w - 10, y: ny }], C.coral, 1, 0.45, [2, 5]);
                mono(ctx, tank.x - 6, ny - 4, `若直接相加 ${naive.toFixed(4)}`, hexToRgba(C.coral, 0.8), 9, 'right');
            }
            mono(ctx, tank.x, bottom + 18, '互补：C_T[1 − (1 − g/C_T)(1 − t/C_T)]', C.muted, 9);

            // 直接锚快线
            const cup = { x: 600, y: 250, w: 46, h: 110 };
            glowLine(ctx, [{ x: 40, y: 410 }, { x: 560, y: 410 }, { x: cup.x + cup.w / 2, y: 410 }, { x: cup.x + cup.w / 2, y: cup.y + cup.h }], C.cinnabar, 1.6, 0.6, [6, 4]);
            label(ctx, 40, 428, '直接锚快线 · 不经过 Ω 闸 · 独立限额 0.10', C.cinnabar, 10.5, 'left');
            ctx.save();
            ctx.strokeStyle = hexToRgba(C.bone, 0.5);
            ctx.strokeRect(cup.x, cup.y, cup.w, cup.h);
            const aH = r.anchor / 0.10 * cup.h * ease;
            ctx.fillStyle = hexToRgba(C.cinnabar, 0.75);
            ctx.fillRect(cup.x + 2, cup.y + cup.h - aH, cup.w - 4, aH);
            ctx.restore();
            label(ctx, cup.x + cup.w / 2, cup.y - 8, `A ${r.anchor.toFixed(3)}`, C.coral, 11);

            // 账页
            const L = { x: 680, y: 66, w: 200, h: 330 };
            ctx.save();
            ctx.fillStyle = '#EDE9DE';
            ctx.shadowBlur = 14;
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.roundRect(L.x, L.y, L.w, L.h, 4);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = 'rgba(27,33,31,0.12)';
            for (let y = L.y + 52; y < L.y + L.h - 10; y += 24) {
                ctx.beginPath();
                ctx.moveTo(L.x + 12, y);
                ctx.lineTo(L.x + L.w - 12, y);
                ctx.stroke();
            }
            ctx.restore();
            label(ctx, L.x + L.w / 2, L.y + 28, '同 一 本 账', '#1B211F', 15, 'center', '600 ');
            const ledger = [
                [r.mix > 0 ? 'B̂ 校准基础' : 'B 基础分', r.base, '#1B211F'],
                ['+ P 路径', r.path, '#21675C'],
                ['+ G 图∪传输', r.graph, '#21675C'],
                ['+ A 直接锚', r.anchor, '#B94832'],
                ['− 截断', r.clipping, '#5A635F'],
            ];
            ledger.forEach(([name, v, color], i) => {
                const y = L.y + 72 + i * 24;
                label(ctx, L.x + 16, y, name, color, 12, 'left');
                mono(ctx, L.x + L.w - 16, y, (v * ease + (i === 0 ? v * (1 - ease) : 0)).toFixed(4), color, 11, 'right');
            });
            ctx.save();
            ctx.strokeStyle = '#1B211F';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(L.x + 14, L.y + 196);
            ctx.lineTo(L.x + L.w - 14, L.y + 196);
            ctx.stroke();
            ctx.restore();
            label(ctx, L.x + 16, L.y + 222, '= S', '#1B211F', 15, 'left', '600 ');
            mono(ctx, L.x + L.w - 16, L.y + 222, r.score.toFixed(4), '#1B211F', 15, 'right');
            // 印章
            ctx.save();
            ctx.translate(L.x + L.w / 2, L.y + 278);
            ctx.rotate(-0.12);
            ctx.globalAlpha = 0.25 + 0.6 * ease;
            ctx.strokeStyle = '#B94832';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-82, -24, 164, 46, 6);
            ctx.stroke();
            label(ctx, 0, -4, '排序分 ≡ 展示分', '#B94832', 14, 'center', '600 ');
            mono(ctx, 0, 14, 'ranking = final', '#B94832', 9.5, 'center');
            ctx.restore();

            label(ctx, 450, 452, '没有倒数名次覆盖：所有证据都是同一条连续分数里的一行账。', C.muted, 11.5);
            ctx.restore();
        });

        return {
            start: () => { previous = null; runner.start(); },
            stop: () => { previous = null; runner.stop(); },
            setTab(value) { reset(value); },
            wormToggle() { playing = !playing; setText('wormPlay', playing ? 'Ⅱ 暂停注水' : '▶ 继续注水'); return playing; },
            wormStep() { playing = false; fill = 1; setText('wormPlay', '▶ 继续注水'); updatePanel(); },
            wormReplay() { reset(); playing = true; setText('wormPlay', 'Ⅱ 暂停注水'); updatePanel(); },
        };
    };
})(window);