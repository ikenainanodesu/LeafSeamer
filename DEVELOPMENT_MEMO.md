# Development Memo

This memo is for development-facing context that should travel with the
repository. Keep entries concise and update it when requirements, implementation
decisions, or release-readiness status changes.

## Requirements

- Keep the repository suitable for source distribution.
- Ensure users can deploy from the repository with the expected flow:
  `npm install`, `npm run build`, then `npm start`.
- Include configuration examples needed for deployment.
- Exclude local runtime data, credentials, dependencies, logs, backups, and
  generated build artifacts from Git.

## Changes

- Reorganized `.gitignore` by category:
  dependencies, build output, NodeCG runtime data, local configuration/secrets,
  diagnostics, editor files, and local tool state.
- Added tracked configuration templates under `cfg/`:
  `nodecg.json.example`, `data-sync-service.json.example`, and `README.md`.
- Removed obsolete development leftovers:
  `test-regex.js` and bundle-level `package.json.off` files.
- Moved the HTML recovery helper from the repository root to
  `scripts/restore-html.js`.
- Fixed TypeScript issues that blocked project-wide type checking:
  shared path alias, dashboard `global.d.ts` references, an implicit `any`, and
  an ATEM macro display type narrowing.

## Progress

- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes and builds all 10 NodeCG bundles.
- Generated bundle output remains ignored:
  `bundles/*/dashboard/`, `bundles/*/graphics/`, `bundles/*/shared/`, and
  `bundles/*/extension/index.js`.
- Real NodeCG config and data remain ignored:
  `cfg/*.json`, `db/`, `logs/`, `backups/`, and `assets/`.

## Notes

- `package-lock.json` had pre-existing local changes before the cleanup work.
  Review it separately before committing if lockfile churn is not desired.
- Real Google Sheets credentials should not be committed. Use
  `cfg/data-sync-service.json.example` as the template and keep credential JSON
  files local.
- If a release package is intended to run without a build step, produce it from
  a clean build artifact process rather than committing generated bundle output.

## 2026-06-14 Log Viewer 界面优化

### 需求变化

- 在保持现有实时日志数据流与日志容量不变的前提下，美化 Log Viewer 页面。
- 页面需要继续适配 NodeCG dashboard 的窄面板，并提升日志检索与浏览效率。

### 代码变动

- 重构 `log-viewer.tsx`，将内联样式迁移到独立的 `log-viewer.css`。
- 新增日志级别统计、级别筛选、搜索清除、筛选重置和空状态。
- 调整日志行结构，强化时间、级别、分类和消息之间的视觉层级。
- 更新 `log-viewer.html` 的基础元数据与主题色。

### 功能增减

- 新增按 `Info`、`Warn`、`Error` 级别筛选日志的功能。
- 新增当前日志级别数量和筛选结果数量显示。
- 未删除原有功能；`recentLogs` Replicant、最新日志优先顺序和最多 100 条日志的行为保持不变。

### 功能实现路径

- 继续订阅 `recentLogs` Replicant，并使用 React 派生状态完成统计和过滤。
- 使用延迟搜索值减少连续输入时的列表更新压力。
- 使用 CSS Grid、固定工具区和独立滚动区保证窄宽度及低高度下的稳定布局。
- 使用语义颜色、键盘焦点状态和减少动画媒体查询提升可访问性。

### 已知 Bug

- NodeCG dashboard 初始 iframe 高度约为 150px；若页面没有最小高度，工具栏会挤占日志区并使空状态操作不可点击。

### 未解决 Bug

- 暂无。

### Bug 解决方法

- 为 `html`、`body`、`#root` 和 Log Viewer 根布局设置 440px 最小高度，使 NodeCG iframe 尺寸监听能够扩展面板并保留日志滚动区。

## 2026-06-14 Log Viewer Bundle 日志汇聚与筛选

### 需求变化

- Log Viewer 需要支持按 bundle 筛选。
- 各业务 bundle 的服务端日志必须自动进入 Log Viewer，而不是依赖业务代码手动调用 logger-system 扩展。

### 代码变动

