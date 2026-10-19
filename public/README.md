# VCP RiverMemo Engine · 交互式算法实验室

独立静态交互演示，呈现 RiverMemo V10、Topology V3.1 与 AGS 双尺度统一几何。页面中的数据与耗时为预设演示，不代表浏览器调用了生产 Rust 引擎。

## 访问地址

- 正式标准网址：https://www.vcptoolbox.com/vcp-rivermemo-engine
- 页面文件：[`vcp-rivermemo-engine.html`](vcp-rivermemo-engine.html)
- 旧网址 `/vcp_wave_v8_engine` 和 `/vcp_wave_v8_engine.html` 在 Vercel 上永久跳转至新网址。
- 本地在仓库根目录启动开发服务后，访问 http://localhost:3000/vcp-rivermemo-engine.html 。无扩展名标准网址由部署平台的重写规则提供。

## 章节地图

| 章节 | 内容 |
|:--:|:--|
| 00 | 统一语义动力场总览 |
| 01 | 局部 AGS 正交剥离、残差范数比与锚增益 |
| 02 | 全局星团方向与前缀嵌套覆盖率 |
| 03 | 次随机传输核、顺逆流阻尼与预算内虫洞 |
| 04 | EPA 背景相对校准与三层残差金字塔 |
| 05 | 有界 Sense 脉冲与请求级有向河网 |
| 06 | Resolvent 局部场与迁移场支持域 |
| 07 | 候选有序曲线与相对拓扑映射 |
| 08 | 形态混合单纯形与 Ω 可观测泛函 |
| 09 | 条件拓扑创新与直接锚激活 |
| 10 | 全链路模拟与 Top-3 分数拆解 |

## 主要文件

- [`vcp-rivermemo-engine.html`](vcp-rivermemo-engine.html)：页面、章节、元数据与控件。
- [`styles.css`](styles.css)：纸墨工业主题与响应式布局。
- [`river-engine.js`](river-engine.js)：画布绘制底座、粒子、路径与场景生命周期。
- [`scenes.js`](scenes.js)：全局背景、总览与各章节场景。
- [`main.js`](main.js)：章节注册、可见性调度、导航和控件绑定。
- [`v92-scenes.js`](v92-scenes.js)：历史场景扩展，当前页面未加载。

## 兼容边界

当前场景导出沿用历史全局接口，保证已有扩展兼容；该内部名称不代表页面仍使用旧版 Wave V8 产品名称。

生产路由、旧地址跳转与单页应用回退规则位于仓库的 [`vercel.json`](../vercel.json)。迁移标准网址时，需要同步首页入口、页面标准链接、分享元数据、结构化数据和 [`sitemap.xml`](sitemap.xml)。

## 已知待完善项

当前调度脚本仍含历史交互绑定；除顺逆流切换外，新章节部分按钮尚未接入对应场景控制方法。这与页面更名和网址迁移相互独立，本次迁移未改写交互逻辑。