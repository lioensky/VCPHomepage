import {useState} from "react";
import {ArrowUpRight, Database, ShieldCheck} from "lucide-react";

const memoryLayers = [
  {name: "SQLite", label: "权威事实", detail: "正文、原始 FP32 向量与有序 Tag 在 SQLite 事务中确立事实。专用写 Actor、有界队列与 WAL 读快照，让读写拥有明确的一致性边界。", flow: "写入 → 事务提交 → 事实代际推进"},
  {name: "TDB 2-bit", label: "冲程检索", detail: "先用符号与强弱两个位平面导航、筛选候选，再从同一读事务读取原始向量精排。量化负责找路，不冒充最终数学真值；全局 Chunk 使用无图紧凑扫描。", flow: "紧凑位码 → 有界候选池 → FP32 精排"},
  {name: "AGS", label: "统一背景", detail: "锚定贪心正交化共享局部残差与全局主题几何。长期结构预计算，查询只唤起与当下有关的背景，不必每次重新训练。", flow: "局部残差 × 全局主题面 → 同代背景资产"},
  {name: "Spike", label: "语境虫洞", detail: "沿真实历史关系有界传播。更深层语境残差为已有弱边争取动态席位，不凭空造边、不额外创造能量，联想始终受预算与证据约束。", flow: "语境残差 → 历史边共鸣 → 请求级河网"},
  {name: "RiverMemo V2", label: "双场裁决", detail: "局部场与迁移场共享投影选点预算，保留核心河网骨架；跨阶段复用请求级 FP32 向量池，以正文闭合、相对拓扑、Ω 与直接锚统一排序。", flow: "共享双场 → 有序 Tag 曲线 → 统一泛函"},
];

export function VexusArchitecture({onRead}: {onRead: () => void}) {
  const [layer, setLayer] = useState(4);
  const [nativePath, setNativePath] = useState(true);
  const active = memoryLayers[layer];
  return (
    <article className="diptych-card memory-architecture">
      <div>
        <div className="mt-kicker"><Database size={15} /> ONE NATIVE ENGINE / 读 · 写 · 查 · 搜</div>
        <h3>Lite 的是运行成本，<br />不是数学高度。</h3>
        <p className="mt-intro">VexusMemo 的原生内核虽名为 Vexus-Lite，却不做轻量化的数学妥协。以极致数学工艺与架构优化，挑战重型企业记忆数据库的资源堆叠范式：<strong>让复杂能力留在内核，让多余成本离开热路径。</strong></p>
        <div className="memory-cost-demo">
          <div className="memory-cost-switch" aria-label="切换架构成本示意">
            <button type="button" aria-pressed={!nativePath} onClick={() => setNativePath(false)}>重型拼装链路</button>
            <button type="button" aria-pressed={nativePath} onClick={() => setNativePath(true)}>Vexus 原生一体</button>
          </div>
          <div className="memory-cost-flow" aria-live="polite">
            <small>{nativePath ? "ONE ENGINE / 把成本消解在架构里" : "ASSEMBLY / 典型多运行时拼装示意"}</small>
            <strong>{nativePath ? "事实事务 → 紧凑候选 → 同代观测 → 统一裁决" : "应用事务 ⇄ 向量服务 ⇄ 图计算 ⇄ 重排服务"}</strong>
            <p>{nativePath ? "长期结构提前算；候选先用 2-bit 找；精排保留原始 FP32；请求内向量只按差集补查。数学仍然完整，搬运与重复不必完整重演。" : "当事实、向量、关系与重排分属不同执行边界，中间候选和高维向量可能反复传输，各层还需协调版本与生命周期。"}</p>
          </div>
          <span className="mt-note">架构机制示意，不是特定竞品基准；实际成本与性能取决于数据规模、硬件和配置。</span>
        </div>
        <div className="memory-layer-list" aria-label="探索一体化记忆链路">
          {memoryLayers.map((item, index) => (
            <button type="button" key={item.name} aria-pressed={layer === index} className={layer === index ? "is-active" : ""} onClick={() => setLayer(index)}>
              <span>0{index + 1}</span><strong>{item.name}</strong><small>{item.label}</small>
            </button>
          ))}
        </div>
        <div className="memory-layer-detail" aria-live="polite">
          <small>原生链路 / {active.label}</small>
          <h4>{active.flow}</h4>
          <p>{active.detail}</p>
        </div>
        <div className="memory-facts">
          <div><strong>2-bit</strong><span>位码载荷约为 FP32 的 1/16</span></div>
          <div><strong>≤256</strong><span>默认双场投影选点去重并集</span></div>
          <div><strong>A / B</strong><span>双槽代际快照 · 可校验恢复</span></div>
        </div>
        <p className="mt-note">256 仅约束双场高维投影选点，不代表整个请求的读取或内存上限，也不意味着全图标量求解变为常数复杂度。索引可从事实重建，双槽文件与 SQLite 不构成跨介质 ACID 事务。</p>
      </div>
      <div className="mt-footer">
        <span>RAGDiary 被动背景 / LightMemo 主动追问</span>
        <button type="button" onClick={onRead}>探索记忆数学 <ArrowUpRight size={14} /></button>
      </div>
    </article>
  );
}

