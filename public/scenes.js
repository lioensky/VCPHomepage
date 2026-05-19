/* =================================================================
   scenes.js
   每个章节的具体场景渲染逻辑
   每个 createScene_X(canvas) 返回 { start(), stop(), trigger?(), setMode?() }
   ================================================================= */

(function (global) {
    'use strict';

    const RE = global.RiverEngine;
    const { COLORS, hexToRgba, lerp, clamp, randRange,
        RiverPath, RiverParticle, GlowDot, SpikeWave, WormholeFlare,
        BackgroundDriftField, SceneRunner, drawSmoothPath, drawConnection } = RE;

    // ============================================================
    // 全局背景：所有页面共享的"暗流" canvas
    // ============================================================
    function createGlobalRiver(canvas) {
        let dims = null;
        let drift = null;
        let paths = [];
        let particles = [];

        function rebuild(w, h) {
            paths = [];
            particles = [];
            // 几条贯穿屏幕的暗河
            const palette = [COLORS.blue, COLORS.violet, COLORS.cyan];
            const lanes = 4;
            for (let i = 0; i < lanes; i++) {
                const y0 = (h / (lanes + 1)) * (i + 1) + randRange(-30, 30);
                const yMid1 = y0 + randRange(-80, 80);
                const yMid2 = y0 + randRange(-80, 80);
                const path = new RiverPath(
                    { x: -50, y: y0 },
                    { x: w * 0.33, y: yMid1 },
                    { x: w * 0.67, y: yMid2 },
                    { x: w + 50, y: y0 + randRange(-30, 30) },
                    { color: palette[i % palette.length], opacity: 0.0, glow: false }
                );
                paths.push(path);
                const count = 18;
                for (let j = 0; j < count; j++) {
                    particles.push(new RiverParticle(path, {
                        startT: j / count,
                        speed: randRange(0.0008, 0.002),
                        size: randRange(0.8, 1.8),
                        opacity: randRange(0.3, 0.6),
                        tail: 12,
                    }));
                }
            }
            drift = new BackgroundDriftField(w, h, 60, COLORS.blue);
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drift.update();
            drift.draw(ctx);
            for (const p of particles) {
                p.update();
                p.draw(ctx);
            }
        }, {
            onResize: ({ w, h }) => rebuild(w, h),
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
        };
    }

    // ============================================================
    // Chapter 0 · Hero - 多支流交汇的开场河流
    // ============================================================
    function createScene_hero(canvas) {
        let paths = [];
        let particles = [];
        let dots = [];
        let drift = null;

        function build(w, h) {
            paths = [];
            particles = [];
            dots = [];

            // 多条河汇聚到中央
            const cx = w * 0.5;
            const cy = h * 0.5;
            const sources = [
                { x: 0, y: h * 0.15 },
                { x: w, y: h * 0.18 },
                { x: 0, y: h * 0.85 },
                { x: w, y: h * 0.82 },
                { x: w * 0.2, y: -20 },
                { x: w * 0.8, y: h + 20 },
            ];
            const palette = [COLORS.cyan, COLORS.blue, COLORS.violet, COLORS.pink, COLORS.gold, COLORS.cyan];

            sources.forEach((src, i) => {
                const path = new RiverPath(
                    src,
                    { x: lerp(src.x, cx, 0.4) + randRange(-50, 50), y: lerp(src.y, cy, 0.4) + randRange(-40, 40) },
                    { x: lerp(src.x, cx, 0.75) + randRange(-30, 30), y: lerp(src.y, cy, 0.75) + randRange(-30, 30) },
                    { x: cx + randRange(-15, 15), y: cy + randRange(-15, 15) },
                    { color: palette[i % palette.length], opacity: 0.35, width: 1.5, glow: true }
                );
                paths.push(path);

                const count = 35;
                for (let j = 0; j < count; j++) {
                    particles.push(new RiverParticle(path, {
                        startT: j / count,
                        speed: randRange(0.002, 0.005),
                        size: randRange(1.2, 2.6),
                        opacity: randRange(0.6, 1),
                        tail: 14,
                    }));
                }
            });

            // 中央枢纽节点
            dots.push(new GlowDot(cx, cy, {
                color: COLORS.cyan,
                radius: 12,
                label: 'TagMemo · v8.2',
                pulseSpeed: 0.06,
            }));

            // 散布的远端 Tag
            const farTags = [
                { x: w * 0.15, y: h * 0.3, label: 'VCP', color: COLORS.violet },
                { x: w * 0.85, y: h * 0.3, label: 'RAG', color: COLORS.blue },
                { x: w * 0.18, y: h * 0.72, label: '语义', color: COLORS.cyan },
                { x: w * 0.82, y: h * 0.7, label: '河道', color: COLORS.pink },
                { x: w * 0.5, y: h * 0.12, label: '浪潮', color: COLORS.gold },
                { x: w * 0.5, y: h * 0.88, label: '流形', color: COLORS.cyan },
            ];
            farTags.forEach(t => dots.push(new GlowDot(t.x, t.y, {
                color: t.color, radius: 4, label: t.label,
            })));

            drift = new BackgroundDriftField(w, h, 50, COLORS.violet);
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drift.update();
            drift.draw(ctx);

            // 河道
            for (const p of paths) p.draw(ctx);
            // 粒子
            for (const p of particles) {
                p.update();
                p.draw(ctx);
            }
            // 节点
            for (const d of dots) {
                d.update();
                d.draw(ctx);
            }
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 1 · 河流的诞生 - 单篇日记里的 Tag 序列
    // ============================================================
    function createScene_ch1(canvas) {
        let path = null;
        let particles = [];
        let tagDots = [];
        const TAG_NAMES = ['VCP', '架构', 'RAG', '浪潮', '语义', '动力学', '流形'];
        const PHI_MAX = 0.9, PHI_MIN = 0.5;

        function build(w, h) {
            // 一条蜿蜒的主河
            path = new RiverPath(
                { x: w * 0.05, y: h * 0.5 },
                { x: w * 0.3, y: h * 0.25 },
                { x: w * 0.7, y: h * 0.75 },
                { x: w * 0.95, y: h * 0.5 },
                { color: COLORS.cyan, opacity: 0.5, width: 2.5, glow: true }
            );

            particles = [];
            const N = 40;
            for (let i = 0; i < N; i++) {
                particles.push(new RiverParticle(path, {
                    startT: i / N,
                    speed: randRange(0.003, 0.005),
                    size: randRange(1.5, 3),
                    opacity: randRange(0.7, 1),
                    color: COLORS.cyan,
                    tail: 12,
                }));
            }

            // 沿河放 Tag 节点 (势能由前到后递减)
            tagDots = [];
            const n = TAG_NAMES.length;
            for (let i = 0; i < n; i++) {
                const t = (i + 0.5) / n;
                const pt = path.sample(t);
                const phi = PHI_MAX - (PHI_MAX - PHI_MIN) * (i / Math.max(1, n - 1));
                tagDots.push({
                    x: pt.x,
                    y: pt.y,
                    label: TAG_NAMES[i],
                    phi: phi,
                    radius: 5 + phi * 6,
                    color: i === 0 ? COLORS.gold : COLORS.cyan,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 河道
            path.draw(ctx);

            // 粒子
            for (const p of particles) {
                p.update();
                p.draw(ctx);
            }

            // Tag 节点（带势能可视化）
            for (let i = 0; i < tagDots.length; i++) {
                const d = tagDots[i];
                d.pulse += 0.04;
                const pulse = 0.85 + Math.sin(d.pulse) * 0.15;

                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = d.color;

                // 势能光晕
                const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius * 2.4);
                grad.addColorStop(0, hexToRgba(d.color, pulse * 0.85));
                grad.addColorStop(0.6, hexToRgba(d.color, 0.3 * pulse));
                grad.addColorStop(1, hexToRgba(d.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius * 2.4, 0, Math.PI * 2);
                ctx.fill();

                // 内核
                ctx.fillStyle = hexToRgba(d.color, 0.95);
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius * 0.55, 0, Math.PI * 2);
                ctx.fill();

                // 标签 + Φ
                ctx.shadowBlur = 0;
                ctx.font = 'bold 13px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = hexToRgba(COLORS.white, 0.95);
                ctx.fillText(d.label, d.x, d.y - d.radius - 10);

                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.fillStyle = hexToRgba(d.color, 0.85);
                ctx.fillText(`Φ=${d.phi.toFixed(2)}`, d.x, d.y + d.radius + 16);
                ctx.restore();
            }
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 2 · 河道网络 - 多支流汇成网络
    // ============================================================
    function createScene_ch2(canvas) {
        let nodes = [];
        let edges = []; // {a, b, weight}
        let paths = []; // 一些主河流
        let particles = [];
        const NODE_LABELS = ['VCP', 'RAG', '浪潮', '语义', 'Tag', '河道', '动力学', '残差', 'LIF', '虫洞', '流形', '直觉'];

        function build(w, h) {
            nodes = [];
            edges = [];
            paths = [];
            particles = [];

            const padX = 60, padY = 60;
            // 节点散布在画布上 - 准随机但避免重叠
            const N = NODE_LABELS.length;
            const grid = [];
            for (let i = 0; i < N; i++) {
                let attempts = 0, x, y, ok = false;
                while (!ok && attempts < 30) {
                    x = randRange(padX, w - padX);
                    y = randRange(padY, h - padY);
                    ok = grid.every(g => Math.hypot(g.x - x, g.y - y) > 70);
                    attempts++;
                }
                grid.push({ x, y });
                const isHub = i < 3;
                nodes.push({
                    x, y,
                    label: NODE_LABELS[i],
                    color: isHub ? COLORS.cyan : (i < 6 ? COLORS.blue : COLORS.violet),
                    radius: isHub ? 8 : 5,
                    pulse: Math.random() * Math.PI * 2,
                    energy: 0,
                });
            }

            // 边：每个节点连2~4个最近邻
            for (let i = 0; i < N; i++) {
                const dists = [];
                for (let j = 0; j < N; j++) if (j !== i) {
                    dists.push({ j, d: Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) });
                }
                dists.sort((a, b) => a.d - b.d);
                const k = 2 + Math.floor(Math.random() * 3);
                for (let m = 0; m < k && m < dists.length; m++) {
                    const j = dists[m].j;
                    if (i < j && !edges.find(e => e.a === i && e.b === j)) {
                        edges.push({
                            a: i, b: j,
                            weight: randRange(0.3, 1),
                            phase: Math.random() * Math.PI * 2,
                        });
                    }
                }
            }

            // 沿主要边创建河流粒子
            edges.forEach(e => {
                if (Math.random() > 0.55) return; // 只在60%的边上跑粒子
                const p1 = nodes[e.a], p2 = nodes[e.b];
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len, ny = dx / len;
                const curve = Math.min(60, len * 0.2) * (Math.random() < 0.5 ? 1 : -1);
                const path = new RiverPath(
                    p1, { x: mx + nx * curve * 0.5, y: my + ny * curve * 0.5 },
                    { x: mx + nx * curve, y: my + ny * curve },
                    p2,
                    { color: e.weight > 0.7 ? COLORS.cyan : COLORS.blue, opacity: 0, glow: false }
                );
                paths.push(path);
                const count = 4 + Math.floor(e.weight * 6);
                for (let k = 0; k < count; k++) {
                    particles.push(new RiverParticle(path, {
                        startT: k / count,
                        speed: randRange(0.003, 0.006),
                        size: randRange(1, 2),
                        opacity: randRange(0.5, 0.9),
                        tail: 8,
                    }));
                }
            });
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 边（拓扑骨架）
            ctx.save();
            for (const e of edges) {
                e.phase += 0.03;
                const a = nodes[e.a], b = nodes[e.b];
                const alpha = 0.18 + e.weight * 0.3 + Math.sin(e.phase) * 0.08;
                drawConnection(ctx, a, b, {
                    color: hexToRgba(COLORS.blue, alpha),
                    width: 0.6 + e.weight * 1.5,
                    shadow: true,
                    shadowColor: COLORS.blue,
                    shadowBlur: 4,
                });
            }
            ctx.restore();

            // 粒子（支流水）
            for (const p of particles) {
                p.update();
                p.draw(ctx);
            }

            // 节点
            for (const n of nodes) {
                n.pulse += 0.04;
                const pulse = 0.85 + Math.sin(n.pulse) * 0.15;
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = n.color;
                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.3);
                grad.addColorStop(0, hexToRgba(n.color, pulse));
                grad.addColorStop(0.5, hexToRgba(n.color, 0.4 * pulse));
                grad.addColorStop(1, hexToRgba(n.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 2.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hexToRgba(n.color, 0.95);
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 0.55, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.font = '11px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = hexToRgba(COLORS.white, 0.85);
                ctx.fillText(n.label, n.x, n.y - n.radius - 7);
                ctx.restore();
            }
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 3 · 顺流 vs 逆流
    // ============================================================
    function createScene_ch3(canvas) {
        let mode = 'forward'; // 'forward' | 'backward'
        let path = null;
        let dotA = null, dotB = null;
        let forwardParticles = [];
        let backwardParticles = [];
        let dimensions = null;

        function build(w, h) {
            dimensions = { w, h };
            path = new RiverPath(
                { x: w * 0.1, y: h * 0.5 },
                { x: w * 0.35, y: h * 0.2 },
                { x: w * 0.65, y: h * 0.8 },
                { x: w * 0.9, y: h * 0.5 },
                { color: COLORS.blue, opacity: 0.4, width: 2.5, glow: true }
            );

            dotA = { x: w * 0.1, y: h * 0.5, label: 'A · 源头\nΦ = 0.9', color: COLORS.gold, radius: 10 };
            dotB = { x: w * 0.9, y: h * 0.5, label: 'B · 末端\nΦ = 0.5', color: COLORS.cyan, radius: 8 };

            forwardParticles = [];
            for (let i = 0; i < 30; i++) {
                forwardParticles.push(new RiverParticle(path, {
                    startT: i / 30,
                    speed: randRange(0.004, 0.007),
                    size: randRange(1.8, 3),
                    color: COLORS.cyan,
                    direction: 1,
                    tail: 14,
                }));
            }
            backwardParticles = [];
            for (let i = 0; i < 13; i++) { // 数量少 = 阻尼大
                backwardParticles.push(new RiverParticle(path, {
                    startT: i / 13,
                    speed: randRange(0.0012, 0.0028), // 慢 = 0.42 阻尼
                    size: randRange(1.2, 2.2),
                    color: COLORS.pink,
                    direction: -1,
                    opacity: randRange(0.4, 0.7),
                    tail: 8,
                }));
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            path.draw(ctx);

            // 公式标签
            ctx.save();
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillStyle = hexToRgba(COLORS.cyan, 0.9);
            ctx.textAlign = 'left';
            ctx.fillText('forwardGain  = 1.00', 18, 24);
            ctx.fillStyle = hexToRgba(COLORS.pink, 0.9);
            ctx.fillText('reverseGain  = 0.42', 18, 42);
            ctx.fillStyle = hexToRgba(COLORS.violet, 0.9);
            ctx.fillText('guard ≤ × 0.95', 18, 60);
            ctx.restore();

            // 渲染对应方向的粒子
            if (mode === 'forward') {
                for (const p of forwardParticles) {
                    p.update();
                    p.draw(ctx);
                }
            } else {
                for (const p of backwardParticles) {
                    p.update();
                    p.draw(ctx);
                }
            }

            // 端点
            [dotA, dotB].forEach(d => {
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = d.color;
                const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius * 2.5);
                grad.addColorStop(0, hexToRgba(d.color, 1));
                grad.addColorStop(0.5, hexToRgba(d.color, 0.4));
                grad.addColorStop(1, hexToRgba(d.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius * 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hexToRgba(d.color, 0.95);
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.radius * 0.55, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.fillStyle = hexToRgba(COLORS.white, 0.95);
                ctx.font = 'bold 12px "Inter", sans-serif';
                ctx.textAlign = 'center';
                const lines = d.label.split('\n');
                lines.forEach((line, i) => {
                    ctx.font = i === 0 ? 'bold 13px "Inter", sans-serif' : '10px "JetBrains Mono", monospace';
                    ctx.fillStyle = i === 0 ? hexToRgba(COLORS.white, 0.95) : hexToRgba(d.color, 0.85);
                    ctx.fillText(line, d.x, d.y - d.radius - 18 + i * 14);
                });
                ctx.restore();
            });
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setMode: (m) => { mode = m; },
        };
    }

    // ============================================================
    // Chapter 4 · 钟形阻尼器
    // ============================================================
    function createScene_ch4(canvas) {
        let dims = null;
        // 钟形函数
        function bell(sim) {
            if (sim < 0.15) return 0.4 + sim * 1.0;
            return 0.5 + 0.8 * Math.exp(-((sim - 0.65) ** 2) / (2 * 0.25 * 0.25));
        }

        let cursor = { sim: 0 };
        let direction = 1;

        function build(w, h) { dims = { w, h }; }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 自动巡游 sim: 0 → 1 → 0
            cursor.sim += 0.0035 * direction;
            if (cursor.sim >= 1) { cursor.sim = 1; direction = -1; }
            if (cursor.sim <= 0) { cursor.sim = 0; direction = 1; }

            const padX = 60, padY = 60;
            const x0 = padX, x1 = w - padX;
            const y0 = padY, y1 = h - padY;

            // 坐标系
            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.muted, 0.3);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); // x轴
            ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); // y轴
            ctx.stroke();

            // 网格
            ctx.strokeStyle = hexToRgba(COLORS.muted, 0.12);
            ctx.setLineDash([2, 4]);
            for (let i = 1; i < 10; i++) {
                const x = lerp(x0, x1, i / 10);
                ctx.beginPath();
                ctx.moveTo(x, y0); ctx.lineTo(x, y1);
                ctx.stroke();
            }
            for (let i = 1; i < 6; i++) {
                const y = lerp(y0, y1, i / 6);
                ctx.beginPath();
                ctx.moveTo(x0, y); ctx.lineTo(x1, y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();

            // 标轴
            ctx.save();
            ctx.fillStyle = hexToRgba(COLORS.muted, 0.7);
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('sim → 0', x0, y1 + 22);
            ctx.fillText('0.65', lerp(x0, x1, 0.65), y1 + 22);
            ctx.fillText('sim → 1', x1, y1 + 22);
            ctx.textAlign = 'right';
            ctx.fillText('1.3', x0 - 8, y0 + 4);
            ctx.fillText('0', x0 - 8, y1 + 4);
            ctx.textAlign = 'left';
            ctx.fillText('gain', x0, y0 - 18);
            ctx.restore();

            // 黄金区高亮
            const goldStart = lerp(x0, x1, 0.45);
            const goldEnd = lerp(x0, x1, 0.85);
            ctx.save();
            const grad = ctx.createLinearGradient(goldStart, 0, goldEnd, 0);
            grad.addColorStop(0, hexToRgba(COLORS.gold, 0));
            grad.addColorStop(0.5, hexToRgba(COLORS.gold, 0.16));
            grad.addColorStop(1, hexToRgba(COLORS.gold, 0));
            ctx.fillStyle = grad;
            ctx.fillRect(goldStart, y0, goldEnd - goldStart, y1 - y0);
            ctx.restore();

            // 钟形曲线
            ctx.save();
            ctx.shadowBlur = 16;
            ctx.shadowColor = COLORS.gold;
            ctx.strokeStyle = COLORS.gold;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const samples = 200;
            for (let i = 0; i <= samples; i++) {
                const sim = i / samples;
                const g = bell(sim);
                const x = lerp(x0, x1, sim);
                const y = y1 - (g / 1.3) * (y1 - y0);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // 三个区域标记
            const marks = [
                { sim: 0.05, label: '噪声底', color: COLORS.muted },
                { sim: 0.65, label: 'PEAK', color: COLORS.gold },
                { sim: 0.95, label: '回音壁', color: COLORS.pink },
            ];
            marks.forEach(m => {
                const g = bell(m.sim);
                const x = lerp(x0, x1, m.sim);
                const y = y1 - (g / 1.3) * (y1 - y0);
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = m.color;
                ctx.fillStyle = hexToRgba(m.color, 0.9);
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = hexToRgba(m.color, 0.9);
                ctx.fillText(m.label, x, y - 12);
                ctx.restore();
            });

            // 巡游游标
            const g = bell(cursor.sim);
            const cx = lerp(x0, x1, cursor.sim);
            const cy = y1 - (g / 1.3) * (y1 - y0);
            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.cyan, 0.4);
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx, y0); ctx.lineTo(cx, y1);
            ctx.moveTo(x0, cy); ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.shadowBlur = 16;
            ctx.shadowColor = COLORS.cyan;
            ctx.fillStyle = COLORS.cyan;
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 同步更新 DOM 显示
            const simEl = document.getElementById('ch4SimValue');
            const gainEl = document.getElementById('ch4GainValue');
            if (simEl) simEl.textContent = cursor.sim.toFixed(2);
            if (gainEl) gainEl.textContent = g.toFixed(2);
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 5 · RAG 直线 vs VCP 测地线
    // ============================================================
    function createScene_ch5(canvas) {
        let dims = null;
        let nodes = [];
        let dotQ = null, dotA = null;
        let ragParticles = [];
        let vcpParticles = [];
        let vcpPath = null;

        function build(w, h) {
            dims = { w, h };
            // 起点 / 终点
            dotQ = { x: w * 0.12, y: h * 0.5, label: 'Query', color: COLORS.gold };
            dotA = { x: w * 0.88, y: h * 0.5, label: 'Target', color: COLORS.cyan };

            // 中间地形：模拟"语义山峰"，用一些拓扑节点
            nodes = [];
            // 平坦底层
            for (let i = 0; i < 18; i++) {
                nodes.push({
                    x: randRange(w * 0.18, w * 0.82),
                    y: randRange(h * 0.18, h * 0.82),
                    color: COLORS.blue,
                    radius: randRange(2, 3.5),
                    pulse: Math.random() * Math.PI * 2,
                });
            }
            // VCP 测地线路径：一条绕过中央山峰的曲线
            vcpPath = new RiverPath(
                dotQ,
                { x: w * 0.32, y: h * 0.18 },
                { x: w * 0.68, y: h * 0.18 },
                dotA,
                { color: COLORS.cyan, opacity: 0, glow: false }
            );

            // RAG 粒子（直线穿过山峰，逐个变红/受阻）
            ragParticles = [];
            const ragCount = 12;
            for (let i = 0; i < ragCount; i++) {
                ragParticles.push({
                    t: i / ragCount,
                    speed: randRange(0.003, 0.006),
                    size: randRange(1.5, 2.5),
                });
            }

            // VCP 粒子沿 vcpPath 流动
            vcpParticles = [];
            for (let i = 0; i < 22; i++) {
                vcpParticles.push(new RiverParticle(vcpPath, {
                    startT: i / 22,
                    speed: randRange(0.003, 0.005),
                    size: randRange(1.6, 2.6),
                    color: COLORS.cyan,
                    tail: 14,
                }));
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 中间"山峰" - 半透明白雾
            ctx.save();
            const mountainCx = w * 0.5, mountainCy = h * 0.55, mountainR = h * 0.32;
            const mountGrad = ctx.createRadialGradient(mountainCx, mountainCy, 0, mountainCx, mountainCy, mountainR);
            mountGrad.addColorStop(0, hexToRgba(COLORS.violet, 0.25));
            mountGrad.addColorStop(0.6, hexToRgba(COLORS.violet, 0.08));
            mountGrad.addColorStop(1, hexToRgba(COLORS.violet, 0));
            ctx.fillStyle = mountGrad;
            ctx.beginPath();
            ctx.arc(mountainCx, mountainCy, mountainR, 0, Math.PI * 2);
            ctx.fill();

            // 山峰等高线
            ctx.strokeStyle = hexToRgba(COLORS.violet, 0.35);
            ctx.lineWidth = 1;
            for (let i = 1; i <= 4; i++) {
                ctx.setLineDash([3, 6]);
                ctx.beginPath();
                ctx.arc(mountainCx, mountainCy, mountainR * (i / 4) * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();

            // 拓扑底层散点
            for (const n of nodes) {
                n.pulse += 0.03;
                ctx.save();
                ctx.shadowBlur = 6;
                ctx.shadowColor = n.color;
                ctx.fillStyle = hexToRgba(n.color, 0.5 + Math.sin(n.pulse) * 0.2);
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // RAG 直线（穿山而过 - 红色虚线）
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = COLORS.pink;
            ctx.strokeStyle = hexToRgba(COLORS.pink, 0.7);
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(dotQ.x, dotQ.y);
            ctx.lineTo(dotA.x, dotA.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // RAG 粒子 - 经过山峰时变弱
            for (const rp of ragParticles) {
                rp.t += rp.speed;
                if (rp.t > 1) rp.t -= 1;
                const x = lerp(dotQ.x, dotA.x, rp.t);
                const y = lerp(dotQ.y, dotA.y, rp.t);
                // 山峰中心衰减
                const distFromMountain = Math.hypot(x - mountainCx, y - mountainCy);
                const damp = clamp(distFromMountain / mountainR, 0.15, 1);
                ctx.shadowBlur = 8 * damp;
                ctx.fillStyle = hexToRgba(COLORS.pink, damp);
                ctx.beginPath();
                ctx.arc(x, y, rp.size * damp, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // VCP 测地线（贴地绕山）
            vcpPath.color = COLORS.cyan;
            vcpPath.opacity = 0.5;
            vcpPath.glow = true;
            vcpPath.draw(ctx);

            for (const vp of vcpParticles) {
                vp.update();
                vp.draw(ctx);
            }

            // 端点
            [dotQ, dotA].forEach(d => {
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = d.color;
                const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 22);
                grad.addColorStop(0, hexToRgba(d.color, 1));
                grad.addColorStop(0.5, hexToRgba(d.color, 0.4));
                grad.addColorStop(1, hexToRgba(d.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hexToRgba(d.color, 1);
                ctx.beginPath();
                ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.font = 'bold 13px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = hexToRgba(COLORS.white, 0.95);
                ctx.fillText(d.label, d.x, d.y - 18);
                ctx.restore();
            });

            // 山峰标签
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.font = 'italic 12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = hexToRgba(COLORS.violet, 0.9);
            ctx.fillText('语义曲率 / Semantic Mountain', mountainCx, mountainCy + 6);
            ctx.restore();
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 6 · LIF 脉冲扩散
    // ============================================================
    function createScene_ch6(canvas) {
        let dims = null;
        let nodes = [];
        let edges = [];
        let waves = [];
        let activeNodes = new Set();
        let lastFire = 0;

        function build(w, h) {
            dims = { w, h };
            nodes = [];
            edges = [];
            waves = [];
            activeNodes = new Set();

            // 中央种子节点 + 外围邻居网络
            const cx = w * 0.5, cy = h * 0.5;
            nodes.push({ x: cx, y: cy, label: 'Seed', color: COLORS.gold, radius: 9, energy: 0, isSeed: true });

            // 第一层
            const ring1 = 6;
            for (let i = 0; i < ring1; i++) {
                const a = (Math.PI * 2 * i) / ring1;
                const r = Math.min(w, h) * 0.22;
                nodes.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r,
                    label: ['VCP', 'RAG', '语义', '河道', '动力学', '流形'][i],
                    color: COLORS.cyan,
                    radius: 6,
                    energy: 0,
                });
                edges.push({ a: 0, b: nodes.length - 1, weight: randRange(0.4, 0.8) });
            }

            // 第二层（涌现节点）
            const ring2 = 10;
            for (let i = 0; i < ring2; i++) {
                const a = (Math.PI * 2 * i) / ring2 + Math.PI / ring2;
                const r = Math.min(w, h) * 0.38;
                nodes.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r,
                    label: '',
                    color: COLORS.violet,
                    radius: 4,
                    energy: 0,
                });
                // 连接到最近的第一层节点
                const idx = nodes.length - 1;
                let bestJ = 1, bestD = Infinity;
                for (let j = 1; j <= ring1; j++) {
                    const d = Math.hypot(nodes[j].x - nodes[idx].x, nodes[j].y - nodes[idx].y);
                    if (d < bestD) { bestD = d; bestJ = j; }
                }
                edges.push({ a: bestJ, b: idx, weight: randRange(0.3, 0.6) });
            }
        }

        function fire() {
            // 重置所有节点能量
            for (const n of nodes) n.energy = 0;
            activeNodes.clear();
            waves = [];

            const seed = nodes[0];
            seed.energy = 1;
            activeNodes.add(0);
            waves.push(new SpikeWave(seed.x, seed.y, { color: COLORS.gold, maxRadius: 60, decay: 0.022 }));

            // 多跳传播 (动画式)
            propagateHop(0, 1);
        }

        function propagateHop(fromIdx, hop) {
            if (hop > 3) return;
            const nextNodes = [];
            for (const e of edges) {
                if (e.a === fromIdx || e.b === fromIdx) {
                    const other = e.a === fromIdx ? e.b : e.a;
                    if (!activeNodes.has(other)) nextNodes.push({ idx: other, weight: e.weight });
                }
            }
            const decay = Math.pow(0.55, hop - 1);
            nextNodes.forEach((nn, k) => {
                setTimeout(() => {
                    const n = nodes[nn.idx];
                    n.energy = nn.weight * decay;
                    activeNodes.add(nn.idx);
                    waves.push(new SpikeWave(n.x, n.y, {
                        color: hop === 1 ? COLORS.cyan : COLORS.violet,
                        maxRadius: 40 - hop * 5,
                        decay: 0.025,
                    }));
                    propagateHop(nn.idx, hop + 1);
                }, 180 + k * 60);
            });
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 自动周期触发
            if (time - lastFire > 5) {
                fire();
                lastFire = time;
            }

            // 边
            for (const e of edges) {
                const a = nodes[e.a], b = nodes[e.b];
                const isActive = activeNodes.has(e.a) && activeNodes.has(e.b);
                ctx.save();
                if (isActive) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = COLORS.cyan;
                    ctx.strokeStyle = hexToRgba(COLORS.cyan, 0.7);
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = hexToRgba(COLORS.blue, 0.18);
                    ctx.lineWidth = 0.7;
                }
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                ctx.restore();
            }

            // 波纹
            waves = waves.filter(w => w.alive);
            for (const wv of waves) {
                wv.update();
                wv.draw(ctx);
            }

            // 节点
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.energy *= 0.985;
                ctx.save();
                const r = n.radius * (1 + n.energy * 0.6);
                const blur = 8 + n.energy * 24;
                ctx.shadowBlur = blur;
                ctx.shadowColor = n.color;

                // 能量环
                if (n.energy > 0.1) {
                    ctx.strokeStyle = hexToRgba(n.color, n.energy * 0.7);
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, r + 5 + n.energy * 8, 0, Math.PI * 2);
                    ctx.stroke();
                }

                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.2);
                grad.addColorStop(0, hexToRgba(n.color, 0.95));
                grad.addColorStop(0.5, hexToRgba(n.color, 0.4));
                grad.addColorStop(1, hexToRgba(n.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = hexToRgba(n.color, 0.95);
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                if (n.label) {
                    ctx.font = '11px "Inter", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = hexToRgba(COLORS.white, 0.9);
                    ctx.fillText(n.label, n.x, n.y - r - 8);
                }
                ctx.restore();
            }

            // 阈值线显示
            ctx.save();
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = hexToRgba(COLORS.cyan, 0.7);
            ctx.textAlign = 'left';
            ctx.fillText('THRESHOLD = 0.10', 16, h - 18);
            ctx.fillText('DECAY = 0.55', 16, h - 4);
            ctx.restore();
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            trigger: () => fire(),
        };
    }

    // ============================================================
    // Chapter 7 · 虫洞飞溅
    // ============================================================
    function createScene_ch7(canvas) {
        let dims = null;
        let denseNodes = [];   // 稠密区
        let farNode = null;    // 远端跨域节点
        let denseCenter = null;
        let flares = [];
        let pulse = { t: 0, x: 0, y: 0, active: false, vx: 0, vy: 0, isWormhole: false };
        let ringWaves = [];
        let lastFire = 0;

        function build(w, h) {
            dims = { w, h };
            denseNodes = [];
            denseCenter = { x: w * 0.32, y: h * 0.5 };
            farNode = { x: w * 0.85, y: h * 0.5, label: '远端跨域', color: COLORS.pink };

            // 稠密区
            for (let i = 0; i < 12; i++) {
                const a = randRange(0, Math.PI * 2);
                const r = randRange(20, 70);
                denseNodes.push({
                    x: denseCenter.x + Math.cos(a) * r,
                    y: denseCenter.y + Math.sin(a) * r,
                    radius: randRange(3, 5),
                    pulse: Math.random() * Math.PI * 2,
                });
            }

            flares = [];
            ringWaves = [];
        }

        function fire() {
            // 在稠密区内做几次衰减传导，然后触发虫洞跳到远端
            ringWaves.push(new SpikeWave(denseCenter.x, denseCenter.y, {
                color: COLORS.cyan, maxRadius: 80, decay: 0.018,
            }));

            // 3 跳衰减
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const t = denseNodes[i % denseNodes.length];
                    ringWaves.push(new SpikeWave(t.x, t.y, {
                        color: COLORS.blue, maxRadius: 30, decay: 0.025,
                    }));
                }, 160 * (i + 1));
            }

            // 触发虫洞 = 浪花飞溅 + 弹弓粒子
            setTimeout(() => {
                const start = denseNodes[denseNodes.length - 1];
                flares.push(new WormholeFlare(start.x, start.y, {
                    color: COLORS.pink, count: 32, speed: 5,
                }));
                // 弹弓粒子
                pulse = {
                    t: 0,
                    x: start.x, y: start.y,
                    targetX: farNode.x, targetY: farNode.y,
                    active: true,
                    isWormhole: true,
                };
            }, 700);

            // 远端冲击波
            setTimeout(() => {
                ringWaves.push(new SpikeWave(farNode.x, farNode.y, {
                    color: COLORS.pink, maxRadius: 90, decay: 0.018,
                }));
                flares.push(new WormholeFlare(farNode.x, farNode.y, {
                    color: COLORS.pink, count: 24, speed: 4,
                }));
            }, 1400);
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            if (time - lastFire > 6) {
                fire();
                lastFire = time;
            }

            // 稠密区背景圈
            ctx.save();
            const grad = ctx.createRadialGradient(denseCenter.x, denseCenter.y, 0, denseCenter.x, denseCenter.y, 100);
            grad.addColorStop(0, hexToRgba(COLORS.blue, 0.18));
            grad.addColorStop(1, hexToRgba(COLORS.blue, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(denseCenter.x, denseCenter.y, 100, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 稠密区节点
            for (const n of denseNodes) {
                n.pulse += 0.03;
                ctx.save();
                ctx.shadowBlur = 8;
                ctx.shadowColor = COLORS.blue;
                ctx.fillStyle = hexToRgba(COLORS.blue, 0.7 + Math.sin(n.pulse) * 0.2);
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 远端节点
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = farNode.color;
            const fgrad = ctx.createRadialGradient(farNode.x, farNode.y, 0, farNode.x, farNode.y, 28);
            fgrad.addColorStop(0, hexToRgba(farNode.color, 1));
            fgrad.addColorStop(0.5, hexToRgba(farNode.color, 0.4));
            fgrad.addColorStop(1, hexToRgba(farNode.color, 0));
            ctx.fillStyle = fgrad;
            ctx.beginPath();
            ctx.arc(farNode.x, farNode.y, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = hexToRgba(farNode.color, 0.95);
            ctx.beginPath();
            ctx.arc(farNode.x, farNode.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = hexToRgba(COLORS.white, 0.95);
            ctx.fillText(farNode.label, farNode.x, farNode.y - 22);
            ctx.restore();

            // 标签
            ctx.save();
            ctx.font = 'italic 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = hexToRgba(COLORS.blue, 0.75);
            ctx.fillText('稠密区 (普通衰减)', denseCenter.x, denseCenter.y - 90);
            ctx.restore();

            // 弹弓粒子（虫洞中的高速粒子）
            if (pulse.active) {
                pulse.t += 0.032;
                if (pulse.t >= 1) pulse.active = false;
                const x = lerp(pulse.x, pulse.targetX, pulse.t);
                // 弧形抛物线（pulse.t = 0~1, 中间略下凹）
                const arc = Math.sin(pulse.t * Math.PI) * (h * 0.18);
                const y = lerp(pulse.y, pulse.targetY, pulse.t) - arc;

                ctx.save();
                ctx.shadowBlur = 22;
                ctx.shadowColor = COLORS.pink;
                ctx.fillStyle = hexToRgba(COLORS.pink, 1);
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();

                // 拖尾
                for (let i = 1; i <= 12; i++) {
                    const tt = clamp(pulse.t - i * 0.04, 0, 1);
                    const tx = lerp(pulse.x, pulse.targetX, tt);
                    const tarc = Math.sin(tt * Math.PI) * (h * 0.18);
                    const ty = lerp(pulse.y, pulse.targetY, tt) - tarc;
                    ctx.fillStyle = hexToRgba(COLORS.pink, (1 - i / 12) * 0.6);
                    ctx.beginPath();
                    ctx.arc(tx, ty, 4 - i * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // 飞溅
            flares = flares.filter(f => f.alive);
            for (const f of flares) {
                f.update();
                f.draw(ctx);
            }

            // 波纹
            ringWaves = ringWaves.filter(w => w.alive);
            for (const w of ringWaves) {
                w.update();
                w.draw(ctx);
            }

            // 张力公式（左下角，避开右下角的「触发虫洞」按钮）
            ctx.save();
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = hexToRgba(COLORS.pink, 0.85);
            ctx.fillText('Tension = coocW × residual', 16, h - 18);
            ctx.fillText('if Tension ≥ 1.0 → 🌊 Wormhole', 16, h - 4);
            ctx.restore();
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop(), trigger: () => fire() };
    }

    // ============================================================
    // Chapter 8 · 残差金字塔 + SVD = 地势图
    // ============================================================
    function createScene_ch8(canvas) {
        let dims = null;

        function build(w, h) { dims = { w, h }; }

        // 等高线 = 二维高斯叠加
        function field(x, y, w, h, time) {
            const cx1 = w * 0.35, cy1 = h * 0.55;
            const cx2 = w * 0.65, cy2 = h * 0.4;
            const cx3 = w * 0.5, cy3 = h * 0.75;
            const sigma = Math.min(w, h) * 0.18;
            const v1 = Math.exp(-((x - cx1) ** 2 + (y - cy1) ** 2) / (2 * sigma * sigma));
            const v2 = 0.85 * Math.exp(-((x - cx2) ** 2 + (y - cy2) ** 2) / (2 * sigma * sigma));
            const v3 = 0.6 * Math.exp(-((x - cx3) ** 2 + (y - cy3) ** 2) / (2 * sigma * sigma * 0.7));
            const wobble = 0.05 * Math.sin(time * 0.3 + (x + y) * 0.005);
            return v1 + v2 + v3 + wobble;
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 渲染等高线热图
            const cellSize = 8;
            const cols = Math.ceil(w / cellSize);
            const rows = Math.ceil(h / cellSize);

            // 离散高度网格
            const grid = [];
            for (let i = 0; i <= rows; i++) {
                const row = [];
                for (let j = 0; j <= cols; j++) {
                    row.push(field(j * cellSize, i * cellSize, w, h, time));
                }
                grid.push(row);
            }

            // 颜色填充（低-暗，高-亮）
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const v = grid[i][j];
                    const intensity = clamp(v, 0, 1);
                    const r = Math.floor(80 + intensity * 100);
                    const g = Math.floor(150 + intensity * 60);
                    const b = Math.floor(220);
                    ctx.fillStyle = `rgba(${r},${g},${b},${0.04 + intensity * 0.18})`;
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                }
            }

            // 等高线
            const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
            ctx.save();
            ctx.lineWidth = 1;
            for (let li = 0; li < levels.length; li++) {
                const lv = levels[li];
                const alpha = 0.25 + li * 0.12;
                ctx.strokeStyle = hexToRgba(COLORS.cyan, alpha);
                ctx.shadowBlur = li > 2 ? 6 : 0;
                ctx.shadowColor = COLORS.cyan;

                // 简单 marching squares
                ctx.beginPath();
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const x0 = j * cellSize;
                        const y0 = i * cellSize;
                        const v00 = grid[i][j];
                        const v10 = grid[i][j + 1];
                        const v01 = grid[i + 1][j];
                        const v11 = grid[i + 1][j + 1];
                        // 双线性等值线检测
                        const a = v00, b = v10, c = v11, d = v01;
                        const idx = (a > lv ? 1 : 0) | (b > lv ? 2 : 0) | (c > lv ? 4 : 0) | (d > lv ? 8 : 0);
                        if (idx === 0 || idx === 15) continue;
                        // 简化：找出穿过的边
                        const interp = (v1, v2) => (lv - v1) / (v2 - v1);
                        const top = { x: x0 + interp(a, b) * cellSize, y: y0 };
                        const right = { x: x0 + cellSize, y: y0 + interp(b, c) * cellSize };
                        const bottom = { x: x0 + interp(d, c) * cellSize, y: y0 + cellSize };
                        const left = { x: x0, y: y0 + interp(a, d) * cellSize };
                        const drawSeg = (p1, p2) => {
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                        };
                        switch (idx) {
                            case 1: case 14: drawSeg(left, top); break;
                            case 2: case 13: drawSeg(top, right); break;
                            case 3: case 12: drawSeg(left, right); break;
                            case 4: case 11: drawSeg(right, bottom); break;
                            case 6: case 9: drawSeg(top, bottom); break;
                            case 7: case 8: drawSeg(left, bottom); break;
                            case 5: drawSeg(left, top); drawSeg(right, bottom); break;
                            case 10: drawSeg(top, right); drawSeg(left, bottom); break;
                        }
                    }
                }
                ctx.stroke();
            }
            ctx.restore();

            // 标记三个高峰（残差能量中心）
            const peaks = [
                { x: w * 0.35, y: h * 0.55, label: 'Tag A · Residual 1.0', color: COLORS.gold },
                { x: w * 0.65, y: h * 0.4, label: 'Tag B · Residual 0.85', color: COLORS.cyan },
                { x: w * 0.5, y: h * 0.75, label: 'Tag C · Residual 0.6', color: COLORS.violet },
            ];
            peaks.forEach(p => {
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = p.color;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18);
                grad.addColorStop(0, hexToRgba(p.color, 1));
                grad.addColorStop(0.5, hexToRgba(p.color, 0.4));
                grad.addColorStop(1, hexToRgba(p.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hexToRgba(p.color, 1);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.font = '11px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = hexToRgba(COLORS.white, 0.92);
                ctx.fillText(p.label, p.x, p.y - 24);
                ctx.restore();
            });

            // 标题
            ctx.save();
            ctx.font = 'italic 12px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = hexToRgba(COLORS.cyan, 0.85);
            ctx.fillText('SVD · 残差金字塔 · 地势等高线', 16, 24);
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = hexToRgba(COLORS.muted, 0.75);
            ctx.fillText('precomputed → O(1) lookup at runtime', 16, 42);
            ctx.restore();
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 9 · 朗飞结跨域跳跃
    // ============================================================
    function createScene_ch9(canvas) {
        let dims = null;
        let leftCluster = [];
        let rightCluster = [];
        let bridgeSegments = []; // 朗飞结的"段"
        let leapPulses = [];
        let lastSpawn = 0;

        function build(w, h) {
            dims = { w, h };
            leftCluster = [];
            rightCluster = [];
            bridgeSegments = [];

            // 左域：技术 (Python决策树)
            const lcx = w * 0.18, lcy = h * 0.5;
            for (let i = 0; i < 8; i++) {
                const a = randRange(0, Math.PI * 2);
                const r = randRange(20, 80);
                leftCluster.push({
                    x: lcx + Math.cos(a) * r,
                    y: lcy + Math.sin(a) * r,
                    radius: randRange(2.5, 4.5),
                    pulse: Math.random() * Math.PI * 2,
                    color: COLORS.cyan,
                });
            }
            // 中央枢纽
            leftCluster[0] = { x: lcx, y: lcy, radius: 7, pulse: 0, color: COLORS.cyan, label: 'Python·决策' };

            // 右域：生物 (蟒蛇生物学)
            const rcx = w * 0.82, rcy = h * 0.5;
            for (let i = 0; i < 8; i++) {
                const a = randRange(0, Math.PI * 2);
                const r = randRange(20, 80);
                rightCluster.push({
                    x: rcx + Math.cos(a) * r,
                    y: rcy + Math.sin(a) * r,
                    radius: randRange(2.5, 4.5),
                    pulse: Math.random() * Math.PI * 2,
                    color: COLORS.pink,
                });
            }
            rightCluster[0] = { x: rcx, y: rcy, radius: 7, pulse: 0, color: COLORS.pink, label: '蟒蛇·生物' };

            // 朗飞结桥 - 离散段
            const segCount = 5;
            bridgeSegments = [];
            for (let i = 0; i < segCount; i++) {
                const t1 = i / segCount;
                const t2 = (i + 0.5) / segCount; // 段长度 = 半个间距
                const sx = lerp(lcx, rcx, t1);
                const ex = lerp(lcx, rcx, t2);
                bridgeSegments.push({
                    x1: sx, y1: lcy + Math.sin(i * 1.3) * 18,
                    x2: ex, y2: lcy + Math.sin((i + 0.5) * 1.3) * 18,
                    pulse: Math.random() * Math.PI * 2,
                });
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            // 自动周期生成跨域脉冲
            if (time - lastSpawn > 1.6) {
                leapPulses.push({
                    t: 0,
                    speed: 0.014,
                    color: time % 4 < 2 ? COLORS.cyan : COLORS.pink,
                });
                lastSpawn = time;
            }

            // 域背景圈
            ctx.save();
            const lg = ctx.createRadialGradient(leftCluster[0].x, leftCluster[0].y, 0, leftCluster[0].x, leftCluster[0].y, 110);
            lg.addColorStop(0, hexToRgba(COLORS.cyan, 0.15));
            lg.addColorStop(1, hexToRgba(COLORS.cyan, 0));
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.arc(leftCluster[0].x, leftCluster[0].y, 110, 0, Math.PI * 2);
            ctx.fill();

            const rg = ctx.createRadialGradient(rightCluster[0].x, rightCluster[0].y, 0, rightCluster[0].x, rightCluster[0].y, 110);
            rg.addColorStop(0, hexToRgba(COLORS.pink, 0.15));
            rg.addColorStop(1, hexToRgba(COLORS.pink, 0));
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(rightCluster[0].x, rightCluster[0].y, 110, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 朗飞结桥（离散闪烁段）
            for (const seg of bridgeSegments) {
                seg.pulse += 0.08;
                const intensity = 0.4 + Math.sin(seg.pulse) * 0.4;
                ctx.save();
                ctx.shadowBlur = 10 * intensity;
                ctx.shadowColor = COLORS.violet;
                ctx.strokeStyle = hexToRgba(COLORS.violet, intensity);
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
                ctx.restore();
            }

            // 节点
            const drawNode = (n) => {
                n.pulse += 0.04;
                const pulse = 0.85 + Math.sin(n.pulse) * 0.15;
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = n.color;
                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.3);
                grad.addColorStop(0, hexToRgba(n.color, pulse));
                grad.addColorStop(0.5, hexToRgba(n.color, 0.4));
                grad.addColorStop(1, hexToRgba(n.color, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 2.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hexToRgba(n.color, 0.95);
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius * 0.55, 0, Math.PI * 2);
                ctx.fill();
                if (n.label) {
                    ctx.shadowBlur = 0;
                    ctx.font = 'bold 12px "Inter", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = hexToRgba(COLORS.white, 0.95);
                    ctx.fillText(n.label, n.x, n.y - n.radius - 10);
                }
                ctx.restore();
            };
            leftCluster.forEach(drawNode);
            rightCluster.forEach(drawNode);

            // 跨域脉冲（在桥段间跳跃式前进）
            leapPulses = leapPulses.filter(p => p.t < 1);
            for (const p of leapPulses) {
                p.t += p.speed;
                // 桥的起终点
                const sx = leftCluster[0].x;
                const sy = leftCluster[0].y;
                const ex = rightCluster[0].x;
                const ey = rightCluster[0].y;

                // 跳跃感：用 quantize 函数让粒子离散停留在每个段端
                const segCount = bridgeSegments.length * 2;
                const quant = Math.floor(p.t * segCount) / segCount;
                const eased = quant + (p.t * segCount - Math.floor(p.t * segCount)) ** 2 / segCount;

                const x = lerp(sx, ex, eased);
                const y = lerp(sy, ey, eased) + Math.sin(eased * Math.PI * 4) * 8;

                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = p.color;
                ctx.fillStyle = hexToRgba(p.color, 1 - p.t * 0.3);
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 标签
            ctx.save();
            ctx.font = 'italic 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = hexToRgba(COLORS.cyan, 0.7);
            ctx.fillText('技术域', leftCluster[0].x, h - 24);
            ctx.fillStyle = hexToRgba(COLORS.violet, 0.85);
            ctx.fillText('朗飞结跨域桥 · Node of Ranvier', w * 0.5, h - 24);
            ctx.fillStyle = hexToRgba(COLORS.pink, 0.7);
            ctx.fillText('生物域', rightCluster[0].x, h - 24);
            ctx.restore();
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ============================================================
    // Chapter 10 · Finale 全景 - 完整pipeline的河流图
    // ============================================================
    function createScene_finale(canvas) {
        let dims = null;
        let paths = [];
        let particles = [];
        let dots = [];

        function build(w, h) {
            dims = { w, h };
            paths = [];
            particles = [];
            dots = [];

            // 8 个 pipeline 锚点，从左到右
            const N = 8;
            const labels = ['EPA', '残差', 'β', '门控', 'LIF', '去重', '融合', '测地线'];
            const colors = [COLORS.cyan, COLORS.blue, COLORS.violet, COLORS.gold,
                            COLORS.violet, COLORS.cyan, COLORS.blue, COLORS.cyan];
            const yMid = h * 0.5;
            const xs = [];
            for (let i = 0; i < N; i++) {
                const x = lerp(w * 0.06, w * 0.94, i / (N - 1));
                xs.push(x);
                dots.push(new GlowDot(x, yMid, {
                    color: colors[i],
                    radius: 6,
                    label: labels[i],
                }));
            }

            // 多条河流贯穿所有锚点（不同弯度）
            const lanes = 5;
            for (let i = 0; i < lanes; i++) {
                const offset = (i - (lanes - 1) / 2) * 22;
                for (let k = 0; k < N - 1; k++) {
                    const x1 = xs[k], x2 = xs[k + 1];
                    const y1 = yMid + offset;
                    const y2 = yMid + offset;
                    const path = new RiverPath(
                        { x: x1, y: y1 },
                        { x: lerp(x1, x2, 0.3), y: y1 + Math.sin(k + i) * 30 },
                        { x: lerp(x1, x2, 0.7), y: y2 + Math.cos(k + i) * 30 },
                        { x: x2, y: y2 },
                        { color: colors[k], opacity: 0.3, width: 1.2, glow: true }
                    );
                    paths.push(path);

                    const count = 6;
                    for (let j = 0; j < count; j++) {
                        particles.push(new RiverParticle(path, {
                            startT: j / count,
                            speed: randRange(0.0035, 0.006),
                            size: randRange(1.2, 2),
                            opacity: randRange(0.5, 0.85),
                            color: colors[k],
                            tail: 10,
                        }));
                    }
                }
            }
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, time) => {
            for (const p of paths) p.draw(ctx);
            for (const p of particles) {
                p.update();
                p.draw(ctx);
            }
            for (const d of dots) {
                d.update();
                d.draw(ctx);
            }
        }, {
            onResize: ({ w, h }) => build(w, h),
        });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // ---------- Export ----------
    global.WaveScenes = {
        createGlobalRiver,
        createScene_hero,
        createScene_ch1,
        createScene_ch2,
        createScene_ch3,
        createScene_ch4,
        createScene_ch5,
        createScene_ch6,
        createScene_ch7,
        createScene_ch8,
        createScene_ch9,
        createScene_finale,
    };
})(window);