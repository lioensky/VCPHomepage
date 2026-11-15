import {useEffect, useRef, useState, type ReactNode} from "react";
import {Pause, Play, RotateCcw} from "lucide-react";

/* ==========================================================================
   THEATER 03 · V5 流式 Div 管线概念演示（12 秒预设脚本，非性能实测）
   - 自带独立时钟：状态隔离在本组件内，不会触发整页重渲染
   - 离开视口自动暂停（IntersectionObserver），回到视口继续
   - prefers-reduced-motion 下直接展示终稿
   ========================================================================== */

const SCRIPT_END = 12000;
const LOOP_HOLD = 2800;
const TICK_MS = 40;
const weatherCards = [
  {id: "sun", label: "晴空", value: "24.5°", detail: "日照充足 · 光芒缓缓转动", start: 3900},
  {id: "cloud", label: "云层", value: "32%", detail: "轻云掠过 · 云层独立漂移", start: 5100},
  {id: "rain", label: "阵雨", value: "18%", detail: "午后概率 · 雨滴持续落下", start: 7600},
];

const stickerUrl =
  "https://raw.githubusercontent.com/lioensky/VCPToolBox/refs/heads/main/image/Nova%E8%A1%A8%E6%83%85%E5%8C%85/%E5%85%83%E6%B0%94%E6%BB%A1%E6%BB%A1.png";

type StreamPart = {text: string; bold?: boolean};

const introParts: StreamPart[] = [
  {text: "主人早安！正在为你生成 "},
  {text: "今日动态天气卡片", bold: true},
  {text: "。闭合一个子块，就先让它动起来，不必等待整座岛。"},
];
const introLength = introParts.reduce((sum, part) => sum + Array.from(part.text).length, 0);
const stickerToken = "[表情包:元气满满]";

const islandSource = '<div class="vcp-island" data-scope="desktop-weather">';
const islandTitle = "🌤️ 今日赛博桌面气象与心流状态";
const islandDesc = "子块逐个就绪、逐个激活；已挂载的天气动画不随流式更新重建。";

const outroText = "✓ 外层岛闭合，终稿提交。晴空、云层、雨滴继续运行：结构上屏与动画时钟各走各的轨道。";

