/* =================================================================
   v92-scenes.js
   TagMemo Wave V9.2 可视化覆盖层
   - V9.1 固定预算传播核 / 软非回溯 / 有限时域场
   - V9.2 查询诱导式候选曲线 / 四层闭合读出
   - 查询层 Ranvier Ghost Core Tag 预注入
   ================================================================= */

(function (global) {
    'use strict';

    const RE = global.RiverEngine;
    const Scenes = global.WaveScenes;
    if (!RE || !Scenes) return;

    const {
        COLORS, hexToRgba, lerp, clamp,
        RiverPath, RiverParticle, GlowDot,
        BackgroundDriftField, SceneRunner, drawSmoothPath
    } = RE;

    function drawLabel(ctx, text, x, y, color = COLORS.white, align = 'center', size = 11, weight = '') {
        ctx.save();
        ctx.font = `${weight ? `${weight} ` : ''}${size}px "JetBrains Mono", monospace`;
        ctx.textAlign = align;
        ctx.fillStyle = hexToRgba(color, 0.9);
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function drawNode(ctx, node, energy = 0, options = {}) {
        const color = options.color || node.color || COLORS.cyan;
        const radius = (options.radius || node.radius || 5) * (1 + energy * 0.38);
        ctx.save();
        ctx.shadowBlur = 10 + energy * 22;
        ctx.shadowColor = color;
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
        gradient.addColorStop(0, hexToRgba(color, 0.95));
        gradient.addColorStop(0.45, hexToRgba(color, 0.28 + energy * 0.25));
        gradient.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hexToRgba(color, 0.95);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 0.58, 0, Math.PI * 2);
        ctx.fill();
        if (energy > 0.04) {
            ctx.strokeStyle = hexToRgba(color, 0.25 + energy * 0.65);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5 + energy * 7, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        if (node.label) drawLabel(ctx, node.label, node.x, node.y - radius - 9, color);
    }

    function drawArrow(ctx, a, b, color, alpha = 0.5, width = 1.2, reverse = false) {
        const from = reverse ? b : a;
        const to = reverse ? a : b;
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const t = 0.68;
        const x = lerp(from.x, to.x, t);
        const y = lerp(from.y, to.y, t);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(angle - 0.5) * 6, y - Math.sin(angle - 0.5) * 6);
        ctx.lineTo(x - Math.cos(angle + 0.5) * 6, y - Math.sin(angle + 0.5) * 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function samplePolyline(points, progress) {
        if (points.length < 2) return points[0] || { x: 0, y: 0 };
        const scaled = clamp(progress, 0, 0.999999) * (points.length - 1);
        const index = Math.floor(scaled);
        const local = scaled - index;
        return {
            x: lerp(points[index].x, points[index + 1].x, local),
            y: lerp(points[index].y, points[index + 1].y, local)
        };
    }

    // Hero：六条支流不再汇入一个“无限蓄水池”，而是收束成查询场并读出一条候选曲线。
    Scenes.createScene_hero = function (canvas) {
        let drift;
        let fieldNodes = [];
        let paths = [];
        let particles = [];

        function build(w, h) {
            drift = new BackgroundDriftField(w, h, 52, COLORS.violet);
            fieldNodes = [
                { x: w * 0.18, y: h * 0.25, label: 'seed', color: COLORS.gold },
                { x: w * 0.31, y: h * 0.60, label: 'hop 1', color: COLORS.cyan },
                { x: w * 0.46, y: h * 0.34, label: 'hop 2', color: COLORS.blue },
                { x: w * 0.61, y: h * 0.64, label: 'curve', color: COLORS.violet },
                { x: w * 0.77, y: h * 0.38, label: 'closure', color: COLORS.pink }
            ];
            paths = [];
            particles = [];
            for (let i = 0; i < fieldNodes.length - 1; i++) {
                const a = fieldNodes[i];
                const b = fieldNodes[i + 1];
                const path = new RiverPath(
                    a,
                    { x: lerp(a.x, b.x, 0.32), y: a.y + (i % 2 ? -55 : 55) },
                    { x: lerp(a.x, b.x, 0.68), y: b.y + (i % 2 ? 45 : -45) },
                    b,
                    { color: fieldNodes[i + 1].color, width: 2, opacity: 0.42, glow: true }
                );
                paths.push(path);
                for (let p = 0; p < 10; p++) {
                    particles.push(new RiverParticle(path, {
                        startT: p / 10,
                        speed: 0.0025 + i * 0.00025,
                        color: fieldNodes[i + 1].color,
                        size: 1.4 + (i === 0 ? 0.8 : 0),
                        opacity: 0.8,
                        tail: 12
                    }));
                }
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            drift.update();
            drift.draw(ctx);
            paths.forEach(path => path.draw(ctx));
            particles.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });
            fieldNodes.forEach((node, index) => {
                const fir = Math.pow(0.6, index);
                drawNode(ctx, node, fir, { radius: 5 + fir * 4 });
            });

            const phase = (time % 6) / 6;
            const point = samplePolyline(fieldNodes, phase);
            ctx.save();
            ctx.shadowBlur = 24;
            ctx.shadowColor = COLORS.gold;
            ctx.fillStyle = COLORS.gold;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            drawLabel(ctx, 'bounded wave  →  ordered curve  →  closure', w * 0.5, h * 0.82, COLORS.cyan, 'center', 12, 'bold');
            drawLabel(ctx, 'ΣPᵢⱼ ≤ m_out', w * 0.5, h * 0.86, COLORS.gold);
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    };

    // Chapter 5：查询场局部连续化，并同时检验三条候选 Tag 曲线。
    Scenes.createScene_ch5 = function (canvas) {
        let field = [];
        let curves = [];

        function build(w, h) {
            field = [
                { x: w * 0.16, y: h * 0.48, energy: 1.00, label: 'core', color: COLORS.gold },
                { x: w * 0.29, y: h * 0.30, energy: 0.72, label: 'seed', color: COLORS.cyan },
                { x: w * 0.43, y: h * 0.55, energy: 0.46, label: 'hop 1', color: COLORS.blue },
                { x: w * 0.58, y: h * 0.35, energy: 0.28, label: 'hop 2', color: COLORS.violet }
            ];
            curves = [
                {
                    name: 'A · direct',
                    color: COLORS.cyan,
                    score: 0.91,
                    points: [
                        { x: w * 0.12, y: h * 0.50 },
                        { x: w * 0.27, y: h * 0.31 },
                        { x: w * 0.43, y: h * 0.53 },
                        { x: w * 0.61, y: h * 0.38 },
                        { x: w * 0.84, y: h * 0.28 }
                    ]
                },
                {
                    name: 'B · structural',
                    color: COLORS.violet,
                    score: 0.67,
                    points: [
                        { x: w * 0.12, y: h * 0.50 },
                        { x: w * 0.30, y: h * 0.62 },
                        { x: w * 0.47, y: h * 0.56 },
                        { x: w * 0.64, y: h * 0.57 },
                        { x: w * 0.84, y: h * 0.55 }
                    ]
                },
                {
                    name: 'C · isolated',
                    color: COLORS.pink,
                    score: 0.12,
                    points: [
                        { x: w * 0.12, y: h * 0.50 },
                        { x: w * 0.31, y: h * 0.77 },
                        { x: w * 0.49, y: h * 0.72 },
                        { x: w * 0.67, y: h * 0.79 },
                        { x: w * 0.84, y: h * 0.78 }
                    ]
                }
            ];
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            field.forEach(node => {
                const radius = 36 + node.energy * 70;
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
                gradient.addColorStop(0, hexToRgba(node.color, 0.12 + node.energy * 0.16));
                gradient.addColorStop(1, hexToRgba(node.color, 0));
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fill();
                drawNode(ctx, node, node.energy, { radius: 4 + node.energy * 3 });
            });

            curves.forEach((curve, curveIndex) => {
                drawSmoothPath(ctx, curve.points, {
                    color: hexToRgba(curve.color, curveIndex === 2 ? 0.35 : 0.82),
                    width: curveIndex === 0 ? 3 : 1.7,
                    shadow: curveIndex !== 2,
                    shadowColor: curve.color,
                    shadowBlur: 12,
                    dashed: curveIndex === 2 ? [4, 7] : null
                });
                curve.points.slice(1, -1).forEach((point, index) => {
                    drawNode(ctx, { ...point, color: curve.color }, curve.score * (1 - index * 0.08), { radius: 3.5 });
                });
                const closure = curve.points[curve.points.length - 1];
                drawNode(ctx, { ...closure, label: curve.name, color: curve.color }, curve.score, { radius: 6 });
                drawLabel(ctx, `Geo=${curve.score.toFixed(2)}`, closure.x, closure.y + 22, curve.color);
                const moving = samplePolyline(curve.points, ((time * (0.12 + curveIndex * 0.025)) + curveIndex * 0.24) % 1);
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = curve.color;
                ctx.fillStyle = curve.color;
                ctx.beginPath();
                ctx.arc(moving.x, moving.y, curveIndex === 0 ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.pink, 0.36);
            ctx.setLineDash([7, 7]);
            ctx.beginPath();
            ctx.moveTo(w * 0.12, h * 0.50);
            ctx.lineTo(w * 0.84, h * 0.28);
            ctx.stroke();
            ctx.restore();
            drawLabel(ctx, 'KNN endpoint line', w * 0.56, h * 0.22, COLORS.pink);
            drawLabel(ctx, 'U(x) · continuity · action · closure', 16, 24, COLORS.cyan, 'left', 11, 'bold');
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    };

    // Chapter 6：有向、有限、带前驱记忆的波前。
    Scenes.createScene_ch6 = function (canvas) {
        let nodes = [];
        let edges = [];
        let firedAt = -100;

        function build(w, h) {
            nodes = [
                { x: w * 0.13, y: h * 0.50, label: 'seed', color: COLORS.gold, hop: 0 },
                { x: w * 0.32, y: h * 0.28, label: 'h¹', color: COLORS.cyan, hop: 1 },
                { x: w * 0.32, y: h * 0.70, label: 'h¹', color: COLORS.cyan, hop: 1 },
                { x: w * 0.53, y: h * 0.40, label: 'h²', color: COLORS.blue, hop: 2 },
                { x: w * 0.55, y: h * 0.74, label: 'h²', color: COLORS.blue, hop: 2 },
                { x: w * 0.75, y: h * 0.30, label: 'h³', color: COLORS.violet, hop: 3 },
                { x: w * 0.82, y: h * 0.65, label: 'h³', color: COLORS.violet, hop: 3 }
            ];
            edges = [
                [0, 1, 0.52], [0, 2, 0.38], [1, 3, 0.44], [2, 3, 0.24],
                [2, 4, 0.40], [3, 5, 0.36], [3, 6, 0.18], [4, 6, 0.31]
            ];
        }

        function trigger() {
            firedAt = performance.now() / 1000;
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            const now = performance.now() / 1000;
            if (now - firedAt > 6) firedAt = now;
            const age = now - firedAt;

            edges.forEach(([a, b, weight]) => {
                const active = age > nodes[a].hop * 0.55 && age < nodes[b].hop * 0.55 + 1.7;
                drawArrow(ctx, nodes[a], nodes[b], active ? COLORS.cyan : COLORS.blue, active ? 0.8 : 0.18, active ? 1.8 : 0.7);
                if (a === 1 && b === 3) {
                    drawArrow(ctx, nodes[a], nodes[b], COLORS.pink, 0.23, 0.8, true);
                    drawLabel(ctx, 'return × 0.15', lerp(nodes[a].x, nodes[b].x, 0.5), lerp(nodes[a].y, nodes[b].y, 0.5) - 9, COLORS.pink);
                }
                if (active) {
                    const local = clamp((age - nodes[a].hop * 0.55) / 0.55, 0, 1);
                    const point = { x: lerp(nodes[a].x, nodes[b].x, local), y: lerp(nodes[a].y, nodes[b].y, local) };
                    ctx.fillStyle = hexToRgba(COLORS.cyan, weight);
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2 + weight * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            nodes.forEach(node => {
                const arrival = node.hop * 0.55;
                const localAge = age - arrival;
                const fir = localAge >= 0 ? Math.pow(0.6, node.hop) * Math.exp(-Math.max(0, localAge) * 0.32) : 0;
                drawNode(ctx, node, clamp(fir, 0, 1), { radius: 6 });
                drawLabel(ctx, `w${node.hop}=${(Math.pow(0.6, node.hop)).toFixed(2)}`, node.x, node.y + 24, node.color);
            });

            const barX = 18;
            const barY = h - 50;
            drawLabel(ctx, 'normalized FIR field', barX, barY - 8, COLORS.white, 'left');
            [1, 0.6, 0.36, 0.216].forEach((value, index) => {
                ctx.fillStyle = hexToRgba([COLORS.gold, COLORS.cyan, COLORS.blue, COLORS.violet][index], 0.8);
                ctx.fillRect(barX + index * 54, barY, 42 * value, 6);
                drawLabel(ctx, `h${index}`, barX + index * 54, barY + 20, COLORS.muted, 'left', 9);
            });
            drawLabel(ctx, 'finite hops · finite states · finite mass', w - 16, 24, COLORS.cyan, 'right', 10, 'bold');
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop(), trigger };
    };

    // Chapter 7：源节点总预算固定，虫洞仅重新分配份额。
    Scenes.createScene_ch7 = function (canvas) {
        let source;
        let targets = [];
        let allocationStarted = 0;

        function build(w, h) {
            source = { x: w * 0.18, y: h * 0.50, label: 'source', color: COLORS.gold };
            targets = [
                { x: w * 0.74, y: h * 0.20, label: 'local A', color: COLORS.blue, share: 0.18 },
                { x: w * 0.81, y: h * 0.43, label: 'local B', color: COLORS.cyan, share: 0.22 },
                { x: w * 0.75, y: h * 0.72, label: 'local C', color: COLORS.violet, share: 0.15 },
                { x: w * 0.50, y: h * 0.50, label: 'wormhole', color: COLORS.pink, share: 0.40 }
            ];
            allocationStarted = performance.now() / 1000;
        }

        function trigger() {
            allocationStarted = performance.now() / 1000;
        }

        const runner = new SceneRunner(canvas, (ctx, w, h) => {
            const age = performance.now() / 1000 - allocationStarted;
            const cycle = (age % 3.8) / 3.8;
            const total = targets.reduce((sum, target) => sum + target.share, 0);

            targets.forEach((target, index) => {
                const isWormhole = index === targets.length - 1;
                drawArrow(ctx, source, target, target.color, 0.25 + target.share, 1 + target.share * 6);
                const point = {
                    x: lerp(source.x, target.x, (cycle + index * 0.13) % 1),
                    y: lerp(source.y, target.y, (cycle + index * 0.13) % 1)
                };
                ctx.save();
                ctx.shadowBlur = isWormhole ? 18 : 9;
                ctx.shadowColor = target.color;
                ctx.fillStyle = target.color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2.5 + target.share * 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                drawNode(ctx, target, target.share, { radius: isWormhole ? 8 : 5 });
                drawLabel(ctx, `${Math.round(target.share * 100)}%`, target.x, target.y + 25, target.color);
            });

            drawNode(ctx, source, 0.95, { radius: 10 });
            const meterX = w * 0.12;
            const meterY = h * 0.87;
            const meterW = w * 0.76;
            let offset = 0;
            targets.forEach(target => {
                const width = meterW * target.share / total;
                ctx.fillStyle = hexToRgba(target.color, 0.85);
                ctx.fillRect(meterX + offset, meterY, width, 10);
                offset += width;
            });
            ctx.strokeStyle = hexToRgba(COLORS.white, 0.45);
            ctx.strokeRect(meterX, meterY, meterW, 10);
            drawLabel(ctx, `fixed outbound mass = ${total.toFixed(2)} ≤ 1.00`, w * 0.5, meterY - 10, COLORS.gold);
            drawLabel(ctx, 'wormhole gains share — total bar never grows', w * 0.5, meterY + 30, COLORS.pink);
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop(), trigger };
    };

    // Chapter 9：N 个 Ghost Core 用查询能量开凿临时支流；持久事实图保持不变。
    Scenes.createScene_ch9 = function (canvas) {
        let query;
        let fused;
        let ghosts = [];
        let leftBasin = [];
        let rightBasin = [];
        let tributaries = [];
        let particles = [];

        function build(w, h) {
            query = { x: w * 0.50, y: h * 0.82, label: 'query energy', color: COLORS.cyan };
            fused = { x: w * 0.50, y: h * 0.18, label: 'q′ · temporary field', color: COLORS.violet };
            leftBasin = [
                { x: w * 0.10, y: h * 0.34, label: 'Tag basin A', color: COLORS.blue },
                { x: w * 0.18, y: h * 0.51, label: '', color: COLORS.blue },
                { x: w * 0.11, y: h * 0.68, label: '', color: COLORS.blue }
            ];
            rightBasin = [
                { x: w * 0.90, y: h * 0.34, label: 'Tag basin B', color: COLORS.pink },
                { x: w * 0.82, y: h * 0.51, label: '', color: COLORS.pink },
                { x: w * 0.89, y: h * 0.68, label: '', color: COLORS.pink }
            ];
            ghosts = [
                { x: w * 0.32, y: h * 0.58, label: 'Ghost₁ · −1', color: COLORS.gold, energy: 0.92 },
                { x: w * 0.50, y: h * 0.48, label: 'Ghost₂ · −2', color: COLORS.gold, energy: 0.78 },
                { x: w * 0.68, y: h * 0.58, label: 'Ghostₙ · −n', color: COLORS.gold, energy: 0.66 }
            ];
            tributaries = [];
            particles = [];

            ghosts.forEach((ghost, index) => {
                const queryBranch = new RiverPath(
                    query,
                    { x: lerp(query.x, ghost.x, 0.35), y: query.y - h * 0.13 },
                    { x: lerp(query.x, ghost.x, 0.72), y: ghost.y + h * 0.08 },
                    ghost,
                    { color: COLORS.gold, width: 1.5 + ghost.energy, opacity: 0.62, glow: true }
                );
                const fieldBranch = new RiverPath(
                    ghost,
                    { x: ghost.x, y: ghost.y - h * 0.14 },
                    { x: lerp(ghost.x, fused.x, 0.72), y: fused.y + h * 0.10 },
                    fused,
                    { color: COLORS.violet, width: 1.4 + ghost.energy, opacity: 0.58, glow: true }
                );
                const leftBridge = new RiverPath(
                    leftBasin[index % leftBasin.length],
                    { x: w * 0.22, y: ghost.y - h * 0.05 },
                    { x: ghost.x - w * 0.05, y: ghost.y },
                    ghost,
                    { color: COLORS.blue, width: 1.2, opacity: 0.38, glow: true }
                );
                const rightBridge = new RiverPath(
                    ghost,
                    { x: ghost.x + w * 0.05, y: ghost.y },
                    { x: w * 0.78, y: ghost.y - h * 0.05 },
                    rightBasin[index % rightBasin.length],
                    { color: COLORS.pink, width: 1.2, opacity: 0.38, glow: true }
                );
                [queryBranch, fieldBranch, leftBridge, rightBridge].forEach((path, pathIndex) => {
                    tributaries.push(path);
                    const count = pathIndex < 2 ? 5 : 3;
                    for (let particleIndex = 0; particleIndex < count; particleIndex++) {
                        particles.push(new RiverParticle(path, {
                            startT: particleIndex / count,
                            speed: 0.0026 + index * 0.00035,
                            color: path.color,
                            size: 1.2 + ghost.energy,
                            opacity: 0.78,
                            tail: 9
                        }));
                    }
                });
            });
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.blue, 0.18);
            ctx.setLineDash([4, 7]);
            ctx.strokeRect(w * 0.04, h * 0.22, w * 0.20, h * 0.54);
            ctx.strokeStyle = hexToRgba(COLORS.pink, 0.18);
            ctx.strokeRect(w * 0.76, h * 0.22, w * 0.20, h * 0.54);
            ctx.restore();

            [leftBasin, rightBasin].forEach((basin, basinIndex) => {
                basin.forEach((node, index) => {
                    if (index > 0) drawArrow(ctx, basin[index - 1], node, basinIndex ? COLORS.pink : COLORS.blue, 0.18, 0.7);
                    drawNode(ctx, node, 0.18, { radius: index === 0 ? 6 : 4 });
                });
            });

            tributaries.forEach(path => path.draw(ctx));
            particles.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });

            ghosts.forEach((ghost, index) => {
                const pulse = ghost.energy * (0.82 + Math.sin(time * 2.4 + index) * 0.12);
                drawNode(ctx, ghost, pulse, { radius: 7 });
                drawLabel(ctx, `E=${pulse.toFixed(2)}`, ghost.x, ghost.y + 24, COLORS.gold, 'center', 9);
            });
            drawNode(ctx, query, 0.72, { radius: 9 });
            drawNode(ctx, fused, 0.88, { radius: 10 });

            drawLabel(ctx, 'PERSISTENT TAG SEA', w * 0.14, h * 0.18, COLORS.blue, 'center', 9, 'bold');
            drawLabel(ctx, 'PERSISTENT TAG SEA', w * 0.86, h * 0.18, COLORS.pink, 'center', 9, 'bold');
            drawLabel(ctx, 'QUERY-SCOPED RANVIER BRIDGE GROUP', w * 0.5, 24, COLORS.gold, 'center', 10, 'bold');
            drawLabel(ctx, 'Ghost × N creates temporary tributaries · persistent facts stay unchanged', w * 0.5, h * 0.93, COLORS.white, 'center', 10);
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    };

    // Finale：同一条路径先承载有限传播，再被候选曲线和四层闭合读取。
    Scenes.createScene_finale = function (canvas) {
        let nodes = [];
        let particles = [];
        let path;

        function build(w, h) {
            const labels = ['QUERY', 'GHOST', 'KERNEL', 'FIR FIELD', 'U(x)', 'Γc', 'D/S/T', 'C₄'];
            const colors = [COLORS.cyan, COLORS.gold, COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.violet, COLORS.pink, COLORS.gold];
            nodes = labels.map((label, index) => ({
                x: lerp(w * 0.06, w * 0.94, index / (labels.length - 1)),
                y: h * 0.50 + Math.sin(index * 1.35) * h * 0.16,
                label,
                color: colors[index],
                radius: index === labels.length - 1 ? 9 : 6
            }));
            path = nodes;
            particles = Array.from({ length: 22 }, (_, index) => ({
                t: index / 22,
                speed: 0.0025 + (index % 4) * 0.00035,
                color: colors[index % colors.length]
            }));
        }

        const runner = new SceneRunner(canvas, (ctx, w, h) => {
            for (let layer = 5; layer >= 1; layer--) {
                drawSmoothPath(ctx, nodes.map((node, index) => ({
                    x: node.x,
                    y: node.y + (layer - 3) * 5 * Math.sin(index + layer)
                })), {
                    color: hexToRgba(layer % 2 ? COLORS.cyan : COLORS.violet, 0.08 + layer * 0.025),
                    width: 0.7 + layer * 0.35,
                    shadow: layer === 1,
                    shadowColor: COLORS.cyan,
                    shadowBlur: 12
                });
            }

            particles.forEach(particle => {
                particle.t = (particle.t + particle.speed) % 1;
                const point = samplePolyline(path, particle.t);
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
                ctx.fillStyle = hexToRgba(particle.color, 0.82);
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            nodes.forEach((node, index) => {
                const energy = index < 4 ? Math.pow(0.72, index) : 0.62 + index * 0.035;
                drawNode(ctx, node, energy, { radius: node.radius });
            });

            drawLabel(ctx, 'PROPAGATION', w * 0.26, 30, COLORS.cyan, 'center', 11, 'bold');
            drawLabel(ctx, 'THE SAME PATH', w * 0.50, 30, COLORS.gold, 'center', 11, 'bold');
            drawLabel(ctx, 'GEODESIC READOUT', w * 0.76, 30, COLORS.pink, 'center', 11, 'bold');
            drawLabel(ctx, 'wave field  ≈  path geometry  ·  one equation remains', w * 0.5, h - 22, COLORS.white, 'center', 12, 'bold');
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    };
})(window);