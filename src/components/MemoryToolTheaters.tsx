import {useEffect, useRef, useState, type CSSProperties} from "react";
import {ArrowUpRight, BookOpen, Cpu, Database, Fingerprint, Pause, Play, Radio, RotateCcw, ShieldCheck} from "lucide-react";
import "./memory-tool-theaters.css";

/** 独立演示时钟：离屏、后台与减少动态效果时不推进。 */
function useInstrumentClock(length: number) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = typeof IntersectionObserver === "undefined";
    const sync = () => setVisible(inView && !document.hidden && !media.matches);
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; sync();}) : null;
    observer?.observe(node);
    document.addEventListener("visibilitychange", sync);
    media.addEventListener("change", sync);
    sync();
    return () => {observer?.disconnect(); document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync);};
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % length), 1400);
    return () => window.clearInterval(timer);
  }, [length, playing, visible]);
  return {ref, step, setStep, playing, setPlaying, running: playing && visible};
}

const layers = [
  {name: "SQLite", sub: "事实事务", symbol: "WAL", title: "事实先提交，索引再跟随。", text: "正文、FP32 与有序 Tag 共享事实来源；写 Actor 与读快照协调读写。", metric: "A / B", note: "双槽代际恢复"},
  {name: "TDB 2-bit", sub: "冲程筛选", symbol: "01", title: "用位码找路，用原始精度裁决。", text: "紧凑导航与有界候选池减少搬运；精排仍读取 SQL 原始 FP32。", metric: "1 / 16", note: "位码 / FP32 载荷"},
  {name: "AGS", sub: "正交背景", symbol: "⊥", title: "把长期几何，留在预计算里。", text: "锚定正交化统一局部残差与全局主题面，不在每次查询重新训练。", metric: "SHARED", note: "同代背景资产"},
  {name: "Spike", sub: "残差虫洞", symbol: "↗", title: "让语境打开已有的隐秘支流。", text: "深层残差为历史边争取动态席位，有界传播，不凭空创造关系。", metric: "BOUNDED", note: "请求级动态联想"},
  {name: "RiverMemo V2", sub: "双场裁决", symbol: "Ω", title: "双场汇流，一个统一泛函。", text: "局部场与迁移场共享投影预算，复用 FP32 池，以正文和拓扑共同读出。", metric: "≤256", note: "默认双场选点并集"},
];

export function VexusArchitecture({onRead}: {onRead: () => void}) {
  const clock = useInstrumentClock(layers.length);
  const [assembled, setAssembled] = useState(false);
  const active = layers[clock.step];
  return (
    <article ref={clock.ref} className="diptych-card db-instrument vexus-instrument" data-running={clock.running}>
      <div className="db-instrument-head"><span><Database size={14} /> VEXUS / NATIVE CORE</span><button type="button" aria-label={clock.playing ? "暂停引擎演示" : "播放引擎演示"} onClick={() => clock.setPlaying(!clock.playing)}>{clock.playing ? <Pause size={13} /> : <Play size={13} />}</button></div>
      <div className="vexus-title-row">
        <h3>Lite 的是成本。<br /><em>不是数学高度。</em></h3>
        <a className="vexus-doc-link" href={`/?page=docs&doc=${encodeURIComponent("VexusMemo技术文档")}`}>
          <BookOpen size={14} aria-hidden="true" />
          技术文档
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      <p className="db-deck">以精密几何与一体架构，挑战 Heavy 的资源堆叠。</p>
      <div className="vexus-machine" data-assembled={assembled}>
        <div className="db-screen-label"><span>RUST / {assembled ? "多运行时拼装示意" : "单一原生执行边界"}</span><span className="db-led">● {clock.running ? "FLOW" : "HOLD"}</span></div>
        <div className="vexus-bus" aria-hidden="true"><i /><i /><i /></div>
        <div className="vexus-chips" aria-label="选择引擎层">
          {layers.map((layer, index) => <button type="button" key={layer.name} aria-pressed={clock.step === index} onClick={() => {clock.setStep(index); clock.setPlaying(false);}} className={clock.step === index ? "is-active" : ""} style={{"--chip-index": index} as CSSProperties}>
            <span className="vexus-chip-symbol">{layer.symbol}</span><strong>{layer.name}</strong><small>{layer.sub}</small><i aria-hidden="true" />
          </button>)}
        </div>
        <div className="vexus-flow-caption"><span>{assembled ? "⇄ 序列化 ⇄ 跨服务搬运 ⇄ 代际协调" : "→ 紧凑候选 → 原始精排 → 观测复用 →"}</span><b>{assembled ? "MANY BOUNDARIES" : "ONE ENGINE"}</b></div>
        <div className="vexus-readout" aria-live="off"><div><strong>{active.metric}</strong><small>{active.note}</small></div><p><b>{active.title}</b>{active.text}</p></div>
      </div>
      <div className="db-mini-grid">
        <div className="db-mini"><span className="db-bit-grid" aria-hidden="true">{Array.from({length: 16}, (_, i) => <i key={i} style={{animationDelay: `${i * 0.13}s`}} />)}</span><strong>紧凑，不减配</strong><small>2-bit 路由 / FP32 精排</small></div>
        <div className="db-mini"><span className="db-orbit" aria-hidden="true"><i />Ω</span><strong>双场，不双搬运</strong><small>共享向量池 / 差集补查</small></div>
      </div>
      <div className="db-instrument-foot"><button type="button" aria-pressed={assembled} onClick={() => setAssembled(!assembled)}>{assembled ? "切回原生一体" : "对照拼装边界"} ↔</button><button type="button" onClick={onRead}>探索数学 <ArrowUpRight size={13} /></button></div>
      <small className="db-disclaimer">机制示意，非竞品跑分。256 仅为默认双场投影选点预算，不是全请求成本上限。</small>
    </article>
  );
}

