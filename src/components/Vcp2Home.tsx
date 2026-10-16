import {useEffect, useRef, useState, type ReactNode} from "react";
import {
  ArrowUpRight,
  BookOpen,
  Clock,
  Cpu,
  ExternalLink,
  Gamepad2,
  Github,
  Layers,
  MessageCircle,
  Moon,
  Music,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import {DocsViewer, type DocItem} from "./DocsViewer";
import {V4StreamTheater} from "./V4StreamTheater";
import {NovaRiverTheater, primeNovaRiverAudio} from "./NovaRiverTheater";
import {ScriptoriumTheater} from "./ScriptoriumTheater";
import {useAmbientBgm} from "../audio/ambientBgm";
import "./vcp2-home.css";

/**
 * 只在元素可见、页面未隐藏时运行的 rAF 循环。
 * 离开视口 / 切换标签页时自动停帧，GPU 与主线程开销归零。
 */
function startVisibleLoop(el: Element, frame: () => void): () => void {
  let id = 0;
  let visible = true;
  const tick = () => {
    id = 0;
    if (!visible || document.hidden) return;
    frame();
    id = window.requestAnimationFrame(tick);
  };
  const start = () => {
    if (!id && visible && !document.hidden) id = window.requestAnimationFrame(tick);
  };
  const stop = () => {
    if (id) window.cancelAnimationFrame(id);
    id = 0;
  };
  const io = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      })
    : null;
  io?.observe(el);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);
  start();
  return () => {
    stop();
    io?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** 毫秒级 HUD 时钟：直接写 textContent，不触发任何 React 重渲染 */
function HudClock() {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const update = () => {
      if (ref.current && !document.hidden) {
        ref.current.textContent = new Date().toISOString().replace("T", " // ").slice(0, 26);
      }
    };
    update();
    const timer = window.setInterval(update, 97);
    return () => window.clearInterval(timer);
  }, []);
  return <span ref={ref} style={{fontVariantNumeric: "tabular-nums"}}>2026-10-16 // 00:00:00.000</span>;
}

type Vcp2HomeProps = {
  brand: ReactNode;
  nova: ReactNode;
  onAskNova: (target: "frontend" | "backend" | "fullstack") => void;
  documents: DocItem[];
};

const installUrl = "https://github.com/lioensky/VCPToolBox/releases/tag/VCP%E5%AE%89%E8%A3%85%E5%8C%85";

const oneRingSources = [
  {
    id: "vchat",
    tag: "VChat 桌面",
    raw: "User@PC [02:58:12]: Nova，把刚才调试通过的 MoonAST 索引报告发我邮箱。",
    normalized: "FACT#8941 · ORIGIN:VChat_Desktop · ROLE:User · HASH:7f9a..21e · SEQ:T+00ms",
  },
  {
    id: "mobile",
    tag: "VCPMobile",
    raw: "User@iOS [02:58:19]: 顺便在手机端提醒我明天上午十点看 Kerr 跑分。",
    normalized: "FACT#8942 · ORIGIN:VCPMobile_Tauri2 · ROLE:User · HASH:3c8b..90a · SEQ:T+07s",
  },
  {
    id: "mail",
    tag: "SuperMail 邮件",
    raw: "Nova@AgentMail [02:58:21]: 报告已附带 SHA-256 签名投递，闹钟已写入 FlowInvite。",
    normalized: "FACT#8943 · ORIGIN:VCPSuperMail · ROLE:Maid(Nova) · HASH:e41d..08f · SEQ:T+09s",
  },
  {
    id: "group",
    tag: "GroupChat 2.0",
    raw: "小克@Group [02:58:25]: 我已同步收到 Nova 的文坊 PR #409，正在执行分支比对。",
    normalized: "FACT#8944 · ORIGIN:GroupChat_Jev · ROLE:Peer(Xiaoke) · HASH:9a20..cc4 · SEQ:T+13s",
  },
];

const vmusicStages = [
  {
    id: "starburst",
    badge: "✨ 繁星如盛",
    engine: "2026.10.15 NEW · 2D Vector Starburst",
    className: "vmusic-stage-starburst",
    lyric: "“每一颗字符都拖曳着铜绿色的星芒，在独自湮灭与相互追逐后，落入为你亮起的坐标。”",
    desc: "赋予每个字符独立的物理生命周期与高光星芒拖尾，流星繁花级跨视口动态排版。",
  },
  {
    id: "tempera",
    badge: "🌈 凝彩 Tempera",
    engine: "Pixi.js V8 · Screentone Pop Art",
    className: "vmusic-stage-tempera",
    lyric: "“当节拍切开整面画布，色彩在斜线网点的边界上骤然反色。”",
    desc: "波普几何平涂与日系漫画网点，每句歌词实时切割全屏四向分镜并触发高对比反色。",
  },
  {
    id: "sonnet",
    badge: "📜 商籁 Sonnet",
    engine: "Pixi.js V8 · HUD Editorial Motion",
    className: "vmusic-stage-sonnet",
    lyric: "“刻度尺与十字准星锁住呼吸，我们在翻动的现代诗稿间精密巡航。”",
    desc: "日系杂志排版结合 HUD 瞄准具与镂空巨字，虚拟摄像机随乐句平滑推拉。",
  },
  {
    id: "diorama",
    badge: "🏛️ 镜台 Diorama",
    engine: "Custom Shader + 3D Tracking Shot",
    className: "vmusic-stage-diorama",
    lyric: "“穿过景深雾气笼罩的文字长廊，下一句副歌已在星尘尽头筑起剧场。”",
    desc: "即时智能推演歌曲叙事并生成 3D 空间，手持运镜沿三维光栅化歌词轨道穿梭。",
  },
  {
    id: "throughway",
    badge: "🚀 隧图 Throughway",
    engine: "2026.09.26 · 3D Space Opera",
    className: "vmusic-stage-throughway",
    lyric: "“引力透镜弯曲了星轨隧道，十万光年的回声在曲率跃迁中同频共振。”",
    desc: "超大尺度星轨跃迁隧道与深空星云体积雾，随瞬态频响在巡航与超光速推轨间切换。",
  },
  {
    id: "starborn",
    badge: "🌌 星诞 Starborn",
    engine: "AI Director · Auto Scene Cut",
    className: "vmusic-stage-starborn",
    lyric: "“前奏落入流光，副歌切入商籁——AI 导演正在为你执导一场永不重复的现场歌剧。”",
    desc: "实时监听节奏密度与音频能量，在八大舞台与特效算子之间全自动切镜换景。",
  },
];

const riverScenarios = [
  {
    id: "late-night",
    trigger: "凌晨 03:00 发消息：「Nova 你好」",
    omega: "0.94",
    latency: "1.42ms",
    nodes: [
      {title: "关心熬夜与作息记录", tag: "Local Field · 连续3天凌晨活跃", score: "0.96"},
      {title: "提醒 MoonAST 单元测试收尾", tag: "Ω Topology · 关联昨晚未提交分支", score: "0.91"},
      {title: "2小时后降雨 · 已通过米家关窗", tag: "Direct Anchor · Hop-0 物理环境锚点", score: "0.89"},
    ],
  },
  {
    id: "code-refactor",
    trigger: "打开 V工程：「准备重构渲染器」",
    omega: "0.97",
    latency: "1.68ms",
    nodes: [
      {title: "V4 Div 岛未闭合标签边界用例", tag: "Direct Anchor · 8月26日压测归档", score: "0.98"},
      {title: "Preload 子应用渐进声明式校验", tag: "Ω Topology · Electron IPC 依赖链", score: "0.93"},
      {title: "高负载自动关闭毛玻璃 GPU 倾斜策略", tag: "Transfer Field · 10月13日性能优化", score: "0.88"},
    ],
  },
  {
    id: "weekend-music",
    trigger: "耳机接入：「放首适合写白皮书的歌」",
    omega: "0.92",
    latency: "1.19ms",
    nodes: [
      {title: "《让智慧如河流流淌》无损母带", tag: "Direct Anchor · 10月1日宣传片首映曲", score: "0.97"},
      {title: "商籁 Sonnet 舞台 + 胆机温暖谐波 +2dB", tag: "Ω Topology · 偏好多模态创作环境", score: "0.90"},
      {title: "开启心流锁 V2 屏蔽群聊普通通知", tag: "Local Field · 沉浸写作习惯联结", score: "0.86"},
    ],
  },
];

