/* 两阶段读出教学模型：不连接原生数据库，不验证因果或生产性能。 */
(function (global) {
    'use strict';
    const API = global.RiverMemoV3;
    const { SceneRunner, COLORS: C, drawIndustrialGrid } = global.RiverEngine;
    const positive = x => Number.isFinite(x) && x > 0;
    const clip = x => Math.min(1, Math.max(0, x));
    function gateWitness(files, source, target, focuses) {
        if (files.length > 128 || files.some(f => f.tags.length > 128)) return null;
        const joint = files.filter(f => f.tags.includes(source) && f.tags.includes(target));
        for (let i = 0; i < joint.length; i++) for (let j = i + 1; j < joint.length; j++) {
            const a = joint[i], b = joint[j];
            if (a.id === b.id || !a.checksum || !b.checksum || a.checksum === b.checksum) continue;
            const third = a.tags.find(t => b.tags.includes(t) && t !== source && t !== target && !focuses.includes(t));
            const focus = focuses.find(t => t !== source && t !== target && (a.tags.includes(t) || b.tags.includes(t)));
            if (third !== undefined && focus !== undefined) return { files: [a.id, b.id], third, focus };
        }
        return null;
    }
    function fuse(candidates, routes, observation) {
        const baseline = candidates.map((c, index) => ({ ...c, index, baseline: API.scoreCandidate(c.input).score }))
            .sort((a, b) => b.baseline - a.baseline || a.index - b.index);
        const edges = observation.edges.filter(e => positive(e.flow));
        const ordinary = edges.filter(e => !e.wormhole && !e.returning && e.source !== e.target);
        const maximum = Math.max(0, ...edges.map(e => e.flow));
        const reference = Math.max(0, ...(ordinary.length ? ordinary : edges).map(e => e.flow));
        const rows = baseline.map((c, i) => ({ ...c, baseRank: i + 1, baseRrf: 1 / (61 + i), contribution: 0, routeRank: null }));
        const traces = [];
        for (const route of routes) {
            const witness = gateWitness(observation.files, route.source, route.target, observation.focuses);
            const ratio = maximum > 0 ? route.flow / maximum : 0;
            const real = positive(route.flow) && route.source !== route.target && !route.returning
                && route.csr && route.wormhole && route.validVector;
            const strong = real && witness && observation.complete && positive(observation.omega)
                && observation.focuses.includes(route.source) && ratio >= .5;
            const eligible = strong ? rows.filter(c => positive(c.targetCosine) && positive(c.tagClosure) && c.tagSimilarity > .48)
                .sort((a, b) => b.targetCosine - a.targetCosine || a.baseRank - b.baseRank) : [];
            const weight = strong && reference > 0 ? route.flow / reference * observation.omega : 0;
            eligible.forEach((c, i) => {
                const contribution = weight / (61 + i);
                if (contribution > c.contribution) { c.contribution = contribution; c.routeRank = i + 1; }
            });
            traces.push({ witness, ratio, real, strong: Boolean(strong), weight, eligible: eligible.length });
        }
        const enabled = rows.some(c => c.contribution > 0);
        rows.forEach(c => { c.final = enabled ? c.baseRrf + c.contribution : c.baseline; });
        rows.sort((a, b) => b.final - a.final || a.baseRank - b.baseRank);
        return { rows, traces, enabled, reference, maximum };
    }
    const presets = {
        proof: 'X · 联合见证通过', isolated: '两端孤立 · 拒绝', duplicate: '内容重复 · 拒绝',
        weak: '电流太弱 · 拒绝', ungrounded: '正文未落地', incomplete: '观测不完整', w: 'W · 洞察构型',
    };
    function fixture(mode = 'proof') {
        const files = [
            { id: 1, checksum: 'a1', tags: [1, 2, 3, 4] },
            { id: 2, checksum: 'b2', tags: [1, 2, 3, 5] },
        ];
        if (mode === 'isolated') { files[0].tags = [1, 3, 4]; files[1].tags = [2, 5]; }
        if (mode === 'duplicate') files[1].checksum = 'a1';
        if (mode === 'w') {
            files[0].tags = [1, 3, 4]; files[1].tags = [3, 2, 5];
            files.push({ id: 3, checksum: 'c3', tags: [5, 2, 6] });
        }
        const candidates = Array.from({ length: 12 }, (_, i) => ({
            id: i + 1, name: i === 11 ? '目标事件记录' : i === 0 ? '表面相似综述' : `背景记录 ${i + 1}`,
            input: { query: .85 - i * .025, omega: .72 },
            targetCosine: i === 11 ? .92 : 0,
            tagSimilarity: i === 11 && mode !== 'ungrounded' ? 1 : 0,
            tagClosure: .8,
        }));
        const route = { source: 1, target: 2, flow: mode === 'weak' ? .02 : .12,
            csr: true, wormhole: true, validVector: true };
        const observation = { files, focuses: [1, 4], omega: .72, complete: mode !== 'incomplete',
            edges: [route, { source: 1, target: 7, flow: .10, wormhole: false }] };
        return { candidates, routes: [route], observation };
    }
    Object.assign(API, { gateWitness, fuse, wormholeFixture: fixture });
    const stages = ['完整基线', '跨文件见证', '真实传播与落地', '条件式 RRF'];
    const descriptions = [
        '先完整计算 S₀ = clip(B + P + G + A)。目标在本教学候选池中排第 12；尚未触发任何旁路。',
        '查看文件—标签连线：两个不同内容文件同时包含路线两端，还共享第三标签，并有额外显式焦点。孤立两端与重复文件不能替代关系见证。',
        '门控通过仍不够：真实正权 CSR 边、实际电流、显式来源、完整观测、相对流量 ≥0.5，以及目标—标签—正文落地缺一不可。',
        '只有实际正贡献才切换到 RRF 分数。路线取最大贡献而非累加；四项基线不改写，没有贡献则分数与顺序原样返回。',
    ];
    const setText = (id, value) => { const e = document.getElementById(id); if (e && e.textContent !== value) e.textContent = value; };
    global.WaveScenes.createScene_ch9 = function (canvas) {
        let mode = 'proof', stage = 0, playing = true, previous = null, elapsed = 0, lastPanel = '';
        let data, result;
        function reset(value = mode) {
            mode = presets[value] ? value : 'proof'; stage = 0; elapsed = 0; previous = null;
            data = fixture(mode); result = fuse(data.candidates, data.routes, data.observation);
        }
        reset();
        function panel() {
            const key = `${mode}:${stage}`;
            if (key === lastPanel) return;
            lastPanel = key;
            const trace = result.traces[0];
            setText('ch9Readout', `${stage + 1}/4 · ${stages[stage]} · ${presets[mode]}`);
            setText('v3ScoreStory', descriptions[stage] + (mode === 'w'
                ? ' W 型在此仅展示洞察：本预设没有满足当前严格文件对条件，因此不冒充已获准路线。' : ''));
            setText('wormGateStatus', `联合见证：${trace.witness ? '通过' : '拒绝'} ｜相对流量 ${trace.ratio.toFixed(2)} ｜路线权重 ${trace.weight.toFixed(3)} ｜落地候选 ${trace.eligible} ｜${result.enabled ? '存在正贡献' : '保留基线'}`);
            const table = document.getElementById('wormRankTable');
            if (table) {
                const rows = stage === 3 ? result.rows : result.rows.slice().sort((a, b) => a.baseRank - b.baseRank);
                table.innerHTML = '<table><caption>12 个教学候选 · 展示头部与目标 · 分数不可跨阶段混比</caption><thead><tr><th>候选 / 名次</th><th>S₀</th><th>基线 RRF</th><th>路线贡献</th><th>最终分</th></tr></thead><tbody>'
                    + rows.map((c, i) => ({ c, i })).filter(({ c, i }) => i < 3 || c.id === 12)
                        .map(({ c, i }) => `<tr${c.id === 12 ? ' class="worm-target"' : ''}><td>#${i + 1} ${c.name}<small>基线 #${c.baseRank}${c.routeRank ? ` · 路线 #${c.routeRank}` : ''}</small></td><td>${c.baseline.toFixed(3)}</td><td>${stage === 3 && result.enabled ? c.baseRrf.toFixed(6) : '—'}</td><td>${stage === 3 && result.enabled ? c.contribution.toFixed(6) : '—'}</td><td>${(stage === 3 ? c.final : c.baseline).toFixed(stage === 3 && result.enabled ? 6 : 3)}</td></tr>`).join('')
                    + '</tbody></table>';
            }
        }
        function label(ctx, x, y, value, color = C.bone, size = 13) {
            ctx.fillStyle = color; ctx.font = `${size}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center'; ctx.fillText(value, x, y);
        }
        function link(ctx, x1, y1, x2, y2, color, t, active) {
            ctx.strokeStyle = color; ctx.lineWidth = active ? 2 : 1; ctx.globalAlpha = active ? .85 : .2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            if (active) {
                const p = (t * .35) % 1;
                ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        const runner = new SceneRunner(canvas, (ctx, width, height, time) => {
            if (previous !== null && playing) elapsed += Math.max(0, time - previous);
            previous = time;
            if (elapsed >= 3) { stage = (stage + 1) % 4; elapsed = 0; }
            panel();
            const scale = Math.min(width / 900, height / 460);
            ctx.save(); ctx.translate((width - 900 * scale) / 2, 0); ctx.scale(scale, scale);
            drawIndustrialGrid(ctx, 900, 460);
            stages.forEach((name, i) => {
                ctx.fillStyle = stage === i ? C.patina : '#273137'; ctx.fillRect(18 + i * 220, 15, 208, 34);
                label(ctx, 122 + i * 220, 37, `${i + 1} / ${name}`, stage === i ? '#101417' : C.muted);
            });
            label(ctx, 220, 83, mode === 'w' ? 'W 洞察示意 ≠ 当前严格门控' : '文件—标签交叉见证', C.amber, 16);
            const names = { 1: '源 S', 2: '目标 T', 3: '第三标签', 4: '焦点 F', 5: '标签 U', 6: '标签 V' };
            const tagIds = mode === 'w' ? [1, 3, 4, 2, 5, 6] : [1, 2, 3, 4, 5];
            data.observation.files.forEach((f, i) => {
                const x = 95 + i * 125, y = 125;
                ctx.strokeStyle = C.patina; ctx.strokeRect(x - 45, y - 20, 90, 45);
                label(ctx, x, y, `文件 ${f.id}`); label(ctx, x, y + 17, f.checksum, C.muted, 10);
                f.tags.forEach(tag => {
                    const j = tagIds.indexOf(tag);
                    if (j >= 0) link(ctx, x, y + 25, 40 + j * 77, 240, tag <= 2 ? C.amber : C.patina, time, stage >= 1);
                });
            });
            tagIds.forEach((tag, j) => {
                const x = 40 + j * 77;
                ctx.fillStyle = tag <= 2 ? C.amber : C.patina; ctx.beginPath(); ctx.arc(x, 240, 7, 0, Math.PI * 2); ctx.fill();
                label(ctx, x, 265, names[tag], C.bone, 11);
            });
            const tr = result.traces[0];
            label(ctx, 675, 83, '不是“有边就加分”', C.amber, 16);
            const checks = [
                ['真实 CSR / 实际正电流', tr.real],
                ['不同内容文件联合见证', Boolean(tr.witness)],
                ['完整观测 / 显式来源', data.observation.complete],
                ['相对流量 ≥ 0.50', tr.ratio >= .5],
                ['候选标签与正文落地', tr.eligible > 0],
            ];
            checks.forEach(([name, pass], i) => {
                const y = 120 + i * 32;
                label(ctx, 670, y, stage >= 2 || i === 1 && stage >= 1 ? `${pass ? '✓' : '×'} ${name}` : `· ${name}`, stage >= 2 ? pass ? C.patina : C.coral : C.muted);
            });
            label(ctx, 450, 320, '原因 / 前提 → 关系桥接 → 事件 → 结果', C.bone, 16);
            for (let i = 0; i < 3; i++) link(ctx, 130 + i * 220, 355, 350 + i * 220, 355, tr.strong ? C.patina : C.coral, time - i * .4, stage >= 2 && tr.strong);
            ['原因线索', '见证关系', '候选正文', '结果记录'].forEach((name, i) => {
                ctx.fillStyle = tr.strong && stage >= 2 ? C.amber : C.muted;
                ctx.beginPath(); ctx.arc(130 + i * 220, 355, 8, 0, Math.PI * 2); ctx.fill();
                label(ctx, 130 + i * 220, 389, name);
            });
            label(ctx, 450, 425, stage === 3 ? result.enabled ? 'S = 1/(60+r₀) + maxₑ wₑ/(60+rₑ) · 目标 #12 → #1（教学计算）' : '无实际正贡献：S = S₀ · 原分数 / 原顺序不变' : '大多数为数学虫洞；罕见交叉见证才可能获得逻辑读出资格', stage === 3 ? C.amber : C.muted, 14);
            ctx.restore();
        });
        return {
            start: () => { previous = null; runner.start(); },
            stop: () => { previous = null; runner.stop(); },
            setTab(value) { reset(value); },
            wormToggle() { playing = !playing; setText('wormPlay', playing ? 'Ⅱ 暂停' : '▶ 播放'); return playing; },
            wormStep() { playing = false; stage = (stage + 1) % 4; elapsed = 0; setText('wormPlay', '▶ 播放'); panel(); },
            wormReplay() { reset(); panel(); },
        };
    };
})(window);