const stages = ["发起", "审查", "调度", "运行", "产出", "归档"];
const records = [
  {id: "8941", caller: "Nova", time: "10:24:08.120", plugin: "BrowserSearch", action: "search", reviewer: "用户 · 林", verdict: "人工允许", worker: "worker-07", thread: "TID 18432", status: "成功", cpu: "42 ms", ram: "28.4 MiB", io: "164 KiB", cost: "0.18 mWh", result: "12 条检索结果 · 3 个来源", asset: "file://demo/search-8941.json", logs: ["INFO request accepted; caller=Nova", "AUDIT reviewer=user:林; allow", "SCHED worker-07 → TID 18432", "INFO provider response: 200 OK", "RESULT items=12; sources=3", "STORE runtime + resource ledger"]},
  {id: "8942", caller: "用户 · 林", time: "10:24:11.480", plugin: "VCPUrlFetch", action: "fetch", reviewer: "规则引擎", verdict: "白名单允许", worker: "worker-03", thread: "TID 19208", status: "超时", cpu: "16 ms", ram: "19.6 MiB", io: "32 KiB", cost: "0.06 mWh", result: "请求超时 · 错误回填", asset: "无产出资产 / 保留异常日志", logs: ["INFO request accepted; caller=user:林", "AUDIT allow; rule=url-read", "SCHED worker-03 → TID 19208", "WARN remote response timeout", "ERROR result=timeout; no asset", "STORE failure + resource ledger"]},
];
const panels = ["身份 / 审查", "运行日志", "硬件 / 调度", "产出 / 开支"];

