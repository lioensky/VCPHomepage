/* =================================================================
   main.js
   - 章节注册 + IntersectionObserver 启停场景
   - anime.js 文本入场动画
   - 进度导航联动
   - 交互按钮 (LIF 触发, 顺/逆流切换, 虫洞触发)
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
                const id = parseInt(en.target.dataset.chapter, 10);
                if (en.isIntersecting && en.intersectionRatio > 0.15) {
                    startChapter(id);
                    setActiveDot(id);
                    triggerEntryAnimation(en.target);
                } else if (!en.isIntersecting) {
                    stopChapter(id);
                }
            });
        }, {
            threshold: [0, 0.15, 0.5, 1],
            rootMargin: '0px',
        });

        sections.forEach(s => observer.observe(s));
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

    // ---------- Ch3: 顺流/逆流切换 ----------
    function setupCh3FlowToggle() {
        const buttons = document.querySelectorAll('.ctrl-btn[data-flow]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.flow;
                buttons.forEach(b => b.classList.toggle('active', b === btn));
                const entry = chapters.find(c => c.id === 3);
                if (entry && entry.instance && entry.instance.setMode) {
                    entry.instance.setMode(mode);
                }
            });
        });
    }

    // ---------- Ch6: LIF 触发按钮 ----------
    function setupCh6FireButton() {
        const btn = document.getElementById('ch6FireBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const entry = chapters.find(c => c.id === 6);
            if (entry && entry.instance && entry.instance.trigger) {
                entry.instance.trigger();
                pulseFireButton(btn);
            }
        });
    }

    // ---------- Ch7: 虫洞触发按钮 ----------
    function setupCh7FireButton() {
        const btn = document.getElementById('ch7FireBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const entry = chapters.find(c => c.id === 7);
            if (entry && entry.instance && entry.instance.trigger) {
                entry.instance.trigger();
                pulseFireButton(btn);
            }
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
        setupCh3FlowToggle();
        setupCh6FireButton();
        setupCh7FireButton();
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