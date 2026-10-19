/* =================================================================
   main.js
   - 章节注册 + IntersectionObserver 启停场景
   - anime.js 文本入场动画
   - 进度导航联动
   - AGS / EPA / Sense / 双场 / 拓扑 / Ω / 直接锚 / 终章交互
   - 数字递增动画
   ================================================================= */

(function () {
    'use strict';

    const Scenes = window.WaveScenes;

    // ---------- 章节注册表 ----------
    // 每个 chapter 一个 entry: { id, canvasId, factory, instance: null, started: false }
    const chapters = [
        { id: 0, canvasId: 'heroCanvas', factory: Scenes.createScene_hero },
        { id: 1, canvasId: 'ch1Canvas', factory: Scenes.createScene_ch1 },
        { id: 2, canvasId: 'ch2Canvas', factory: Scenes.createScene_ch2 },
        { id: 3, canvasId: 'ch3Canvas', factory: Scenes.createScene_ch3 },
        { id: 4, canvasId: 'ch4Canvas', factory: Scenes.createScene_ch4 },
        { id: 5, canvasId: 'ch5Canvas', factory: Scenes.createScene_ch5 },
        { id: 6, canvasId: 'ch6Canvas', factory: Scenes.createScene_ch6 },
        { id: 7, canvasId: 'ch7Canvas', factory: Scenes.createScene_ch7 },
        { id: 8, canvasId: 'ch8Canvas', factory: Scenes.createScene_ch8 },
        { id: 9, canvasId: 'ch9Canvas', factory: Scenes.createScene_ch9 },
        { id: 10, canvasId: 'ch10Canvas', factory: Scenes.createScene_finale },
    ];

    function getOrCreateScene(entry) {
        if (entry.instance) return entry.instance;
        const canvas = document.getElementById(entry.canvasId);
        if (!canvas) {
            console.warn(`[main] canvas not found: ${entry.canvasId}`);
            return null;
        }
        try {
            entry.instance = entry.factory(canvas);
        } catch (e) {
            console.error(`[main] factory failed for chapter ${entry.id}:`, e);
        }
        return entry.instance;
    }

    function startChapter(id) {
        const entry = chapters.find(c => c.id === id);
        if (!entry) return;
        const inst = getOrCreateScene(entry);
        if (inst && !entry.started) {
            inst.start();
            entry.started = true;
        }
    }

    function stopChapter(id) {
        const entry = chapters.find(c => c.id === id);
        if (!entry || !entry.instance || !entry.started) return;
        entry.instance.stop();
        entry.started = false;
    }

    // ---------- 全局背景 ----------
    function startGlobalRiver() {
        const canvas = document.getElementById('globalRiver');
        if (!canvas) return;
        const inst = Scenes.createGlobalRiver(canvas);
        inst.start();
    }

    // ---------- IntersectionObserver: 进入视口启动 / 离开停止 ----------
    function setupVisibilityObserver() {
        const sections = document.querySelectorAll('.chapter');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                const section = en.target.closest('.chapter');
                if (!section) return;
                const id = parseInt(section.dataset.chapter, 10);
                if (en.isIntersecting) {
                    startChapter(id);
                    setActiveDot(id);
                    triggerEntryAnimation(section);
                } else if (!en.isIntersecting) {
                    stopChapter(id);
                }
            });
        }, {
            threshold: 0,
            rootMargin: '0px',
        });

        sections.forEach(section => {
            const canvas = section.querySelector('.scene-canvas');
            if (canvas) observer.observe(canvas);
        });
    }

    // ---------- 进度导航 ----------
    function setActiveDot(chapterId) {
        document.querySelectorAll('.chapter-dots .dot').forEach(dot => {
            const id = parseInt(dot.dataset.chapter, 10);
            dot.classList.toggle('active', id === chapterId);
        });
    }

    function setupNavClick() {
        document.querySelectorAll('.chapter-dots .dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const id = parseInt(dot.dataset.chapter, 10);
                const target = document.querySelector(`.chapter[data-chapter="${id}"]`);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ---------- 文本入场动画 (anime.js) ----------
    const animatedSet = new WeakSet();
    function triggerEntryAnimation(section) {
        if (animatedSet.has(section)) return;
        animatedSet.add(section);

        if (typeof anime === 'undefined') return;

        const targets = section.querySelectorAll('.chapter-meta, .chapter-title, .text-pane > *, .canvas-pane');
        if (targets.length === 0) return;

        anime({
            targets,
            opacity: [0, 1],
            translateY: [22, 0],
            delay: anime.stagger(80, { start: 0 }),
            duration: 700,
            easing: 'easeOutCubic',
        });

        // 触发统计数字动画
        const stats = section.querySelectorAll('.stat-num[data-target]');
        stats.forEach(stat => animateStat(stat));
    }

    function animateStat(el) {
        const target = parseInt(el.dataset.target, 10);
        if (isNaN(target)) return;
        const obj = { v: 0 };
        anime({
            targets: obj,
            v: target,
            duration: 1600,
            easing: 'easeOutQuart',
            delay: 200,
            update: () => {
                el.textContent = formatStat(Math.floor(obj.v));
            },
        });
    }

    function formatStat(n) {
        if (n >= 10000) return (n / 1000).toFixed(0) + 'K';
        if (n >= 1000) return n.toLocaleString();
        return String(n);
    }

    // ---------- Hero 标题特效 ----------
    function setupHeroAnimation() {
        if (typeof anime === 'undefined') return;
        anime.timeline({ easing: 'easeOutExpo' })
            .add({
                targets: '.hero-badge',
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 600,
            })
            .add({
                targets: '.title-line',
                opacity: [0, 1],
                translateY: [60, 0],
                duration: 900,
                delay: anime.stagger(150),
            }, '-=300')
            .add({
                targets: '.hero-subtitle',
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 600,
            }, '-=400')
            .add({
                targets: '.hero-formula > *',
                opacity: [0, 1],
                scale: [0.9, 1],
                duration: 600,
                delay: anime.stagger(120),
            }, '-=300')
            .add({
                targets: '.hero-scroll-hint',
                opacity: [0, 1],
                duration: 600,
            }, '-=200');
    }

    // ---------- 当前页面全部章节控件：首次点击也可创建并启动场景 ----------
    function setupSceneControls() {
        function invoke(id, method, value) {
            startChapter(id);
            const scene = chapters.find(entry => entry.id === id)?.instance;
            if (typeof scene?.[method] !== 'function') return;
            return scene[method](value);
        }

        const groups = [
            [1, 'ags-step', 'agsStep', 'setStep', Number],
            [2, 'star-mode', 'starMode', 'setStarMode', String],
            [3, 'flow', 'flow', 'setMode', String],
            [4, 'epa-mode', 'epaMode', 'setEpaMode', String],
            [5, 'sense-view', 'senseView', 'setViewMode', String],
            [5, 'worm-preset', 'wormPreset', 'setWormPreset', String],
            [6, 'field-mode', 'fieldMode', 'setFieldMode', String],
            [6, 'projection-k', 'projectionK', 'setProjectionK', Number],
            [6, 'pool-action', 'poolAction', 'setPoolAction', String],
            [7, 'curve-idx', 'curveIdx', 'setCurveIdx', Number],
            [8, 'morph-preset', 'morphPreset', 'setPreset', String],
            [9, 'ch9-tab', 'ch9Tab', 'setTab', String],
            [10, 'final-scene', 'finalScene', 'setScenario', String],
        ];
        groups.forEach(([id, attr, key, method, convert]) => {
            const buttons = document.querySelectorAll(`[data-${attr}]`);
            buttons.forEach(btn => {
                btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
                btn.addEventListener('click', () => {
                    invoke(id, method, convert(btn.dataset[key]));
                    buttons.forEach(button => {
                        const active = button === btn;
                        button.classList.toggle('active', active);
                        button.setAttribute('aria-pressed', String(active));
                    });
                    if (id === 1) {
                        const cycle = document.getElementById('ch1CycleBtn');
                        if (cycle) {
                            cycle.classList.remove('active');
                            cycle.setAttribute('aria-pressed', 'false');
                        }
                    }
                });
            });
        });

        [
            [1, 'ch1CycleBtn', 'toggleCycle'],
            [2, 'ch2SweepBtn', 'triggerSweep'],
            [5, 'ch5FireBtn', 'trigger'],
        ].forEach(([id, buttonId, method]) => {
            const btn = document.getElementById(buttonId);
            if (!btn) return;
            if (method === 'toggleCycle') btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', () => {
                const result = invoke(id, method);
                if (method === 'toggleCycle') {
                    btn.classList.toggle('active', result === true);
                    btn.setAttribute('aria-pressed', String(result === true));
                }
                pulseFireButton(btn);
            });
        });
    }

    function pulseFireButton(btn) {
        if (typeof anime === 'undefined') return;
        anime({
            targets: btn,
            scale: [1, 1.08, 1],
            duration: 400,
            easing: 'easeOutQuad',
        });
    }

    // ---------- Pipeline 闪烁 (Ch10) ----------
    function setupPipelineHover() {
        if (typeof anime === 'undefined') return;
        const steps = document.querySelectorAll('.pipe-step');
        // 入场依次点亮
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting && !en.target.dataset.lit) {
                    en.target.dataset.lit = '1';
                    anime({
                        targets: steps,
                        opacity: [0.3, 1],
                        translateY: [12, 0],
                        delay: anime.stagger(80),
                        duration: 500,
                        easing: 'easeOutCubic',
                    });
                }
            });
        }, { threshold: 0.4 });
        const pipeline = document.querySelector('.finale-pipeline');
        if (pipeline) observer.observe(pipeline);
    }

    // ---------- 初始化 ----------
    function init() {
        startGlobalRiver();
        setupHeroAnimation();
        setupVisibilityObserver();
        setupNavClick();
        setupSceneControls();
        setupPipelineHover();

        // 默认启动第 0 章
        startChapter(0);
        setActiveDot(0);
        triggerEntryAnimation(document.querySelector('.chapter[data-chapter="0"]'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();