<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VCP Official Website

这是 VCP 的官方网页项目，用于承载官网首页、项目介绍、聚合文档、更新日志与后续持续扩展的教学内容。

当前站点的目标不是只做一个简单展示页，而是逐步建设成 VCP 对外公开的文档入口与内容门户，方便用户系统理解 VCP 的架构、能力边界、版本演进与生态方向。

---

## 项目定位

本项目目前主要承载以下内容：

- 官网首页展示
- VCP 聚合文档展示
- 更新日志总览与版本记录
- 教学文档与深度教程入口
- 后续可持续扩展的官方内容专区

如果你现在看到这个仓库，它已经不再是默认生成的占位项目，而是 VCP 官方网页本体。

---

## 欢迎贡献

欢迎各位围绕这个站点提交高质量内容 PR，尤其欢迎以下方向：

- 对 VCP 架构的高价值论点
- 对核心模块的深度解读
- 对记忆系统、插件系统、分布式能力的教学教程
- 对前端交互、渲染器、桌面能力的专题文档
- 对已有文档的修订、补充与结构优化

我们尤其欢迎“有信息密度、有独立判断、有技术深度”的内容，而不只是泛泛而谈的介绍。

---

## 本地运行

### 环境要求

- Node.js

### 启动方式

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 如需构建生产版本

```bash
npm run build
```

---

## 内容维护说明

当前文档内容主要位于 [`src/docs`](src/docs) 目录，站点会自动读取其中的 Markdown 文档作为官网内容的一部分。

你可以重点关注这些文件：

- [`src/docs/changelog.md`](src/docs/changelog.md)
- [`src/docs/changelog-2026-04-05.md`](src/docs/changelog-2026-04-05.md)
- [`src/docs/getting-started.md`](src/docs/getting-started.md)
- [`src/docs/teaching-docs.md`](src/docs/teaching-docs.md)
- [`VCP聚合文档.md`](VCP聚合文档.md)

---

## 说明

如果你想为 VCP 官网补充内容，最有价值的方式通常不是简单加几句介绍，而是直接提交：

- 结构更完整的教学文档
- 更准确的版本记录
- 更深入的技术分析
- 更清晰的概念解释
- 更有价值的架构观点

这个仓库欢迎真正能提升官网内容质量的贡献。