- 新增 NodeCG Logger 原型采集器，统一捕获各 bundle 的 `info`、`warn`、`error` 日志。
- 为日志条目新增 `bundle` 字段，并将近期日志容量从 100 条提升到 500 条。
- 新增 `availableBundles` Replicant，在所有扩展加载完成后发布 bundle 清单。
- 九个业务 bundle 新增对 `logger-system` 的 bundle 依赖，保证日志采集器优先加载。
- 公共 logger 改为使用 `nodecg.log`，移除原有 console 与扩展 API 的双通道写入。
- Log Viewer 新增 Bundle 下拉筛选、bundle 来源标签和 bundle 名称搜索。
- 日志文件格式新增 bundle 字段：`[LEVEL] [BUNDLE] [CATEGORY] message`。

### 功能增减

- 新增按单个 bundle 查看日志的功能。
- 新增全部 bundle 服务端日志自动汇聚功能，包括各 bundle 的启动日志。
- 保留级别筛选、文本搜索、空状态重置和旧日志展示功能。
- 旧日志缺少 `bundle` 字段时统一显示为 `legacy`。

### 功能实现路径

- `logger-system` 优先加载并包装 NodeCG 公共 Logger 原型。
- 包装器先调用原始 Logger，保持原控制台输出，再将格式化日志写入 `recentLogs`。
- 日志正文以 `[Category]` 开头时提取分类，否则使用 `Runtime`。
- 前端合并 `availableBundles` 与当前日志来源，生成稳定且完整的筛选选项。

### 已知 Bug

- NodeCG 启动并加载全部 bundle 时，socket.io 可能输出 `MaxListenersExceededWarning`；该警告现在会被 Log Viewer 正确显示。

### 未解决 Bug

- 尚未定位 NodeCG/socket.io 消息监听器超过默认 10 个的具体所有者；当前不影响日志汇聚和筛选。

### Bug 解决方法

- 修正旧公共 logger 对不存在的 `nodecg.extensions` 属性的依赖，统一改用 NodeCG Logger 采集路径。
- 日志文件写入失败时改写标准错误流，避免错误日志再次触发存储并形成递归。
- `MaxListenersExceededWarning` 本次仅完成可见性确认，尚未修改第三方监听器上限或监听注册结构。

## 2026-06-14 Log Viewer 自动清理

### 需求变化

- Log Viewer 需要提供自动清理机制，并允许用户直接在 UI 中选择日志保留周期。
- 自动清理需要同时作用于界面中的近期日志和磁盘日志文件，避免两处数据保留范围不一致。

### 代码变动

- 新增共享清理周期定义，提供关闭、1 小时、6 小时、24 小时、7 天和 30 天选项。
- 新增持久化 `logCleanupPeriodMs` Replicant 和非持久化 `lastLogCleanupAt` Replicant。
- 将日志写入和文件清理统一放入单并发存储队列。
- 为磁盘日志新增按文件日期和行内 UTC 时间解析、逐行裁剪及空文件删除逻辑。
- Log Viewer 新增自动清理周期下拉框和最近清理时间状态。

### 功能增减

- 新增用户选择日志保留周期的功能，默认关闭，避免升级后未经确认删除历史日志。
- 新增周期变更后立即清理，并每 5 分钟自动检查一次的功能。
- 新增清理周期跨 Dashboard 刷新持久化的功能。
- 未删除原有 bundle、级别和文本筛选功能。

### 功能实现路径

- 前端通过 `logCleanupPeriodMs` Replicant 将固定周期同步到 logger-system 扩展。
- 后端校验周期值，拒绝 UI 选项之外的异常数值。
- 清理时先按时间戳裁剪 `recentLogs`，再通过同一串行队列处理磁盘文件。
- 磁盘文件名提供日期，日志行首提供 UTC 时间，两者组合为精确时间戳。
- 清理完成后更新 `lastLogCleanupAt`，前端页脚即时显示最近完成时间。

### 已知 Bug

- NodeCG/socket.io 在加载多个 bundle 时仍可能触发 `MaxListenersExceededWarning`。
- Windows 桌面沙箱可能阻止内置浏览器进程启动；该问题不影响 NodeCG 页面本身。

### 未解决 Bug

- 尚未定位 `MaxListenersExceededWarning` 的具体监听器所有者。

### Bug 解决方法

- 写入与清理使用同一单并发队列，避免文件追加和重写发生竞争。
- 无法解析时间戳的旧格式日志行会被保留，防止自动清理误删兼容数据。
- 非法清理周期会自动恢复为关闭状态。
- UI 已通过系统 Edge 的 Playwright 回退路径验证 560px 和 280px 面板布局。
