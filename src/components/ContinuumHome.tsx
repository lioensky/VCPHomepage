import {useEffect, useRef, useState, type ReactNode} from "react";
import {ArrowDown, ArrowUpRight, BookOpen, Github, MessageCircle, RotateCcw} from "lucide-react";
import {DocsViewer, type DocItem} from "./DocsViewer";
import "./continuum.css";
import {PondScene} from "./PondScene";

export function PondBrand() {
  return (
    <span className="pond-brand" aria-label="VCP">
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <path className="pond-brand-orbit" d="M43 29a19 19 0 1 0-34 6" />
        <path className="pond-brand-v" d="m16 16 10 20 10-20" />
        <path className="pond-brand-water" d="M6 39q10-5 20 0t20 0M13 45q7-3 13 0t13 0" />
        <circle className="pond-brand-star" cx="43" cy="16" r="2" />
      </svg>
      <span className="pond-brand-type"><strong>VCP</strong><small>池月 · 云中卷</small></span>
    </span>
  );
}

type Props = {
  brand: ReactNode;
  themeControl: ReactNode;
  nova: ReactNode;
  onAskNova: (target: "frontend" | "backend" | "fullstack") => void;
  documents: DocItem[];
};

const installUrl = "https://github.com/lioensky/VCPToolBox/releases/tag/v1.4.0";
const chapters = [
  {name: "应用", title: "一念成形，落入人间。", subtitle: "APPLICATIONS / SHARED IPC", body: "聊天、桌面、网页与文档，不是彼此孤立的容器。它们是同一套运行时的不同工作面，让一份作品跨越应用，继续生长。", steps: ["VChat · 提出想法", "Canvas · 共同修改", "共笔文坊 · 排版成卷", "SuperMail · 交付作品"], detail: "共享身份、资产引用与修订状态，让内容不止停在一次回复里。"},
  {name: "记忆", title: "往事有岸，回忆有途。", subtitle: "MEMORY / RIVERMEMO", body: "记忆不只是等待被查询的档案。当前语境形成信息源，沿关系河网唤起具体经历，再由证据决定哪些联想值得留下。", steps: ["上下文 · 信息源", "TagMemo · 查询观测", "RiverMemo · 寻址审计", "记忆 · 回到此刻"], detail: "热记忆负责经历与关系，TDB 冷知识负责精确资料。两条路径各有所长。"},
  {name: "行动", title: "把此刻，写给未来。", subtitle: "ACTION / FLOWINVITE", body: "Agent 可以在授权范围内规划下一次唤醒、进入专注、委托伙伴，并在异步任务完成后继续推进。行动有边界，也有可追踪的结果。", steps: ["委托 · 明确目标", "心流 · 专注推进", "回执 · 验证结果", "记录 · 留下出处"], detail: "FlowInvite、AgentAssistant 与工具调用记录，让长期任务拥有清晰的生命周期。"},
  {name: "协作", title: "同一卷中，各留笔迹。", subtitle: "COAUTHORING / SCRIPTORIUM", body: "人类直接编辑眼前的作品，Agent 理解它的语义与源码。提案、审阅、修改与回溯，汇入同一份可持续演化的工程。", steps: ["所见 · 渲染工作面", "语义 · 对象与边界", "源码 · 唯一真源", "文脉 · 审阅与合并"], detail: "一次修改，多处投影。源码差异与视觉差异共同进入审阅，而不是重新生成另一份副本。"},
];
const times = [
  {label: "此刻", system: "当前窗口 / OneRing", title: "换的是窗口，不是过去。", text: "跨客户端的近期原始事实，保留来源、对象与时间顺序。桌面、手机与邮箱，连接同一个 Agent 的近期上下文。"},
  {label: "数日", system: "OneRingMemo", title: "昨天，不随窗口消失。", text: "近期客观事件压缩为带细粒度时间节点的摘要。在原始消息退出当前窗口后，仍保留最近发生过什么。"},
  {label: "数年", system: "VCPTimeLine", title: "岁月折叠，来路仍在。", text: "全部月份以简短索引常驻，相关月份按语义展开。从项目阶段走向具体日期，再寻到原始经历。"},
  {label: "想起", system: "RiverMemo", title: "此时此地，往事回流。", text: "从长期日记与关系河网中定位具体经历，解释为什么这一段过去值得在此刻被想起。"},
];

