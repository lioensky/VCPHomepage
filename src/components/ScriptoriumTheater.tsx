import {useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent} from "react";
import {CheckCircle2, Pause, Play, RotateCcw} from "lucide-react";

/**
 * THEATER 03 · 共笔文坊 Scriptorium V3
 * 一块真正有厚度的 .vdocx 书块（六面 preserve-3d）+ 逐键组字剧本：
 *   输入态（IME 组字，源码冻结）→ 渲染态（compositionend 上屏）→ 源码态（<100ms 原子补丁回写）
 * 指针倾斜只写 CSS 变量，不触发 React 重渲染；离开视口自动停演。
 */

export const imeCandidates = [
  {key: "1", word: "流淌", pinyin: "liu'tang", desc: "让智慧如河流流淌 (Rev #409)"},
  {key: "2", word: "流体", pinyin: "liu'ti", desc: "流体语义动力场 (Rev #410)"},
  {key: "3", word: "留存", pinyin: "liu'cun", desc: "跨端唯一事实留存 (Rev #411)"},
];

type Lane = "input" | "render" | "source";
type LogLine = {id: number; t: string; lane: "INPUT" | "RENDER" | "SOURCE"; text: string};

type ImeState = {
  composing: boolean;
  pinyin: string;
  showCandidates: boolean;
  highlight: number;
  surface: string;
  source: string;
  lane: Lane;
  syncMs: number;
  syncPulse: number;
  inkPulse: number;
  rev: number;
  candIdx: number;
  key: string;
  keyPulse: number;
  log: LogLine[];
};

const BASE_OFFSET = 128;
const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const byteLen = (s: string) => (encoder ? encoder.encode(s).length : s.length * 3);

const tiltPresets = [
  {rx: -14, ry: -28},
  {rx: -20, ry: 32},
  {rx: -9, ry: -35},
];

const lanes: {id: Lane; label: string}[] = [
  {id: "input", label: "输入态 INPUT"},
  {id: "render", label: "渲染态 RENDER"},
  {id: "source", label: "源码态 SOURCE"},
];

function createInitialState(): ImeState {
  const first = imeCandidates[0];
  return {
    composing: false,
    pinyin: "",
    showCandidates: false,
    highlight: 0,
    surface: first.word,
    source: first.word,
    lane: "source",
    syncMs: 41,
    syncPulse: 0,
    inkPulse: 0,
    rev: 409,
    candIdx: 0,
    key: "⏎",
    keyPulse: 0,
    log: [{id: 0, t: "+0.000s", lane: "SOURCE", text: "open CHAPTER_04.md · rev #409 · sha256 8f94…a409b"}],
  };
}

