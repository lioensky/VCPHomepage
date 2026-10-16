import {useEffect, useRef, useState, type ReactNode} from "react";
import {Pause, Play, RotateCcw} from "lucide-react";

/* ==========================================================================
   THEATER 02 · V4 流式渲染微剧场（12 秒真实流式脚本）
   - 自带独立时钟：状态隔离在本组件内，不会触发整页重渲染
   - 离开视口自动暂停（IntersectionObserver），回到视口继续
   - prefers-reduced-motion 下直接展示终稿
   ========================================================================== */

const SCRIPT_END = 12000;
const LOOP_HOLD = 2800;
const TICK_MS = 40;
const ROW_DUR = 1100;

const stickerUrl =
  "https://raw.githubusercontent.com/lioensky/VCPToolBox/refs/heads/main/image/Nova%E8%A1%A8%E6%83%85%E5%8C%85/%E5%85%83%E6%B0%94%E6%BB%A1%E6%BB%A1.png";

type StreamPart = {text: string; bold?: boolean};

const introParts: StreamPart[] = [
  {text: "主人早安！今日工作区 "},
  {text: "MoonAST 纯几何索引", bold: true},
  {text: " 已在 0.228 秒内构建完毕，内存稳停在 48MB。"},
];
const introLength = introParts.reduce((sum, part) => sum + Array.from(part.text).length, 0);
const stickerToken = "[表情包:元气满满]";

const islandSource = '<div class="vcp-island" data-scope="desktop-weather">';
const islandTitle = "🌤️ 今日赛博桌面气象与心流状态";
const islandDesc = "24.5°C 晴 · 心流锁 V2 专注中 · 离屏动画已由 Tombstone Freeze V2 墓碑冻结";

const benchRows = [
  {label: "MoonAST (VCP)", width: 18, value: "1.02s", color: "#76BFAE", start: 7400},
  {label: "Tree-sitter 旧版", width: 76, value: "41.2s", color: "#F2A900", start: 8200},
  {label: "传统全局 rg 盲搜", width: 96, value: "OOM/Timeout", color: "#B94832", start: 9000},
];

const outroText = "✓ 流式终稿提交：表情包、Div 岛与动态表格均已渐进挂载，历史消息几何尺寸全程锁死。";