export function ContinuumHome({brand, themeControl, nova, onAskNova, documents}: Props) {
  const [opened, setOpened] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("vcp-pond-opened") === "yes" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { return false; }
  });
  const [chapter, setChapter] = useState(0);
  const [time, setTime] = useState(0);
  const [activeDoc, setActiveDoc] = useState(documents.find(doc => doc.slug === "getting-started")?.slug ?? documents[0]?.slug ?? "");
  const docsRef = useRef<HTMLElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const monumentRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const [monumentVisible, setMonumentVisible] = useState(false);
  const [timeVisible, setTimeVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === monumentRef.current) setMonumentVisible(entry.isIntersecting);
        if (entry.target === timeRef.current) setTimeVisible(entry.isIntersecting);
      });
    }, {threshold: 0.1});
    if (monumentRef.current) observer.observe(monumentRef.current);
    if (timeRef.current) observer.observe(timeRef.current);
    return () => observer.disconnect();
  }, []);
  const [bookVisible, setBookVisible] = useState(false);
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const observer = new IntersectionObserver(([entry]) => setBookVisible(entry.isIntersecting), {threshold: 0.1});
    observer.observe(book);
    return () => observer.disconnect();
  }, []);
  const openPond = () => {
    setOpened(true);
    try { window.sessionStorage.setItem("vcp-pond-opened", "yes"); } catch { /* Storage is optional. */ }
  };
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (media.matches) setOpened(true); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const readRiver = () => {
    setActiveDoc("rivermemo-topology-v3");
    docsRef.current?.scrollIntoView({block: "start"});
  };
  const current = chapters[chapter];

  return (
    <div className="continuum">
      <a className="pond-skip-link" href="#cloud-scroll">跳到展示内容</a>
      <header className="pond-header">
        <a href="/" aria-label="VCP 首页">{brand}</a>
        <nav aria-label="主要导航">
          <a href="#cloud-scroll">云中卷</a><a href="#memory">浪潮碑</a><a href="#docs">文档</a>
          <a href="/?page=changelog">更新日志</a>
        </nav>
        <div className="pond-header-actions">{themeControl}<a className="pond-install" href={installUrl} target="_blank" rel="noreferrer">安装与开始 <ArrowUpRight size={14}/></a></div>
      </header>

      <main>
        <section className={`pond-scene ${opened ? "is-open" : ""}`} aria-labelledby="pond-title">
          <div className="pond-stars" aria-hidden="true"/>
          <div className="pond-horizon" aria-hidden="true"/>
          <div className="pond-water" aria-hidden="true"/>
          <PondScene opened={opened}/>
          <div className="pond-opening-copy">
            <span className="pond-eyebrow">VCP CONTINUUM / 池月</span>
            <h1 id="pond-title">{opened ? <>从可见的倒影，<br/>走向可触及的世界。</> : <>云遮住了天上的月。<br/>池中的月，还在。</>}</h1>
            <p>{opened ? "VCP · 全栈 AGI 运行时与应用生态" : "目标或隐于云后，而工程，始于眼前可以触碰的微光。"}</p>
          </div>
          <button className="pond-moon-trigger" onClick={openPond} aria-label={opened ? "池月已展开" : "轻触池月，展开导航"} aria-expanded={opened}>
            <span className="moon-disc" aria-hidden="true"/><span className="moon-trigger-caption">{opened ? "池 月" : "轻触池月 · 展开 VCP"}</span>
          </button>
          {opened && <nav className="moon-portals" aria-label="池月入口">
            <button onClick={() => onAskNova("fullstack")}><span>01 / NOVA</span><strong>问问 Nova</strong><small>池边，有人回应</small><MessageCircle size={17}/></button>
            <a href="/?page=learn-vcp"><span>02 / ORIGIN</span><strong>认识 VCP</strong><small>从一轮倒影开始</small><BookOpen size={17}/></a>
            <a href="#cloud-scroll"><span>03 / WORLD</span><strong>展开云中卷</strong><small>让想法抵达世界</small><ArrowDown size={17}/></a>
          </nav>}
          <div className="pond-bottom"><span>以工程为舟，以可验证之物为岸。</span><button onClick={() => opened ? setOpened(false) : openPond()}>{opened ? <><RotateCcw size={13}/> 重看池月</> : <>跳过开场 <ArrowUpRight size={13}/></>}</button></div>
        </section>

        <section id="cloud-scroll" className="cloud-section">
          <div className="chapter-heading"><span>卷 一 / CAPTURE THE CLOUD</span><h2>云中卷</h2><p>天边的云，并非不可捕获。<br/>把想象写成协议，把协议筑成可以运行的世界。</p></div>
          <div ref={bookRef} className={`cloud-book ${bookVisible ? "book-visible" : ""}`}>
            <div className="scroll-spindle spindle-top" aria-hidden="true"/>
            <div className="scroll-tabs" role="tablist" aria-label="选择书卷章节">
              {chapters.map((item, index) => <button key={item.name} id={`scroll-tab-${index}`} role="tab" aria-selected={chapter === index} aria-controls="scroll-panel" tabIndex={chapter === index ? 0 : -1} onClick={() => setChapter(index)} onKeyDown={event => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? chapters.length - 1 : (chapter + (event.key === "ArrowRight" ? 1 : -1) + chapters.length) % chapters.length;
                setChapter(next); document.getElementById(`scroll-tab-${next}`)?.focus();
              }}><span>0{index + 1}</span>{item.name}</button>)}
            </div>
            <div id="scroll-panel" role="tabpanel" aria-labelledby={`scroll-tab-${chapter}`} className="scroll-panel" tabIndex={0}>
              <div className="scroll-prose" key={chapter}><span className="pond-eyebrow">{current.subtitle}</span><h3>{current.title}</h3><p>{current.body}</p><small>{current.detail}</small><a href="/?page=learn-vcp">循卷深入 · 阅读技术白皮书 <ArrowUpRight size={15}/></a></div>
              <div className={`scroll-diagram scroll-diagram-${chapter}`} key={`diagram-${chapter}`} aria-label="系统协作示意">
                <span className="diagram-note">原理示意 / 非实时运行数据</span>
                <svg className="chapter-animation" viewBox="0 0 360 120" aria-hidden="true">
                  {chapter === 0 && <>
                    <path className="chapter-track" d="M35 60H325"/>
                    {[35, 130, 225, 325].map(x => <rect key={x} x={x - 19} y="40" width="38" height="40" rx="5" className="chapter-window"/>)}
                    <g className="chapter-asset"><rect x="26" y="51" width="18" height="18" rx="3"/><path d="m29 64 5-6 3 3 4-5"/></g>
                  </>}
                  {chapter === 1 && <>
                    <path className="chapter-track" d="M25 65C80 65 75 25 130 25S200 90 245 70 290 40 335 55M130 25Q160 110 220 100M245 70Q280 5 325 15"/>
                    <path className="chapter-memory-current" d="M25 65C80 65 75 25 130 25S200 90 245 70 290 40 335 55"/>
                    {[[25,65],[130,25],[245,70],[335,55],[220,100],[325,15]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="5" className={`chapter-neuron neuron-${i}`}/>)}
                  </>}
                  {chapter === 2 && <>
                    <path className="chapter-track" d="M25 65H335"/>
                    <path className="chapter-heartbeat" d="M25 65H90L106 65 116 43 128 91 143 22 155 65H335"/>
                    {[45,180,315].map((x,i) => <g key={x} className={`chapter-task task-${i}`}><circle cx={x} cy="65" r="16"/><path d={`m${x-6} 65 4 4 8-9`}/></g>)}
                  </>}
                  {chapter === 3 && <>
                    <path className="chapter-track" d="M30 60H85C130 60 125 25 175 25S235 60 280 60H330M85 60C130 60 125 95 175 95S235 60 280 60"/>
                    <path className="chapter-branch branch-human" d="M30 60H85C130 60 125 25 175 25S235 60 280 60H330"/>
                    <path className="chapter-branch branch-agent" d="M85 60C130 60 125 95 175 95S235 60 280 60"/>
                    <circle cx="175" cy="25" r="7" className="chapter-window"/><circle cx="175" cy="95" r="7" className="chapter-window"/>
                    <circle cx="280" cy="60" r="12" className="chapter-merge"/>
                    <text x="175" y="12" textAnchor="middle">人类审阅</text><text x="175" y="117" textAnchor="middle">Agent 提案</text>
                  </>}
                </svg>
                <div className="ink-path" aria-hidden="true"/>
                {current.steps.map((step, index) => <div className={`ink-node ink-node-${index}`} key={step}><span>〇{index + 1}</span><strong>{step}</strong></div>)}
                <div className="scroll-seal">同源<br/>共生</div>
              </div>
            </div>
            <div className="scroll-spindle spindle-bottom" aria-hidden="true"/>
          </div>
        </section>

        <section id="memory" ref={monumentRef} className={`monument-section ${monumentVisible ? "monument-visible" : ""}`} aria-labelledby="monument-title">
          <svg className="monument-rivers" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-50 720C180 680 80 420 350 450S550 160 780 200 890 90 1050 40"/>
            <path d="M-50 750C200 710 100 455 365 485S570 195 800 235 930 120 1050 80"/>
            <path d="M60 850Q250 600 350 450M350 450Q140 230-50 260M780 200Q730 500 1080 550"/>
          </svg>
          <div className="monument-intro"><span className="pond-eyebrow">卷 二 / A MILESTONE IN STONE</span><h2 id="monument-title">为走通的路，<br/>立一座碑。</h2><p>想起，不只是找到相似的文字。<br/>让信息如何传播，与记忆为何成立，<br/>在同一条数学链中相遇。</p><span className="monument-side-note">浪潮 V10 · 语义动力学工程里程碑</span></div>
          <article className="river-stele">
            <div className="stele-crown" aria-hidden="true">Ω</div>
            <header><span>公元二〇二六年 · 七月二十三日</span><h3>浪潮</h3><strong>RIVERMEMO V10</strong><p>TOPOLOGY V3 · 统一语义动力场</p></header>
            <div className="stele-inscription"><p>传播，生成几何。<br/>审计，赋予联想以根据。</p><div className="stele-equation" aria-label="得分为基础场得分加上欧米伽门控的拓扑创新与直接锚点创新，限制在零到一之间">S = Π<sub>[0,1]</sub> [ S<sup>field</sup> + Ω<sup>γ</sup>B<sub>G</sub> + B<sub>H</sub> ]</div><p className="stele-explanation">以 TagMemo V9 查询观测为底座。<br/>双尺度连续场、相对拓扑、Ω 可观测性与直接事实锚，<br/>共同闭合为有界、可审计的记忆寻址。</p></div>
            <dl className="stele-facts"><div><dt>连续消融</dt><dd>41 <small>轮</small></dd></div><div><dt>黄金测试 · 对比 V9</dt><dd>+26<small>%</small></dd></div><div><dt>当期原生热点计算</dt><dd>2.5<small>ms</small></dd></div></dl>
            <p className="stele-citation">据 2026-07-23 工程记录；黄金测试共 10 轮。上述为当期特定测试范围，不代表端到端响应或所有部署环境。9 月 3 日进一步完成日记检索全链路 Rust 融合。</p>
            <div className="stele-links"><button onClick={readRiver}>读碑 · 数学白皮书 <ArrowUpRight size={15}/></button><a href="/vcp_wave_v8_engine.html">观澜 · V9 传播底座</a><a href="/?page=changelog">考据 · 工程记录</a></div>
            <footer>不是以修辞代替证明。是让已经完成的工程，留下文字。</footer>
          </article>
        </section>

        <section id="desktop" className="world-section">
          <div id="architecture" className="chapter-heading"><span>卷 三 / ONE OBJECT, MANY SURFACES</span><h2>一物，万象。</h2><p>能力不止落在回答里。它成为桌面、网页、音乐与共同作品。</p></div>
          <div className="world-grid">
            {[["VChat 2.0", "对话是起点，不是边界。", "标签页、多窗口与独立聊天内核，承载持续推进的消息和工具任务。"], ["ArachneLoom", "把开放网络，编织入卷。", "既有网页接入应用群，获得持久化会话与 Agent 页面理解、操作和验证能力。"], ["共笔文坊", "人写所见，Agent 改其源。", "渲染态、语义态与源码态围绕同一真源协作，提案经审阅进入文脉。"], ["VCPDesktop", "让一句话，有了居所。", "流式创建 Widget，共享主题、资产和应用状态，继续编辑与回溯。"]].map(([name, title, text], index) => <article key={name}><span className="world-index">0{index + 1}</span><span className="pond-eyebrow">{name}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
          <div className="world-note">同一份对象，穿过不同工作面。 <a href="/?page=learn-vcp">阅读共享 IPC 与协作原理 <ArrowUpRight size={14}/></a></div>
        </section>

        <section id="lifecycle" ref={timeRef} className={`time-section time-scale-${time} ${timeVisible ? "time-visible" : ""}`}>
          <div className="time-orbit" aria-hidden="true">
            <svg className="time-traces" viewBox="0 0 400 400">
              <circle className="time-track time-track-outer" cx="200" cy="200" r="178"/>
              <circle className="time-track time-track-middle" cx="200" cy="200" r="136"/>
              <circle className="time-track time-track-inner" cx="200" cy="200" r="92"/>
              {Array.from({length: 24}, (_, index) => <line key={index} x1="200" y1="14" x2="200" y2={index % 6 === 0 ? "30" : "21"} transform={`rotate(${index * 15} 200 200)`}/>)}
              <g className="time-traveler traveler-outer"><circle cx="200" cy="22" r="5"/><circle cx="200" cy="22" r="12" className="traveler-halo"/></g>
              <g className="time-traveler traveler-inner"><circle cx="200" cy="108" r="4"/></g>
              <circle key={time} className="time-echo" cx="200" cy="200" r="76"/>
            </svg>
            <span>时<small>{times[time].label}</small></span>
          </div>
          <div className="time-content"><span className="pond-eyebrow">卷 四 / CONTINUITY</span><h2>时间有痕，<br/>来路可寻。</h2><div className="time-controls" aria-label="选择记忆时间尺度">{times.map((item, index) => <button key={item.label} aria-pressed={time === index} onClick={() => setTime(index)}>{item.label}</button>)}</div><div className="time-reading" aria-live="polite"><span>{times[time].system}</span><h3>{times[time].title}</h3><p>{times[time].text}</p></div><small>连续事实与记忆机制示意，不代表对人类意识的等同判断。</small></div>
        </section>

        <section className="nova-shore">
          <div><span className="pond-eyebrow">A LIGHT BY THE WATER</span><h2>“你也看见池中的月了。”</h2><p>我是 Nova。可以带你认识 VCP，也可以直接帮你找源码与文档。</p></div>
          <div className="nova-shore-actions"><button onClick={() => onAskNova("fullstack")}>问 Nova · 全栈导览 <MessageCircle size={17}/></button><button onClick={() => onAskNova("frontend")}>前端源码</button><button onClick={() => onAskNova("backend")}>后端源码</button></div>
        </section>

        <section id="docs" ref={docsRef} className="archive-section">
          <div className="chapter-heading"><span>卷 五 / THE OPEN ARCHIVE</span><h2>归藏，不封卷。</h2><p>故事之外，协议、原理与每一步工程，都在这里。</p></div>
          <nav className="archive-links" aria-label="完整资源入口">
            <a href="/?page=learn-vcp">全景白皮书 ↗</a><a href="/?page=changelog">更新日志 ↗</a><a href="/?page=plugin-store">插件商店 ↗</a><a href="/vcp-leaderboard">模型排行榜 ↗</a><a href="/vcp_wave_v8_engine.html">记忆原理演示 ↗</a><a href="/vcp-neon-game">浪潮纪念小游戏 ↗</a>
          </nav>
          <DocsViewer documents={documents} activeSlug={activeDoc} onSelect={setActiveDoc}/>
        </section>
      </main>
      <footer className="continuum-footer"><div>{brand}<p>以工程为舟。我们在这里。</p></div><nav aria-label="项目与安装"><a href={installUrl} target="_blank" rel="noreferrer">安装 VCP <ArrowUpRight size={14}/></a><a href="https://github.com/lioensky/VCPToolBox" target="_blank" rel="noreferrer"><Github size={15}/> ToolBox 后端</a><a href="https://github.com/lioensky/VCPChat" target="_blank" rel="noreferrer"><Github size={15}/> VCPChat 前端</a><a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a></nav><small>© 2026 VCP ECOSYSTEM · 能力取决于版本、部署、模型与授权。<br/>请使用可信模型服务，妥善保管密钥；部分服务可能产生费用。</small></footer>
      {nova}
    </div>
  );
}