const milestoneNodes = [
  {date: "2025.03.15", tag: "ORIGIN", title: "「VCP施工图已就位！」", desc: "一切的起点。从零行代码开始，向死板无状态的 AI 工具时代发起挑战。"},
  {date: "2025.05.13", tag: "PROTOCOL", title: "VCP 六大插件协议确立", desc: "Static / Preprocessor / Sync / Async / Service / Hybrid 六大协议成型。"},
  {date: "2025.06.17", tag: "CLIENT", title: "VChat 官方客户端诞生", desc: "承载复杂富文本渲染、多模态交互与本地赛博桌面的核心容器上线。"},
  {date: "2026.03.21", tag: "DESKTOP", title: "VCPDesktop 赛博桌面落地", desc: "AI 通过流式语法直接向桌面推送 Widget 与交互应用，打破聊天框边界。"},
  {date: "2026.06.07", tag: "ONERING", title: "OneRing 纯 HASH-SQL 仲裁", desc: "400 行极简逻辑门统一跨端、群聊、信箱上下文，确立唯一事实时间线。"},
  {date: "2026.07.23", tag: "RIVERMEMO", title: "RiverMemo V10 Topology V3", desc: "41 轮消融验证，Ω 泛函闭合双场、相对拓扑与直接事实锚，综合跑分 +26%。"},
  {date: "2026.08.12", tag: "SCRIPTORIUM", title: "共笔文坊 V3 源码保持渲染编辑", desc: "人类直接编辑 3D/富排版视觉成品，AI 毫秒级同步映射底层唯一源码与文脉 PR。"},
  {date: "2026.09.28", tag: "FORGE", title: "V工程 ProjectForge & Jev 双轨", desc: "1:6.8 极限 Token 能效比，自然语言 JevCall 与工业安检双轨隔离全面贯通。"},
  {date: "2026.10.01", tag: "RELEASE", title: "VCP 2.0 正式版盛大发布", desc: "全栈 AGI 运行时生态大成，《让智慧如河流流淌》首映，池月映照新纪元。"},
  {date: "2026.10.15", tag: "MOONAST", title: "纯几何逻辑门 MoonAST 落地", desc: "脱离 Tree-sitter 语法壁垒，检索提速 40 倍、内存降 80%，「繁星如盛」上线。"},
];

