const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('public/vcp-rivermemo-engine.html', 'utf8');
const elements = new Map();
const buttons = [];
const sections = [];
const observers = [];
const runners = [];
const noop = () => {};
const gradient = { addColorStop: noop };
const ctx = new Proxy({
    measureText: text => ({ width: text.length * 6 }),
    createRadialGradient: () => gradient,
}, { get: (object, key) => key in object ? object[key] : noop });

function element(attrs = '') {
    const attributes = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const classes = new Set((attributes.class || '').split(' '));
    const listeners = {};
    return {
        attributes,
        dataset: Object.fromEntries(Object.entries(attributes).filter(([k]) => k.startsWith('data-'))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])),
        textContent: '', innerHTML: '',
        classList: {
            contains: key => classes.has(key),
            remove: key => classes.delete(key),
            toggle(key, value) {
                const active = value === undefined ? !classes.has(key) : value;
                if (active) classes.add(key); else classes.delete(key);
            },
        },
        setAttribute: (key, value) => { attributes[key] = value; },
        addEventListener: (key, fn) => { listeners[key] = fn; },
        click() { assert(listeners.click, `Unbound button: ${attrs}`); listeners.click(); },
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width: 900, height: 340 }),
        querySelectorAll: () => [],
    };
}
for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) elements.set(match[1], element(match[0]));
for (const match of html.matchAll(/<button\b([^>]*)>/g)) {
    const button = element(match[1]);
    buttons.push(button);
    if (button.attributes.id) elements.set(button.attributes.id, button);
}
for (let id = 0; id <= 10; id++) {
    const canvas = elements.get(id === 0 ? 'heroCanvas' : `ch${id}Canvas`);
    const section = element(`data-chapter="${id}"`);
    section.querySelector = () => canvas;
    canvas.closest = () => section;
    sections.push(section);
}
function queryAll(selector) {
    if (selector === '.chapter') return sections;
    const match = selector.match(/^\[data-([\w-]+)\]$/);
    if (match) return buttons.filter(button => `data-${match[1]}` in button.attributes);
    return [];
}
const sandbox = {
    window: { addEventListener: noop, removeEventListener: noop },
    document: {
        readyState: 'complete', hidden: false,
        getElementById: id => elements.get(id) || null,
        querySelectorAll: queryAll,
        querySelector: () => sections[0],
    },
    IntersectionObserver: class {
        constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
        observe(target) { this.targets.push(target); }
    },
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
    console: { ...console, error(...args) { throw new Error(args.join(' ')); } },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/river-engine.js', 'utf8'), sandbox);
const RealRunner = sandbox.window.RiverEngine.SceneRunner;
sandbox.window.RiverEngine.SceneRunner = class {
    constructor(canvas, draw, options = {}) { Object.assign(this, { canvas, draw, options, time: 0 }); runners.push(this); }
    start() { this.running = true; this.options.onResize?.({ w: 900, h: 340 }); this.tick(0); }
    stop() { this.running = false; }
    tick(dt) { this.time += dt; this.draw(ctx, 900, 340, this.time); }
};
for (const path of ['public/scenes.js', 'public/main.js']) vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox);
const observer = observers[0];
assert.equal(observer.targets.length, 11);
for (const target of observer.targets) observer.callback([{ target, isIntersecting: true, intersectionRatio: 0.001 }]);
assert.equal(runners.length, 12);
for (const button of buttons) {
    button.click();
    for (const runner of runners) runner.tick(0.1);
    if (Object.keys(button.dataset).length) assert.equal(button.attributes['aria-pressed'], 'true');
}
const star = queryAll('[data-star-mode]');
star[1].click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('ch2Readout').textContent.includes('Single Anchor'));
star[0].click();
runners.forEach(runner => runner.tick(0.1));
assert(elements.get('ch2Readout').textContent.includes('Star Mixture'));
const sense = runners.find(runner => runner.canvas === elements.get('ch5Canvas'));
sense.tick(3);
elements.get('ch5FireBtn').click();
sense.tick(0.01);
assert(elements.get('ch5Readout').textContent.includes('Hop 0/4'));
assert(elements.get('finaleScoreTable').innerHTML.includes('OneRing'));
const cycle = elements.get('ch1CycleBtn');
queryAll('[data-ags-step]')[0].click();
assert.equal(cycle.attributes['aria-pressed'], 'false');
cycle.click();
assert.equal(cycle.attributes['aria-pressed'], 'true');
cycle.click();
assert.equal(cycle.attributes['aria-pressed'], 'false');

const times = [];
let queued;
sandbox.requestAnimationFrame = callback => { queued = callback; return 1; };
const clock = new RealRunner(elements.get('ch5Canvas'), (_ctx, _w, _h, t) => times.push(t));
clock.start();
queued(1000);
queued(1050);
clock.stop();
clock.start();
queued(9000);
assert.equal(times.at(-1), 0.05);
sandbox.document.hidden = true;
queued(9100);
sandbox.document.hidden = false;
queued(20000);
assert.equal(times.at(-1), 0.05);
clock.stop();
console.log(`PASS: ${buttons.length} buttons, 12 scenes, low-ratio visibility, mode readouts, pulse replay, finale table and pause/resume clock.`);