const phases = [
  {step: 1, start: 0, label: "阶段 01 (0~3s)：增量正文 · 表情渐进上屏"},
  {step: 2, start: 3000, label: "阶段 02 (3~7s)：子块闭合即刷 · 天气开始动"},
  {step: 3, start: 7000, label: "阶段 03 (7~12s)：雨滴接力 · 外层岛终稿提交"},
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

  // 页面隐藏时暂停，与离屏暂停共同约束剧本及 CSS 动画。
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // 独立剧本时钟
  useEffect(() => {
    if (!playing || !inView || !pageVisible) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 120);
      last = now;
      setT((prev) => {
        const next = prev + dt;
        return !loop ? Math.min(next, SCRIPT_END) : next >= SCRIPT_END + LOOP_HOLD ? 0 : next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, inView, pageVisible, loop]);

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
  const islandTitleText = sliceChars(islandTitle, progress(tt, 3500, 400));
  const islandDescText = sliceChars(islandDesc, progress(tt, 3900, 1200));
  const islandWidgetReady = tt >= 6500;
  const islandClosed = tt >= 9700;
  const islandCaretAt = !showIsland || islandClosed ? null : tt < 3500 ? "source" : tt < 3900 ? "title" : tt < 5100 ? "desc" : null;
  const readyCards = weatherCards.filter((card) => tt >= card.start).length;
  const scriptPending = tt >= 5600 && tt < 6500;
  const animationRunning = playing && inView && pageVisible;
  const outroP = progress(tt, 10200, 1400);
  const outroTyping = tt >= 10200 && tt < 11600;

  const jumpToPhase = (start: number) => {
    setLoop(false);
    setIslandOverclock(false);
    setT(start);
    setPlaying(true);
  };

  const replay = () => {
    setLoop(true);
    setIslandOverclock(false);
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
    <div className="v4-stage-grid v5-weather-theater" data-animation-running={animationRunning} ref={rootRef}>
      {/* Left Interactive Streaming Window */}
      <div className="v4-chat-window">
        <div className="v4-window-bar">
          <div className="v4-window-dots" aria-hidden="true">
            <i style={{background: "#B94832"}} />
            <i style={{background: "#F2A900"}} />
            <i style={{background: "#76BFAE"}} />
            <span style={{marginLeft: "0.5rem", fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#F2F0E9"}}>
              VChat · V5 Stream Pipeline (Nova)
            </span>
          </div>

          <div className="v4-hud-meters">
            <span className={`v4-meter-pill ${streaming ? "is-live" : ""}`}>
              {streaming ? (animationRunning ? "● STREAMING" : "❚❚ PAUSED") : "✓ COMMITTED"}
            </span>
            <span className="v4-meter-pill">架构示意 · 非实测</span>
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
                <span>[{phase === 1 ? "增量分域" : phase === 2 ? "子块闭合即刷" : "双轨独立运行"}]</span>
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
                      {islandClosed ? "外层 </div> 闭合 · 终稿已提交" : `外层岛未闭合 · ${readyCards}/3 子块已上屏`}
                    </span>
                  </div>
                  <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem"}}>
                    <div style={{minHeight: "2.6rem"}}>
                      <strong style={{fontSize: "1.05rem", display: "block"}}>
                        {islandTitleText}
                        {islandCaretAt === "title" && <Caret />}
                      </strong>
                      <span style={{fontSize: "0.78rem", color: "#C4CACD"}}>
                        {islandOverclock ? "已切换夜间配色，天气子块保持挂载，动画继续。" : islandDescText}
                        {islandCaretAt === "desc" && <Caret />}
                      </span>
                    </div>
                    {islandWidgetReady && (
                      <button
                        type="button"
                        onClick={() => setIslandOverclock((v) => !v)}
                        className="vcp2-btn-primary v4-stream-enter"
                        style={{padding: "0.5rem 0.9rem", fontSize: "0.75rem"}}
                        aria-pressed={islandOverclock}
                      >
                        {islandOverclock ? "切回日间天气" : "切换夜间天气"}
                      </button>
                    )}
                  </div>
                  <div className="v5-weather-grid">
                    {weatherCards.map((card, index) => {
                      const ready = tt >= card.start;
                      return (
                        <div key={card.id} className={`v5-weather-slot ${ready ? "is-ready" : ""}`}>
                          {ready ? (
                            <div className={`v5-weather-card v5-weather-${card.id} v4-stream-enter`}>
                              <div className="v5-weather-sky" aria-hidden="true">
                                {card.id === "sun" ? (
                                  <div className="v5-weather-sun"><i /></div>
                                ) : (
                                  <>
                                    <div className="v5-weather-cloud" />
                                    {card.id === "cloud" && <div className="v5-weather-cloud is-distant" />}
                                    {card.id === "rain" && <div className="v5-weather-rain"><i /><i /><i /><i /></div>}
                                  </>
                                )}
                              </div>
                              <div className="v5-weather-reading"><span>{card.label}</span><strong>{card.value}</strong></div>
                              <small>{card.detail}</small>
                              <span className="v5-weather-ready">✓ 子块 0{index + 1} 已闭合 · 动画运行</span>
                            </div>
                          ) : (
                            <div className="v5-weather-pending">
                              <span>0{index + 1} / {card.label}</span>
                              <small>{index === readyCards ? "尾区接收中…" : "等待流入"}</small>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="v5-pipeline-status">
                    <span>结构轨 / {islandClosed ? "终稿提交" : scriptPending ? "脚本中间态 · 静默等待闭合" : `${readyCards}/3 最小子块已提交`}</span>
                    <span>动画轨 / {readyCards === 0 ? "等待首块" : animationRunning ? "独立运行 ↻" : "已暂停"}</span>
                  </div>
                  <div className="v5-pipeline-note">
                    {scriptPending ? "脚本尚未闭合，不执行中间态；已就绪的天气动画照常运行。" : !islandWidgetReady ? "完整子块先上屏；交互脚本闭合就绪后，再激活配色按钮。" : "交互脚本已就绪 · 可切换配色，先前子块无需重建。"}
                  </div>
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
                aria-pressed={phase === item.step}
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
            <span>V5 ENGINE</span>
          </div>
          <ul style={{margin: 0, paddingLeft: "1.1rem", fontSize: "0.84rem", lineHeight: 1.75, color: "#C4CACD"}}>
            <li><strong>单遍分域 + 增量尾区</strong>：正文、代码、工具与交互岛分域处理，不再每帧重扫全文。</li>
            <li><strong>最小子块闭合即刷</strong>：外层岛仍在接收，天气子块已各自运动；脚本中间态静默等待，长子块按 0.65 秒节流上屏。</li>
            <li><strong>结构帧 ≠ 动画帧</strong>：降低重型结构上屏频率，不改变独立动画时钟；沙箱资源随消息生命周期统一回收。</li>
            <li><strong>长历史与状态契约</strong>：Worker 预解析、模板缓存与等高离屏回收；持久化真源与 UI 投影分离，历史修改经事务提交。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}