export function ScriptoriumTheater() {
  const [ime, setIme] = useState<ImeState>(createInitialState);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [tiltIdx, setTiltIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const runRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const manualTimerRef = useRef<number | null>(null);
  const surfaceRef = useRef(imeCandidates[0].word);
  const candIdxRef = useRef(0);
  const logIdRef = useRef(0);
  const t0Ref = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const appendLog = (log: LogLine[], lane: LogLine["lane"], text: string): LogLine[] => {
    const t = `+${((performance.now() - t0Ref.current) / 1000).toFixed(3)}s`;
    logIdRef.current += 1;
    return [...log.slice(-4), {id: logIdRef.current, t, lane, text}];
  };

  /** 源码态回写：真实 setTimeout 模拟 <100ms 的原子补丁落盘 */
  const applySync = (text: string, ms: number) => {
    setIme((s) => ({
      ...s,
      source: text,
      lane: "source",
      syncMs: ms,
      syncPulse: s.syncPulse + 1,
      log: appendLog(s.log, "SOURCE", `patch [${BASE_OFFSET}, ${BASE_OFFSET + byteLen(text)}) "${text}" · ${ms}ms`),
    }));
  };

  const randomSyncMs = () => 34 + Math.round(Math.random() * 52);

  /** 渲染态上屏（compositionend） */
  const commit = (idx: number, keyLabel: string) => {
    const cand = imeCandidates[idx];
    surfaceRef.current = cand.word;
    candIdxRef.current = idx;
    setIme((s) => ({
      ...s,
      composing: false,
      pinyin: "",
      showCandidates: false,
      highlight: idx,
      surface: cand.word,
      lane: "render",
      inkPulse: s.inkPulse + 1,
      rev: s.rev + 1,
      candIdx: idx,
      key: keyLabel,
      keyPulse: s.keyPulse + 1,
      log: appendLog(s.log, "RENDER", `compositionend → commit "${cand.word}"`),
    }));
  };

  // 视口可见性：离开视口即停演
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {threshold: 0.15});
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 自动组字剧本
  useEffect(() => {
    if (!auto || !inView) return;
    const token = ++runRef.current;

    const sleep = (ms: number) =>
      new Promise<boolean>((resolve) => {
        timersRef.current.push(window.setTimeout(() => resolve(runRef.current === token), ms));
      });

    const scheduleSync = (text: string) => {
      const ms = randomSyncMs();
      timersRef.current.push(
        window.setTimeout(() => {
          if (runRef.current === token) applySync(text, ms);
        }, ms),
      );
    };

    const script = async () => {
      setIme((s) => ({...s, composing: false, pinyin: "", showCandidates: false}));
      let idx = (candIdxRef.current + 1) % imeCandidates.length;

      while (runRef.current === token) {
        if (!(await sleep(1800))) return;

        // 1) Backspace 逐字删除：每一次删除都是一次独立的渲染态→源码态事务
        let cur = surfaceRef.current;
        while (cur.length > 0) {
          cur = cur.slice(0, -1);
          const next = cur;
          surfaceRef.current = next;
          setIme((s) => ({
            ...s,
            surface: next,
            lane: "render",
            key: "⌫",
            keyPulse: s.keyPulse + 1,
            log: appendLog(s.log, "RENDER", `deleteContentBackward → "${next}"`),
          }));
          scheduleSync(next);
          if (!(await sleep(210))) return;
        }
        if (!(await sleep(320))) return;

        // 2) 逐键敲拼音：输入态独立，源码冻结
        const cand = imeCandidates[idx];
        for (let i = 0; i < cand.pinyin.length; i++) {
          const ch = cand.pinyin[i];
          if (ch === "'") continue;
          const pre = cand.pinyin.slice(0, i + 1);
          const first = i === 0;
          setIme((s) => ({
            ...s,
            composing: true,
            pinyin: pre,
            showCandidates: pre.length >= 3,
            highlight: 0,
            lane: "input",
            key: ch.toUpperCase(),
            keyPulse: s.keyPulse + 1,
            log: first ? appendLog(s.log, "INPUT", "compositionstart · 源码冻结") : s.log,
          }));
          if (!(await sleep(95 + Math.random() * 85))) return;
        }
        setIme((s) => ({...s, log: appendLog(s.log, "INPUT", `compositionupdate "${cand.pinyin}"`)}));
        if (!(await sleep(420))) return;

        // 3) 候选框里移动高亮
        for (let h = 1; h <= idx; h++) {
          setIme((s) => ({...s, highlight: h, key: "→", keyPulse: s.keyPulse + 1}));
          if (!(await sleep(320))) return;
        }
        if (!(await sleep(280))) return;

        // 4) 上屏 + 源码回写
        commit(idx, cand.key);
        scheduleSync(cand.word);
        idx = (idx + 1) % imeCandidates.length;
      }
    };

    void script();
    return () => {
      runRef.current++;
      clearTimers();
    };
    // 剧本只依赖 ref 与稳定的 setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, inView]);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current) window.clearTimeout(manualTimerRef.current);
    };
  }, []);

  const pickCandidate = (idx: number) => {
    setAuto(false);
    runRef.current++;
    clearTimers();
    if (manualTimerRef.current) window.clearTimeout(manualTimerRef.current);
    const word = imeCandidates[idx].word;
    commit(idx, imeCandidates[idx].key);
    const ms = randomSyncMs();
    manualTimerRef.current = window.setTimeout(() => applySync(word, ms), ms);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    el.style.setProperty("--px", nx.toFixed(3));
    el.style.setProperty("--py", ny.toFixed(3));
    el.style.setProperty("--lx", `${(50 + nx * 45).toFixed(1)}%`);
    el.style.setProperty("--ly", `${(40 + ny * 40).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
    el.style.setProperty("--lx", "30%");
    el.style.setProperty("--ly", "18%");
  };

  const tilt = tiltPresets[tiltIdx];
  const popupOpen = ime.composing && ime.showCandidates;
  const activeCandidate = imeCandidates[ime.candIdx];

  return (
    <div className="scriptorium-grid" ref={rootRef}>
      {/* Left 3D Slab Stage */}
      <div className="scriptorium-3d-stage">
        <div className="scriptorium-stage-head">
          <span>LEFT STAGE // 渲染态 3D 书块工作面 (6-FACE preserve-3d)</span>
          <div className="scriptorium-stage-ctls">
            <button
              type="button"
              className="scriptorium-ctl"
              onClick={() => setTiltIdx((v) => (v + 1) % tiltPresets.length)}
              title="切换书块基准透视角"
            >
              <RotateCcw size={12} />
              透视角 {tilt.ry > 0 ? "+" : ""}{tilt.ry}°
            </button>
            <button
              type="button"
              className="scriptorium-ctl"
              onClick={() => setAuto((v) => !v)}
              title={auto ? "暂停自动组字演出" : "继续自动组字演出"}
            >
              {auto ? <Pause size={12} /> : <Play size={12} />}
              {auto ? "暂停组字" : "重播组字"}
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="cube-scene-viewport"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div className="cube-floor" aria-hidden="true" />
          <div className="cube-ground-shadow" aria-hidden="true" />

          <div className="cube-sway">
            <div
              className="cube-slab"
              style={{"--rx": `${tilt.rx}deg`, "--ry": `${tilt.ry}deg`} as CSSProperties}
            >
              <div className="cube-face cube-face-back" aria-hidden="true" />
              <div className="cube-face cube-face-right" aria-hidden="true" />
              <div className="cube-face cube-face-left" aria-hidden="true">
                <span>SCRIPTORIUM · V3 · .VDOCX</span>
              </div>
              <div className="cube-face cube-face-top" aria-hidden="true" />
              <div className="cube-face cube-face-bottom" aria-hidden="true" />

              <div className="cube-face cube-face-front">
                <div className="cube-face-label">VDOCX // CHAPTER_04.MD · 3D ISLAND SURFACE</div>
                <h3 className="cube-face-title">
                  让智慧如河流
                  <span className={`cube-editable-word ${ime.composing ? "is-composing" : ""}`}>
                    <span key={ime.inkPulse} className="cube-surface">{ime.surface}</span>
                    {ime.composing && <span className="cube-preedit">{ime.pinyin}</span>}
                    <i className="cube-caret" />
                    {ime.inkPulse > 0 && <span key={`ink-${ime.inkPulse}`} className="cube-ink-burst" aria-hidden="true" />}

                    {/* IME 候选框悬浮在书面上方 52px：倾斜时能看到它与纸面之间的视差 */}
                    <span className={`cube-ime-ghost ${popupOpen ? "is-open" : ""}`} aria-hidden="true" />
                    <span
                      className={`cube-ime-popup ${popupOpen ? "is-open" : ""}`}
                      role="listbox"
                      aria-label="3D 透视中文输入法候选框"
                    >
                      <span className="cube-ime-pinyin">
                        <strong>拼音: {ime.pinyin || "—"}</strong>
                        <span>IME 3D LOCK · Z+52</span>
                      </span>
                      <span className="cube-ime-candidates">
                        {imeCandidates.map((cand, idx) => (
                          <span
                            key={cand.key}
                            role="option"
                            aria-selected={ime.highlight === idx}
                            className={ime.highlight === idx ? "active" : ""}
                            onClick={() => pickCandidate(idx)}
                          >
                            {cand.key}.{cand.word}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </h3>

                <p className="cube-face-formula">
                  连续场方程：<code>S = Π[S^field + Ω^γ B_G + B_H]</code>
                </p>

                <div className="cube-face-foot">
                  <span>空白折叠幂等还原: PASS</span>
                  <span style={{color: "#B94832"}}>重排闪烁: 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="scriptorium-stage-foot">
          <div className="scriptorium-keyhud">
            <kbd key={ime.keyPulse} className="cube-keycap">{ime.key}</kbd>
            <div>
              <small>LAST KEYSTROKE</small>
              移动鼠标倾斜书块 · 点击候选直接上屏
            </div>
          </div>
          <div className="scriptorium-commit-row">
            {imeCandidates.map((cand, idx) => (
              <button
                key={cand.key}
                type="button"
                onClick={() => pickCandidate(idx)}
                className={`scriptorium-commit-btn ${!ime.composing && ime.candIdx === idx ? "is-active" : ""}`}
              >
                上屏「{cand.word}」
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Source & PR Mapping Panel */}
      <div className="scriptorium-source-panel">
        <div>
          <div className="scriptorium-panel-head">
            <span>RIGHT STAGE // 唯一真源 Markdown-Hybrid 源码映射</span>
            <span>OFFSET [from: {BASE_OFFSET}, to: {BASE_OFFSET + byteLen(ime.source)}]</span>
          </div>

          <div className="scriptorium-lanes">
            {lanes.map((lane) => (
              <span
                key={lane.id}
                data-lane={lane.id}
                className={`scriptorium-lane ${ime.lane === lane.id ? "is-active" : ""}`}
              >
                {lane.label}
              </span>
            ))}
            <span key={ime.syncPulse} className="source-sync-badge">
              SYNC {ime.syncMs}ms · ≤100ms ✓
            </span>
          </div>

          <pre className="source-code-box">
{`---
format: scriptorium-v2-zip (.vdocx)
sha256: 8f94e2c1...a409b
---
## 第四卷：统一语义动力场

<div class="vcp-3d-cube" data-island-id="cube-01">
  <h3>让智慧如河流`}<span
              key={ime.syncPulse}
              className={`source-range-highlight ${ime.composing ? "is-frozen" : "is-synced"}`}
            >{ime.source || "\u200b"}</span>{`</h3>`}{ime.composing && <span className="source-freeze-tag">{"  ◂ IME 组字中 · 源码冻结"}</span>}{`
  <math>S_i = \\Pi_{[0,1]}[S_i^{field} + \\Omega_Q^\\gamma B_G(i) + B_H(i)]</math>
</div>`}
          </pre>

          <div className="scriptorium-txbox">
            <div className="scriptorium-txbox-head">ATOMIC TRANSACTION LOG // 三态独立事务队列</div>
            <ol className="scriptorium-txlog">
              {ime.log.map((line) => (
                <li key={line.id}>
                  <time>{line.t}</time>
                  <b data-lane={line.lane}>{line.lane}</b>
                  <span>{line.text}</span>
                </li>
              ))}
            </ol>
            <p>
              变更语义：<code>{activeCandidate.desc}</code>。组字期间源码冻结，仅在 compositionend 后以原子补丁回写；
              缩进、连续换行与公式块均受原子边界保护。
            </p>
          </div>
        </div>

        <div className="scriptorium-panel-foot">
          <div className="scriptorium-seal-stamp">
            <CheckCircle2 size={18} style={{color: "#B94832"}} />
            <div>
              <strong>Revision #{ime.rev} Verified (SHA-256)</strong>
              <div style={{fontSize: "0.62rem", opacity: 0.8}}>Co-authored by Human & Maid:Nova · PR Merged</div>
            </div>
          </div>

          <span style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#76BFAE"}}>
            支持双击 .vdocx 浏览器直接分页阅读
          </span>
        </div>
      </div>
    </div>
  );
}