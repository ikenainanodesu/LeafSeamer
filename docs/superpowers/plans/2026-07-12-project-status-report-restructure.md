# Project Status Report Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 LeafSeamer 项目现状报告改为按 Bundle 分类的问题台账，并让每个问题在同一处完整说明风险与改善建议。

**Architecture:** 保持单文件静态 HTML 交付，使用语义化章节、唯一问题编号和渐进增强筛选。新增一个无第三方依赖的 Node.js 静态检查脚本，验证 Bundle 覆盖、问题字段、锚点与重复 ID；仓库内报告作为可验证副本，验证后复制到用户指定目录。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js、PowerShell、Git

## Global Constraints

- 不修改 LeafSeamer 业务代码，不重新执行源码审计，不新增未经源码或现有报告支持的结论。
- 跨 Bundle 问题只在 Platform / Shared Concerns 中完整说明，其他 Bundle 使用关联链接。
- 禁用 JavaScript 时报告全部内容仍可阅读。
- 所有代码注释使用中文。
- 最终目标为 `D:\git-repo\PROFILE-MANAGER-1\nodecg\LeafSeamer_Project_Status_Report.html`。

---

### Task 1: 报告结构检查器

**Files:**
- Create: `scripts/validate-status-report.mjs`
- Test: `LeafSeamer_Project_Status_Report.html`

**Interfaces:**
- Consumes: 第一个命令行参数指定的 HTML 文件路径。
- Produces: 成功时输出检查统计并返回退出码 `0`；失败时逐项输出缺失规则并返回退出码 `1`。

- [x] **Step 1: 编写针对新结构的检查脚本**

检查脚本必须验证：唯一 `id`、所有内部锚点存在、12 个 Bundle 章节存在、每个 `.issue-card` 有问题编号和八个必填字段、P0/P1/P2 筛选控件存在、窄屏和打印样式存在。

```js
const requiredBundles = [
  'platform', 'seamer', 'logger', 'schedule', 'vb-matrix', 'obs',
  'atem', 'mixer', 'graphics', 'backup', 'data-sync', 'adapters'
];

const requiredFields = [
  'evidence', 'risk', 'impact', 'mitigation',
  'improvement', 'implementation', 'acceptance', 'related'
];
```

- [x] **Step 2: 在旧报告上运行并确认失败**

Run: `node scripts/validate-status-report.mjs LeafSeamer_Project_Status_Report.html`

Expected: FAIL，至少报告缺少 `data-bundle` 章节或 `.issue-card` 字段。

- [x] **Step 3: 保留失败输出作为重排验收基线**

Run: `git diff -- scripts/validate-status-report.mjs`

Expected: 仅包含静态检查器，不修改业务 Bundle。

### Task 2: 按 Bundle 重排报告

**Files:**
- Modify: `LeafSeamer_Project_Status_Report.html`

**Interfaces:**
- Consumes: 现有报告事实、设计说明中的 Bundle 顺序和问题字段规范。
- Produces: 单文件、可离线打开、可筛选和可打印的 HTML 报告。

- [x] **Step 1: 重建页面骨架和导航**

页面必须包含 `#overview`、`#bundle-summary`、12 个 `section[data-bundle]` 和 `#roadmap`、`#appendix`。桌面侧栏使用 `position: sticky`，窄屏在 `@media (max-width: 900px)` 下变为顶部目录。

- [x] **Step 2: 迁移项目概览与 Bundle 状态**

保留项目功能、语言、架构、构建命令和工具链；Bundle 总览表必须列出独立状态、依赖、问题数量与最高风险。

- [x] **Step 3: 合并平台共享问题**

建立 `PLAT-01` 至 `PLAT-07`，覆盖部署边界、Secret、备份、命令授权与 schema、CI、构建目录、数据治理。每项使用统一字段：

```html
<article class="issue-card" data-priority="p0">
  <header><!-- 问题编号、标题和优先级 --></header>
  <div data-field="evidence">...</div>
  <div data-field="risk">...</div>
  <div data-field="impact">...</div>
  <div data-field="mitigation">...</div>
  <div data-field="improvement">...</div>
  <div data-field="implementation">...</div>
  <div data-field="acceptance">...</div>
  <div data-field="related">...</div>
</article>
```

- [x] **Step 4: 建立各 Bundle 问题档案**

Seamer、Logger、Schedule、VB Matrix、OBS、ATEM、Mixer、Graphics、Backup、Data Sync 和 Adapters 各自包含功能、独立条件、依赖、入口和问题卡片；不重复平台共享问题正文。

- [x] **Step 5: 添加渐进增强筛选与打印样式**

原生 JavaScript 只切换问题卡片的 `hidden` 状态和按钮 `aria-pressed`；无 JavaScript 时不隐藏任何内容。打印时强制显示全部卡片和 `details` 内容，并隐藏侧栏与工具栏。

- [x] **Step 6: 运行结构检查并确认通过**

Run: `node scripts/validate-status-report.mjs LeafSeamer_Project_Status_Report.html`

Expected: PASS，输出 Bundle 数、问题数、锚点数和重复 ID 数为 `0`。

### Task 3: 开发日志、目标同步与最终验证

**Files:**
- Modify: `DEVELOPMENT_MEMO.md`
- Copy: `LeafSeamer_Project_Status_Report.html` to `D:\git-repo\PROFILE-MANAGER-1\nodecg\LeafSeamer_Project_Status_Report.html`

**Interfaces:**
- Consumes: 已通过检查的仓库内 HTML。
- Produces: 与仓库副本哈希一致的外部交付文件和完整开发日志。

- [x] **Step 1: 更新开发日志的实际实现与验证结果**

记录按 Bundle 重排、问题字段、筛选、响应式、打印、静态检查器，以及 `file://` 自动化浏览器限制。

- [x] **Step 2: 运行完整静态验证**

Run: `node scripts/validate-status-report.mjs LeafSeamer_Project_Status_Report.html`

Expected: PASS，无缺失字段、无无效锚点、无重复 ID。

- [x] **Step 3: 覆盖外部目标文件**

Run: `Copy-Item -LiteralPath 'D:\git-repo\LeafSeamer\LeafSeamer_Project_Status_Report.html' -Destination 'D:\git-repo\PROFILE-MANAGER-1\nodecg\LeafSeamer_Project_Status_Report.html' -Force`

Expected: 命令退出码 `0`。

- [x] **Step 4: 比较两个文件哈希**

Run: `Get-FileHash -LiteralPath 'D:\git-repo\LeafSeamer\LeafSeamer_Project_Status_Report.html'; Get-FileHash -LiteralPath 'D:\git-repo\PROFILE-MANAGER-1\nodecg\LeafSeamer_Project_Status_Report.html'`

Expected: 两个 SHA256 完全一致。

- [x] **Step 5: 检查工作区差异**

Run: `git status --short && git diff --check`

Expected: 仅包含本任务报告、检查器、计划和开发日志变更，且 `git diff --check` 无错误。