const phases = [
  {step: 1, start: 0, label: "阶段 01 (0~3s)：Markdown 逐字吐出 + 表情包 PreText 零抖动"},
  {step: 2, start: 3000, label: "阶段 02 (3~7s)：未闭合 <div class='vcp-island'> 样式防火墙"},
  {step: 3, start: 7000, label: "阶段 03 (7~12s)：动态小表格 + 可点击微组件同屏生长"},
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const progress = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
const sliceChars = (text: string, p: number) => {
  const chars = Array.from(text);
  return chars.slice(0, Math.round(chars.length * p)).join("");
};

function renderParts(parts: StreamPart[], count: number): ReactNode[] {
  const out: ReactNode[] = [];
  let remaining = count;
  parts.forEach((part, index) => {
    if (remaining <= 0) return;
    const chars = Array.from(part.text);
    const slice = chars.slice(0, remaining).join("");
    remaining -= chars.length;
    out.push(part.bold ? <strong key={index}>{slice}</strong> : <span key={index}>{slice}</span>);
  });
  return out;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Caret = () => <i className="v4-stream-caret" aria-hidden="true" />;

export function V4StreamTheater() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState(() => (prefersReducedMotion() ? SCRIPT_END : 0));
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [loop, setLoop] = useState(true);
  const [inView, setInView] = useState(false);
  const [islandOverclock, setIslandOverclock] = useState(false);
  const [stickerLoaded, setStickerLoaded] = useState(false);

  // 预热表情包缓存：流式到达时 PreText 盒子已锁死尺寸，图片只需淡入
  useEffect(() => {
    const img = new Image();
    img.src = stickerUrl;
  }, []);

  // 离开视口自动暂停
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {threshold: 0.12});
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // 独立剧本时钟
  useEffect(() => {
    if (!playing || !inView) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 120);
      last = now;
      setT((prev) => {
        const next = prev + dt;
        return next >= SCRIPT_END + LOOP_HOLD ? 0 : next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, inView]);

  // 非循环模式：播完停在终稿
  useEffect(() => {
    if (!loop && t >= SCRIPT_END) setPlaying(false);
  }, [loop, t]);

  const tt = Math.min(t, SCRIPT_END);
  const phase = tt < 3000 ? 1 : tt < 7000 ? 2 : 3;
  const streaming = tt < SCRIPT_END;

  const introCount = Math.round(introLength * progress(tt, 200, 1800));
  const introTyping = tt >= 200 && tt < 2000;
  const showToken = tt >= 2000 && tt < 2450;
  const tokenText = sliceChars(stickerToken, progress(tt, 2000, 420));
  const showSticker = tt >= 2450;

  const showIsland = tt >= 3000;
  const islandSourceText = sliceChars(islandSource, progress(tt, 3000, 480));
  const islandTitleText = sliceChars(islandTitle, progress(tt, 3500, 850));
  const islandDescText = sliceChars(islandDesc, progress(tt, 4400, 1700));
  const islandWidgetReady = tt >= 4400;
  const islandClosed = tt >= 6300;
  const islandCaretAt = !showIsland || islandClosed ? null : tt < 3500 ? "source" : tt < 4400 ? "title" : "desc";

  const showTable = tt >= 7000;
  const outroP = progress(tt, 10200, 1400);
  const outroTyping = tt >= 10200 && tt < 11600;

  const jumpToPhase = (start: number) => {
    setLoop(false);
    setT(start);
    setPlaying(true);
  };

  const replay = () => {
    setLoop(true);
    setT(0);
    setPlaying(true);
  };

  const togglePlay = () => {
    if (!playing && t >= SCRIPT_END) {
      setT(0);
    }
    setPlaying((v) => !v);
  };

  return (
    <div className="v4-stage-grid" ref={rootRef}>
      {/* Left Interactive Streaming Window */}
      <div className="v4-chat-window">
        <div className="v4-window-bar">
          <div className="v4-window-dots" aria-hidden="true">
            <i style={{background: "#B94832"}} />
            <i style={{background: "#F2A900"}} />
            <i style={{background: "#76BFAE"}} />
            <span style={{marginLeft: "0.5rem", fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#F2F0E9"}}>
              VChat 2.0 · Surface #01 (Nova)
            </span>
          </div>

          <div className="v4-hud-meters">
            <span className={`v4-meter-pill ${streaming ? "is-live" : ""}`}>
              {streaming ? (playing && inView ? "● STREAMING" : "❚❚ PAUSED") : "✓ COMMITTED"}
            </span>
            <span className="v4-meter-pill">CLS: 0.00</span>
            <span className="v4-meter-pill amber">
              T+{(tt / 1000).toFixed(1)}s · STAGE 0{phase}/03
            </span>
          </div>
        </div>

        <div className="v4-stream-body" aria-live="off">
          <div className="v4-msg-row">
            <div className="v4-avatar">Nova</div>
            <div className="v4-bubble">
              <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#9FA6AA", marginBottom: "0.45rem", fontFamily: "JetBrains Mono"}}>
                <span>Maid: Nova · RevToken #904</span>
                <span>[{phase === 1 ? "0~3s · Markdown 流式吐字" : phase === 2 ? "3~7s · Div 岛流式隔离" : "7~12s · 微组件同屏生长"}]</span>
              </div>

              {/* Stage 1: Markdown streaming */}
              <p style={{margin: "0 0 0.5rem", lineHeight: 1.7, minHeight: "1.7em"}}>
                {renderParts(introParts, introCount)}
                {introTyping && <Caret />}
              </p>

              {/* Stage 1b: sticker token → PreText locked box */}
              {showToken && (
                <div style={{margin: "0.65rem 0", minHeight: "86px", display: "flex", alignItems: "center"}}>
                  <span className="v4-stream-raw">{tokenText}</span>
                  <Caret />
                </div>
              )}
              {showSticker && (
                <div className="v4-sticker-lock v4-stream-enter">
                  <div className={`v4-sticker-frame ${stickerLoaded ? "is-loaded" : ""}`}>
                    <img
                      src={stickerUrl}
                      alt="Nova 元气满满表情包"
                      width={68}
                      height={68}
                      decoding="async"
                      ref={(el) => {
                        if (el?.complete && el.naturalWidth > 0) setStickerLoaded(true);
                      }}
                      onLoad={() => setStickerLoaded(true)}
                    />
                  </div>
                  <div>
                    <div style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#76BFAE"}}>
                      {stickerToken} · PreText Intrinsic Box Locked (68×68px)
                    </div>
                    <div style={{fontSize: "0.78rem", color: "#C4CACD", marginTop: "0.2rem"}}>
                      {stickerLoaded ? "解码完成，淡入上屏 · 容器几何零位移。" : "图片异步解码中，容器尺寸已提前锁死…"}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 2: Semantic Div Island (streams in unclosed) */}
              {showIsland && (
                <div className={`vcp-island-card v4-stream-enter ${islandClosed ? "" : "is-streaming"} ${islandOverclock ? "is-overclock" : ""}`}>
                  <div className="vcp-island-badge">
                    <span>
                      {islandSourceText}
                      {islandCaretAt === "source" && <Caret />}
                    </span>
                    <span>
                      {islandClosed ? "</div> 闭合代次校验 PASS · Scoped CSS 已隔离" : "标签未闭合 · Div 岛防火墙隔离中"}
                    </span>
                  </div>
                  <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem"}}>
                    <div style={{minHeight: "2.6rem"}}>
                      <strong style={{fontSize: "1.05rem", display: "block"}}>
                        {islandOverclock ? "⚡ V工程高负载算力倾斜模式已激活" : islandTitleText}
                        {islandCaretAt === "title" && <Caret />}
                      </strong>
                      <span style={{fontSize: "0.78rem", color: "#C4CACD"}}>
                        {islandOverclock
                          ? "已自动卸载局部 Frosted Glass 磨砂，100% GPU 算力让渡给 AST 增量高亮"
                          : islandDescText}
                        {islandCaretAt === "desc" && <Caret />}
                      </span>
                    </div>
                    {islandWidgetReady && (
                      <button
                        type="button"
                        onClick={() => setIslandOverclock((v) => !v)}
                        className="vcp2-btn-primary v4-stream-enter"
                        style={{padding: "0.5rem 0.9rem", fontSize: "0.75rem"}}
                      >
                        {islandOverclock ? "恢复常规磨砂视图" : "点我测试流式岛内交互"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stage 3: Dynamic Bar Chart Table */}
              {showTable && (
                <div className="v4-bench-table v4-stream-enter">
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.66rem", fontFamily: "JetBrains Mono", color: "#76BFAE", marginBottom: "0.6rem"}}>
                    <span>[7~12s · 流式动态表格与微组件同屏生长]</span>
                    <span>UNIT: MS / MEMORY</span>
                  </div>
                  {benchRows.map((row) => {
                    const p = progress(tt, row.start, ROW_DUR);
                    if (tt < row.start) return null;
                    return (
                      <div key={row.label} className="v4-bench-row v4-stream-enter">
                        <span>{row.label}</span>
                        <div className="v4-bar-track">
                          <div className="v4-bar-fill" style={{width: `${row.width * p}%`, background: row.color}} />
                        </div>
                        <strong style={{color: row.color, textAlign: "right"}}>
                          {p >= 1 ? row.value : "…"}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}

              {tt >= 10200 && (
                <p style={{margin: "0.85rem 0 0", fontSize: "0.78rem", color: "#76BFAE", fontFamily: "JetBrains Mono", lineHeight: 1.6}}>
                  {sliceChars(outroText, outroP)}
                  {outroTyping && <Caret />}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls & Technical Breakdown */}
      <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
        <div className="vcp2-hero-telemetry">
          <div className="vcp2-telemetry-head">
            <span>DIRECTOR CONTROLS // 剧本控制</span>
            <span>{loop ? "12S LOOP" : "SINGLE SHOT"}</span>
          </div>

          <div className="v4-timeline-track" aria-hidden="true">
            <div className="v4-timeline-fill" style={{width: `${(tt / SCRIPT_END) * 100}%`}} />
            <i style={{left: "25%"}} />
            <i style={{left: "58.33%"}} />
          </div>

          <div style={{display: "flex", flexDirection: "column", gap: "0.65rem"}}>
            {phases.map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => jumpToPhase(item.start)}
                className="vcp2-btn-secondary"
                style={{
                  justifyContent: "flex-start",
                  borderColor: phase >= item.step ? "#76BFAE" : "rgba(242,240,233,0.12)",
                  background: phase === item.step ? "rgba(118,191,174,0.16)" : "rgba(255,255,255,0.02)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{display: "flex", gap: "0.65rem", marginTop: "1rem"}}>
            <button type="button" onClick={replay} className="vcp2-btn-primary" style={{flex: 1, justifyContent: "center"}}>
              <RotateCcw size={15} />
              重播 12 秒流式演出
            </button>
            <button type="button" onClick={togglePlay} className="vcp2-btn-secondary" style={{justifyContent: "center"}} aria-label={playing ? "暂停流式演出" : "继续流式演出"}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </div>
        </div>

        <div className="vcp2-hero-telemetry" style={{borderTopColor: "#F2A900"}}>
          <div className="vcp2-telemetry-head">
            <span>WHY IT MATTERS // 架构护城河</span>
            <span>V4 ENGINE</span>
          </div>
          <ul style={{margin: 0, paddingLeft: "1.1rem", fontSize: "0.84rem", lineHeight: 1.75, color: "#C4CACD"}}>
            <li><strong>语义级 Div 岛识别</strong>：即使 AI 在流式中途吐出未闭合的 <code>div/style</code>，也不会击穿外部聊天主界面。</li>
            <li><strong>Tombstone Freeze V2</strong>：滑出视口的 WebGL / Pixi / CSS 动画出生即冻结，后台 GPU 开销归零。</li>
            <li><strong>按需渐进加载</strong>：超长历史会话只挂载卡片骨架，桌面端冷启动稳定压制在 <strong>275MB</strong>。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}