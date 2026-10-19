/* ==========================================================================
   river-engine.js
   Nova 纸墨工业 (Paper & Ink Industrial) Canvas 2D 渲染底座
   服务于 RiverMemo Topology V3.1 & AGS 统一场交互实验室
   ========================================================================== */

(function (global) {
    'use strict';

    const COLORS = {
        graphite: '#101417',
        panel: '#171C20',
        bone: '#F2F0E9',
        muted: '#9FA6AA',
        dim: '#5A635F',
        patina: '#76BFAE',
        turquoise: '#21675C',
        mint: '#4CE0B3',
        amber: '#F2A900',
        cinnabar: '#B94832',
        coral: '#FF7A59',
    };

    function hexToRgba(hex, alpha) {
        const h = (hex || '#76BFAE').replace('#', '');
        const r = parseInt(h.substring(0, 2), 16) || 118;
        const g = parseInt(h.substring(2, 4), 16) || 191;
        const b = parseInt(h.substring(4, 6), 16) || 174;
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function smoothstep(edge0, edge1, x) {
        if (Math.abs(edge1 - edge0) < 1e-9) return x >= edge1 ? 1 : 0;
        const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function setupHiDPI(canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(280, rect.width || canvas.clientWidth || 640);
        const h = Math.max(220, rect.height || canvas.clientHeight || 340);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h, dpr };
    }

    function cubicBezierPoint(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        return {
            x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
            y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
        };
    }

    // 绘制工业测地坐标背景网格与十字准星
    function drawIndustrialGrid(ctx, w, h, step = 44) {
        ctx.save();
        ctx.strokeStyle = 'rgba(118, 191, 174, 0.055)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = step; x < w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = step; y < h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // 四角准星标记
        ctx.strokeStyle = 'rgba(242, 169, 0, 0.28)';
        const marks = [
            [14, 14],
            [w - 14, 14],
            [14, h - 14],
            [w - 14, h - 14],
        ];
        ctx.beginPath();
        for (const [mx, my] of marks) {
            ctx.moveTo(mx - 4, my);
            ctx.lineTo(mx + 4, my);
            ctx.moveTo(mx, my - 4);
            ctx.lineTo(mx, my + 4);
        }
        ctx.stroke();
        ctx.restore();
    }

    // 绘制带方向箭头的向量/有向边
    function drawVectorArrow(ctx, from, to, opts = {}) {
        const color = opts.color || COLORS.patina;
        const alpha = opts.alpha ?? 0.85;
        const width = opts.width ?? 2;
        const head = opts.head ?? 7;

        ctx.save();
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        if (opts.dashed) ctx.setLineDash(opts.dashed);
        if (opts.glow) {
            ctx.shadowBlur = opts.glowBlur ?? 10;
            ctx.shadowColor = color;
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.setLineDash([]);
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const pos = opts.arrowAt ?? 1.0;
        const ax = lerp(from.x, to.x, pos);
        const ay = lerp(from.y, to.y, pos);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - 0.45) * head, ay - Math.sin(angle - 0.45) * head);
        ctx.lineTo(ax - Math.cos(angle + 0.45) * head, ay - Math.sin(angle + 0.45) * head);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 绘制工业风节点
    function drawNodeBadge(ctx, node, opts = {}) {
        const color = opts.color || node.color || COLORS.patina;
        const r = opts.radius ?? node.radius ?? 6;
        const energy = clamp(opts.energy ?? node.energy ?? 0.5, 0, 1);
        const dimmed = opts.dimmed ?? false;
        const alpha = dimmed ? 0.28 : 0.95;

        ctx.save();
        if (!dimmed && energy > 0.15) {
            const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * (2.2 + energy * 1.4));
            halo.addColorStop(0, hexToRgba(color, 0.38 * energy));
            halo.addColorStop(1, hexToRgba(color, 0));
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * (2.2 + energy * 1.4), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#101417';
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = opts.ringWidth ?? 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(2, r * 0.46), 0, Math.PI * 2);
        ctx.fill();

        const label = opts.label ?? node.label;
        if (label) {
            ctx.font = `${opts.bold ? '600 ' : ''}11px "JetBrains Mono", "Inter", sans-serif`;
            ctx.textAlign = opts.align || 'center';
            ctx.fillStyle = hexToRgba(opts.labelColor || COLORS.bone, dimmed ? 0.42 : 0.94);
            ctx.fillText(label, node.x + (opts.offsetX || 0), node.y + (opts.offsetY ?? -(r + 8)));
        }

        if (opts.sub) {
            ctx.font = '9.5px "JetBrains Mono", monospace';
            ctx.textAlign = opts.align || 'center';
            ctx.fillStyle = hexToRgba(color, dimmed ? 0.35 : 0.86);
            ctx.fillText(opts.sub, node.x + (opts.offsetX || 0), node.y + (opts.subOffsetY ?? (r + 13)));
        }
        ctx.restore();
    }

    // 绘制 HUD 胶囊铭牌
    function drawPillTag(ctx, x, y, text, color = COLORS.patina, align = 'left') {
        ctx.save();
        ctx.font = '600 10px "JetBrains Mono", monospace';
        const padX = 7;
        const w = ctx.measureText(text).width + padX * 2;
        const h = 18;
        const rx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
        const ry = y - h / 2;

        ctx.fillStyle = 'rgba(16, 20, 23, 0.88)';
        ctx.strokeStyle = hexToRgba(color, 0.55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(rx, ry, w, h, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = hexToRgba(color, 0.95);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, rx + padX, y + 0.5);
        ctx.restore();
    }

    class RiverPath {
        constructor(p0, p1, p2, p3, opts = {}) {
            this.p0 = p0;
            this.p1 = p1;
            this.p2 = p2;
            this.p3 = p3;
            this.color = opts.color || COLORS.patina;
            this.width = opts.width ?? 2;
            this.opacity = opts.opacity ?? 0.5;
            this.dashed = opts.dashed || null;
        }

        sample(t) {
            return cubicBezierPoint(t, this.p0, this.p1, this.p2, this.p3);
        }

        draw(ctx) {
            ctx.save();
            ctx.strokeStyle = hexToRgba(this.color, this.opacity);
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            if (this.dashed) ctx.setLineDash(this.dashed);
            ctx.beginPath();
            ctx.moveTo(this.p0.x, this.p0.y);
            ctx.bezierCurveTo(this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.p3.x, this.p3.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    class RiverParticle {
        constructor(path, opts = {}) {
            this.path = path;
            this.t = opts.startT ?? Math.random();
            this.speed = opts.speed ?? 0.003;
            this.size = opts.size ?? 2.2;
            this.color = opts.color || path.color;
            this.opacity = opts.opacity ?? 0.85;
            this.direction = opts.direction ?? 1;
        }

        update() {
            this.t += this.speed * this.direction;
            if (this.direction > 0 && this.t >= 1) this.t -= 1;
            if (this.direction < 0 && this.t <= 0) this.t += 1;
        }

        draw(ctx) {
            const p = this.path.sample(clamp(this.t, 0, 1));
            const prevT = clamp(this.t - this.speed * this.direction * 9, 0, 1);
            const tail = this.path.sample(prevT);

            ctx.save();
            ctx.strokeStyle = hexToRgba(this.color, this.opacity * 0.45);
            ctx.lineWidth = this.size * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            ctx.fillStyle = hexToRgba(this.color, this.opacity);
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class SceneRunner {
        constructor(canvas, drawFn, options = {}) {
            this.canvas = canvas;
            this.drawFn = drawFn;
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
                if (!document.hidden && this._dims) {
                    const t = (now - this._t0) / 1000;
                    const { ctx, w, h } = this._dims;
                    ctx.clearRect(0, 0, w, h);
                    try {
                        this.drawFn(ctx, w, h, t);
                    } catch (e) {
                        console.error('[SceneRunner] draw error:', e);
                    }
                }
                this._raf = requestAnimationFrame(loop);
            };
            this._raf = requestAnimationFrame(loop);
        }

        stop() {
            this._running = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = null;
            window.removeEventListener('resize', this._resizeHandler);
        }
    }

    global.RiverEngine = {
        COLORS,
        hexToRgba,
        lerp,
        clamp,
        smoothstep,
        setupHiDPI,
        cubicBezierPoint,
        drawIndustrialGrid,
        drawVectorArrow,
        drawNodeBadge,
        drawPillTag,
        RiverPath,
        RiverParticle,
        SceneRunner,
    };
})(window);