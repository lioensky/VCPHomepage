/* RiverMemo V3：基于公开白皮书的简化教学读出，非生产引擎或性能基准。 */
(function (global) {
    'use strict';
    const clip = value => Math.min(1, Math.max(0, value));
    const smooth = value => { const x = clip(value); return x * x * (3 - 2 * x); };
    function branchCoverage(node, edge, atomic = false, hasEdges = true) {
        const nodes = clip(node / 0.35), edges = clip(edge / 0.20);
        return { nodes, edges, combined: atomic ? nodes : hasEdges ? .70 * edges + .30 * nodes : .35 * nodes };
    }
    function scoreCandidate(input = {}) {
        const { query = .70, field = query, fieldWeight = .30, support = 0,
            pathQuality = 0, scalarPath = 0, graphScore = 0, nodeCoverage = 0,
            edgeCoverage = 0, closure = 0, alignment = 0, direction = 0,
            hasEdges = true, atomic = false, precision = 1, omega = 0,
            anchorStrength = 0, implicitOnly = false } = input;
        const resonance = Math.min(.03, clip(fieldWeight) * Math.max(0, field - query))
            * clip(support);
        const base = clip(query) + Math.min(resonance, 1 - clip(query));
        const branch = branchCoverage(nodeCoverage, edgeCoverage, atomic, hasEdges);
        const confidence = Math.sqrt(branch.combined * clip(closure) * clip(alignment));
        const path = Math.min(.08, .08 * clip(.625 * pathQuality + .375 * scalarPath)
            * Math.sqrt(clip(pathQuality / .15) * clip(query)));
        const graphRequested = .08 * clip(graphScore) * confidence
            * (hasEdges ? .25 + .75 * clip(direction) : .25) * clip(precision) * clip(omega);
        const graph = Math.min(graphRequested, Math.max(0, .08 - path));
        const strength = implicitOnly ? Math.min(.035, anchorStrength) : anchorStrength;
        const anchor = .10 * smooth((strength - .05) / .15);
        const sum = base + path + graph + anchor, score = clip(sum);
        return { base, resonance: base - clip(query), path, graph, graphRequested,
            anchor, score, clipping: sum - score, branch, confidence };
    }
    // 双侧容量为一；先精确，再按权重×质量，最后按稳定 ID 裁决。
    function alignContacts(pairs) {
        const queryUsed = new Set(), tagUsed = new Set(), accepted = [];
        const sorted = pairs.slice().sort((a, b) => Number(b.exact) - Number(a.exact)
            || b.weight * b.quality - a.weight * a.quality
            || a.queryId - b.queryId || a.tagId - b.tagId);
        for (const pair of sorted) {
            if (queryUsed.has(pair.queryId) || tagUsed.has(pair.tagId)) continue;
            queryUsed.add(pair.queryId); tagUsed.add(pair.tagId); accepted.push(pair);
        }
        return accepted;
    }
    function densityCredit(tagCount, acceptedQuality) {
        return 1 / (1 + Math.max(0, tagCount - acceptedQuality - 6) / 16);
    }
    const evidence = {
        query: .72, field: .88, fieldWeight: .30, support: .90,
        pathQuality: .42, scalarPath: .35, graphScore: .85,
        nodeCoverage: .35, edgeCoverage: .20, closure: .90,
        alignment: .90, direction: .90, omega: .80, anchorStrength: .16,
    };
    const examples = [
        { name: '精准单支流', input: evidence },
        { name: '只覆盖半支流', input: { ...evidence, nodeCoverage: .175, edgeCoverage: .10, anchorStrength: 0 } },
        { name: '河网较弱', input: { ...evidence, omega: .08 } },
        { name: '普通隐式种子', input: { ...evidence, implicitOnly: true } },
    ];
    global.RiverMemoV3 = { scoreCandidate, branchCoverage, alignContacts, densityCredit, examples };
    const { COLORS: C, SceneRunner, drawIndustrialGrid, drawPillTag } = global.RiverEngine;
    function text(id, value) {
        const el = document.getElementById(id);
        if (el && el.textContent !== value) el.textContent = value;
    }
    global.WaveScenes.createScene_ch9 = function (canvas) {
        let tab = 'innovation';
        const runner = new SceneRunner(canvas, (ctx, width, height) => {
            const scale = Math.min(1, width / 650);
            ctx.save(); ctx.scale(scale, scale);
            const w = width / scale, h = height / scale;
            drawIndustrialGrid(ctx, w, h);
            if (tab === 'anchor') {
                text('ch9Readout', '绝对阈值 0.05 → 0.20 饱和 · 上限 0.10 · 不读取同伴均值');
                drawPillTag(ctx, 20, 25, '独立事实锚 / 不乘 Ω', C.coral);
                const x0 = 40, y0 = h - 60, gw = w - 80, gh = h - 125;
                ctx.strokeStyle = C.coral; ctx.lineWidth = 3; ctx.beginPath();
                for (let i = 0; i <= 100; i++) {
                    const strength = i / 100 * .25;
                    const y = y0 - smooth((strength - .05) / .15) * gh;
                    if (!i) ctx.moveTo(x0, y); else ctx.lineTo(x0 + i / 100 * gw, y);
                }
                ctx.stroke();
                for (const [value, label, color] of [
                    [.035, '隐式上限 .035', C.muted],
                    [.05, '激活 .05', C.amber], [.20, '饱和 .20', C.coral],
                ]) {
                    const x = x0 + value / .25 * gw;
                    ctx.strokeStyle = color; ctx.setLineDash([3, 4]); ctx.beginPath();
                    ctx.moveTo(x, 70); ctx.lineTo(x, y0); ctx.stroke(); ctx.setLineDash([]);
                    drawPillTag(ctx, x, value === .035 ? 58 : h - 32, label, color, 'center');
                }
                text('v3ScoreStory', '纯隐式锚强度最多 0.035，低于默认激活阈值。直接答案角色还要求真实显式精确接触与正文闭合 ≥0.55；角色本身不分配奖励。');
            } else {
                text('ch9Readout', 'B + P + G + A · P 不乘 Ω · P + G ≤ 0.08 · A ≤ 0.10');
                drawPillTag(ctx, 20, 25, '候选自身证据 / 没有同伴互砍', C.patina);
                const colors = [C.patina, C.mint, C.amber, C.coral];
                const barX = 150, barW = w - 180;
                examples.forEach((example, i) => {
                    const result = scoreCandidate(example.input);
                    const y = 75 + i * (h - 120) / 4;
                    ctx.textAlign = 'left'; ctx.font = '12px "Microsoft YaHei", sans-serif';
                    ctx.fillStyle = C.bone; ctx.fillText(example.name, 20, y + 12);
                    let x = barX;
                    [result.base, result.path, result.graph, result.anchor].forEach((v, j) => {
                        ctx.fillStyle = colors[j]; ctx.fillRect(x, y, barW * v, 16); x += barW * v;
                    });
                    ctx.font = '10px monospace'; ctx.fillStyle = C.bone;
                    ctx.fillText(`B ${result.base.toFixed(3)}  P ${result.path.toFixed(3)}  G ${result.graph.toFixed(3)}  A ${result.anchor.toFixed(3)}  = ${result.score.toFixed(3)}`, barX, y + 33);
                });
                text('v3ScoreStory', '相同证据下，降低 Ω 只缩小图奖励，不扣路径和锚奖励；增加无关候选不改变已有候选自身奖励。原始语义是分数下限，不是名次保证。条形和数字均为简化教学计算。');
            }
            ctx.restore();
        });
        return { start: () => runner.start(), stop: () => runner.stop(),
            setTab(value) { tab = value === 'anchor' ? 'anchor' : 'innovation'; } };
    };
})(window);