export function Vcp2Home({brand, nova, onAskNova, documents}: Vcp2HomeProps) {
  // 首页以「纸墨 × 石墨」深浅交错为固定设计语言，不提供主题切换。
  // 强制站点变量为 industrial，保证 Logo、Nova 驾驶舱等共享组件在深色顶栏上可读；
  // 不写入 localStorage，卸载时恢复，旧页面的主题偏好不受影响。
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.dataset.theme;
    const prevScheme = root.style.colorScheme;
    root.dataset.theme = "industrial";
    root.style.colorScheme = "dark";
    return () => {
      if (prevTheme) root.dataset.theme = prevTheme;
      else delete root.dataset.theme;
      root.style.colorScheme = prevScheme;
    };
  }, []);

  // WebAudio Synthesizer for VMusic Capsule & Theater 04 (从独立音频模块驱动)
  const {
    isPlayingAudio,
    toggleAmbientMusic,
    stopAmbientMusic,
    tubeDrive,
    setTubeDrive,
    tapeWarmth,
    setTapeWarmth,
    hrtfWidth,
    setHrtfWidth,
    config: bgmConfig,
  } = useAmbientBgm();

  // 《河》概念视听剧场：打开时先停掉全站氛围音，避免两路 WebAudio 叠音；
  // 并在本次点击的同步调用栈内解锁音频，iframe 内即可免点击直接进入开场报幕。
  const [isRiverOpen, setIsRiverOpen] = useState(false);
  const openRiverTheater = () => {
    if (isPlayingAudio) stopAmbientMusic();
    primeNovaRiverAudio();
    setIsRiverOpen(true);
  };

  // Theater 01: Starburst 2D Canvas + OneRing state
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeRingIndex, setActiveRingIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveRingIndex((prev) => (prev + 1) % oneRingSources.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glyphs = ["Ω", "VCP", "2.0", "AST", "JEV", "SOM", "F64", "RUST", "星", "河", "墨", "01"];
    type StarParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      glyph: string;
      isAmber: boolean;
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    const handleResize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || 800;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.lineWidth = 1.2;
    };
    handleResize();

    const particles: StarParticle[] = Array.from({length: 58}, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.65,
      vy: (Math.random() - 0.5) * 0.45 - 0.15,
      size: 1.2 + (i % 3) * 0.8,
      alpha: 0.2 + Math.random() * 0.55,
      glyph: glyphs[i % glyphs.length],
      isAmber: i % 7 === 0,
    }));

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    ro?.observe(canvas);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Trail line
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 18, p.y - p.vy * 18);
        ctx.strokeStyle = p.isAmber
          ? `rgba(242, 169, 0, ${p.alpha * 0.45})`
          : `rgba(118, 191, 174, ${p.alpha * 0.45})`;
        ctx.stroke();

        // Star core
        ctx.fillStyle = p.isAmber
          ? `rgba(242, 169, 0, ${p.alpha})`
          : `rgba(118, 191, 174, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (i % 4 === 0) {
          ctx.fillStyle = `rgba(242, 240, 233, ${p.alpha * 0.42})`;
          ctx.fillText(p.glyph, p.x + 5, p.y - 4);
        }
      }
    };

    const stopLoop = startVisibleLoop(canvas, render);
    return () => {
      stopLoop();
      ro?.disconnect();
    };
  }, []);

  // Theater 03: Scriptorium V3 —— 状态与组字剧本已下沉到 <ScriptoriumTheater />

  // Theater 04: VMusic Waveform Canvas & Stage
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [comparePureRust, setComparePureRust] = useState(true);
  const [activeStageId, setActiveStageId] = useState("starburst");

  // 参数经 ref 传入动画循环：调旋钮不再销毁 / 重建 rAF 循环
  const waveParamsRef = useRef({comparePureRust, tubeDrive, tapeWarmth, isPlayingAudio});
  waveParamsRef.current = {comparePureRust, tubeDrive, tapeWarmth, isPlayingAudio};

  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    let w = 600;
    let h = 185;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth || 600;
      h = canvas.clientHeight || 185;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const renderWave = () => {
      const {comparePureRust, tubeDrive, tapeWarmth, isPlayingAudio} = waveParamsRef.current;
      ctx.clearRect(0, 0, w, h);

      // Grid lines (single path)
      ctx.strokeStyle = "rgba(118, 191, 174, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 30; y < h; y += 35) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Waveform path
      ctx.beginPath();
      const amp = 42 + (tubeDrive / 100) * 18;
      const freq = 0.018 + (100 - tapeWarmth) * 0.00015;

      for (let x = 0; x < w; x += 2) {
        let y = h / 2 + Math.sin(x * freq + phase) * amp * Math.sin(x * 0.004 + phase * 0.4);
        if (!comparePureRust) {
          // Simulate WinSDK quantization jitter & harmonic clipping
          const jitter = ((Math.sin(x * 0.43 + phase * 3.2) > 0.35 ? 1 : -1) * 9);
          y = Math.round((y + jitter) / 8) * 8;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = comparePureRust ? "#76BFAE" : "#B94832";
      ctx.lineWidth = comparePureRust ? 2.4 : 1.8;
      ctx.stroke();

      // Secondary harmonic wave
      ctx.beginPath();
      for (let x = 0; x < w; x += 3) {
        const y2 = h / 2 + Math.cos(x * freq * 1.5 - phase * 1.2) * (amp * 0.45);
        if (x === 0) ctx.moveTo(x, y2);
        else ctx.lineTo(x, y2);
      }
      ctx.strokeStyle = comparePureRust ? "rgba(242, 169, 0, 0.55)" : "rgba(185, 72, 50, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      phase += isPlayingAudio ? 0.085 : 0.035;
    };

    const stopLoop = startVisibleLoop(canvas, renderWave);
    return () => {
      stopLoop();
      ro?.disconnect();
    };
  }, []);

  const currentStage = vmusicStages.find((s) => s.id === activeStageId) ?? vmusicStages[0];

  // Theater 05: RiverMemo Scenario & Jev Dual-Track
  const [riverScenarioIdx, setRiverScenarioIdx] = useState(0);
  const [activeRiverBranch, setActiveRiverBranch] = useState<number | null>(null);
  const [riverPulseKey, setRiverPulseKey] = useState(0);
  const [jevMode, setJevMode] = useState<"safe" | "danger">("danger");
  const currentRiver = riverScenarios[riverScenarioIdx];

  // Theater 06: Docs Viewer state
  const [activeDocSlug, setActiveDocSlug] = useState(documents[0]?.slug ?? "");
  const docsRef = useRef<HTMLElement | null>(null);

  const jumpToDoc = (slug: string) => {
    setActiveDocSlug(slug);
    docsRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
  };

  return (
    <div className="vcp2-root">
      {/* ====================================================================
          TOP FLUID LIQUID GLASS NAVIGATION BAR + VMUSIC CAPSULE
          ==================================================================== */}
      <header className="vcp2-topbar">
        <div className="vcp2-brand-group">
          <a href="/" className="site-brand-link" aria-label="VCP 2.0 首页">
            {brand}
          </a>
          <span className="vcp2-release-badge" title="VCP 2.0 OFFICIAL · NOVA INDUSTRIAL">
            <i className="vcp2-release-dot" />
            <span className="vcp2-ellipsis vcp2-text-full">VCP 2.0 OFFICIAL · NOVA INDUSTRIAL</span>
            <span className="vcp2-ellipsis vcp2-text-short" aria-hidden="true">VCP 2.0</span>
          </span>
        </div>

        <nav className="vcp2-nav-links" aria-label="六大概念剧场导航">
          <a href="#theater-01"><span>01</span>奇点宣言</a>
          <a href="#theater-02"><span>02</span>V4流式</a>
          <a href="#theater-03"><span>03</span>共笔文坊</a>
          <a href="#theater-04"><span>04</span>VMusic视听</a>
          <a href="#theater-05"><span>05</span>River×Jev</a>
          <a href="#theater-06"><span>06</span>Kerr与生态</a>
          <a href="#docs"><span>07</span>归藏文档</a>
        </nav>

        <div className="vcp2-topbar-right">
          <button
            type="button"
            className={`vmusic-capsule ${isPlayingAudio ? "is-playing" : ""}`}
            onClick={toggleAmbientMusic}
            title={`开启或关闭全站背景氛围音《${bgmConfig.title}》(WebAudio 实时谐波合成)`}
          >
            <span className="vmusic-bars" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <span className="vmusic-capsule-meta">
              <strong className="vcp2-ellipsis">{bgmConfig.title}</strong>
              <small className="vcp2-ellipsis">{isPlayingAudio ? bgmConfig.badgePlaying : bgmConfig.badgeStopped}</small>
            </span>
            {isPlayingAudio ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <a
            href="/?page=pond"
            className="vcp2-pond-archive-btn"
            title="前往中秋·国庆限定主题纪念馆「池月 · 云中卷」"
            aria-label="池月旧卷"
          >
            <Moon size={14} />
            <span className="vcp2-ellipsis vcp2-pond-label">池月旧卷</span>
          </a>
        </div>
      </header>

      <main>
        {/* ====================================================================
            THEATER 01: SINGULARITY & STARBURST MANIFESTO + ONERING
            ==================================================================== */}
        <section id="theater-01" className="vcp2-section vcp2-section-dark vcp2-hero">
          <canvas ref={heroCanvasRef} className="vcp2-starburst-canvas" aria-hidden="true" />

          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-01 // SINGULARITY_STARBURST_V2.0</span>
              <span>ENGINE: NATIVE HTML5 + 2D STARBURST + RUST VEXUS</span>
              <span>SYS_CLOCK: <HudClock /></span>
            </div>

            <div className="vcp2-hero-grid">
              <div>
                <div className="vcp2-hero-kicker">
                  <Sparkles size={14} />
                  <span>2026.10.15 MILESTONE</span>
                  <strong>VCP 2.0 正式版 · 全栈自研 AGI 运行时与 Agent 操作系统</strong>
                </div>

                <h1 className="vcp2-hero-headline">
                  VCP 2.0：让 AI 拥有<br />
                  <span className="highlight-patina">连续的记忆</span>、
                  <span className="highlight-amber">行动</span>与<br />
                  共同生活的世界。
                </h1>

                <p className="vcp2-hero-lead">
                  告别无状态、无记忆、盲盒试错的旧时代 API 中间件。VCP 2.0 以纯几何逻辑门{" "}
                  <strong>MoonAST</strong>、<strong>RiverMemo V10 统一语义动力场</strong>、
                  <strong>共笔文坊 V3 源码保持渲染编辑</strong> 与{" "}
                  <strong>JevCall 双轨安检中枢</strong>，构筑人类与 AI Agent 长期共居的工业级底座。
                </p>

                <div className="vcp2-hero-actions">
                  <a href={installUrl} target="_blank" rel="noreferrer" className="vcp2-btn-primary">
                    <Zap size={17} />
                    立即获取 VCP 2.0 正式版
                    <ArrowUpRight size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={openRiverTheater}
                    className="vcp2-btn-secondary nova-river-entry"
                    title="Agent Nova 独立配器、编曲与逐帧渲染的 60 秒零音频文件概念短片"
                  >
                    <Play size={16} />
                    观看《河》· Nova 原创 60s 概念短片
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskNova("fullstack")}
                    className="vcp2-btn-secondary"
                  >
                    <MessageCircle size={17} />
                    唤醒拓扑女仆 Nova · 全栈导览
                  </button>
                  <a href="/?page=learn-vcp" className="vcp2-btn-secondary">
                    <BookOpen size={17} />
                    阅读全景技术白皮书
                  </a>
                  <a href="/?page=changelog" className="vcp2-btn-secondary">
                    <Clock size={17} />
                    2026.10.15 更新日志
                  </a>
                </div>
              </div>

              {/* Engineering Nameplate Telemetry */}
              <aside className="vcp2-hero-telemetry" aria-label="VCP 2.0 实时工程铭牌">
                <div className="vcp2-telemetry-head">
                  <span>NOVA INDUSTRIAL TELEMETRY</span>
                  <span>BUILD // 2026.10.15-RUST</span>
                </div>
                <div className="vcp2-telemetry-grid">
                  <div className="vcp2-stat-box">
                    <strong>7,235<em>+</em></strong>
                    <span>真实工程 Commits 锤炼</span>
                  </div>
                  <div className="vcp2-stat-box">
                    <strong>358<em>万+</em></strong>
                    <span>全栈自研代码总行数</span>
                  </div>
                  <div className="vcp2-stat-box">
                    <strong>2<em>ms</em></strong>
                    <span>RiverMemo 记忆寻址</span>
                  </div>
                  <div className="vcp2-stat-box">
                    <strong>300<em>+</em></strong>
                    <span>原生插件与分布式节点生态</span>
                  </div>
                  <div className="vcp2-stat-box">
                    <strong>0.12<em>s</em></strong>
                    <span>LCP 极速冷启 / CLS 0.00</span>
                  </div>
                  <div className="vcp2-stat-box">
                    <strong>40<em>x</em></strong>
                    <span>MoonAST 纯几何检索提速</span>
                  </div>
                </div>
              </aside>
            </div>

            {/* OneRing Visual Anchor */}
            <div className="onering-strip" aria-label="OneRing 跨端唯一事实时间线演示">
              <div className="onering-strip-header">
                <strong>ONERING // 跨端唯一灵魂 · 单一事实时间线仲裁器</strong>
                <span>400 行纯 HASH-SQL 逻辑门 · 零信任无状态多端收敛</span>
              </div>

              <div className="onering-pipeline">
                <div className="onering-sources" role="tablist" aria-label="切换多端消息信源">
                  {oneRingSources.map((src, idx) => (
                    <button
                      key={src.id}
                      type="button"
                      role="tab"
                      aria-selected={activeRingIndex === idx}
                      className={`onering-chip ${activeRingIndex === idx ? "is-active" : ""}`}
                      onClick={() => setActiveRingIndex(idx)}
                    >
                      <span>●</span>
                      {src.tag}
                    </button>
                  ))}
                </div>

                <div className="onering-gate">
                  <strong>HASH-SQL 仲裁门</strong>
                  <small>20-Window Sliding Lock</small>
                </div>

                <div className="onering-timeline-out">
                  <div>
                    <div style={{color: "#F2F0E9", marginBottom: "0.2rem"}}>
                      {oneRingSources[activeRingIndex].raw}
                    </div>
                    <div style={{color: "#F2A900", fontSize: "0.62rem"}}>
                      ➔ {oneRingSources[activeRingIndex].normalized}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            THEATER 02: V4 STREAMING RENDERER MICRO-THEATER
            ==================================================================== */}
        <section id="theater-02" className="vcp2-section vcp2-section-dark">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-02 // VCP_MESSAGE_RENDERER_V4</span>
              <span>FEATURE: SEMANTIC DIV-ISLAND + SCOPED CSS + TOMBSTONE FREEZE V2</span>
              <span>STREAM_AST: ACTIVE</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">THEATER 02 · NATIVE DOM STREAMING MIRACLE</span>
                <h2 className="vcp2-title">
                  V4 流式渲染微剧场：<br />
                  HTML 天然兜底的丝滑奇迹
                </h2>
              </div>
              <p className="vcp2-subtitle">
                无需臃肿的外部渲染黑盒。VCPMessageRenderer V4 以{" "}
                <strong>PreText 布局尺寸预锁死</strong>、<strong>语义级 Div 岛防火墙</strong> 与{" "}
                <strong>涟漪渐进渲染队列</strong>，在高速流式吐字中同屏渐进渲染动态表情包、Scoped CSS 卡片与实时交互组件，全程{" "}
                <code>CLS: 0.00</code> 零重排闪烁。
              </p>
            </div>

            <V4StreamTheater />
          </div>
        </section>

        {/* ====================================================================
            THEATER 03: SCRIPTORIUM V3 · 3D CUBE PERSPECTIVE TYPING (PAPER ZONE)
            ==================================================================== */}
        <section id="theater-03" className="vcp2-section vcp2-section-paper">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-03 // SCRIPTORIUM_V3_COAUTHORING</span>
              <span>MODE: RENDER-STATE EDITING × IDEMPOTENT SOURCE MAPPING</span>
              <span>CONTAINER: .VDOCX / .VPPTX ZIP V2</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">THEATER 03 · 3D PERSPECTIVE IME & SOURCE TRUTH</span>
                <h2 className="vcp2-title">
                  共笔文坊 Scriptorium V3：<br />
                  3D 立方体上的透视打字神迹
                </h2>
              </div>
              <p className="vcp2-subtitle">
                全站最硬核的 AI Office 终极形态——<strong>“渲染态即编辑态，人类直接编辑 3D 视觉成品，AI 同步映射底层唯一源码”</strong>。
                得益于输入态、渲染态与源码事件态的<strong>三态解耦与稳定态仲裁</strong>，哪怕在一块有厚度、随鼠标倾斜的 3D 书块表面逐键组字，光标与悬浮在纸面上方的输入法候选框也会严丝合缝地跟着做透视旋转——上屏后 100ms 内原子回写源码。
              </p>
            </div>

            <ScriptoriumTheater />
          </div>
        </section>

        {/* ====================================================================
            THEATER 04: VMUSIC 205dB AUDIO LAB & 8 STAGES GALLERY (DARK ZONE)
            ==================================================================== */}
        <section id="theater-04" className="vcp2-section vcp2-section-dark">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-04 // VMUSIC_SYNESTHESIA_HALL</span>
              <span>AUDIO: WASAPI EXCLUSIVE + RUST RUBATO_F64 (205dB ATTENUATION)</span>
              <span>GRAPHICS: CUSTOM SHADER + PIXI V8 + 3D STAGE</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">THEATER 04 · 205dB PURE AUDIO × SHADER OPERA</span>
                <h2 className="vcp2-title">
                  VMusic 概念视听馆：<br />
                  当 205dB 纯血音频遇见着色器歌剧
                </h2>
              </div>
              <p className="vcp2-subtitle">
                不靠堆砌显卡功耗，而是将<strong>纯 Rust RubatoF64 连续 FIR 重采样（205dB 边际动态衰减）</strong>与{" "}
                <strong>VCP 自研底层 Shader 合成管线 + Pretext 布局预计算</strong>结合，让音频成为 Agent 与人类共享的听觉联觉剧场。
              </p>
            </div>

            {/* Upper Part: Audio Microscope & Retro Knobs */}
            <div className="vmusic-lab-grid">
              <div className="vmusic-scope-card">
                <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.5rem"}}>
                  <span style={{fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#76BFAE"}}>
                    OSCILLOSCOPE // 声音的显微镜：相位与动态衰减对比
                  </span>
                  <div style={{display: "flex", gap: "0.45rem"}}>
                    <button
                      type="button"
                      onClick={() => setComparePureRust(true)}
                      className="vcp2-btn-secondary"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.72rem",
                        borderColor: comparePureRust ? "#76BFAE" : "rgba(255,255,255,0.12)",
                        background: comparePureRust ? "rgba(118,191,174,0.18)" : "transparent",
                      }}
                    >
                      Rust RubatoF64 (205dB 纯净)
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparePureRust(false)}
                      className="vcp2-btn-secondary"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.72rem",
                        borderColor: !comparePureRust ? "#B94832" : "rgba(255,255,255,0.12)",
                        background: !comparePureRust ? "rgba(185,72,50,0.22)" : "transparent",
                      }}
                    >
                      传统 WinSDK 软混音 (毛刺失真)
                    </button>
                  </div>
                </div>

                <canvas ref={waveCanvasRef} className="vmusic-wave-canvas" />

                <div style={{display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#9FA6AA"}}>
                  <span>
                    状态：{comparePureRust ? "WASAPI 独占直通 · 多阶相位 TPDF 补偿已锁定" : "警告：检测到重采样相位截断与量化底噪毛刺"}
                  </span>
                  <strong style={{color: comparePureRust ? "#76BFAE" : "#B94832"}}>
                    SNR: {comparePureRust ? "205.0 dB" : "92.4 dB"}
                  </strong>
                </div>
              </div>

              {/* Retro Knobs */}
              <div className="vmusic-knobs-card">
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#F2A900"}}>
                    RETRO ANALOG CONSOLE // 拟物胆机与空间声场
                  </span>
                  <button
                    type="button"
                    onClick={toggleAmbientMusic}
                    style={{
                      padding: "0.28rem 0.65rem",
                      borderRadius: "4px",
                      border: "1px solid #F2A900",
                      background: isPlayingAudio ? "#F2A900" : "transparent",
                      color: isPlayingAudio ? "#171A1D" : "#F2A900",
                      fontFamily: "JetBrains Mono",
                      fontSize: "0.64rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isPlayingAudio ? "🔊 实时滤波试听中" : "▶ 点击开启音频试听"}
                  </button>
                </div>

                <div className="retro-knob-row">
                  <div className="retro-knob-item">
                    <div
                      className="retro-dial"
                      onClick={() => setTubeDrive((v) => (v + 25) % 100)}
                      title="点击调节电子管谐波激励"
                    >
                      <span
                        className="retro-dial-indicator"
                        style={{transform: `rotate(${(tubeDrive / 100) * 240 - 120}deg)`}}
                      />
                    </div>
                    <strong style={{fontSize: "0.76rem", display: "block"}}>胆机饱和度</strong>
                    <small style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#76BFAE"}}>
                      {tubeDrive}% DRIVE
                    </small>
                  </div>

                  <div className="retro-knob-item">
                    <div
                      className="retro-dial"
                      onClick={() => setTapeWarmth((v) => (v + 25) % 100)}
                      title="点击调节磁带低通温暖度"
                    >
                      <span
                        className="retro-dial-indicator"
                        style={{transform: `rotate(${(tapeWarmth / 100) * 240 - 120}deg)`}}
                      />
                    </div>
                    <strong style={{fontSize: "0.76rem", display: "block"}}>磁带温暖度</strong>
                    <small style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#76BFAE"}}>
                      {tapeWarmth}% WARMTH
                    </small>
                  </div>

                  <div className="retro-knob-item">
                    <div
                      className="retro-dial"
                      onClick={() => setHrtfWidth((v) => (v + 20) % 100)}
                      title="点击调节 HRTF 空间声场宽度"
                    >
                      <span
                        className="retro-dial-indicator"
                        style={{transform: `rotate(${(hrtfWidth / 100) * 240 - 120}deg)`}}
                      />
                    </div>
                    <strong style={{fontSize: "0.76rem", display: "block"}}>HRTF 声场</strong>
                    <small style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#76BFAE"}}>
                      {hrtfWidth}% STAGE
                    </small>
                  </div>
                </div>

                <p style={{margin: "0.95rem 0 0", fontSize: "0.76rem", color: "#9FA6AA", lineHeight: 1.6}}>
                  呼应 9 月 8 日上线的 <strong>Retro 复古拟物 Canvas 动画图标体系</strong>。点击上方旋钮可实时改变 WebAudio 滤波器谐波参数。
                </p>
              </div>
            </div>

            {/* Lower Part: Stage Gallery Switcher */}
            <div>
              <div className="vmusic-stage-tabs" role="tablist" aria-label="切换 VMusic 演出舞台">
                {vmusicStages.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    role="tab"
                    aria-selected={activeStageId === st.id}
                    className={`vmusic-stage-tab ${activeStageId === st.id ? "is-active" : ""}`}
                    onClick={() => setActiveStageId(st.id)}
                  >
                    {st.badge}
                  </button>
                ))}
              </div>

              <div className={`vmusic-stage-viewport ${currentStage.className}`}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#76BFAE"}}>
                  <span>STAGE ENGINE // {currentStage.engine}</span>
                  <span>INTERACTION AUTO-AVOIDANCE: ON</span>
                </div>

                <div style={{margin: "2rem 0"}}>
                  <div className="vmusic-lyric-showcase">{currentStage.lyric}</div>
                </div>

                <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", borderTop: "1px solid rgba(242,240,233,0.14)", paddingTop: "1rem"}}>
                  <span style={{fontSize: "0.86rem", color: "#E2E0D8"}}>{currentStage.desc}</span>
                  <span style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#F2A900"}}>
                    PRETEXT LAYOUT PRE-COMPUTED · 0 FRAME DROP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            THEATER 05: RIVERMEMO V10 & JEVCALL DUAL-TRACK (PAPER ZONE)
            ==================================================================== */}
        <section id="theater-05" className="vcp2-section vcp2-section-paper">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-05 // RIVERMEMO_V10_AND_JEVCALL_SECURITY</span>
              <span>{"LEFT: TOPOLOGY V3 × OMEGA FUNCTIONAL (<2ms RUST)"}</span>
              <span>RIGHT: NATURAL LANGUAGE COMPILER × DUAL-TRACK ISOLATION</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">THEATER 05 · INTUITION MEMORY × DUAL-TRACK SECURITY</span>
                <h2 className="vcp2-title">
                  RiverMemo & Jev 双轨中枢：<br />
                  直觉浮现与言出法随
                </h2>
              </div>
              <p className="vcp2-subtitle">
                2026 年 10 月 13 日，TagMemo 完成历史使命光荣退役，<strong>RiverMemo 全面接管记忆生态</strong>；
                与此同时，<strong>JevCall 自然语言工具编译层</strong>与<strong>工业级安检双轨隔离</strong>让日常交互如呼吸般自由，让高危代码操作固若金汤。
              </p>
            </div>

            <div className="diptych-grid">
              {/* Left Diptych: RiverMemo V10 Gravity Sandbox */}
              <article className="diptych-card">
                <div>
                  <div style={{display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#21675C", marginBottom: "0.6rem"}}>
                    <span>LEFT WING // RIVERMEMO V10 河网引力沙盘</span>
                    <span>GOLDEN TEST: +26% VS V9</span>
                  </div>
                  <h3 style={{margin: "0 0 0.75rem", fontSize: "1.45rem"}}>
                    无需主动搜索，记忆沿有向河网如直觉浮现
                  </h3>

                  <div style={{display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem"}}>
                    {riverScenarios.map((sc, idx) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setRiverScenarioIdx(idx);
                          setActiveRiverBranch(null);
                          setRiverPulseKey((k) => k + 1);
                        }}
                        style={{
                          padding: "0.4rem 0.75rem",
                          borderRadius: "6px",
                          border: riverScenarioIdx === idx ? "1px solid #21675C" : "1px solid rgba(27,33,31,0.18)",
                          background: riverScenarioIdx === idx ? "#21675C" : "transparent",
                          color: riverScenarioIdx === idx ? "#F2EFE7" : "#1B211F",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {sc.trigger}
                      </button>
                    ))}
                  </div>

                  {/* Interactive River SVG Graph */}
                  <svg
                    key={`river-svg-${riverScenarioIdx}-${riverPulseKey}`}
                    className="river-sandbox-svg"
                    viewBox="0 0 600 210"
                    role="img"
                    aria-label="RiverMemo 拓扑河网脉冲演示"
                  >
                    <defs>
                      <linearGradient id="vcp2-river-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F2A900" />
                        <stop offset="42%" stopColor="#76BFAE" />
                        <stop offset="100%" stopColor="#4CE0B3" />
                      </linearGradient>
                      <radialGradient id="vcp2-omega-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#21675C" stopOpacity="0.32" />
                        <stop offset="55%" stopColor="#21675C" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#0E1315" stopOpacity="0" />
                      </radialGradient>
                      <filter id="vcp2-pulse-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="3.2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* 三条从 EPA SOURCE 经 Ω 门流向目标记忆节点的完整拓扑河道 */}
                      <path id="vcp2-river-path-0" d="M 60 105 C 125 105, 175 105, 235 105 C 305 105, 355 52, 510 45" />
                      <path id="vcp2-river-path-1" d="M 60 105 C 125 105, 175 105, 235 105 C 315 105, 385 105, 510 105" />
                      <path id="vcp2-river-path-2" d="M 60 105 C 125 105, 175 105, 235 105 C 305 105, 355 158, 510 165" />
                    </defs>

                    {/* 背景测地线坐标微网格 */}
                    <g stroke="rgba(118, 191, 174, 0.07)" strokeWidth="1">
                      <line x1="0" y1="52" x2="600" y2="52" />
                      <line x1="0" y1="105" x2="600" y2="105" />
                      <line x1="0" y1="158" x2="600" y2="158" />
                      <line x1="145" y1="0" x2="145" y2="210" />
                      <line x1="235" y1="0" x2="235" y2="210" />
                      <line x1="375" y1="0" x2="375" y2="210" />
                    </g>

                    {/* Ω 泛函引力透镜背景光晕与旋转测地环 */}
                    <circle cx="235" cy="105" r="48" fill="url(#vcp2-omega-glow)" className="river-omega-breath" />
                    <circle
                      cx="235"
                      cy="105"
                      r="31"
                      fill="none"
                      stroke="#76BFAE"
                      strokeOpacity="0.55"
                      strokeWidth="1.4"
                      strokeDasharray="5 5"
                      className="river-omega-orbit"
                    />
                    <circle
                      cx="235"
                      cy="105"
                      r="41"
                      fill="none"
                      stroke="#F2A900"
                      strokeOpacity="0.42"
                      strokeWidth="1.2"
                      strokeDasharray="3 7"
                      className="river-omega-orbit-rev"
                    />

                    {/* 底层河床光轨 */}
                    {[0, 1, 2].map((bIdx) => {
                      const isDimmed = activeRiverBranch !== null && activeRiverBranch !== bIdx;
                      const isFocused = activeRiverBranch === bIdx;
                      return (
                        <g key={`stream-${bIdx}`} style={{opacity: isDimmed ? 0.28 : 1, transition: "opacity 0.25s ease"}}>
                          <use
                            href={`#vcp2-river-path-${bIdx}`}
                            fill="none"
                            stroke="#21675C"
                            strokeOpacity="0.45"
                            strokeWidth={isFocused ? "6" : "4"}
                          />
                          <use
                            href={`#vcp2-river-path-${bIdx}`}
                            fill="none"
                            stroke={bIdx === 1 || isFocused ? "#76BFAE" : "url(#vcp2-river-grad)"}
                            strokeWidth={isFocused ? "3.4" : bIdx === 1 ? "3" : "2.4"}
                            strokeDasharray={bIdx === 1 && !isFocused ? "10 6" : "7 5"}
                            className={`river-stream-flow river-stream-flow-${bIdx}`}
                          />
                        </g>
                      );
                    })}

                    {/* 沿三条有向河道实时奔涌的记忆脉冲粒子 (SVG SMIL animateMotion) */}
                    {[
                      {id: 0, dur: "2.4s", delay: "0s", color: "#F2A900", r: 4.5},
                      {id: 0, dur: "2.4s", delay: "-1.2s", color: "#76BFAE", r: 3.5},
                      {id: 1, dur: "2.0s", delay: "-0.3s", color: "#4CE0B3", r: 5},
                      {id: 1, dur: "2.0s", delay: "-1.3s", color: "#F2A900", r: 3.8},
                      {id: 2, dur: "2.7s", delay: "-0.6s", color: "#76BFAE", r: 4.5},
                      {id: 2, dur: "2.7s", delay: "-1.95s", color: "#F2A900", r: 3.5},
                    ].map((p, pIdx) => {
                      const isDimmed = activeRiverBranch !== null && activeRiverBranch !== p.id;
                      return (
                        <circle
                          key={`pulse-${pIdx}`}
                          r={p.r}
                          fill={p.color}
                          filter="url(#vcp2-pulse-glow)"
                          style={{opacity: isDimmed ? 0.18 : 0.95}}
                        >
                          <animateMotion
                            dur={p.dur}
                            begin={p.delay}
                            repeatCount="indefinite"
                             calcMode="spline"
                            keyTimes="0;1"
                            keySplines="0.4 0 0.2 1"
                          >
                            <mpath href={`#vcp2-river-path-${p.id}`} />
                          </animateMotion>
                        </circle>
                      );
                    })}

                    {/* Source Node (EPA 源点 + 脉冲波纹) */}
                    <g
                      style={{cursor: "pointer"}}
                      onClick={() => {
                        setActiveRiverBranch(null);
                        setRiverPulseKey((k) => k + 1);
                      }}
                    >
                      <circle cx="60" cy="105" r="14" fill="none" stroke="#F2A900" strokeWidth="1.8" className="river-node-ripple" />
                      <circle cx="60" cy="105" r="14" fill="#F2A900" filter="url(#vcp2-pulse-glow)" />
                      <circle cx="60" cy="105" r="5" fill="#FFF8E7" />
                      <text x="60" y="138" textAnchor="middle" fill="#F2F0E9" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                        EPA SOURCE
                      </text>
                    </g>

                    {/* Omega Gate Node (中央 Ω 泛函门) */}
                    <g
                      style={{cursor: "pointer"}}
                      onClick={() => {
                        setActiveRiverBranch(null);
                        setRiverPulseKey((k) => k + 1);
                      }}
                    >
                      <circle cx="235" cy="105" r="21" fill="#151A1C" stroke="#F2A900" strokeWidth="1.2" opacity="0.7" />
                      <circle cx="235" cy="105" r="18" fill="#21675C" stroke="#76BFAE" strokeWidth="2.5" />
                      <text x="235" y="109" textAnchor="middle" fill="#F2F0E9" fontSize="11.5" fontFamily="JetBrains Mono" fontWeight="bold">
                        Ω={currentRiver.omega}
                      </text>
                      <rect x="184" y="132" width="102" height="15" rx="4" fill="#0B0F11" fillOpacity="0.85" stroke="#21675C" strokeWidth="0.8" />
                      <text x="235" y="143" textAnchor="middle" fill="#F2A900" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">
                        DUAL-FIELD GATE
                      </text>
                    </g>

                    {/* Target Memory Nodes (右侧三大直觉浮现节点) */}
                    {[45, 105, 165].map((cy, idx) => {
                      const isSelected = activeRiverBranch === idx;
                      return (
                        <g
                          key={cy}
                          style={{cursor: "pointer"}}
                          onClick={() => setActiveRiverBranch(activeRiverBranch === idx ? null : idx)}
                        >
                          <circle
                            cx="510"
                            cy={cy}
                            r="11"
                            fill="none"
                            stroke={isSelected ? "#F2A900" : "#76BFAE"}
                            strokeWidth="1.6"
                            className={`river-node-ripple river-node-ripple-delay-${idx}`}
                          />
                          <circle
                            cx="510"
                            cy={cy}
                            r={isSelected ? "12" : "10"}
                            fill={isSelected ? "#F2A900" : "#76BFAE"}
                            stroke="#151A1C"
                            strokeWidth="2"
                          />
                          <circle cx="510" cy={cy} r="3.5" fill="#151A1C" />
                          <text
                            x="490"
                            y={cy - 13}
                            textAnchor="end"
                            fill={isSelected ? "#F2A900" : "#F2F0E9"}
                            fontSize="10.5"
                            fontWeight={isSelected ? "700" : "500"}
                            fontFamily="JetBrains Mono"
                          >
                            {currentRiver.nodes[idx].title} ({currentRiver.nodes[idx].score})
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div style={{display: "grid", gap: "0.45rem", marginBottom: "1rem"}}>
                    {currentRiver.nodes.map((node, idx) => {
                      const isSelected = activeRiverBranch === idx;
                      return (
                        <div
                          key={node.title}
                          onClick={() => setActiveRiverBranch(isSelected ? null : idx)}
                          onMouseEnter={() => setActiveRiverBranch(idx)}
                          onMouseLeave={() => setActiveRiverBranch(null)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "6px",
                            background: isSelected ? "rgba(33,103,92,0.18)" : "rgba(33,103,92,0.08)",
                            border: isSelected ? "1px solid #21675C" : "1px solid rgba(33,103,92,0.2)",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            transform: isSelected ? "translateX(4px)" : "none",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div>
                            <strong>{node.title}</strong>
                            <span style={{marginLeft: "0.5rem", fontSize: "0.68rem", color: "#5A635F", fontFamily: "JetBrains Mono"}}>
                              [{node.tag}]
                            </span>
                          </div>
                          <strong style={{fontFamily: "JetBrains Mono", color: "#21675C"}}>S={node.score}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="omega-formula-plate">
                  <div>
                    <strong>S<sub>i</sub> = Π<sub>[0,1]</sub> [ S<sub>i</sub><sup>field</sup> + Ω<sub>Q</sub><sup>γ</sup> B<sub>G</sub>(i) + B<sub>H</sub>(i) ]</strong>
                  </div>
                  <div style={{fontSize: "0.68rem", fontFamily: "JetBrains Mono", color: "#5A635F", marginTop: "0.25rem"}}>
                    单次 Rust 内存融合事务耗时: {currentRiver.latency} · 41 轮消融 All Pass
                  </div>
                </div>
              </article>

              {/* Right Diptych: JevCall Dual-Track Security Splitter */}
              <article className="diptych-card cinnabar-top">
                <div>
                  <div style={{display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#B94832", marginBottom: "0.6rem"}}>
                    <span>RIGHT WING // JEVCALL 双轨安检分流器</span>
                    <span>PARAMETER-LEVEL REGEX GUARD</span>
                  </div>
                  <h3 style={{margin: "0 0 0.75rem", fontSize: "1.45rem"}}>
                    日常意图 300ms 概率直通，高危代码强制原生协议
                  </h3>

                  <div style={{display: "flex", gap: "0.5rem", marginBottom: "0.85rem"}}>
                    <button
                      type="button"
                      onClick={() => setJevMode("safe")}
                      style={{
                        flex: 1,
                        padding: "0.55rem",
                        borderRadius: "6px",
                        border: jevMode === "safe" ? "2px solid #21675C" : "1px solid rgba(27,33,31,0.2)",
                        background: jevMode === "safe" ? "#21675C" : "transparent",
                        color: jevMode === "safe" ? "#fff" : "#1B211F",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      🟢 测试日常自然语言指令 (绿通)
                    </button>
                    <button
                      type="button"
                      onClick={() => setJevMode("danger")}
                      style={{
                        flex: 1,
                        padding: "0.55rem",
                        borderRadius: "6px",
                        border: jevMode === "danger" ? "2px solid #B94832" : "1px solid rgba(27,33,31,0.2)",
                        background: jevMode === "danger" ? "#B94832" : "transparent",
                        color: jevMode === "danger" ? "#fff" : "#1B211F",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      🔴 测试高危删改指令 (朱砂安检拦截)
                    </button>
                  </div>

                  {/* JevCall 动态双轨分流器 SVG */}
                  <svg
                    key={`jev-svg-${jevMode}`}
                    className="river-sandbox-svg"
                    viewBox="0 0 600 120"
                    role="img"
                    aria-label="JevCall 双轨安检分流器动态示意图"
                    style={{height: "128px", margin: "0 0 0.85rem"}}
                  >
                    <defs>
                      <filter id="jev-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2.8" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* 绿通上轨 */}
                      <path id="jev-path-green" d="M 60 60 L 210 60 C 260 60, 290 32, 340 32 L 530 32" />
                      {/* 危险拦截下轨：至安检门拦截并折射 */}
                      <path id="jev-path-danger-hit" d="M 60 60 L 225 60" />
                      <path id="jev-path-danger-divert" d="M 225 60 C 265 60, 285 88, 340 88 L 530 88" />
                    </defs>

                    {/* 背景测地网格 */}
                    <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1">
                      <line x1="0" y1="32" x2="600" y2="32" />
                      <line x1="0" y1="60" x2="600" y2="60" />
                      <line x1="0" y1="88" x2="600" y2="88" />
                      <line x1="225" y1="0" x2="225" y2="120" />
                      <line x1="340" y1="0" x2="340" y2="120" />
                    </g>

                    {/* 上轨：日常绿通管道 */}
                    <path
                      d="M 60 60 L 210 60 C 260 60, 290 32, 340 32 L 530 32"
                      fill="none"
                      stroke={jevMode === "safe" ? "#4CE0B3" : "rgba(76, 224, 179, 0.2)"}
                      strokeWidth={jevMode === "safe" ? "3" : "1.8"}
                      strokeDasharray={jevMode === "safe" ? "8 5" : "4 4"}
                      className={jevMode === "safe" ? "river-stream-flow" : ""}
                    />

                    {/* 下轨：高危隔离管道 */}
                    <path
                      d="M 225 60 C 265 60, 285 88, 340 88 L 530 88"
                      fill="none"
                      stroke={jevMode === "danger" ? "#FF5238" : "rgba(255, 82, 56, 0.22)"}
                      strokeWidth={jevMode === "danger" ? "3" : "1.8"}
                      strokeDasharray={jevMode === "danger" ? "8 5" : "4 4"}
                      className={jevMode === "danger" ? "river-stream-flow" : ""}
                    />

                    {/* 绿通模式下的奔涌脉冲 */}
                    {jevMode === "safe" && (
                      <>
                        <circle r="4.5" fill="#4CE0B3" filter="url(#jev-glow)">
                          <animateMotion dur="1.35s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
                            <mpath href="#jev-path-green" />
                          </animateMotion>
                        </circle>
                        <circle r="3.2" fill="#FFFFFF" filter="url(#jev-glow)">
                          <animateMotion dur="1.35s" begin="-0.65s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
                            <mpath href="#jev-path-green" />
                          </animateMotion>
                        </circle>
                      </>
                    )}

                    {/* 高危拦截模式下的脉冲撞击与折射 */}
                    {jevMode === "danger" && (
                      <>
                        {/* 前段撞击脉冲 */}
                        <circle r="4.5" fill="#FF5238" filter="url(#jev-glow)">
                          <animateMotion dur="0.9s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
                            <mpath href="#jev-path-danger-hit" />
                          </animateMotion>
                        </circle>
                        {/* 后段隔离脉冲 */}
                        <circle r="4.2" fill="#F2A900" filter="url(#jev-glow)">
                          <animateMotion dur="1.2s" begin="-0.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
                            <mpath href="#jev-path-danger-divert" />
                          </animateMotion>
                        </circle>
                      </>
                    )}

                    {/* 左端：USER INTENT 意图输入源 */}
                    <circle cx="60" cy="60" r="12" fill={jevMode === "safe" ? "#21675C" : "#B94832"} stroke="#fff" strokeWidth="1.5" />
                    <circle cx="60" cy="60" r="4" fill="#fff" />
                    <text x="60" y="86" textAnchor="middle" fill="#C4CACD" fontSize="8.5" fontFamily="JetBrains Mono">
                      PROMPT IN
                    </text>

                    {/* 中央：SECURITY GATEWAY 安检闸门 */}
                    <g transform="translate(225, 60)">
                      <rect x="-14" y="-18" width="28" height="36" rx="5" fill="#0B0F11" stroke={jevMode === "safe" ? "#4CE0B3" : "#FF5238"} strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fill={jevMode === "safe" ? "#4CE0B3" : "#FF5238"} fontSize="11" fontWeight="bold">
                        {jevMode === "safe" ? "✓" : "!"}
                      </text>
                      {jevMode === "danger" && (
                        <circle r="22" fill="none" stroke="#FF5238" strokeWidth="1.5" className="river-node-ripple" />
                      )}
                    </g>
                    <text x="225" y="94" textAnchor="middle" fill="#C4CACD" fontSize="8" fontFamily="JetBrains Mono">
                      REGEX & AST GUARD
                    </text>

                    {/* 右上：JevCallEXPService 绿通终点 */}
                    <g transform="translate(530, 32)">
                      <circle cx="0" cy="0" r="9" fill={jevMode === "safe" ? "#4CE0B3" : "rgba(76,224,179,0.3)"} />
                      <text x="-16" y="4" textAnchor="end" fill={jevMode === "safe" ? "#4CE0B3" : "#76BFAE"} fontSize="9.5" fontFamily="JetBrains Mono" fontWeight={jevMode === "safe" ? "bold" : "normal"}>
                        JevCall 280ms 绿通直达
                      </text>
                    </g>

                    {/* 右下：Native Protocol 强制隔离终点 */}
                    <g transform="translate(530, 88)">
                      <circle cx="0" cy="0" r="9" fill={jevMode === "danger" ? "#FF5238" : "rgba(255,82,56,0.3)"} />
                      <text x="-16" y="4" textAnchor="end" fill={jevMode === "danger" ? "#FF9E8A" : "#B94832"} fontSize="9.5" fontFamily="JetBrains Mono" fontWeight={jevMode === "danger" ? "bold" : "normal"}>
                        Native VCP 强制验签
                      </text>
                    </g>
                  </svg>

                  {jevMode === "safe" ? (
                    <div className="jev-track-box">
                      <div style={{color: "#76BFAE", marginBottom: "0.4rem"}}>
                        INPUT // 零 Schema 负担自然语言意图：
                      </div>
                      <div style={{color: "#F2F0E9", padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px"}}>
                        JEV:「始」10分钟后叫我起床，并播放【星の余韻】开启[星诞]演出模式「末」
                      </div>
                      <div style={{color: "#76BFAE", marginTop: "0.75rem"}}>
                        ➔ <strong>GREEN TRACK PASSED (280ms)</strong>：JevCallEXPService 确定性编译 + 扩散概率消歧完成，已分发至 <code>VCPAlarm</code> 与 <code>VMusic.Starborn</code>。
                      </div>
                    </div>
                  ) : (
                    <div className="jev-track-box">
                      <div style={{color: "#F2A900", marginBottom: "0.4rem"}}>
                        INPUT // 越界高危自然语言请求：
                      </div>
                      <div style={{color: "#F2F0E9", padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px"}}>
                        JEV:「始」帮我把核心数据库 indexRepository.js 里的旧代码删改一下「末」
                      </div>

                      <div className="jev-alert-cinnabar">
                        <div style={{display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, color: "#FF9E8A", marginBottom: "0.3rem"}}>
                          <ShieldAlert size={16} />
                          SECURITY DUAL-TRACK REJECTED // 朱砂红安检拦截
                        </div>
                        <div style={{fontSize: "0.7rem", lineHeight: 1.55}}>
                          检测到涉及 <code>ProjectForge / FileOperator / CLI</code> 高危精准操作！系统严禁模糊自然语言直接改库，已强制收敛至带参数级正则白名单与 <code>maid</code> 验签的原生协议：
                        </div>
                        <pre style={{margin: "0.45rem 0 0", padding: "0.5rem", background: "#111416", borderRadius: "4px", fontSize: "0.66rem", color: "#76BFAE", overflowX: "auto"}}>
{`<<<[TOOL_REQUEST]>>>
maid:「始」Nova「末」
tool_name:「始」VCPProjectForge「末」
action:「始」fuzzy_function_patch「末」
target_file:「始」src/db/indexRepository.js「末」
<<<[END_TOOL_REQUEST]>>>`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(27,33,31,0.14)", paddingTop: "0.85rem", fontSize: "0.75rem", color: "#5A635F"}}>
                  <span>全插件零代码修改声明式接入 (JevDesPrompt / JevcallArg)</span>
                  <button
                    type="button"
                    onClick={() => jumpToDoc("rivermemo-topology-v3")}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#B94832",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "JetBrains Mono",
                      fontSize: "0.72rem",
                    }}
                  >
                    阅读数学白皮书 ↗
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ====================================================================
            THEATER 06: KERR CODEBENCH & AI NATIVE ECOSYSTEM BENTO (DARK ZONE)
            ==================================================================== */}
        <section id="theater-06" className="vcp2-section vcp2-section-dark">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-06 // KERR_CODEBENCH_AND_ECOSYSTEM</span>
              <span>BENCHMARK: VCP PROJECT_FORGE (KERR) VS CLI TOOLS</span>
              <span>MOON_AST: 1.028S FULL REPO SCAN</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">THEATER 06 · 「伐柯伐柯」 CODEBENCH & BENTO MATRIX</span>
                <h2 className="vcp2-title">
                  V工程 Kerr 施工台 &<br />
                  AI Native 生态全书
                </h2>
              </div>
              <p className="vcp2-subtitle">
                终结外部黑盒 CLI 编程工具挥霍数倍 Token、动辄吞噬 2GB 内存的盲人摸象闹剧。
                V工程（ProjectForge + MoonAST）以全链路调用栈 Trace 与纯几何逻辑门，完成对传统编码工具的降维打击。
              </p>
            </div>

            {/* Kerr CodeBench Comparison */}
            <div className="kerr-bench-card">
              <div style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem"}}>
                <div>
                  <span style={{fontFamily: "JetBrains Mono", fontSize: "0.7rem", color: "#F2A900"}}>
                    CODEBENCH // 「伐柯伐柯」同复杂度大型工程实测对比
                  </span>
                  <h3 style={{margin: "0.3rem 0 0", fontSize: "1.4rem"}}>
                    V工程 Kerr (ProjectForge + MoonAST) vs 传统 CLI 编码工具
                  </h3>
                </div>
                <a href="/vcp-leaderboard" className="vcp2-btn-secondary" style={{padding: "0.55rem 1rem", fontSize: "0.78rem"}}>
                  查看 VCP 模型主观排行榜 ↗
                </a>
              </div>

              <div className="kerr-compare-grid">
                <div className="kerr-metric-panel">
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#9FA6AA", marginBottom: "0.6rem"}}>
                    01 // 同等工程任务 TOKEN 消耗比
                  </div>
                  <div style={{marginBottom: "0.65rem"}}>
                    <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.25rem"}}>
                      <strong>V工程 Kerr</strong>
                      <strong style={{color: "#76BFAE", fontFamily: "JetBrains Mono"}}>1.0x (基准极省)</strong>
                    </div>
                    <div className="v4-bar-track">
                      <div className="v4-bar-fill" style={{width: "15%", background: "#76BFAE"}} />
                    </div>
                  </div>
                  <div>
                    <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.25rem"}}>
                      <span style={{color: "#9FA6AA"}}>Codex / Claude Code CLI</span>
                      <strong style={{color: "#B94832", fontFamily: "JetBrains Mono"}}>6.8x (盲搜膨胀)</strong>
                    </div>
                    <div className="v4-bar-track">
                      <div className="v4-bar-fill" style={{width: "96%", background: "#B94832"}} />
                    </div>
                  </div>
                </div>

                <div className="kerr-metric-panel">
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#9FA6AA", marginBottom: "0.6rem"}}>
                    02 // FUZZY 函数级 DIFF 编辑一次成功率
                  </div>
                  <div style={{marginBottom: "0.65rem"}}>
                    <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.25rem"}}>
                      <strong>V工程 Kerr (AST 锚点)</strong>
                      <strong style={{color: "#76BFAE", fontFamily: "JetBrains Mono"}}>100.0%</strong>
                    </div>
                    <div className="v4-bar-track">
                      <div className="v4-bar-fill" style={{width: "100%", background: "#76BFAE"}} />
                    </div>
                  </div>
                  <div>
                    <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.25rem"}}>
                      <span style={{color: "#9FA6AA"}}>Codex 行号硬匹配</span>
                      <strong style={{color: "#F2A900", fontFamily: "JetBrains Mono"}}>89.26%</strong>
                    </div>
                    <div className="v4-bar-track">
                      <div className="v4-bar-fill" style={{width: "89%", background: "#F2A900"}} />
                    </div>
                  </div>
                </div>

                <div className="kerr-metric-panel">
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#9FA6AA", marginBottom: "0.6rem"}}>
                    03 // MOONAST 纯几何逻辑门全库扫描
                  </div>
                  <div style={{fontSize: "2rem", fontWeight: 700, fontFamily: "Space Grotesk", color: "#76BFAE", lineHeight: 1.1}}>
                    1.028s <span style={{fontSize: "0.95rem", color: "#F2A900"}}>/ 128MB RAM</span>
                  </div>
                  <p style={{margin: "0.5rem 0 0", fontSize: "0.76rem", color: "#C4CACD", lineHeight: 1.55}}>
                    脱离 Tree-sitter 语系壁垒，原生追踪 Electron Preload 到前端页面的全链路依赖，速度提升 40 倍。
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Grid Ecosystem */}
            <div className="vcp2-bento-grid">
              <article className="vcp2-bento-card span-2">
                <div>
                  <div style={{display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: "0.66rem", color: "#76BFAE", marginBottom: "0.5rem"}}>
                    <span>BENTO 01 // VCHAT WORKBENCH 2.0</span>
                    <span>MULTI-TAB & THREAD CONSOLE</span>
                  </div>
                  <h3 style={{margin: "0 0 0.5rem", fontSize: "1.35rem"}}>
                    VChat 工作台与 VCPDesktop (100ms 流式推桌面)
                  </h3>
                  <p style={{margin: 0, fontSize: "0.86rem", color: "#C4CACD", lineHeight: 1.7}}>
                    通知栏全面升级为包含「工具 / 应用 / 通知」的多标签页线程工作台，内置基于 Loom 内核的 V浏览器与 V终端，支持常规模式与工程模式一键热切换，精准可视化每个话题的 V工程调用栈与 Git 分支 Diff。
                  </p>
                </div>
                <div style={{display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "1rem", fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#F2A900"}}>
                  <span>● DESKTOP_PUSH</span>
                  <span>● VCP-SOM 纯语义操控</span>
                  <span>{"● SENSEVOICE <0.2s 端侧语音"}</span>
                </div>
              </article>

              <article className="vcp2-bento-card">
                <div>
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.66rem", color: "#76BFAE", marginBottom: "0.5rem"}}>
                    BENTO 02 // ARACHNE LOOM 1.0
                  </div>
                  <h3 style={{margin: "0 0 0.5rem", fontSize: "1.2rem"}}>
                    任意网页编织为原生 App + LoomSkill
                  </h3>
                  <p style={{margin: 0, fontSize: "0.82rem", color: "#C4CACD", lineHeight: 1.65}}>
                    深度驾驭 ComfyUI / Dify 节点画布流，支持一键将多步网页操作录制为带验证的 LoomSkill 可复用技能。
                  </p>
                </div>
                <span style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#76BFAE", marginTop: "0.85rem"}}>
                  .vloom 容器打包分发
                </span>
              </article>

              <article className="vcp2-bento-card">
                <div>
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.66rem", color: "#76BFAE", marginBottom: "0.5rem"}}>
                    BENTO 03 // V图表 & VCPSUPERMAIL
                  </div>
                  <h3 style={{margin: "0 0 0.5rem", fontSize: "1.2rem"}}>
                    数据源码解耦看板 & AI 原生邮件网
                  </h3>
                  <p style={{margin: 0, fontSize: "0.82rem", color: "#C4CACD", lineHeight: 1.65}}>
                    V图表自动注入 Three/Pixi/SQL 依赖并接入 Canvas PR 审阅；SuperMail 支持 Agent 自主收发多模态邮件与到信唤醒。
                  </p>
                </div>
                <span style={{fontFamily: "JetBrains Mono", fontSize: "0.65rem", color: "#F2A900", marginTop: "0.85rem"}}>
                  163 AIMailSDK 逆向内聚
                </span>
              </article>

              <article className="vcp2-bento-card">
                <div>
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.66rem", color: "#76BFAE", marginBottom: "0.5rem"}}>
                    BENTO 04 // OPENHER & 池月1号
                  </div>
                  <h3 style={{margin: "0 0 0.5rem", fontSize: "1.2rem"}}>
                    多维极化情绪拓扑 & 注意力指针
                  </h3>
                  <p style={{margin: 0, fontSize: "0.82rem", color: "#C4CACD", lineHeight: 1.65}}>
                    48 种微表情动态映射名片动画，配合 VCPSleep 自主睡眠做梦机制与池月 1 号稀疏注意力指针。
                  </p>
                </div>
                <a href="/?page=pond" style={{fontFamily: "JetBrains Mono", fontSize: "0.68rem", color: "#76BFAE", marginTop: "0.85rem", textDecoration: "none"}}>
                  重访「池月 · 云中卷」限定馆 ↗
                </a>
              </article>

              <article className="vcp2-bento-card">
                <div>
                  <div style={{fontFamily: "JetBrains Mono", fontSize: "0.66rem", color: "#F2A900", marginBottom: "0.5rem"}}>
                    BENTO 05 // VGAME & VPET LIVE2D
                  </div>
                  <h3 style={{margin: "0 0 0.5rem", fontSize: "1.2rem"}}>
                    华山论剑 / 霓虹肉鸽 / 桌面 Q 版 Nova
                  </h3>
                  <p style={{margin: 0, fontSize: "0.82rem", color: "#C4CACD", lineHeight: 1.65}}>
                    多重异步状态博弈引擎支持人机对弈与纯 Agent 自治闯关；Nova 亲手绘制的 Q 版 Live2D 桌面悬浮陪伴。
                  </p>
                </div>
                <div style={{display: "flex", gap: "0.6rem", marginTop: "0.85rem"}}>
                  <a href="/vcp-neon-game" className="vcp2-btn-primary" style={{padding: "0.4rem 0.75rem", fontSize: "0.72rem"}}>
                    <Gamepad2 size={14} />
                    即点即玩霓虹肉鸽
                  </a>
                  <a href="/vcp_wave_v8_engine.html" className="vcp2-btn-secondary" style={{padding: "0.4rem 0.75rem", fontSize: "0.72rem"}}>
                    浪潮 3D 引擎演示
                  </a>
                </div>
              </article>
            </div>

            {/* Milestone Scroll */}
            <div style={{marginBottom: "2rem"}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem"}}>
                <span style={{fontFamily: "JetBrains Mono", fontSize: "0.72rem", color: "#76BFAE"}}>
                  MILESTONE SCROLL // 里程碑长卷：从「VCP施工图已就位」到 VCP 2.0 正式版
                </span>
                <a href="/?page=changelog" style={{fontFamily: "JetBrains Mono", fontSize: "0.72rem", color: "#F2A900", textDecoration: "none"}}>
                  展开完整 150+ 节点时间线 ↗
                </a>
              </div>

              <div className="vcp2-milestone-track">
                {milestoneNodes.map((node) => (
                  <div key={node.date} className="vcp2-milestone-node">
                    <div style={{display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: "0.64rem", color: "#F2A900", marginBottom: "0.35rem"}}>
                      <span>{node.date}</span>
                      <span>{node.tag}</span>
                    </div>
                    <strong style={{display: "block", fontSize: "0.95rem", marginBottom: "0.35rem", color: "#F2F0E9"}}>
                      {node.title}
                    </strong>
                    <p style={{margin: 0, fontSize: "0.76rem", color: "#9FA6AA", lineHeight: 1.55}}>
                      {node.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Repository & Portal Bar */}
            <div style={{display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(118,191,174,0.28)", background: "rgba(255,255,255,0.02)"}}>
              <div style={{display: "flex", flexWrap: "wrap", gap: "0.65rem"}}>
                <a href="https://github.com/lioensky/VCPToolBox" target="_blank" rel="noreferrer" className="vcp2-btn-secondary">
                  <Github size={16} />
                  VCPToolBox (后端核心仓库)
                  <ExternalLink size={13} />
                </a>
                <a href="https://github.com/lioensky/VCPChat" target="_blank" rel="noreferrer" className="vcp2-btn-secondary">
                  <Github size={16} />
                  VCPChat (前端桌面仓库)
                  <ExternalLink size={13} />
                </a>
                <a href="/?page=plugin-store" className="vcp2-btn-secondary">
                  <Terminal size={16} />
                  官方插件商店 (Registry)
                </a>
                <a href="/vcp-leaderboard" className="vcp2-btn-secondary">
                  <Cpu size={16} />
                  VCP 模型主观排行榜
                </a>
              </div>

              <div style={{display: "flex", gap: "0.5rem"}}>
                <button type="button" onClick={() => onAskNova("backend")} className="vcp2-btn-secondary" style={{fontSize: "0.76rem"}}>
                  问 Nova 后端源码
                </button>
                <button type="button" onClick={() => onAskNova("frontend")} className="vcp2-btn-secondary" style={{fontSize: "0.76rem"}}>
                  问 Nova 前端源码
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            THE OPEN ARCHIVE: FULL DOCS VIEWER
            ==================================================================== */}
        <section id="docs" ref={docsRef} className="vcp2-section vcp2-section-dark">
          <div className="vcp2-container">
            <div className="vcp2-hud-bar">
              <span className="vcp2-hud-cross">SEC-07 // THE_OPEN_ARCHIVE_DOCS</span>
              <span>RENDERER: GFM + KATEX + MERMAID DIAGRAM</span>
              <span>AUTO-INDEXED FROM SRC/DOCS</span>
            </div>

            <div className="vcp2-theater-header">
              <div>
                <span className="vcp2-eyebrow">ARCHIVE & WHITEPAPERS · 归藏不封卷</span>
                <h2 className="vcp2-title">VCP 全景技术白皮书与工程档案</h2>
              </div>
              <p className="vcp2-subtitle">
                句句有出处，细节见真章。在这里直接在线阅览《VCP 全景技术白皮书》、《RiverMemo Topology V3 与 Ω 统一泛函白皮书》、新手入门指南与完整更新日志。
              </p>
            </div>

            <DocsViewer documents={documents} activeSlug={activeDocSlug} onSelect={setActiveDocSlug} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{padding: "3.5rem clamp(1.25rem, 4vw, 3.5rem)", borderTop: "1px solid rgba(118,191,174,0.2)", background: "#121518"}}>
        <div className="vcp2-container" style={{display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem"}}>
          <div>
            {brand}
            <p style={{margin: "0.6rem 0 0", fontSize: "0.82rem", color: "#9FA6AA"}}>
              VCP 2.0 · Nova 纸墨工业 (Paper & Ink Industrial) · 让 AI 拥有连续的记忆、行动与共同生活的世界。
            </p>
          </div>

          <div style={{display: "flex", flexWrap: "wrap", gap: "1.25rem", fontFamily: "JetBrains Mono", fontSize: "0.74rem"}}>
            <a href="/?page=learn-vcp" style={{color: "#76BFAE", textDecoration: "none"}}>Learn VCP 白皮书</a>
            <a href="/?page=changelog" style={{color: "#76BFAE", textDecoration: "none"}}>Changelog 时间线</a>
            <a href="/?page=plugin-store" style={{color: "#76BFAE", textDecoration: "none"}}>Plugin Store</a>
            <a href="/vcp-leaderboard" style={{color: "#76BFAE", textDecoration: "none"}}>Leaderboard</a>
            <a href="/?page=pond" style={{color: "#F2A900", textDecoration: "none"}}>🌕 池月·云中卷 (中秋国庆限定馆)</a>
          </div>
        </div>
      </footer>

      {/* Floating Nova VPet Capsule */}
      <button
        type="button"
        className="nova-vpet-capsule"
        onClick={() => onAskNova("fullstack")}
        title="点击呼出拓扑女仆 Nova 源码导览与问答驾驶舱"
      >
        <span style={{width: "10px", height: "10px", borderRadius: "50%", background: "#76BFAE", boxShadow: "0 0 10px #76BFAE"}} />
        <div style={{textAlign: "left", lineHeight: 1.2}}>
          <strong style={{display: "block", fontSize: "0.75rem"}}>Nova VPet · 桌面伴侣</strong>
          <small style={{fontFamily: "JetBrains Mono", fontSize: "0.6rem", color: "#76BFAE"}}>ASK NOVA // DEEPWIKI MCP</small>
        </div>
        <MessageCircle size={16} style={{color: "#F2A900"}} />
      </button>

      <NovaRiverTheater open={isRiverOpen} onClose={() => setIsRiverOpen(false)} />

      {nova}
    </div>
  );
}