export function ToolRecordTheater() {
  const clock = useInstrumentClock(stages.length);
  const [selected, setSelected] = useState(0);
  const [panel, setPanel] = useState(0);
  const record = records[selected];
  return (
    <article ref={clock.ref} className="diptych-card db-instrument recorder-instrument" data-running={clock.running}>
      <div className="db-instrument-head"><span><Radio size={14} /> TOOLRECORD / FLIGHT RECORDER</span><span className="db-rec-dot">● REC</span></div>
      <h3>每一次调用，<br /><em>都有一只航空级黑匣子。</em></h3>
      <p className="db-deck">谁、何时、调用谁、谁审查；日志、结果、线程与硬件开支，全部进入同一份运行记录。</p>
      <div className="recorder-console">
        <div className="recorder-topline"><span><Fingerprint size={14} /> DEMO-TR-{record.id}</span><select aria-label="选择黑匣子演示记录" value={selected} onChange={(event) => {setSelected(Number(event.target.value)); clock.setStep(0);}}>{records.map((r, i) => <option key={r.id} value={i}>#{r.id} / {r.status}</option>)}</select></div>
        <div className="recorder-flight">
          <div className="recorder-reel" aria-hidden="true"><i /><i /><i /><b>TR</b></div>
          <div className="recorder-flight-data"><small>2026-10-20 / UTC+08:00</small><strong>{record.time}</strong><span>{record.caller} <b>→</b> {record.plugin}</span><small>{record.action} / {record.worker} / {record.thread}</small></div>
          <div className="recorder-signal" aria-hidden="true">{Array.from({length: 12}, (_, i) => <i key={i} style={{"--signal-height": `${15 + (i * 19 % 65)}%`, animationDelay: `${i * -0.14}s`} as CSSProperties} />)}</div>
        </div>
        <div className="recorder-timeline" aria-label="选择回放阶段">{stages.map((stage, i) => <button type="button" key={stage} aria-pressed={clock.step === i} className={i <= clock.step ? "is-passed" : ""} onClick={() => {clock.setStep(i); clock.setPlaying(false);}}><i />{stage}</button>)}</div>
        <div className="recorder-tabs" aria-label="选择记录视角">{panels.map((name, i) => <button type="button" key={name} aria-pressed={panel === i} onClick={() => setPanel(i)}>{name}</button>)}</div>
        <div className="recorder-panel" key={`${panel}-${selected}`}>
          {panel === 0 && <div className="recorder-fields"><div><small>发起人 / CALLER</small><strong>{record.caller}</strong></div><div><small>目标插件 / CALLEE</small><strong>{record.plugin}</strong></div><div><small>中间审查人 / REVIEWER</small><strong><ShieldCheck size={14} />{record.reviewer}</strong></div><div><small>审查结论 / VERDICT</small><strong>{record.verdict}</strong></div></div>}
          {panel === 1 && <div className="recorder-log" aria-live="off">{record.logs.map((log, i) => <div key={log} className={i <= clock.step ? "is-recorded" : ""}><time>+{String(i * 84).padStart(3, "0")}</time><span>{i <= clock.step ? log : "等待该阶段回放…"}</span></div>)}</div>}
          {panel === 2 && <div className="recorder-hardware"><div className="recorder-scheduler">{["MAIN", "WORKER", "I/O"].map((name, i) => <div key={name}><small>{name}</small><span>{[0, 1, 2, 3, 4].map((v) => <i key={v} style={{width: `${12 + (v * 7 + i * 9) % 23}%`, animationDelay: `${v * -0.2}s`}} />)}</span></div>)}<small>{record.worker} ↔ {record.thread} · 调度轨迹示意</small></div><div className="recorder-resource-row"><span>CPU 时间<b>{record.cpu}</b></span><span>峰值内存<b>{record.ram}</b></span><span>I/O 读写<b>{record.io}</b></span></div></div>}
          {panel === 3 && <div className="recorder-output"><div><small>执行结果 / {clock.step < 4 ? "待回放至产出" : record.status}</small><strong>{clock.step < 4 ? "运行中间态已记录" : record.result}</strong><span>{clock.step < 4 ? "拖动下方回放刻度，检查产出前后的变化。" : record.asset}</span></div><div className="recorder-cost"><Cpu size={20} /><strong>{record.cost}</strong><small>硬件能耗开支 · 演示估算值<br />非真实测量或计费凭据</small></div></div>}
        </div>
        <div className="recorder-controls"><button type="button" aria-label={clock.playing ? "暂停黑匣子回放" : "播放黑匣子回放"} onClick={() => clock.setPlaying(!clock.playing)}>{clock.playing ? <Pause size={13} /> : <Play size={13} />}</button><input type="range" min={0} max={5} value={clock.step} aria-label="黑匣子回放阶段" onChange={(event) => {clock.setStep(Number(event.target.value)); clock.setPlaying(false);}} /><span>{stages[clock.step]} / 0{clock.step + 1}</span><button type="button" aria-label="重新回放" onClick={() => {clock.setStep(0); clock.setPlaying(true);}}><RotateCcw size={13} /></button></div>
      </div>
      <div className="db-instrument-foot"><span>同步 · 异步 · 系统 · 人类 / 统一留痕</span><a href="/?page=changelog">追溯演进 ↗</a></div>
      <small className="db-disclaimer">“航空级黑匣子”为全链路记录能力比喻，非航空认证。身份、日志、硬件与能耗均为预设演示，不连接生产数据库。</small>
    </article>
  );
}