/* ==========================================================================
   scenes.js
   RiverMemo V3 · AGS 统一场交互教学动画集
   公开白皮书的简化示意，不执行 Rust 原生计算或性能测量
   ========================================================================== */

(function (global) {
    'use strict';

    const RE = global.RiverEngine;
    const {
        COLORS,
        hexToRgba,
        lerp,
        clamp,
        smoothstep,
        drawIndustrialGrid,
        drawVectorArrow,
        drawNodeBadge,
        drawPillTag,
        RiverPath,
        RiverParticle,
        SceneRunner,
    } = RE;

    function setReadout(id, text) {
        const el = document.getElementById(id);
        if (el && el.textContent !== text) {
            el.textContent = text;
        }
    }

    // =========================================================================
    // GLOBAL BACKGROUND: 2D Vector Starburst + Subtle Geodesic Currents
    // =========================================================================
    function createGlobalRiver(canvas) {
        let stars = [];
        const glyphs = ['Ω', 'AGS', 'V3', 'u_L', 'u_T', 'Γ_c', 'CSR', 'RUST', 'r_t', 'p_N'];

        function build(w, h) {
            stars = Array.from({ length: 44 }, (_, i) => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.42,
                vy: (Math.random() - 0.5) * 0.32 - 0.08,
                size: 1.1 + (i % 3) * 0.65,
                alpha: 0.16 + Math.random() * 0.36,
                isAmber: i % 6 === 0,
                glyph: glyphs[i % glyphs.length],
            }));
        }

        const runner = new SceneRunner(canvas, (ctx, w, h) => {
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.x += s.vx;
                s.y += s.vy;
                if (s.x < 0) s.x = w;
                if (s.x > w) s.x = 0;
                if (s.y < 0) s.y = h;
                if (s.y > h) s.y = 0;

                const col = s.isAmber ? COLORS.amber : COLORS.patina;
                ctx.strokeStyle = hexToRgba(col, s.alpha * 0.4);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - s.vx * 16, s.y - s.vy * 16);
                ctx.stroke();

                ctx.fillStyle = hexToRgba(col, s.alpha);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();

                if (i % 5 === 0) {
                    ctx.font = '9px "JetBrains Mono", monospace';
                    ctx.fillStyle = hexToRgba(COLORS.bone, s.alpha * 0.35);
                    ctx.fillText(s.glyph, s.x + 5, s.y - 4);
                }
            }
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // =========================================================================
    // CHAPTER 00 · HERO: 三通道闭合流场 (Field + Ω-Gated Topology + Direct Anchor)
    // =========================================================================
    function createScene_hero(canvas) {
        let paths = [];
        let particles = [];

        function build(w, h) {
            paths = [];
            particles = [];
            const src = { x: w * 0.08, y: h * 0.52 };
            const gate = { x: w * 0.44, y: h * 0.48 };
            const dst = { x: w * 0.88, y: h * 0.48 };

            const configs = [
                { c1y: h * 0.22, c2y: h * 0.25, color: COLORS.patina },
                { c1y: h * 0.50, c2y: h * 0.48, color: COLORS.amber },
                { c1y: h * 0.78, c2y: h * 0.74, color: COLORS.cinnabar },
            ];

            configs.forEach((cfg) => {
                const pA = new RiverPath(
                    src,
                    { x: lerp(src.x, gate.x, 0.4), y: cfg.c1y },
                    { x: lerp(src.x, gate.x, 0.75), y: gate.y },
                    gate,
                    { color: cfg.color, width: 1.6, opacity: 0.28 }
                );
                const pB = new RiverPath(
                    gate,
                    { x: lerp(gate.x, dst.x, 0.35), y: cfg.c2y },
                    { x: lerp(gate.x, dst.x, 0.75), y: dst.y },
                    dst,
                    { color: cfg.color, width: 1.6, opacity: 0.28 }
                );
                paths.push(pA, pB);
                for (let k = 0; k < 12; k++) {
                    particles.push(new RiverParticle(pA, { startT: k / 12, speed: 0.0028, color: cfg.color, size: 1.8 }));
                    particles.push(new RiverParticle(pB, { startT: k / 12, speed: 0.0028, color: cfg.color, size: 1.8 }));
                }
            });
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 64);
            for (const p of paths) p.draw(ctx);
            for (const pt of particles) {
                pt.update();
                pt.draw(ctx);
            }

            // 中央 Ω 引力环
            const gx = w * 0.44;
            const gy = h * 0.48;
            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.amber, 0.28);
            ctx.setLineDash([5, 6]);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(gx, gy, 46 + Math.sin(t * 1.8) * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }, { onResize: ({ w, h }) => build(w, h) });

        return { start: () => runner.start(), stop: () => runner.stop() };
    }

    // =========================================================================
    // CHAPTER 01 · LOCAL AGS EXPLAIN: 局部贪心正交剥离与残差范数比 r_t -> a_t
    // =========================================================================
    function createScene_ch1(canvas) {
        let stepK = 3;
        let autoCycle = false;
        let lastSwitch = 0;

        // 预设 3 个正交基对目标 Tag 的投影系数 ⟨t, b_k⟩
        const basisSteps = [
            { k: 1, name: 'b₁ (OneRing)', proj: 0.62, sem: 0.68, w: 14.2, color: COLORS.patina, angle: -0.42 },
            { k: 2, name: 'b₂ (SQLite)', proj: 0.44, sem: 0.61, w: 9.6, color: COLORS.amber, angle: 0.55 },
            { k: 3, name: 'b₃ (IPC)', proj: 0.29, sem: 0.57, w: 6.1, color: COLORS.mint, angle: -1.35 },
        ];

        function computeStats(k) {
            let explainedEnergy = 0;
            for (let i = 0; i < k; i++) {
                explainedEnergy += basisSteps[i].proj * basisSteps[i].proj;
            }
            const rt = Math.sqrt(Math.max(0, 1 - explainedEnergy));
            const at = clamp(0.75 + 1.25 * rt, 0.5, 2.0);
            return { explainedEnergy, rt, at };
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            if (autoCycle && t - lastSwitch > 1.8) {
                stepK = (stepK + 1) % 4;
                lastSwitch = t;
                document.querySelectorAll('[data-ags-step]').forEach((btn) => {
                    const active = parseInt(btn.dataset.agsStep, 10) === stepK;
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-pressed', String(active));
                });
            }

            drawIndustrialGrid(ctx, w, h, 42);
            const { explainedEnergy, rt, at } = computeStats(stepK);
            setReadout(
                'ch1Readout',
                `K = ${stepK} Anchors · Explained 1−r_t² = ${(explainedEnergy * 100).toFixed(1)}% · r_t = ${rt.toFixed(3)} · a_t = ${at.toFixed(2)}`
            );

            // 左侧：向量正交剥离几何圆盘
            const cx = w * 0.34;
            const cy = h * 0.53;
            const R = Math.min(w * 0.26, h * 0.36);

            // 单位圆参考
            ctx.save();
            ctx.strokeStyle = hexToRgba(COLORS.patina, 0.22);
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 残差能量光晕
            const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * rt);
            haloGrad.addColorStop(0, hexToRgba(COLORS.cinnabar, 0.28 * rt));
            haloGrad.addColorStop(1, hexToRgba(COLORS.cinnabar, 0));
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, R * rt, 0, Math.PI * 2);
            ctx.fill();

            // 原始单位目标向量 t (虚线基准)
            const targetEnd = { x: cx + Math.cos(-0.18) * R, y: cy + Math.sin(-0.18) * R };
            drawVectorArrow(ctx, { x: cx, y: cy }, targetEnd, {
                color: COLORS.bone,
                alpha: 0.35,
                width: 1.5,
                dashed: [4, 4],
            });
            drawPillTag(ctx, targetEnd.x + 8, targetEnd.y - 6, '‖t‖ = 1.00', COLORS.bone);

            // 已选正交基向量与投影扣减
            basisSteps.forEach((b, idx) => {
                const active = idx < stepK;
                const len = R * (active ? b.proj : 0.42);
                const bx = cx + Math.cos(b.angle) * len;
                const by = cy + Math.sin(b.angle) * len;

                drawVectorArrow(ctx, { x: cx, y: cy }, { x: bx, y: by }, {
                    color: b.color,
                    alpha: active ? 0.92 : 0.22,
                    width: active ? 2.6 : 1.2,
                    glow: active,
                });

                drawNodeBadge(ctx, { x: bx, y: by }, {
                    color: b.color,
                    radius: active ? 6 : 4,
                    dimmed: !active,
                    label: b.name,
                    sub: active ? `⟨t,b_${b.k}⟩=${b.proj.toFixed(2)}` : `sem=${b.sem}`,
                });
            });

            // 剩余未解释残差向量 r_t (朱砂红高亮)
            const resAngle = 0.85 - stepK * 0.12;
            const resEnd = {
                x: cx + Math.cos(resAngle) * R * rt,
                y: cy + Math.sin(resAngle) * R * rt,
            };
            drawVectorArrow(ctx, { x: cx, y: cy }, resEnd, {
                color: COLORS.cinnabar,
                alpha: 0.98,
                width: 3.2,
                glow: true,
            });
            drawPillTag(ctx, resEnd.x + 10, resEnd.y + 4, `r_t = ${rt.toFixed(3)}`, COLORS.coral);

            drawNodeBadge(ctx, { x: cx, y: cy }, {
                color: COLORS.amber,
                radius: 7,
                energy: 0.8,
                label: 'Target Tag t',
                offsetY: 20,
            });

            // 右侧：范数比 r_t vs 能量比 1-r_t^2 vs 锚增益 a_t 仪表柱
            const panelX = w * 0.65;
            const panelW = w * 0.30;
            const topY = h * 0.16;

            ctx.save();
            ctx.fillStyle = 'rgba(23, 28, 32, 0.9)';
            ctx.strokeStyle = 'rgba(118, 191, 174, 0.28)';
            ctx.beginPath();
            ctx.roundRect(panelX, topY, panelW, h * 0.70, 8);
            ctx.fill();
            ctx.stroke();

            const bars = [
                {
                    label: '已解释能量比 1 − r_t²',
                    val: explainedEnergy,
                    max: 1.0,
                    text: `${(explainedEnergy * 100).toFixed(1)}%`,
                    color: COLORS.patina,
                },
                {
                    label: '未解释残差范数比 r_t (L2)',
                    val: rt,
                    max: 1.0,
                    text: rt.toFixed(3),
                    color: COLORS.cinnabar,
                },
                {
                    label: '映射锚增益 a_t ∈ [0.5, 2.0]',
                    val: at,
                    max: 2.0,
                    text: `${at.toFixed(2)}×`,
                    color: COLORS.amber,
                },
            ];

            bars.forEach((bar, i) => {
                const by = topY + 28 + i * 68;
                const bx = panelX + 14;
                const bw = panelW - 28;

                ctx.font = '600 10.5px "JetBrains Mono", monospace';
                ctx.fillStyle = COLORS.bone;
                ctx.textAlign = 'left';
                ctx.fillText(bar.label, bx, by);

                ctx.fillStyle = bar.color;
                ctx.textAlign = 'right';
                ctx.fillText(bar.text, bx + bw, by);

                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.roundRect(bx, by + 8, bw, 10, 5);
                ctx.fill();

                ctx.fillStyle = bar.color;
                ctx.beginPath();
                ctx.roundRect(bx, by + 8, Math.max(4, bw * clamp(bar.val / bar.max, 0, 1)), 10, 5);
                ctx.fill();
            });
            ctx.restore();
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setStep: (k) => {
                autoCycle = false;
                stepK = clamp(k, 0, 3);
            },
            toggleCycle: () => {
                autoCycle = !autoCycle;
                return autoCycle;
            },
        };
    }

    // =========================================================================
    // CHAPTER 02 · GLOBAL AGS STAR SPAN: 星团中心化方向 s_t 与前缀嵌套覆盖率曲线
    // =========================================================================
    function createScene_ch2(canvas) {
        let mode = 'star'; // 'star' (xi=0.8) | 'anchor' (xi=0.0)
        let sweepPhase = 0;
        let sweeping = true;
        let displayedXi = 0.8;
        let previousTime = null;

        const coverageStar = [0.24, 0.41, 0.53, 0.62, 0.69, 0.74, 0.78, 0.81, 0.84, 0.86, 0.88, 0.895, 0.905, 0.912, 0.917, 0.921];
        const coverageAnchor = [0.16, 0.28, 0.37, 0.45, 0.51, 0.56, 0.60, 0.63, 0.66, 0.68, 0.70, 0.715, 0.728, 0.738, 0.746, 0.752];
        const axisNames = ['RiverMemo', 'OneRing', 'MoonAST', 'Scriptorium', 'JevCall', 'VMusic', 'VCPDesktop', 'OpenHer'];

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);
            const dt = previousTime === null ? 0 : clamp(t - previousTime, 0, 0.1);
            previousTime = t;
            if (sweeping) {
                sweepPhase += dt / 1.6;
                if (sweepPhase >= 1) {
                    sweepPhase = 1;
                    sweeping = false;
                }
            }

            const xi = mode === 'star' ? 0.8 : 0.0;
            displayedXi = lerp(displayedXi, xi, 1 - Math.exp(-dt * 9));
            const covArr = mode === 'star' ? coverageStar : coverageAnchor;
            const kEff = mode === 'star' ? 14 : 16;
            setReadout(
                'ch2Readout',
                `Mode: ${mode === 'star' ? 'Star Mixture (ξ=0.80)' : 'Single Anchor (ξ=0.00)'} · K_sem=8 · K_eff=${kEff} · Cov=${(covArr[kEff - 1] * 100).toFixed(1)}%`
            );

            // 左半区：星团中心化几何示意 (t - μ 与邻居噪声抵消)
            const cx = w * 0.26;
            const cy = h * 0.54;
            const R = Math.min(w * 0.20, h * 0.34);

            drawNodeBadge(ctx, { x: cx, y: cy }, {
                color: COLORS.muted,
                radius: 5,
                label: 'Global Mean μ',
                offsetY: 18,
            });

            // 单个 Tag 偏置向量 (t - μ)
            const rawAngle = -0.78;
            const rawPt = { x: cx + Math.cos(rawAngle) * R * 0.88, y: cy + Math.sin(rawAngle) * R * 0.88 };
            drawVectorArrow(ctx, { x: cx, y: cy }, rawPt, {
                color: COLORS.cinnabar,
                alpha: mode === 'anchor' ? 0.95 : 0.42,
                width: mode === 'anchor' ? 2.8 : 1.5,
                dashed: mode === 'star' ? [4, 4] : null,
            });
            drawNodeBadge(ctx, rawPt, {
                color: COLORS.cinnabar,
                radius: 5,
                label: 't − μ (单点偏置)',
                offsetY: -12,
            });

            // 星团共现邻居 (t_j - μ)
            const neighborAngles = [-0.48, -0.22, -0.05, 0.14];
            neighborAngles.forEach((na, idx) => {
                const nr = R * (0.72 + (idx % 2) * 0.14);
                const np = { x: cx + Math.cos(na) * nr, y: cy + Math.sin(na) * nr };
                drawVectorArrow(ctx, { x: cx, y: cy }, np, {
                    color: COLORS.patina,
                    alpha: mode === 'star' ? 0.45 : 0.15,
                    width: 1.2,
                });
                ctx.fillStyle = hexToRgba(COLORS.patina, mode === 'star' ? 0.8 : 0.25);
                ctx.beginPath();
                ctx.arc(np.x, np.y, 3.2, 0, Math.PI * 2);
                ctx.fill();
            });

            // 合成星团主轴 s_t
            const starAngle = lerp(rawAngle, -0.24, displayedXi);
            const starPt = { x: cx + Math.cos(starAngle) * R, y: cy + Math.sin(starAngle) * R };
            drawVectorArrow(ctx, { x: cx, y: cy }, starPt, {
                color: COLORS.amber,
                alpha: 0.98,
                width: 3.2,
                glow: true,
            });
            drawPillTag(ctx, starPt.x + 8, starPt.y, `s_t (ξ=${displayedXi.toFixed(2)})`, COLORS.amber);
            const pulse = (t * 0.55) % 1;
            ctx.fillStyle = COLORS.amber;
            ctx.beginPath();
            ctx.arc(lerp(cx, starPt.x, pulse), lerp(cy, starPt.y, pulse), 3, 0, Math.PI * 2);
            ctx.fill();

            // 右半区：前缀嵌套覆盖率曲线 (k = 1..16)
            const gx0 = w * 0.52;
            const gx1 = w - 24;
            const gy0 = 36;
            const gy1 = h - 42;
            const gw = gx1 - gx0;
            const gh = gy1 - gy0;

            ctx.save();
            ctx.fillStyle = 'rgba(18, 22, 26, 0.88)';
            ctx.strokeStyle = 'rgba(118, 191, 174, 0.25)';
            ctx.beginPath();
            ctx.roundRect(gx0 - 12, gy0 - 14, gw + 22, gh + 38, 8);
            ctx.fill();
            ctx.stroke();

            // K_sem = 8 分界线
            const kSemX = gx0 + (7 / 15) * gw;
            ctx.strokeStyle = hexToRgba(COLORS.patina, 0.45);
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(kSemX, gy0);
            ctx.lineTo(kSemX, gy1);
            ctx.stroke();
            ctx.setLineDash([]);
            drawPillTag(ctx, kSemX, gy0 + 10, 'K_sem = 8 (语义前缀)', COLORS.patina, 'center');

            // 覆盖率折线与柱状能量
            const maxIdx = Math.max(1, Math.floor(covArr.length * sweepPhase));
            ctx.beginPath();
            for (let i = 0; i < maxIdx; i++) {
                const px = gx0 + (i / (covArr.length - 1)) * gw;
                const py = gy1 - covArr[i] * gh;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = COLORS.amber;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            for (let i = 0; i < maxIdx; i++) {
                const px = gx0 + (i / (covArr.length - 1)) * gw;
                const py = gy1 - covArr[i] * gh;
                const isSem = i < 8;
                ctx.fillStyle = isSem ? COLORS.patina : COLORS.amber;
                ctx.beginPath();
                ctx.arc(px, py, isSem ? 3.8 : 3, 0, Math.PI * 2);
                ctx.fill();

                if (i < 4) {
                    ctx.font = '9px "JetBrains Mono", monospace';
                    ctx.fillStyle = hexToRgba(COLORS.bone, 0.8);
                    ctx.textAlign = 'center';
                    ctx.fillText(axisNames[i], px, py - 10 - (i % 2) * 10);
                }
            }
            ctx.restore();
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setStarMode: (m) => {
                mode = m === 'anchor' ? 'anchor' : 'star';
                sweepPhase = 0;
                sweeping = true;
            },
            triggerSweep: () => {
                sweepPhase = 0;
                sweeping = true;
            },
        };
    }

    // =========================================================================
    // CHAPTER 03 · SUB-STOCHASTIC TRANSPORT GRAPH: 顺逆流、钟形门控与预算内虫洞
    // =========================================================================
    function createScene_ch3(canvas) {
        let flowMode = 'forward'; // 'forward' | 'wormhole' | 'backward'

        function bellGate(sim) {
            if (sim <= 0) return 0.35;
            return Math.max(0.35, 0.5 + 0.8 * Math.exp(-Math.pow(sim - 0.65, 2) / (2 * 0.25 * 0.25)));
        }

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);

            const shares = flowMode === 'wormhole'
                ? [
                    { name: 'Neighbor A (普通边)', p: 0.18, color: COLORS.patina, wormhole: false },
                    { name: 'Neighbor B (普通边)', p: 0.15, color: COLORS.turquoise, wormhole: false },
                    { name: 'Cross-Domain Tag (虫洞 a_t=1.85)', p: 0.52, color: COLORS.cinnabar, wormhole: true },
                ]
                : flowMode === 'backward'
                ? [
                    { name: 'Forward i → j (×1.00)', p: 0.54, color: COLORS.patina, wormhole: false },
                    { name: 'Reverse j → i (×0.42·a_t ≤ 0.95·fwd)', p: 0.26, color: COLORS.amber, wormhole: false },
                    { name: 'Local Branch', p: 0.05, color: COLORS.turquoise, wormhole: false },
                ]
                : [
                    { name: 'Neighbor A (sim=0.64 黄金区)', p: 0.38, color: COLORS.patina, wormhole: false },
                    { name: 'Neighbor B (sim=0.52)', p: 0.29, color: COLORS.amber, wormhole: false },
                    { name: 'Neighbor C (sim=0.93 同义抑制)', p: 0.18, color: COLORS.turquoise, wormhole: false },
                ];

            const sumP = shares.reduce((acc, s) => acc + s.p, 0);
            setReadout(
                'ch3Readout',
                `Mode: ${flowMode.toUpperCase()} · Row Sum ΣP_ij = ${sumP.toFixed(2)} ≤ m_out < 1.00 (Resolvent Safe)`
            );

            // 左侧：源节点 i 向邻居分配固定行预算
            const src = { x: w * 0.14, y: h * 0.44 };
            shares.forEach((s, idx) => {
                const ty = h * (0.20 + idx * 0.24);
                const tx = w * 0.52;
                const path = new RiverPath(
                    src,
                    { x: lerp(src.x, tx, 0.4), y: src.y },
                    { x: lerp(src.x, tx, 0.7), y: ty },
                    { x: tx, y: ty },
                    { color: s.color, width: 1.5 + s.p * 6, opacity: 0.75 }
                );
                path.draw(ctx);

                // 沿边流动的份额脉冲
                const phase = (t * (s.wormhole ? 0.9 : 0.55) + idx * 0.3) % 1;
                const pt = path.sample(phase);
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5 + s.p * 5, 0, Math.PI * 2);
                ctx.fill();

                drawNodeBadge(ctx, { x: tx, y: ty }, {
                    color: s.color,
                    radius: 5 + s.p * 6,
                    energy: s.p,
                    label: s.name,
                    sub: `P_ij = ${s.p.toFixed(2)}`,
                    align: 'left',
                    offsetX: 14,
                    offsetY: -2,
                    subOffsetY: 12,
                });
            });

            drawNodeBadge(ctx, src, {
                color: COLORS.amber,
                radius: 9,
                energy: 0.9,
                label: 'Source Tag i',
                sub: `m_out = ${sumP.toFixed(2)}`,
            });

            // 底部：固定行预算守恒条 Σ_j P_ij < 1.00
            const barX = 24;
            const barY = h - 38;
            const barW = w * 0.56;
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.strokeStyle = 'rgba(242, 240, 233, 0.3)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, 14, 4);
            ctx.fill();
            ctx.stroke();

            let offset = 0;
            shares.forEach((s) => {
                const segW = barW * s.p;
                ctx.fillStyle = hexToRgba(s.color, 0.88);
                ctx.fillRect(barX + offset, barY + 1, segW - 1, 12);
                offset += segW;
            });
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = COLORS.amber;
            ctx.fillText(`Fixed Row Budget Cap (1.00) · Remained Sink = ${(1 - sumP).toFixed(2)}`, barX, barY - 6);
            ctx.restore();

            // 右侧小窗：内联钟形语义门控曲线 bell(sim)
            const bx0 = w * 0.68;
            const bx1 = w - 20;
            const by0 = 36;
            const by1 = h - 42;
            const bw = bx1 - bx0;
            const bh = by1 - by0;

            ctx.save();
            ctx.fillStyle = 'rgba(18, 22, 26, 0.9)';
            ctx.strokeStyle = 'rgba(118, 191, 174, 0.25)';
            ctx.beginPath();
            ctx.roundRect(bx0 - 10, by0 - 12, bw + 18, bh + 30, 8);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            for (let k = 0; k <= 80; k++) {
                const sim = k / 80;
                const g = bellGate(sim);
                const x = bx0 + sim * bw;
                const y = by1 - (g / 1.4) * bh;
                if (k === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = COLORS.patina;
            ctx.lineWidth = 2.2;
            ctx.stroke();

            const peakX = bx0 + 0.65 * bw;
            const peakY = by1 - (1.3 / 1.4) * bh;
            drawNodeBadge(ctx, { x: peakX, y: peakY }, {
                color: COLORS.amber,
                radius: 4.5,
                label: 'Peak sim=0.65 (1.30×)',
                offsetY: -10,
            });
            ctx.restore();
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setMode: (m) => {
                flowMode = m;
            },
        };
    }

    // =========================================================================
    // CHAPTER 04 · EPA CALIBRATION & RESIDUAL PYRAMID: 背景校准 g_Q 与 3 层正交金字塔
    // =========================================================================
    function createScene_ch4(canvas) {
        let epaMode = 'focused'; // 'focused' | 'cross' | 'ood'

        const presets = {
            focused: {
                rQ: 0.68,
                cM: 0.78,
                bIso: 0.08,
                entropy: 0.22,
                axes: [
                    { name: 'RiverMemo', val: 0.58 },
                    { name: 'VexusRust', val: 0.24 },
                    { name: 'SQLite', val: 0.11 },
                    { name: 'OneRing', val: 0.07 },
                ],
                levels: [
                    { lv: 'L0 主方向', ratio: 0.54, tag: 'TopologyV3 · Ω泛函', coh: 0.88 },
                    { lv: 'L1 一阶残差', ratio: 0.24, tag: 'AGS正交基 · CSR核', coh: 0.76 },
                    { lv: 'L2 二阶残差', ratio: 0.11, tag: 'Rayon并发 · 句柄缓存', coh: 0.64 },
                ],
            },
            cross: {
                rQ: 0.61,
                cM: 0.78,
                bIso: 0.08,
                entropy: 0.48,
                axes: [
                    { name: 'Scriptorium', val: 0.36 },
                    { name: 'MoonAST', val: 0.33 },
                    { name: 'VMusic', val: 0.19 },
                    { name: 'JevCall', val: 0.12 },
                ],
                levels: [
                    { lv: 'L0 主方向', ratio: 0.42, tag: '3D透视打字 · 源码映射', coh: 0.81 },
                    { lv: 'L1 一阶残差', ratio: 0.29, tag: 'MoonAST跨进程追踪', coh: 0.79 },
                    { lv: 'L2 二阶残差', ratio: 0.16, tag: 'Jev双轨安检验签', coh: 0.68 },
                ],
            },
            ood: {
                rQ: 0.09,
                cM: 0.78,
                bIso: 0.08,
                entropy: 0.91,
                axes: [
                    { name: 'Axis#1', val: 0.27 },
                    { name: 'Axis#2', val: 0.25 },
                    { name: 'Axis#3', val: 0.24 },
                    { name: 'Axis#4', val: 0.24 },
                ],
                levels: [
                    { lv: 'L0 弱响应', ratio: 0.08, tag: '无显著域内主轴', coh: 0.21 },
                    { lv: 'L1 噪声截断', ratio: 0.03, tag: 'Handshake Noise 高', coh: 0.14 },
                    { lv: 'L2 提前终止', ratio: 0.00, tag: 'Gate → 保护原查询 q', coh: 0.00 },
                ],
            },
        };

        const runner = new SceneRunner(canvas, (ctx, w, h) => {
            drawIndustrialGrid(ctx, w, h, 44);
            const p = presets[epaMode] || presets.focused;
            const gQ = clamp((p.rQ - p.bIso) / Math.max(1e-6, p.cM - p.bIso), 0, 1);
            const logicDepth = (1 - p.entropy) * gQ;

            setReadout(
                'ch4Readout',
                `r_Q=${p.rQ.toFixed(2)} vs b_iso=${p.bIso.toFixed(2)} · Gate g_Q=${gQ.toFixed(2)} · LogicDepth=${logicDepth.toFixed(2)}`
            );

            // 左栏：EPA 背景相对校准尺 (b_iso -> r_Q -> c_m)
            const lx = 24;
            const lw = w * 0.43;
            const ly = 28;

            ctx.save();
            ctx.fillStyle = 'rgba(18, 22, 26, 0.92)';
            ctx.strokeStyle = 'rgba(118, 191, 174, 0.28)';
            ctx.beginPath();
            ctx.roundRect(lx, ly, lw, h - 52, 8);
            ctx.fill();
            ctx.stroke();

            ctx.font = '600 10.5px "JetBrains Mono", monospace';
            ctx.fillStyle = COLORS.patina;
            ctx.fillText('1. EPA BACKGROUND-RELATIVE GATE g_Q', lx + 14, ly + 22);

            // 校准刻度条
            const scaleX = lx + 14;
            const scaleY = ly + 42;
            const scaleW = lw - 28;
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(scaleX, scaleY, scaleW, 14);

            const bIsoX = scaleX + p.bIso * scaleW;
            const cMX = scaleX + p.cM * scaleW;
            const rQX = scaleX + p.rQ * scaleW;

            ctx.fillStyle = hexToRgba(COLORS.patina, 0.25);
            ctx.fillRect(bIsoX, scaleY, cMX - bIsoX, 14);

            ctx.fillStyle = gQ > 0.2 ? COLORS.amber : COLORS.cinnabar;
            ctx.beginPath();
            ctx.arc(rQX, scaleY + 7, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = '9.5px "JetBrains Mono", monospace';
            ctx.fillStyle = COLORS.muted;
            ctx.fillText(`b_iso=${p.bIso}`, bIsoX - 10, scaleY + 28);
            ctx.fillStyle = COLORS.patina;
            ctx.fillText(`c_m=${p.cM}`, cMX - 18, scaleY + 28);
            ctx.fillStyle = COLORS.amber;
            ctx.fillText(`r_Q=${p.rQ}`, rQX - 16, scaleY - 6);

            // 前缀主题面投影分布
            p.axes.forEach((ax, i) => {
                const ay = ly + 94 + i * 38;
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.fillStyle = COLORS.bone;
                ctx.fillText(ax.name, scaleX, ay);
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                ctx.fillRect(scaleX + 86, ay - 9, scaleW - 86, 10);
                ctx.fillStyle = i === 0 ? COLORS.amber : COLORS.patina;
                ctx.fillRect(scaleX + 86, ay - 9, (scaleW - 86) * ax.val, 10);
            });
            ctx.restore();

            // 右栏：3 层 Residual Pyramid 正交剥离阶梯
            const rx = w * 0.50;
            const rw = w * 0.47;
            ctx.save();
            ctx.fillStyle = 'rgba(18, 22, 26, 0.92)';
            ctx.strokeStyle = 'rgba(242, 169, 0, 0.28)';
            ctx.beginPath();
            ctx.roundRect(rx, ly, rw, h - 52, 8);
            ctx.fill();
            ctx.stroke();

            ctx.font = '600 10.5px "JetBrains Mono", monospace';
            ctx.fillStyle = COLORS.amber;
            ctx.fillText('2. 3-LEVEL ORTHOGONAL RESIDUAL PYRAMID', rx + 14, ly + 22);

            p.levels.forEach((lv, i) => {
                const by = ly + 44 + i * 74;
                const decay = Math.pow(0.7, i);
                ctx.fillStyle = 'rgba(255,255,255,0.035)';
                ctx.strokeStyle = hexToRgba(i === 0 ? COLORS.amber : COLORS.patina, 0.35);
                ctx.beginPath();
                ctx.roundRect(rx + 14, by, rw - 28, 60, 6);
                ctx.fill();
                ctx.stroke();

                ctx.font = '600 10px "JetBrains Mono", monospace';
                ctx.fillStyle = i === 0 ? COLORS.amber : COLORS.patina;
                ctx.fillText(`${lv.lv} (LayerDecay 0.7^${i} = ${decay.toFixed(2)})`, rx + 24, by + 18);

                ctx.font = '10px "Inter", sans-serif';
                ctx.fillStyle = COLORS.bone;
                ctx.fillText(`召回种子: ${lv.tag}`, rx + 24, by + 36);

                ctx.font = '9.5px "JetBrains Mono", monospace';
                ctx.fillStyle = COLORS.muted;
                ctx.fillText(`Explained=${(lv.ratio * 100).toFixed(0)}% · HandshakeCoh=${lv.coh.toFixed(2)}`, rx + 24, by + 51);
            });
            ctx.restore();
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setEpaMode: (m) => {
                epaMode = m;
            },
        };
    }

    // =========================================================================
    // CHAPTER 05 · SENSE BOUNDED FIR WAVE: 4跳脉冲、软非回溯与请求级河网 R_q
    // =========================================================================
    function createScene_ch5(canvas) {
        let viewMode = 'river'; // 'river' | 'all'
        let firedAt = null;

        const nodes = [
            { id: 0, rx: 0.11, ry: 0.50, hop: 0, label: 'Core Seed z₁', color: COLORS.amber },
            { id: 1, rx: 0.31, ry: 0.26, hop: 1, label: 'Hop-1 Tag A', color: COLORS.patina },
            { id: 2, rx: 0.31, ry: 0.74, hop: 1, label: 'Hop-1 Tag B', color: COLORS.patina },
            { id: 3, rx: 0.54, ry: 0.28, hop: 2, label: 'Hop-2 Tag C', color: COLORS.mint },
            { id: 4, rx: 0.54, ry: 0.72, hop: 2, label: 'Hop-2 Wormhole', color: COLORS.cinnabar },
            { id: 5, rx: 0.77, ry: 0.36, hop: 3, label: 'Hop-3 Emergent', color: COLORS.patina },
            { id: 6, rx: 0.86, ry: 0.68, hop: 4, label: 'Hop-4 Deep Node', color: COLORS.amber },
            // 未激活静态背景节点
            { id: 7, rx: 0.45, ry: 0.10, hop: -1, label: 'Static Idle', color: COLORS.dim },
            { id: 8, rx: 0.72, ry: 0.86, hop: -1, label: 'Static Idle', color: COLORS.dim },
        ];

        const activeEdges = [
            { a: 0, b: 1, flow: 0.48, wormhole: false },
            { a: 0, b: 2, flow: 0.37, wormhole: false },
            { a: 1, b: 3, flow: 0.31, wormhole: false },
            { a: 2, b: 4, flow: 0.42, wormhole: true },
            { a: 3, b: 5, flow: 0.22, wormhole: false },
            { a: 4, b: 5, flow: 0.28, wormhole: false },
            { a: 4, b: 6, flow: 0.25, wormhole: true },
        ];

        const staticEdges = [
            { a: 1, b: 7 },
            { a: 3, b: 7 },
            { a: 2, b: 8 },
            { a: 5, b: 8 },
        ];

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);
            if (firedAt === null || t < firedAt || t - firedAt > 6.5) firedAt = t;
            const age = t - firedAt;
            setReadout('ch5Readout', `Hop ${Math.min(4, Math.floor(age / 0.75))}/4 · FIR γ=0.60 · Return Flow ×0.15 · ${viewMode === 'all' ? 'Static + R_q' : 'Request River R_q'}`);

            const pts = nodes.map((n) => ({ ...n, x: n.rx * w, y: n.ry * h }));

            // 可选绘制未激活静态背景边（证明 R_q ≠ 全库静态图）
            if (viewMode === 'all') {
                staticEdges.forEach((se) => {
                    drawVectorArrow(ctx, pts[se.a], pts[se.b], {
                        color: COLORS.muted,
                        alpha: 0.18,
                        width: 1,
                        dashed: [3, 5],
                    });
                });
            }

            // 绘制真实承载流量的请求级河网边 E_q
            activeEdges.forEach((e) => {
                const na = pts[e.a];
                const nb = pts[e.b];
                const hopStart = na.hop * 0.75;
                const reached = age >= hopStart;
                const col = e.wormhole ? COLORS.cinnabar : COLORS.patina;

                drawVectorArrow(ctx, na, nb, {
                    color: col,
                    alpha: reached ? 0.85 : 0.22,
                    width: 1.2 + e.flow * 4.5,
                    glow: reached && e.wormhole,
                });

                if (reached) {
                    const localT = clamp((age - hopStart) / 0.85, 0, 1);
                    const px = lerp(na.x, nb.x, localT);
                    const py = lerp(na.y, nb.y, localT);
                    ctx.fillStyle = e.wormhole ? COLORS.amber : COLORS.mint;
                    ctx.beginPath();
                    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // 演示 i -> j -> i 立即回流软抑制 (×0.15)
            drawVectorArrow(
                ctx,
                { x: pts[3].x - 6, y: pts[3].y + 10 },
                { x: pts[1].x + 6, y: pts[1].y + 10 },
                { color: COLORS.coral, alpha: 0.45, width: 1.2, dashed: [3, 3] }
            );
            drawPillTag(
                ctx,
                (pts[1].x + pts[3].x) / 2,
                (pts[1].y + pts[3].y) / 2 + 18,
                'Immediate Return ×0.15',
                COLORS.coral,
                'center'
            );

            // 绘制节点与 FIR 权重 a_h = γ^h / Σγ^r
            pts.forEach((n) => {
                if (n.hop < 0 && viewMode !== 'all') return;
                const active = n.hop >= 0 && age >= n.hop * 0.75;
                const fir = n.hop >= 0 ? Math.pow(0.6, n.hop) : 0;
                drawNodeBadge(ctx, n, {
                    color: n.color,
                    radius: n.hop === 0 ? 8 : 6,
                    energy: active ? fir : 0.1,
                    dimmed: n.hop < 0 || !active,
                    label: n.label,
                    sub: n.hop >= 0 ? `hop=${n.hop} · γ^h=${fir.toFixed(2)}` : 'F_ij = 0 (Excluded)',
                });
            });
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            trigger: () => {
                firedAt = null;
            },
            setViewMode: (m) => {
                viewMode = m;
            },
        };
    }

    // =========================================================================
    // CHAPTER 06 · RESOLVENT DUAL-SCALE FIELDS: u_L (α=0.15, η=0.80) vs u_T (α=0.55, η=0.90)
    // =========================================================================
    function createScene_ch6(canvas) {
        let fieldMode = 'both'; // 'both' | 'local' | 'transfer'

        const fieldNodes = [
            { rx: 0.24, ry: 0.50, uL: 0.96, uT: 0.88, inL: true, inT: true, label: 'Source S₁' },
            { rx: 0.36, ry: 0.30, uL: 0.74, uT: 0.72, inL: true, inT: true, label: 'Near Tag A' },
            { rx: 0.38, ry: 0.70, uL: 0.68, uT: 0.69, inL: true, inT: true, label: 'Near Tag B' },
            { rx: 0.56, ry: 0.28, uL: 0.21, uT: 0.61, inL: false, inT: true, label: 'Bridge Tag C' },
            { rx: 0.60, ry: 0.68, uL: 0.16, uT: 0.54, inL: false, inT: true, label: 'Bridge Tag D' },
            { rx: 0.78, ry: 0.46, uL: 0.06, uT: 0.42, inL: false, inT: true, label: 'Transfer Hub' },
            { rx: 0.88, ry: 0.22, uL: 0.02, uT: 0.05, inL: false, inT: false, label: 'Tail Noise (Q_i=0)' },
            { rx: 0.88, ry: 0.78, uL: 0.01, uT: 0.04, inL: false, inT: false, label: 'Tail Noise (Q_i=0)' },
        ];

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);
            setReadout(
                'ch6Readout',
                fieldMode === 'local'
                    ? 'Viewing: Local Field u_L (α_L=0.15 · Support D_0.80)'
                    : fieldMode === 'transfer'
                    ? 'Viewing: Transfer Field u_T (α_T=0.55 · Support D_0.90)'
                    : 'Viewing: Dual Overlay · D_0.80(u_L) + D_0.90(u_T)'
            );

            // 绘制有效支持域边界包络
            if (fieldMode === 'both' || fieldMode === 'transfer') {
                ctx.save();
                ctx.fillStyle = hexToRgba(COLORS.amber, 0.07);
                ctx.strokeStyle = hexToRgba(COLORS.amber, 0.5);
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.ellipse(w * 0.48, h * 0.49, w * 0.35, h * 0.36, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                drawPillTag(ctx, w * 0.66, h * 0.15, 'D_0.90(u_T) Transfer Support', COLORS.amber, 'center');
            }

            if (fieldMode === 'both' || fieldMode === 'local') {
                ctx.save();
                ctx.fillStyle = hexToRgba(COLORS.patina, 0.11);
                ctx.strokeStyle = hexToRgba(COLORS.patina, 0.75);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(w * 0.33, h * 0.50, w * 0.16, h * 0.29, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                drawPillTag(ctx, w * 0.33, h * 0.17, 'D_0.80(u_L) Local Support', COLORS.patina, 'center');
            }

            // 绘制节点双场势能
            fieldNodes.forEach((n) => {
                const x = n.rx * w;
                const y = n.ry * h;
                const isTail = !n.inL && !n.inT;
                const val = fieldMode === 'local' ? n.uL : fieldMode === 'transfer' ? n.uT : Math.max(n.uL, n.uT);
                const col = isTail
                    ? COLORS.cinnabar
                    : n.inL && fieldMode !== 'transfer'
                    ? COLORS.patina
                    : COLORS.amber;

                drawNodeBadge(ctx, { x, y }, {
                    color: col,
                    radius: isTail ? 4.5 : 5 + val * 4,
                    energy: val,
                    dimmed: isTail || (fieldMode === 'local' && !n.inL),
                    label: n.label,
                    sub: `u_L=${n.uL.toFixed(2)} | u_T=${n.uT.toFixed(2)}`,
                });
            });
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setFieldMode: (m) => {
                fieldMode = m;
            },
        };
    }

    // =========================================================================
    // CHAPTER 07 · ORDERED CURVE & RELATIVE TOPOLOGY: Γ_c 路径几何与相对边映射
    // =========================================================================
    function createScene_ch7(canvas) {
        let curveIdx = 0;

        // 上方：查询感应河网 R_q
        const riverNodes = [
            { id: 'r1', rx: 0.16, ry: 0.24, hop: 0, label: 'r₁ (hop 0)' },
            { id: 'r2', rx: 0.38, ry: 0.20, hop: 1, label: 'r₂ (hop 1)' },
            { id: 'r3', rx: 0.62, ry: 0.24, hop: 2, label: 'r₃ (hop 2)' },
            { id: 'r4', rx: 0.84, ry: 0.22, hop: 3, label: 'r₄ (hop 3)' },
        ];

        const candidates = [
            {
                name: 'Candidate A · 完整复现河网边结构 (edge_topology)',
                pathQ: 0.84,
                edgeScore: 0.79,
                closure: 0.88,
                ie: 0.92,
                mode: 'edge_topology',
                color: COLORS.patina,
                tags: [
                    { rx: 0.15, ry: 0.72, pos: 1, label: 't₁ (pos 1)', align: 0, supported: true },
                    { rx: 0.37, ry: 0.76, pos: 2, label: 't₂ (pos 2)', align: 1, supported: true },
                    { rx: 0.61, ry: 0.70, pos: 3, label: 't₃ (pos 3)', align: 2, supported: true },
                    { rx: 0.83, ry: 0.74, pos: 4, label: 't₄ (pos 4)', align: 3, supported: true },
                ],
            },
            {
                name: 'Candidate B · 节点命中但序位逆序/缺边 (reverse credit ×0.25)',
                pathQ: 0.41,
                edgeScore: 0.28,
                closure: 0.72,
                ie: 0.65,
                mode: 'partial_alignment (教学预设，非完整关系复现)',
                color: COLORS.amber,
                tags: [
                    { rx: 0.18, ry: 0.74, pos: 1, label: 't₁ (pos 1)', align: 2, supported: true },
                    { rx: 0.44, ry: 0.78, pos: 2, label: 't₂ (pos 2)', align: 0, supported: true },
                    { rx: 0.74, ry: 0.72, pos: 3, label: 't₃ (pos 3)', align: -1, supported: false },
                ],
            },
            {
                name: 'Candidate C · 落入支持域长尾外 (Q_i = 0)',
                pathQ: 0.00,
                edgeScore: 0.00,
                closure: 0.31,
                ie: 1.00,
                mode: 'unavailable',
                color: COLORS.cinnabar,
                tags: [
                    { rx: 0.20, ry: 0.76, pos: 1, label: 't₁ (长尾)', align: -1, supported: false },
                    { rx: 0.50, ry: 0.78, pos: 2, label: 't₂ (长尾)', align: -1, supported: false },
                    { rx: 0.80, ry: 0.75, pos: 3, label: 't₃ (长尾)', align: -1, supported: false },
                ],
            },
        ];

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);
            const c = candidates[curveIdx] || candidates[0];
            setReadout(
                'ch7Readout',
                `PathQuality=${c.pathQ.toFixed(2)} · EdgeGraph=${c.edgeScore.toFixed(2)} · Closure=${c.closure.toFixed(2)} · I_e=${c.ie.toFixed(2)}`
            );

            // 上轨：查询感应河网 R_q
            drawPillTag(ctx, 18, 20, 'UPPER: QUERY RIVER R_q (HOP 0 → 3)', COLORS.amber, 'left');
            const rPts = riverNodes.map((n) => ({ ...n, x: n.rx * w, y: n.ry * h }));
            for (let i = 0; i < rPts.length - 1; i++) {
                drawVectorArrow(ctx, rPts[i], rPts[i + 1], {
                    color: COLORS.amber,
                    alpha: 0.88,
                    width: 2.4,
                });
            }
            rPts.forEach((rn) => {
                drawNodeBadge(ctx, rn, {
                    color: COLORS.amber,
                    radius: 6,
                    label: rn.label,
                    offsetY: -12,
                });
            });

            // 下轨：候选有序曲线 Γ_c = (t_1, ..., t_n)
            drawPillTag(ctx, 18, h * 0.54, `LOWER: ${c.name} · Mode: ${c.mode}`, c.color, 'left');
            const cPts = c.tags.map((tg) => ({ ...tg, x: tg.rx * w, y: tg.ry * h }));

            for (let i = 0; i < cPts.length - 1; i++) {
                const segSupported = cPts[i].supported && cPts[i + 1].supported;
                drawVectorArrow(ctx, cPts[i], cPts[i + 1], {
                    color: segSupported ? c.color : COLORS.cinnabar,
                    alpha: segSupported ? 0.9 : 0.35,
                    width: segSupported ? 2.8 : 1.4,
                    dashed: segSupported ? null : [4, 5],
                    glow: segSupported,
                });
            }

            // 绘制节点对应弦 A(r, t)
            cPts.forEach((tg) => {
                if (tg.align >= 0 && rPts[tg.align]) {
                    const rn = rPts[tg.align];
                    ctx.save();
                    ctx.strokeStyle = hexToRgba(COLORS.mint, 0.55);
                    ctx.setLineDash([3, 4]);
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(rn.x, rn.y + 7);
                    ctx.lineTo(tg.x, tg.y - 7);
                    ctx.stroke();
                    ctx.restore();
                }

                drawNodeBadge(ctx, tg, {
                    color: tg.supported ? c.color : COLORS.cinnabar,
                    radius: 6.5,
                    dimmed: !tg.supported,
                    label: tg.label,
                    sub: tg.supported ? 'In D_η(u) · Q_i > 0' : 'Outside Support · Q_i = 0',
                });
            });
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setCurveIdx: (idx) => {
                curveIdx = clamp(idx, 0, candidates.length - 1);
            },
        };
    }

    // =========================================================================
    // CHAPTER 08 · MORPHOLOGY SOFTMAX & OMEGA FUNCTIONAL: 重心单纯形与 ∛Ω 仪表
    // =========================================================================
    function createScene_ch8(canvas) {
        let presetKey = 'propositional';

        const presets = {
            atomic: {
                pA: 0.68,
                pP: 0.21,
                pN: 0.11,
                omegaE: 0.58,
                omegaN: 0.46,
                omegaF: 0.64,
                obs: 1.0,
                mode: 'atomic (浅层高凝聚)',
            },
            propositional: {
                pA: 0.18,
                pP: 0.58,
                pN: 0.24,
                omegaE: 0.82,
                omegaN: 0.74,
                omegaF: 0.79,
                obs: 1.0,
                mode: 'propositional (同层分叉与桥接)',
            },
            narrative: {
                pA: 0.10,
                pP: 0.22,
                pN: 0.68,
                omegaE: 0.86,
                omegaN: 0.88,
                omegaF: 0.81,
                obs: 1.0,
                mode: 'narrative (深链跨层持续)',
            },
            collapsed: {
                pA: 0.36,
                pP: 0.33,
                pN: 0.31,
                omegaE: 0.14,
                omegaN: 0.04,
                omegaF: 0.08,
                obs: 1.0,
                mode: 'prior_shrinkage (样本不足向 1/3 收缩)',
            },
        };

        const runner = new SceneRunner(canvas, (ctx, w, h) => {
            drawIndustrialGrid(ctx, w, h, 44);
            const p = presets[presetKey] || presets.propositional;
            const omegaGeo = Math.cbrt(Math.max(0.02, p.omegaE) * Math.max(0.02, p.omegaN) * Math.max(0.02, p.omegaF));
            const omega = clamp(omegaGeo * p.obs, 0, 1);
            const regime = omega < 0.12 ? 'COLLAPSED' : omega < 0.45 ? 'SPARSE' : 'DENSE';

            setReadout(
                'ch8Readout',
                `M(R_q)=(${p.pA.toFixed(2)}, ${p.pP.toFixed(2)}, ${p.pN.toFixed(2)}) · Ω = ${omega.toFixed(2)} (${regime})`
            );

            // 左半区：(p_A, p_P, p_N) 形态单纯形三角形
            const txTop = { x: w * 0.25, y: h * 0.16 };
            const txLeft = { x: w * 0.09, y: h * 0.78 };
            const txRight = { x: w * 0.41, y: h * 0.78 };

            ctx.save();
            ctx.fillStyle = 'rgba(118, 191, 174, 0.06)';
            ctx.strokeStyle = hexToRgba(COLORS.patina, 0.55);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(txTop.x, txTop.y);
            ctx.lineTo(txLeft.x, txLeft.y);
            ctx.lineTo(txRight.x, txRight.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 均匀先验中心 (1/3, 1/3, 1/3)
            const priorPt = {
                x: (txTop.x + txLeft.x + txRight.x) / 3,
                y: (txTop.y + txLeft.y + txRight.y) / 3,
            };
            ctx.fillStyle = COLORS.muted;
            ctx.beginPath();
            ctx.arc(priorPt.x, priorPt.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // 当前形态重心坐标
            const curPt = {
                x: p.pP * txTop.x + p.pA * txLeft.x + p.pN * txRight.x,
                y: p.pP * txTop.y + p.pA * txLeft.y + p.pN * txRight.y,
            };
            drawVectorArrow(ctx, priorPt, curPt, { color: COLORS.amber, alpha: 0.7, width: 1.6, dashed: [3, 3] });
            drawNodeBadge(ctx, curPt, {
                color: COLORS.amber,
                radius: 7,
                energy: 0.9,
                label: `(${p.pA.toFixed(2)}, ${p.pP.toFixed(2)}, ${p.pN.toFixed(2)})`,
                offsetY: -12,
            });

            drawPillTag(ctx, txTop.x, txTop.y - 12, `Propositional p_P=${p.pP.toFixed(2)}`, COLORS.patina, 'center');
            drawPillTag(ctx, txLeft.x + 16, txLeft.y + 16, `Atomic p_A=${p.pA.toFixed(2)}`, COLORS.amber, 'center');
            drawPillTag(ctx, txRight.x - 16, txRight.y + 16, `Narrative p_N=${p.pN.toFixed(2)}`, COLORS.mint, 'center');
            ctx.restore();

            // 右半区：Ω = ∛(Ω_E · Ω_N · Ω_F) · χ_obs 三维几何平均与工况门控
            const rx = w * 0.49;
            const rw = w * 0.47;
            const ry = 28;

            ctx.save();
            ctx.fillStyle = 'rgba(18, 22, 26, 0.92)';
            ctx.strokeStyle = 'rgba(242, 169, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, h - 52, 8);
            ctx.fill();
            ctx.stroke();

            const comps = [
                { name: 'Ω_E (边激活密度 M / κ_E N_s)', val: p.omegaE, color: COLORS.patina },
                { name: 'Ω_N (涌现节点比 N_e / κ_N N_s)', val: p.omegaN, color: COLORS.mint },
                { name: 'Ω_F (归一化边流 Shannon 熵)', val: p.omegaF, color: COLORS.amber },
                { name: `Unified Ω = ∛(Ω_E·Ω_N·Ω_F) [${regime}]`, val: omega, color: omega < 0.12 ? COLORS.cinnabar : COLORS.amber },
            ];

            comps.forEach((c, idx) => {
                const by = ry + 32 + idx * 58;
                const bx = rx + 16;
                const bw = rw - 32;

                ctx.font = '600 10px "JetBrains Mono", monospace';
                ctx.fillStyle = COLORS.bone;
                ctx.textAlign = 'left';
                ctx.fillText(c.name, bx, by);

                ctx.fillStyle = c.color;
                ctx.textAlign = 'right';
                ctx.fillText(c.val.toFixed(2), bx + bw, by);

                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.roundRect(bx, by + 7, bw, 11, 5);
                ctx.fill();

                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.roundRect(bx, by + 7, Math.max(4, bw * c.val), 11, 5);
                ctx.fill();
            });
            ctx.restore();
        });

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setPreset: (k) => {
                presetKey = k;
            },
        };
    }

    // =========================================================================
    // CHAPTER 09 · CONDITIONAL INNOVATION LCB & DIRECT ANCHOR SMOOTHSTEP
    // =========================================================================
    // Chapter 09 is provided by rivermemo-v3.js.

    function createScene_finale(canvas) {
        let currentScene = 'arch';

        // 标题和解释角色是教学预设；证据标量不来自真实日记或生产观测。
        const common = { field: .88, support: .8, scalarPath: .4,
            graphScore: .8, nodeCoverage: .35, edgeCoverage: .20,
            closure: .9, alignment: .85, direction: .9 };
        const scenarios = {
            arch: {
                omega: .82, regime: 'DENSE', mode: 'narrative · 预设结构证据',
                items: [
                    { title: 'RiverMemo Topology V3 与 AGS 双尺度几何事务闭合记录',
                        role: '显式精确接触 · 闭合达标（预设）',
                        evidence: { query: .78, pathQuality: .7, anchorStrength: .18 } },
                    { title: 'Sense 有界脉冲扩散与 Resolvent 双尺度连续场推导',
                        role: '结构解释（预设）',
                        evidence: { query: .72, pathQuality: .8, anchorStrength: 0 } },
                    { title: '请求句柄与同代快照复用设计',
                        role: '主题邻居（预设）',
                        evidence: { query: .68, pathQuality: .2, nodeCoverage: .12, edgeCoverage: .03 } },
                ],
            },
            fact: {
                omega: .19, regime: 'SPARSE', mode: 'propositional · 预设配置核查',
                items: [
                    { title: '双场共享预算默认 K=256 的配置说明',
                        role: '显式精确接触 · 闭合达标（预设）',
                        evidence: { query: .74, pathQuality: .12, anchorStrength: .20 } },
                    { title: '路径与图共享 0.08 拓扑预算的说明',
                        role: '结构解释（预设）',
                        evidence: { query: .69, pathQuality: .6, anchorStrength: .09 } },
                    { title: '动态虫洞与静态邻居名额的关系',
                        role: '隐式种子（预设）',
                        evidence: { query: .64, pathQuality: .2, implicitOnly: true, anchorStrength: .2 } },
                ],
            },
            concept: {
                omega: .48, regime: 'DENSE', mode: 'atomic · 预设概念证据',
                items: [
                    { title: 'OneRing 跨端唯一事实时间线定义',
                        role: '原子概念（预设）',
                        evidence: { query: .81, pathQuality: .4, atomic: true, anchorStrength: .16 } },
                    { title: '共笔文坊三态解耦协议',
                        role: '原子概念（预设）',
                        evidence: { query: .73, pathQuality: .3, atomic: true, anchorStrength: .10 } },
                    { title: 'VMusic 音频重采样管线说明',
                        role: '主题邻居（预设）',
                        evidence: { query: .66, pathQuality: .1, nodeCoverage: .08, edgeCoverage: 0, hasEdges: false } },
                ],
            },
        };

        function renderScoreTable(sc) {
            const container = document.getElementById('finaleScoreTable');
            if (!container) return;
            const ranked = sc.items.map(item => ({ ...item, result:
                global.RiverMemoV3.scoreCandidate({ ...common, omega: sc.omega, ...item.evidence }) }))
                .sort((a, b) => b.result.score - a.result.score);
            container.innerHTML = ranked
                .map((item, index) => {
                    const r = item.result;
                    return `
                        <div class="score-row-card">
                            <div class="score-row-head">
                                <span class="score-row-title">#0${index + 1} · ${item.title}</span>
                                <span class="score-role-badge">${item.role}</span>
                            </div>
                            <div class="score-bars" title="B + P + G + A；超出 1 的部分另记截断扣分">
                                <div class="bar-s0" style="width:${r.base * 100}%"></div>
                                <div class="bar-bg" style="width:${r.path * 100}%;background:#76BFAE"></div>
                                <div class="bar-bg" style="width:${r.graph * 100}%"></div>
                                <div class="bar-bh" style="width:${r.anchor * 100}%"></div>
                            </div>
                            <div class="score-breakdown">
                                <span>B=${r.base.toFixed(4)}（含共振 ${r.resonance.toFixed(4)}）</span>
                                <span>+ P=${r.path.toFixed(4)}</span>
                                <span>+ G=${r.graph.toFixed(4)}</span>
                                <span>+ A=${r.anchor.toFixed(4)}</span>
                                <span>− 截断=${r.clipping.toFixed(4)}</span>
                                <span>P+G=${(r.path + r.graph).toFixed(4)} ≤ 0.08</span>
                                <strong>S_V3 = ${r.score.toFixed(4)}</strong>
                            </div>
                        </div>
                    `;
                })
                .join('');
        }

        const stageLabels = ['AGS/CSR', '残差分层', '动态虫洞', '双场预算 K', '并集差集', '共享池读出', 'Softmax+Ω', 'Top-K'];

        const runner = new SceneRunner(canvas, (ctx, w, h, t) => {
            drawIndustrialGrid(ctx, w, h, 44);
            const sc = scenarios[currentScene] || scenarios.arch;
            setReadout(
                'ch10Readout',
                `教学预设 · ${sc.mode} · Ω = ${sc.omega.toFixed(2)} (${sc.regime}) · 非生产性能数据`
            );

            const yMid = h * 0.52;
            const pts = stageLabels.map((lb, i) => ({
                x: lerp(w * 0.07, w * 0.93, i / (stageLabels.length - 1)),
                y: yMid + Math.sin(i * 1.1) * 28,
                label: lb,
                color: i < 4 ? COLORS.patina : i < 7 ? COLORS.amber : COLORS.cinnabar,
            }));

            for (let i = 0; i < pts.length - 1; i++) {
                drawVectorArrow(ctx, pts[i], pts[i + 1], {
                    color: pts[i].color,
                    alpha: 0.78,
                    width: 2.4,
                });
            }

            // 沿 8 阶段管线奔涌的脉冲
            const pulseStage = (t * 1.4) % (pts.length - 1);
            const idx = Math.floor(pulseStage);
            const frac = pulseStage - idx;
            const px = lerp(pts[idx].x, pts[idx + 1].x, frac);
            const py = lerp(pts[idx].y, pts[idx + 1].y, frac);
            ctx.fillStyle = COLORS.amber;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();

            pts.forEach((p, i) => {
                drawNodeBadge(ctx, p, {
                    color: p.color,
                    radius: i === pts.length - 1 ? 8 : 6,
                    energy: 0.85,
                    label: p.label,
                    offsetY: i % 2 === 0 ? -14 : 20,
                });
            });
        }, {
            onResize: () => {
                renderScoreTable(scenarios[currentScene] || scenarios.arch);
            },
        });

        renderScoreTable(scenarios[currentScene]);

        return {
            start: () => runner.start(),
            stop: () => runner.stop(),
            setScenario: (key) => {
                currentScene = key;
                renderScoreTable(scenarios[currentScene] || scenarios.arch);
            },
        };
    }

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
        createScene_finale,
    };
})(window);