const callRecords = [
  {
    id: "DEMO-TR-8941", state: "成功", origin: "Nova · 同步调用", tool: "联网搜索",
    input: "请从最近一周的资料中，搜索【RiverMemo 记忆检索】的技术讨论。",
    parsed: "能力域：联网搜索 / 主目标：RiverMemo 记忆检索 / 时间约束：最近一周",
    route: "Jev 语义入口 → 确定性编译 → 必要时消歧 → 统一执行管线",
    events: [
      ["发起", "唯一调用 ID 关联 Agent、原始意图与请求来源"],
      ["解析", "识别主目标与时间约束，映射为结构化参数"],
      ["审核", "按工具指令权限与参数级规则检查"],
      ["执行", "记录进度、执行中间状态与运行时内容"],
      ["完成", "最终状态与结果入库，可按 ID 继续查询"],
    ],
    result: "成功 · 结果与运行时记录可追查，多模态资产可经 VCPFileAPI 继续读取。",
  },
  {
    id: "DEMO-TR-8942", state: "拒绝", origin: "Nova · Jev 请求", tool: "精准文件编辑",
    input: "帮我把核心数据库里的旧代码删改一下。",
    parsed: "识别为文件 / 代码精准删改意图，不能用模糊自然语言直接执行。",
    route: "Jev 语义入口 → 高危边界识别 → 拒绝本次请求",
    events: [
      ["发起", "保留原始请求与发起人，不把失败请求从历史抹去"],
      ["解析", "识别精准代码修改涉及高风险执行边界"],
      ["审核", "Jev 路径拒绝，要求另发显式原生 VCP 请求"],
      ["拒绝", "无工具执行；拒绝原因与终态进入调用记录"],
    ],
    result: "拒绝 ≠ 已执行。改用原生协议仍须通过权限与参数审核，不会自动获准。",
  },
  {
    id: "DEMO-TR-8943", state: "失败", origin: "用户 · 异步调用", tool: "网页读取",
    input: "读取指定网页，提取正文与页面中的图片。",
    parsed: "能力域：网页读取 / 目标：指定 URL / 输出：正文与图片",
    route: "结构化调用 → 审核 → 异步任务 → 错误回填",
    events: [
      ["发起", "调用 ID 绑定用户与异步任务"],
      ["审核", "记录审核结论与任务提交状态"],
      ["执行", "持续保留进度与中间状态"],
      ["失败", "目标请求超时，错误与最终状态统一回填"],
    ],
    result: "失败 · 可以精确引用记录排障，不会把“已发出调用”误报为“操作成功”。",
  },
];

export function ToolRecordTheater() {
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");
  const record = callRecords[selected];
  const matches = callRecords.filter((item) => `${item.id} ${item.state} ${item.tool} ${item.origin}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <article className="diptych-card tool-record-theater">
      <div>
        <div className="mt-kicker"><ShieldCheck size={15} /> VCP TOOLRECORD / 调用黑匣子</div>
        <h3>不只保存最终结果，<br />而是保存调用的一生。</h3>
        <p className="mt-intro">同步、异步、系统与人类发起的调用统一入库。唯一 ID 串联发起、审核、执行、进度、中间状态与终态，让工具运行时成为可审计资产。</p>
        <label className="tool-record-search">
          <span>查询演示记录</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入 ID、工具、发起人或状态" />
        </label>
        <div className="tool-record-list" aria-label="调用记录列表">
          {matches.length ? matches.map((item) => (
            <button type="button" key={item.id} aria-pressed={record.id === item.id} onClick={() => setSelected(callRecords.indexOf(item))} className={record.id === item.id ? "is-active" : ""}>
              <span><strong>{item.tool}</strong><small>{item.id} / {item.origin}</small></span>
              <b data-state={item.state}>{item.state}</b>
            </button>
          )) : <p className="mt-note" role="status">没有匹配的演示记录。可尝试“Nova”“拒绝”或“网页”。</p>}
        </div>
        <div className="tool-record-detail" aria-live="polite">
          <div className="tool-record-id">{record.id} <b data-state={record.state}>{record.state}</b></div>
          <dl>
            <dt>原始意图</dt><dd>{record.input}</dd>
            <dt>解析与归一</dt><dd>{record.parsed}</dd>
            <dt>执行路由</dt><dd>{record.route}</dd>
          </dl>
          <ol className="tool-record-events">
            {record.events.map(([stage, message]) => <li key={stage}><b>{stage}</b><span>{message}</span></li>)}
          </ol>
          <p className="tool-record-result">{record.result}</p>
        </div>
      </div>
      <div className="mt-footer"><span>演示数据 · 非实时监控 / 不连接生产数据库</span><a href="/?page=changelog">查看演进记录 ↗</a></div>
    </article>
  );
}