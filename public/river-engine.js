/* =================================================================
   river-engine.js
   核心粒子流引擎：Canvas 2D 实现"语义河流"渲染
   - RiverParticle: 沿曲线流动的水粒子
   - RiverPath: 贝塞尔/样条河道
   - GlowDot: 发光节点（Tag 锚点）
   - SpikeWave: LIF 脉冲传导环
   - WormholeFlare: 虫洞飞溅
   ================================================================= */

(function (global) {
    'use strict';

    // ---------- 颜色 / 工具 ----------
    const COLORS = {
        cyan: '#4dd0e1',
        blue: '#5b8def',
        violet: '#8a5cf6',
        pink: '#f06292',
        gold: '#ffb74d',
        white: '#e8eaf6',
        muted: '#5e6488',
    };

    function hexToRgba(hex, alpha) {
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // 高 DPI 适配：把 canvas 内部分辨率提升到设备像素，
    // 同时把绘图坐标缩回逻辑像素，所有场景共用。
    function setupHiDPI(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w: rect.width, h: rect.height, dpr };
    }

    // 三次贝塞尔上的点
    function cubicBezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const x = uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x;
        const y = uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y;
        return { x, y };
    }

    // ---------- RiverPath: 河道（一条贝塞尔曲线）----------
    class RiverPath {
        constructor(p0, p1, p2, p3, opts = {}) {
            this.p0 = p0;
            this.p1 = p1;
            this.p2 = p2;
            this.p3 = p3;
            this.color = opts.color || COLORS.cyan;
            this.width = opts.width ?? 2;
            this.glow = opts.glow ?? true;
            this.dashed = opts.dashed ?? false;
            this.opacity = opts.opacity ?? 0.5;
        }

        sample(t) {
            return cubicBezierPoint(t, this.p0, this.p1, this.p2, this.p3);
        }

        draw(ctx) {
            ctx.save();
            if (this.glow) {
                ctx.shadowBlur = 12;
                ctx.shadowColor = this.color;
            }
            if (this.dashed) {
                ctx.setLineDash([4, 4]);
            }
            ctx.strokeStyle = hexToRgba(this.color, this.opacity);
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.p0.x, this.p0.y);
            ctx.bezierCurveTo(this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.p3.x, this.p3.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ---------- RiverParticle: 沿河流动的粒子 ----------
    class RiverParticle {
        constructor(path, opts = {}) {
            this.path = path;
            this.t = opts.startT ?? 0;
            this.speed = opts.speed ?? randRange(0.0025, 0.005);
            this.size = opts.size ?? randRange(1.5, 3);
            this.color = opts.color || path.color;
            this.opacity = opts.opacity ?? randRange(0.5, 1);
            this.tail = opts.tail ?? 8;
            this.history = [];
            this.direction = opts.direction ?? 1; // 1 顺流, -1 逆流
            this.dampening = opts.dampening ?? 1.0;
            this.alive = true;
        }

        update() {
            this.t += this.speed * this.direction * this.dampening;
            if (this.direction > 0 && this.t >= 1) this.t = 0;
            if (this.direction < 0 && this.t <= 0) this.t = 1;
            const p = this.path.sample(this.t);
            this.history.unshift(p);
            if (this.history.length > this.tail) this.history.pop();
        }

        draw(ctx) {
            const p = this.history[0];
            if (!p) return;

            // 拖尾
            for (let i = this.history.length - 1; i >= 1; i--) {
                const a = this.history[i];
                const b = this.history[i - 1];
                const trailA = (1 - i / this.history.length) * this.opacity * 0.6;
                ctx.strokeStyle = hexToRgba(this.color, trailA);
                ctx.lineWidth = this.size * 0.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // 头部光点
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fillStyle = hexToRgba(this.color, this.opacity);
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---------- GlowDot: 发光锚点 ----------
    class GlowDot {
        constructor(x, y, opts = {}) {
            this.x = x;
            this.y = y;
            this.color = opts.color || COLORS.cyan;
            this.radius = opts.radius ?? 5;
            this.label = opts.label || '';
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseSpeed = opts.pulseSpeed ?? 0.04;
            this.energy = opts.energy ?? 0;  // 0 ~ 1, 决定发光强度
            this.maxEnergy = 1;
        }

        update() {
            this.pulsePhase += this.pulseSpeed;
            // 能量缓慢衰减
            this.energy *= 0.985;
        }

        addEnergy(delta) {
            this.energy = clamp(this.energy + delta, 0, this.maxEnergy);
        }

        draw(ctx) {
            const pulse = 0.85 + Math.sin(this.pulsePhase) * 0.15;
            const r = this.radius * (1 + this.energy * 0.5);
            const glow = 8 + this.energy * 30;

            ctx.save();
            // 外层光晕
            ctx.shadowBlur = glow;
            ctx.shadowColor = this.color;

            // 能量环
            if (this.energy > 0.05) {
                ctx.strokeStyle = hexToRgba(this.color, this.energy * 0.8);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r + 4 + this.energy * 6, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 主体
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 2);
            grad.addColorStop(0, hexToRgba(this.color, pulse));
            grad.addColorStop(0.4, hexToRgba(this.color, 0.6 * pulse));
            grad.addColorStop(1, hexToRgba(this.color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
            ctx.fill();

            // 内核
            ctx.fillStyle = hexToRgba(this.color, 0.95);
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // 标签
            if (this.label) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = hexToRgba(COLORS.white, 0.85);
                ctx.font = '11px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(this.label, this.x, this.y + r + 6);
            }
            ctx.restore();
        }
    }

    // ---------- SpikeWave: LIF 脉冲扩散圆环 ----------
    class SpikeWave {
        constructor(x, y, opts = {}) {
            this.x = x;
            this.y = y;
            this.color = opts.color || COLORS.violet;
            this.radius = 0;
            this.maxRadius = opts.maxRadius ?? 80;
            this.life = 1;
            this.decay = opts.decay ?? 0.018;
            this.thickness = opts.thickness ?? 2.5;
            this.alive = true;
        }

        update() {
            this.radius += (this.maxRadius - this.radius) * 0.06;
            this.life -= this.decay;
            if (this.life <= 0) this.alive = false;
        }

        draw(ctx) {
            if (!this.alive) return;
            ctx.save();
            ctx.shadowBlur = 16;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = hexToRgba(this.color, this.life);
            ctx.lineWidth = this.thickness * this.life;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ---------- WormholeFlare: 虫洞瀑布飞溅 ----------
    class WormholeFlare {
        constructor(x, y, opts = {}) {
            this.x = x;
            this.y = y;
            this.particles = [];
            this.color = opts.color || COLORS.pink;
            const count = opts.count ?? 24;
            const speed = opts.speed ?? 4;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + randRange(-0.2, 0.2);
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed * randRange(0.6, 1.4),
                    vy: Math.sin(angle) * speed * randRange(0.6, 1.4),
                    life: 1,
                    decay: randRange(0.012, 0.025),
                    size: randRange(1.5, 3.5),
                });
            }
            this.alive = true;
        }

        update() {
            let any = false;
            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.life -= p.decay;
                if (p.life > 0) any = true;
            }
            this.alive = any;
        }

        draw(ctx) {
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = this.color;
            for (const p of this.particles) {
                if (p.life <= 0) continue;
                ctx.fillStyle = hexToRgba(this.color, p.life);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // ---------- BackgroundDriftField: 背景缓慢漂浮粒子 ----------
    class BackgroundDriftField {
        constructor(w, h, count = 80, color = COLORS.blue) {
            this.w = w;
            this.h = h;
            this.color = color;
            this.particles = [];
            for (let i = 0; i < count; i++) {
                this.particles.push(this._spawn());
            }
        }

        _spawn() {
            return {
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                vx: randRange(-0.15, 0.15),
                vy: randRange(-0.05, 0.05),
                size: randRange(0.5, 1.8),
                opacity: randRange(0.1, 0.4),
                phase: Math.random() * Math.PI * 2,
                phaseSpeed: randRange(0.005, 0.02),
            };
        }

        resize(w, h) {
            this.w = w;
            this.h = h;
        }

        update() {
            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += p.phaseSpeed;
                if (p.x < 0) p.x += this.w;
                if (p.x > this.w) p.x -= this.w;
                if (p.y < 0) p.y += this.h;
                if (p.y > this.h) p.y -= this.h;
            }
        }

        draw(ctx) {
            ctx.save();
            for (const p of this.particles) {
                const a = p.opacity * (0.6 + 0.4 * Math.sin(p.phase));
                ctx.fillStyle = hexToRgba(this.color, a);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // ---------- SceneRunner: 简单场景调度器 ----------
    class SceneRunner {
        constructor(canvas, drawFn, options = {}) {
            this.canvas = canvas;
            this.drawFn = drawFn; // (ctx, w, h, time) => void
            this.options = options;
            this._raf = null;
            this._running = false;
            this._t0 = 0;
            this._dims = null;
            this._resizeHandler = () => this._resize();
        }

        _resize() {
            this._dims = setupHiDPI(this.canvas);
            if (this.options.onResize) {
                this.options.onResize(this._dims);
            }
        }

        start() {
            if (this._running) return;
            this._running = true;
            this._resize();
            window.addEventListener('resize', this._resizeHandler);
            this._t0 = performance.now();

            const loop = (now) => {
                if (!this._running) return;
                const t = (now - this._t0) / 1000;
                const { ctx, w, h } = this._dims;
                ctx.clearRect(0, 0, w, h);
                try {
                    this.drawFn(ctx, w, h, t);
                } catch (e) {
                    console.error('[SceneRunner] draw error:', e);
                }
                this._raf = requestAnimationFrame(loop);
            };
            this._raf = requestAnimationFrame(loop);
        }

        stop() {
            this._running = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            window.removeEventListener('resize', this._resizeHandler);
        }
    }

    // ---------- 工具：在 ctx 上画曲线（用于河道地势线、贝塞尔等）----------
    function drawSmoothPath(ctx, points, options = {}) {
        if (points.length < 2) return;
        ctx.save();
        if (options.shadow) {
            ctx.shadowBlur = options.shadowBlur ?? 12;
            ctx.shadowColor = options.shadowColor || options.color || COLORS.cyan;
        }
        ctx.strokeStyle = options.color || COLORS.cyan;
        ctx.lineWidth = options.width ?? 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (options.dashed) ctx.setLineDash(options.dashed);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        // 末两点
        const n = points.length;
        ctx.quadraticCurveTo(points[n - 2].x, points[n - 2].y, points[n - 1].x, points[n - 1].y);
        ctx.stroke();
        ctx.restore();
    }

    function drawConnection(ctx, p1, p2, opts = {}) {
        ctx.save();
        if (opts.shadow) {
            ctx.shadowBlur = opts.shadowBlur ?? 6;
            ctx.shadowColor = opts.shadowColor || opts.color || COLORS.cyan;
        }
        ctx.strokeStyle = opts.color || hexToRgba(COLORS.blue, 0.4);
        ctx.lineWidth = opts.width ?? 1;
        if (opts.dashed) ctx.setLineDash(opts.dashed);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        // 中间稍微偏移做弧线
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curveAmount = opts.curve ?? Math.min(40, dist * 0.15);
        const nx = -dy / dist;
        const ny = dx / dist;
        const cx = mx + nx * curveAmount;
        const cy = my + ny * curveAmount;
        ctx.quadraticCurveTo(cx, cy, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    // ---------- Export ----------
    global.RiverEngine = {
        COLORS,
        hexToRgba,
        lerp,
        clamp,
        randRange,
        setupHiDPI,
        cubicBezierPoint,
        RiverPath,
        RiverParticle,
        GlowDot,
        SpikeWave,
        WormholeFlare,
        BackgroundDriftField,
        SceneRunner,
        drawSmoothPath,
        drawConnection,
    };
})(window);