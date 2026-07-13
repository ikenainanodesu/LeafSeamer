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

## 2026-06-14 Bundle 独立化重构

### 需求变化

- 放弃 i18n 方案，今后所有 Dashboard 与 Graphic UI 统一使用英文。
- 核心 bundle 必须能够独立安装、构建并插入任意 NodeCG 实例。
- Logger、Seamer、Schedule Manager 在保持原功能的同时不得成为其他核心 bundle 的硬依赖。

### 代码变动

- 移除 10 个核心 bundle 对 `logger-system` 的 `bundleDependencies`。
- 为各核心 bundle 增加本地依赖、`tsconfig.json`、`vite.config.mjs`、类型与工具文件。
- 新增 Seamer 通用集成注册表及 Mixer、ATEM、OBS、VB 四个适配器 bundle。
- 新增 `schedule-adapter-google-sheets`，将 Sheets 同步从 Schedule Manager 核心移出。
- Schedule Manager 新增英文手动编辑、添加、启用和删除排期项功能。
- Logger 采集改为可选全局桥，支持 logger-system 延迟加载后补录有界缓冲。
- 删除过期的 bundle 级 `package-lock.json`，统一由根工作区锁文件管理。

### 功能增减

- Seamer 无设备适配器时仍可独立加载、编辑和保存卡片与触发器。
- 安装对应适配器后恢复原有跨设备卡片动作和触发器动作。
- Schedule Manager 无 Data Sync Service 时仍可独立维护排期。
- Logger System 缺失时不再阻止任何核心 bundle 加载。
- 不再引入中日英切换或其他 i18n 运行时。

### 功能实现路径

- 核心 bundle 只暴露自身 Replicant、消息和扩展 API。
- 可选适配器通过明确的 `bundleDependencies` 连接两个核心，并发布纯数据快照。
- Seamer 注册表在写入 `seamerIntegrations` 前深拷贝 Replicant Proxy，避免 NodeCG 所有权冲突。
- 每个核心 bundle 使用本地 Vite 配置分别构建 extension 和 dashboard/graphics。
- 独立构建验收在隔离目录逐个执行 `npm install` 与 `npm run build`。

### 已知 Bug

- Vite 在 Dashboard 根目录与输出目录存在父子关系时会输出警告，但当前构建产物路径正确。
- NodeCG `NODECG_TEST` 模式会分配随机监听端口，但日志中的 `baseURL` 仍显示配置端口。

### 预期解决方法

- 后续可将前端源码移入独立子目录或使用临时输出目录，消除 Vite 目录关系警告。
- NodeCG 测试端口显示问题属于上游框架行为，升级 NodeCG 后重新验证。

### 已解决 Bug 以及解决方法

- 修复适配器将一个 Replicant Proxy 直接写入另一个 Replicant 导致无法挂载的问题；注册表现在发布深拷贝后的纯数据快照。
- 修复 OBS Dashboard 中遗留的中文可见文本，统一改为英文。
- 修复核心 bundle 依赖根 `shared/`、根 Vite 配置和依赖提升才能构建的问题。

## 2026-06-16 VB Matrix Control UI 与矩阵控制

### 需求变化

- VB Control Dashboard 需要与 Log Viewer 保持统一的暗色操作台风格。
- VB Matrix Control 需要显示 Voicemeeter Matrix / VB-Audio Matrix 的 routing grid，并允许用户直接点击节点进行 patch / de-patch。
- VB Network Config 在 NodeCG 控制台中的默认面板宽度不足，需要避免配置表单溢出。
- 设备发现必须覆盖官方 Matrix slot，尤其是 Windows 输入 / 输出设备和 VAIO / VBAN / VASIO slot。

### 代码变动

- 新增 `vb-control.css`，统一 VB Control 与 Log Viewer 的暗色 token、控件密度、状态颜色和响应式布局。
- 新增 `MatrixView.tsx`，将 discovered inputs 与 outputs 展开为可滚动 routing matrix。
- `Panel.tsx` 新增 `availableDevices`、`matrixPoints` Replicant 订阅，并将 Matrix View 放在 Patch Control 上方。
- `manager.ts` 新增 `matrixPoints` Replicant、Matrix 点状态缓存、Matrix 扫描、Preset 快照合并与 Patch Control / Matrix View 状态同步。
- `package.json` 中 `VB Network Config` 面板宽度从 `3` 调整为 `4`。
- `NetworkConfigList`、`PatchSelector`、`PatchStatus`、Preset Bank 等组件由内联样式迁移到统一 CSS class。
- `DeviceInfo` 新增 `pointDevice` 字段，用于区分 UI slot SUID 与 `Point(...)` 命令中使用的基础 SUID。

### 功能增减

- 新增 Matrix 图查看功能：按 input channel x output channel 展示节点状态。
- 新增 Matrix 节点点击 patch / de-patch 功能；Matrix 点击走已验证可用的 `updatePatch` 消息路径。
- 新增 Matrix 扫描状态显示，包括 patched 数量、known cells 和最近更新时间。
- 新增 muted / patched / open 三种节点视觉状态。
- 保留原有手动 Patch Control、Preset Manager、Preset Bank 与 Network Config 功能。

### 功能实现路径

- 前端 Matrix View 由 `availableDevices` 展开 endpoints，并合并 `matrixPoints` 与 `activePatches` 生成节点状态。
- Matrix 节点点击生成稳定的 `matrix-*` patch id，并发送 `updatePatch`，避免依赖新增 listener 在未重启 NodeCG 时失效。
- 后端 `updatePatch` 在收到 Matrix 生成的 patch 时，会同步更新 `matrixPoints`，并按需补入 `activePatches`，保证 preset 保存能捕获 Matrix 节点。
- Matrix 扫描通过 `Slot(SUID).Device = ?` 和 `Slot(SUID).Info = ?` 获取 slot 名称与通道数量，再查询 `Point(SUID.IN[n], SUID.OUT[j]).dBGain/Mute = ?`。
- 设备发现依据 VB-Audio 官方 Matrix slot 表与官方论坛 VBAN-TEXT requests list：
  - 标准 Matrix slot 包括 `ASIO128`、`ASIO64A`、`ASIO64B`、`WIN1.IN` 至 `WIN4.IN`、`WIN1.OUT` 至 `WIN4.OUT`、`VAIO1` 至 `VAIO4`、`VBAN1` 至 `VBAN4`、`VBAN64`、`VASIO8`、`VASIO128`、`VASIO64A`、`VASIO64B`。
  - `WDM`、`MME`、`KS` 是 `Slot(SUID).Device.*` 的设备接口类型，不是 Matrix slot SUID。
  - `WIN1.IN` / `WIN1.OUT` 在 UI 中分开显示，但 `Point(...)` 命令使用基础 SUID `WIN1`。

### 已知 Bug

- Vite 仍会提示 dashboard `outDir` 与 `root` 存在父子目录关系；当前构建输出正确，但警告仍存在。
- Matrix 扫描会对所有 discovered input/output 组合发送状态查询；在大通道数设备上可能产生较多 VBAN-TEXT 请求。
- 未在真实 VB-Audio Matrix / Voicemeeter Matrix 实例上完成端到端设备发现与节点点击验证。

### 预期解决方法

- 后续可将 dashboard 源码与生成目录彻底拆开，消除 Vite `outDir` 警告。
- 大矩阵后续可加入分页、按 slot 扫描或请求节流，减少一次刷新时的 VBAN-TEXT 请求量。
- 真实设备验证时优先确认 `Slot(SUID).Info = ?` 返回格式，并按实际日志扩展 parser。

### 已解决 Bug 以及解决方法

- 修复 Matrix 点击无法 patch 的问题：点击节点改为发送 `updatePatch`，复用 Patch Control 已验证的后端路径。
- 修复 Windows 设备不可见的问题：设备发现从错误的 `WDM1/MME1/KS1` slot 改为官方 `WINn.IN/WINn.OUT` slot。
- 修复 Windows slot 命令拼接错误风险：`WIN1.IN` / `WIN1.OUT` 记录为 UI slot，`Point(...)` 使用 `WIN1` 作为基础 SUID。
- 修复 Network Config 面板宽度不足的问题：默认面板宽度调整为 4，并在 560px 以下改为更窄的响应式表单布局。
- 修复 VB Control Replicant listener 重复注册风险：主面板订阅使用稳定 listener，并在 unmount 时移除。

## 2026-07-05 项目现状 HTML 报告

### 需求变化

- 需要遍历并理解当前 LeafSeamer 项目内容，输出一份便于阅读的 HTML 项目现状报告。
- 报告需保存到 `D:\git-repo\PROFILE-MANAGER-1\nodecg`，并覆盖项目功能、实现方式、构建 workflow、工具链、潜在安全问题和改进建议。

### 代码变动

- 未修改业务代码。
- 新增项目现状报告 `LeafSeamer_Project_Status_Report.html`，用于交付到指定外部目录。

### 功能增减

- 无运行时功能增减。

### 功能实现路径

- 使用 `rg --files` 统计并阅读非忽略源码、配置模板、脚本和文档。
- 重点阅读根配置、构建脚本、各核心 bundle package、extension 入口、adapter 入口和关键 dashboard/graphics 实现。
- 将第三方依赖、生成产物和运行时数据作为已识别但不逐行阅读的项目外部/运行时内容处理。

### 已知 Bug

- 本次仅静态审计，没有执行完整构建、类型检查或真实设备端到端验证。

### 预期解决方法

- 后续在可用设备和联网 CI 环境中补充 `npm run typecheck`、`npm run build`、依赖审计和真实设备验收记录。

### 已解决 Bug 以及解决方法

- 暂无。

## 2026-07-05 项目治理方案报告增补

### 需求变化

- 在已生成的 HTML 项目现状报告中增量补充安全、权限、前后端隔离、CI、构建目录隔离、VB Matrix 扫描降压、UI 统一、bundle 回调和数据库评估方案。
- 需要明确访问码管理、加密层级、敏感数据剥离路径，以及不同身份组的权限控制方式。

### 代码变动

- 未修改业务代码。
- 增量更新 `LeafSeamer_Project_Status_Report.html`，新增“安全、隔离与数据治理方案”相关章节。

### 功能增减

- 无运行时功能增减。

### 功能实现路径

- 将部署安全分为网络入口、反向代理、防火墙、VLAN、日志与备份五层。
- 将敏感数据方案拆为模块级 secret JSON、传输层加密、存储层加密、访问码哈希和日志 redaction。
- 将前后端隔离方案定义为 Command Gateway、server-owned state、sanitized Replicant 和 schema validator。
- 将实时同步方案定义为当前快照 Replicant、变化事件、ack/correlationId 回调和可选 SQL 历史层。

### 已知 Bug

- 本次仍为方案文档增补，未实现访问码、SecretManager、Command Gateway、CI workflow 或数据库层。

### 预期解决方法

- 后续按优先级逐项拆分任务：先做部署安全文档和 secret 剥离，再实现命令网关、schema 校验和访问码权限。

### 已解决 Bug 以及解决方法

- 暂无。

## 2026-07-12 项目现状报告按 Bundle 重排

### 需求变化

- 将项目现状 HTML 报告重新排版，并按 Bundle 分类组织内容。
- 每个问题必须在同一处逐项说明现状证据、风险、影响、改善建议、实施路径和验收标准。
- 跨 Bundle 的部署、权限、Secret、备份、消息校验、CI 和构建问题统一归入平台共享章节。

### 代码变动

- 新增报告重排设计说明 `docs/superpowers/specs/2026-07-12-project-status-report-restructure-design.md`。
- 新增实施计划 `docs/superpowers/plans/2026-07-12-project-status-report-restructure.md`。
- 重写 `LeafSeamer_Project_Status_Report.html`，改为平台共享与各 Bundle 档案结构。
- 新增 `scripts/validate-status-report.mjs`，静态检查 Bundle 覆盖、问题字段、内部锚点、重复 ID、筛选、响应式和打印约定。
- 已将验证后的报告同步覆盖到 `D:\git-repo\PROFILE-MANAGER-1\nodecg\LeafSeamer_Project_Status_Report.html`。
- 未修改 LeafSeamer 运行时业务代码。

### 功能增减

- 报告增加按 Bundle 导航、问题编号、P0/P1/P2 筛选、展开/折叠、窄屏布局和打印样式。
- 20 个问题均在同一问题卡片内闭环说明证据、风险、影响、缓解、改善、实施路径、验收标准和关联问题。
- 原始 199 文件审计清单保留为折叠附录。
- 不涉及运行时功能增减。

### 功能实现路径

- 先压缩项目概览和 Bundle 总览，再将分散的风险与建议合并为 Bundle 问题卡片。
- 使用平台共享章节承载跨 Bundle 问题，各 Bundle 仅通过链接引用。
- 使用静态 HTML/CSS 和渐进增强脚本，保证禁用 JavaScript 时仍可阅读。
- 使用无第三方依赖的 Node.js 检查器完成 RED/GREEN 验证：旧报告因缺少新结构失败，新报告通过 12 个 Bundle、20 个问题和 48 个内部锚点检查，重复 ID 为 0。

### 已知 Bug

- 应用内浏览器安全策略拒绝自动化访问本地 `file://` 报告，无法直接完成自动截图验证。

### 预期解决方法

- 使用静态结构检查验证 HTML、锚点、问题字段与响应式 CSS；最终由用户在现有本地标签页刷新后确认视觉效果。

### 已解决 Bug 以及解决方法

- 解决风险与改善建议分散、重复的问题：改为按 Bundle 分组，每个问题在单一卡片中闭环说明风险和整改方案。
- 解决长报告定位困难的问题：增加固定 Bundle 目录、问题计数、优先级筛选和有效内部锚点。

## 2026-07-12 模块化集成与安全治理方案

### 需求变化

- Seamer 需要在未来自动识别新 Adapter 提供的触发器、动作和配置界面，不再要求修改核心硬编码类型。
- Schedule Manager 需要同步 Google Sheets 与 PostgreSQL 外部播单，并把到期事件或指定字段变化作为 Seamer 自动化触发器。
- 暂不采用 Python sidecar；外部数据源使用可选 Node.js Adapter。
- Backup 需要按 L0-L3 敏感度分级，并允许管理员选择备份级别；L3 Secret 必须独立加密。
- Adapters 需要统一 Capability、Command、Event、Ack 和版本 API。
- Graphics Package 暂缓完善，优先处理其他 Bundle。

### 代码变动

- 新增设计说明 `docs/superpowers/specs/2026-07-12-modular-integration-hardening-design.md`。
- README 增加模块化 Integration Contract 与 Schedule 数据源方向。
- `.gitignore` 增加模块 Secret、SQLite/WAL、恢复密钥和本机备份 profile 规则。
- 本阶段先更新方案与报告；运行时代码按独立实施计划分阶段修改。

### 功能增减

- 计划新增动态 Capability Manifest、Schedule Source API、PostgreSQL Adapter、Seamer Schedule Adapter、Command Gateway Library、Secret Library、Backup 分级和 Audit Store。
- 不新增 Python 运行时依赖。
- Graphics UI 统一延期，不在本轮实现范围。

### 功能实现路径

- 使用可打包 TypeScript SDK 共享合同，避免核心 Bundle 强制依赖中央 NodeCG Bundle。
- Seamer 通过 Adapter 注册的 Manifest 动态生成触发器和动作表单。
- Schedule 只保存标准化播单；Google Sheets/PostgreSQL Adapter 负责来源转换；Seamer Schedule Adapter 负责自动化桥接。
- Replicant 保存当前快照，Event Envelope 传递变化，Command Envelope 执行操作，SQLite + WAL 保存审计和历史。
- Backup 按 L0-L3 分类，L3 默认排除且只能作为密钥分离的加密载荷导出。

### 已知 Bug

- 当前 Seamer 仍把 `mixer/atem/obs/vb` 写入封闭类型和 Trigger UI，新 Adapter 不能完全即插即用。
- 当前 Schedule 仅支持简单列表替换，没有版本、冲突、回滚、PostgreSQL 或 Seamer 触发事件。
- 当前 Backup 总是打包完整 `cfg` 和 `db`，没有敏感度选择、manifest 或加密。
- 当前 Logger 没有统一 redaction 和独立 Audit Store。

### 预期解决方法

- 按 Integration/Schedule、安全与 Backup、Logger/Audit 三个独立计划依次实施和验证。

### 已解决 Bug 以及解决方法

- 暂无；本条目记录已确认设计与实施顺序。

## 2026-07-12 模块化集成、安全、备份与审计实施

### 需求变化

- 执行已批准的模块化 Integration 方案，不采用 Python sidecar。
- Seamer 自动识别 Adapter Capability；Schedule 接入 Google Sheets 与 PostgreSQL，并只向 Seamer 暴露显式自动化事件。
- Backup 支持 L0-L3 数据选择，L3 只能以密钥分离的加密载荷进入归档。
- Logger 写入前脱敏，高风险命令进入独立审计历史；所有新增 UI 文案使用英文。

### 代码变动

- 新增 `shared/integration` 的 Manifest、Command/Event Envelope、Ack 与参数 schema 校验。
- Seamer Registry、Trigger Manager 与 Dashboard 改为任意 Provider ID 和 schema-driven 表单；四个设备 Adapter 迁移到版本化 Manifest。
- Schedule Manager 新增标准 PlaylistItem、来源隔离导入、preview/commit/rollback、到期去重与配置字段迁移事件。
- Google Sheets Adapter 改用统一 Import Batch；新增 PostgreSQL Adapter、Seamer Schedule Adapter 和配置模板。
- 新增 AES-256-GCM SecretManager、CommandGateway、NodeCG 兼容 envelope 与统一 redaction。
- OBS 推流设置、VB Matrix `updatePatch`/节点切换、ATEM Macro 接入 CommandGateway，并保留旧消息名。
- Backup 新增路径分级、manifest、SHA-256 和 L3 scrypt + AES-256-GCM 加密；Dashboard 新增英文级别选择与风险确认。
- Logger 接入写入前脱敏；新增独立 SQLite + WAL Audit Store。
- 新增 29 项无外部服务测试与 GitHub Actions CI。

### 功能增减

- 新增动态 Seamer Capability、Schedule 多来源模型与显式 Schedule 自动化。
- 新增可选 PostgreSQL 播单来源；`pg` 与 lockfile 已更新并通过 Bundle 构建。
- 新增分级备份和独立命令审计；普通日志自动清理不再影响审计记录。
- Graphics Package 保持 Deferred，本轮未修改。

### 功能实现路径

- 核心 Bundle 不依赖中央业务 Bundle；共享 TypeScript Library 随使用方打包，跨核心功能只由可选 Adapter 连接。
- Replicant 保存当前快照，Schedule Event 表示显式变化，CommandGateway 统一执行角色、schema、目标检查、执行结果与脱敏审计。
- PostgreSQL 只允许单条 `SELECT`，连接串只从配置指定的环境变量读取。
- L3 文件不会以明文加入 ZIP；归档只包含密文、salt、iv、认证 tag 和 manifest，口令不入归档。

### 已知 Bug

- 旧 NodeCG `listenFor` 消息不提供可信用户身份；兼容 wrapper 只能记录合成的 `nodecg-dashboard` 身份，不能代替 OIDC/反向代理或会话桥鉴权。
- OBS WebSocket password 与 stream credentials 仍可能存在旧 Replicant 明文路径；SecretManager Library 已完成，但凭据迁移尚未接线。
- `node:sqlite` 在当前 Node 24 仍输出 experimental warning。
- `npm install` 报告 48 个依赖漏洞（2 low、26 moderate、20 high），其中包含开发依赖，尚未完成逐项可达性和升级影响评估。

### 预期解决方法

- 使用 `npm audit` 输出逐项确认生产依赖可达性，优先无破坏性升级；不得直接使用 `npm audit fix --force`。
- 使用 PostgreSQL 只读账号执行端到端导入测试，并在 CI 运行独立 Bundle matrix。
- 接入认证身份桥后停止信任客户端自报角色，再逐步关闭高风险 legacy wrapper。
- 将 OBS 凭据迁入服务端 SecretManager，只向 Dashboard 发布 configured/masked 状态；随后继续迁移其他剩余高风险入口。
- 在真实硬件上验证 Matrix、ATEM Macro 与 OBS 推流命令，并保存 fixture 和验收记录。

### 已解决 Bug 以及解决方法

- 解决新增 Seamer 模块必须修改核心硬编码的问题：Registry 与 UI 改为消费 Adapter Manifest。
- 解决 Schedule 外部来源整表互相覆盖的问题：导入按 sourceId 隔离并支持 preview/commit/rollback。
- 解决任意播单变化可能误触发的问题：只生成 item_due 与配置 field_changed 事件。
- 解决普通备份无差别包含配置和数据库的问题：引入 L0-L3 选择，L3 仅加密输出。
- 解决 Logger 可能持久化常见 secret 模式的问题：Replicant 与文件写入前统一 redaction。
- 解决普通日志清理误删审计历史的架构风险：审计改用独立 SQLite + WAL 存储。
- 解决 PostgreSQL Adapter 依赖与构建阻塞：安装 `pg`、更新 lockfile，并完成 17 个 Bundle 全量构建。

## 2026-07-13 剩余安全与外部验收工作

### 需求变化

- 完成上一阶段遗留的 OBS Secret 迁移、可信身份注入、依赖审计和外部集成验收准备。
- 高风险 Dashboard 命令不得继续信任客户端自报身份；Seamer 自动化仍需在 legacy 默认关闭时工作。
- PostgreSQL Adapter 除只读账号外，还需在会话层强制只读事务和超时。

### 代码变动

- SecretManager 新增删除、严格 32-byte base64/hex master key 解码和环境变量工厂。
- 新增 `OBSSecretSettings`，将 WebSocket password、stream key 和 stream auth password 保存为 `cfg/secrets/obs-control/*.encrypted-secret.json`。
- `obsConnections` 与 `obsStreamSettings` 只发布非敏感字段和 configured 状态；旧 Replicant 明文会在扩展启动时抓取后立即清洗并迁移。
- OBS Dashboard 的 secret 输入改为本地一次性草稿，空值表示沿用，显式 clear 才删除。
- 新增 NodeCG authenticated Socket command channel；identity 仅由 `socket.request.user` 构造，客户端提交的 identity 被忽略。
- OBS、ATEM Macro、VB Matrix patch Dashboard 改用认证命令；对应 legacy 高风险消息默认拒绝。
- 三个 Seamer Adapter 改为调用目标 Bundle `executeCommand` API，并使用可审计的 service identity。
- PostgreSQL 查询新增只读事务、statement timeout、rollback/release 和危险 SQL 结构拒绝。
- CI 新增生产依赖 audit 门和 PostgreSQL 17 live service 测试。
- 新增 localhost 与 authenticated NodeCG 配置模板，以及三个 legacy 安全开关模板。
- 在不使用 `--force` 的前提下更新 workspace lockfile；NodeCG 随兼容范围升级至 2.8.0，Vite 升至 6.4.3，并将跨 Bundle API 访问迁移到 `nodecg.extensions`。

### 功能增减

- 新增 OBS Secret 加密迁移、configured/masked UI 状态和 connection 删除时 Secret 级联清理。
- 新增可信用户命令与 Adapter service command 两条身份路径。
- 新增 PostgreSQL live E2E 测试入口；本机无 URL 时保持普通测试无外部依赖。
- 高风险 legacy 消息由默认允许改为默认拒绝；只有部署配置显式 opt-in 才恢复。

### 功能实现路径

- `LEAFSEAMER_SECRET_MASTER_KEY` 只从 NodeCG 进程环境读取，密钥不进入 cfg、Replicant、日志或备份。
- Dashboard request 只含 command、correlationId 和 payload；服务端从 NodeCG session 读取 subject/roles 后创建 CommandEnvelope。
- NodeCG local authenticated user 的 `superuser` role 可执行控制；自定义角色可使用 `broadcast` 或 `audio`。
- Seamer Adapter 不经过浏览器会话，直接调用声明依赖的目标 Bundle API，身份记录为 `service:seamer-adapter-*`。
- PostgreSQL 每次 poll 获取独立 client，执行 `BEGIN TRANSACTION READ ONLY`、`SET LOCAL statement_timeout`、SELECT、COMMIT，并在失败时 ROLLBACK。

### 已知 Bug

- 当前机器没有 PostgreSQL/OBS/ATEM/VBAN/Mixer 目标，也没有 Docker；真实设备和本地 PostgreSQL live test 无法执行。
- 2026-07-13 联网审计在兼容升级后仍有 11 个中危、0 个高危和 0 个严重漏洞；剩余项来自 NodeCG 上游 OpenTelemetry/TypeORM、旧 Google API 依赖树及 UUID，npm 仅给出 NodeCG 降级或跨主版本升级方案，暂不执行破坏性 `--force` 修复。
- `node:sqlite` 在当前 Node 24 测试中仍输出 experimental warning。

### 预期解决方法

- 推送分支后由 CI PostgreSQL 17 service 产生真实数据库测试证据，并检查生产依赖 audit 门。
- 在现场提供目标地址和测试窗口后执行 OBS、ATEM、VB Matrix、Mixer 只读/可回滚验收清单。
- 跟踪 NodeCG 与 Google APIs 的上游修复；在独立升级分支评估跨主版本迁移，不直接执行 `npm audit fix --force`。

### 已解决 Bug 以及解决方法

- 解决 OBS secret 进入 Replicant：启动迁移旧值，公开状态只保留 configured 标记，后续 secret 只写加密存储。
- 解决 Dashboard 可伪造 identity：客户端不再提交 identity，服务端只接受 NodeCG authenticated session。
- 解决 legacy 默认绕过 CommandGateway：高风险旧消息默认拒绝，Adapter 改用 service identity API。
- 解决 OBS 设备同步空 secret 被误当作“沿用旧值”：设备 capture 与 Dashboard draft 使用不同语义。
- 解决 PostgreSQL 查询只靠字符串前缀判断：增加数据库只读事务、超时、回滚和 client 释放。
- 解决依赖树 20 个高危公告命中：联网审计后执行兼容 lockfile 更新，将完整与生产依赖结果均降至 11 个中危、0 个高危、0 个严重。
- 解决 NodeCG 2.8 类型与运行时 API 变化：将 logger、Schedule Adapter、Seamer Adapter 和共享审计入口统一改用 `nodecg.extensions`。
- 最新源码已通过 47 项测试、全仓 TypeScript 检查和 17 Bundle 全量生产构建。

## 2026-07-13 Bundle 源码独立性文档与验收

### 需求变化

- 每个受影响 Bundle 必须使用版本化 `src/_leaf-core/` 快照构建；`shared/integration` 与 `shared/security` 仍为唯一权威源。
- 独立性文档必须明确快照不可手工修改，权威源变化后必须执行 `core:sync`，并提供一致性检查和隔离构建命令。

### 代码变动

- 新增 README 及中英日三语安装手册的 Bundle 源码独立性说明，记录 `core:sync`、`core:check` 与代表性隔离构建命令。
- `.gitignore` 已核对：不会忽略 `bundles/*/src/_leaf-core/`，并继续忽略各 Bundle 的 `node_modules/` 与隔离测试临时产物。
- P2 评审记录 `sync-bundle-core.ts` 的两处 `replaceAll` 类型逃逸为 Minor 改善项；本轮仅记录，不修改实现。

### 功能实现路径

- 开发者只在 `shared/integration` 和 `shared/security` 修改共享逻辑，随后运行 `npm run core:sync` 生成并提交每个 Bundle 的本地快照。
- `npm run core:check` 验证快照未漂移；`powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle seamer` 在临时目录验证真实隔离构建。
- CI matrix 对 17 个 Bundle 执行真实临时目录构建；`atem-control` 与 `seamer` 代表隔离构建已通过。

### 已知 Bug

- `seamer` 的直接生产依赖 `uuid@9.0.1` 存在 GHSA-w5hq-g745-h8pq 中危公告；当前仅调用 `v4`，本任务不升级依赖。

### 预期解决方法

- 在独立升级分支评估升至 `uuid` 14 的 semver-major 迁移，完成兼容性验证后再更新生产依赖。

### 已解决 Bug 以及解决方法

- 解决旧 CI 未进行真正隔离构建的问题：改为每个 Bundle 使用已提交的本地 `src/_leaf-core/` 快照，并在 CI matrix 的临时目录执行真实构建验证。

## 2026-07-13 设备 Dashboard UI 统一与阶段验收

### 需求变化

- 非 Graphics Dashboard 统一采用 Dense Hardware Console，并统一使用英文可见 UI 文案。
- ATEM、Mixer 与 OBS 的 Dashboard 必须使用各自 bundle 内的版本化 `_leaf-ui` 本地快照，不能以运行时共享 UI 源码替代。

### 代码变动

- ATEM Connection 与 Control 接入本地 UI 快照、`PanelHeader`、分层控件、确认删除、Toast 和入口错误边界；删除当前选中交换机后同步回退选中 IP。
- Mixer Connection 与 Panel 接入本地 UI 快照、`PanelHeader`、分层控制、内部滚动布局和入口错误边界。
- OBS Connection 与 Live Control 接入本地 UI 快照、`PanelHeader`、确认删除、Promise 回执驱动的 Toast、内部滚动布局和入口错误边界。

### 功能增减

- 仅新增 UI 层的确认流程、临时 Toast 反馈和入口错误边界；未新增录制命令协议。
- 未变更既有命令名称、payload、Replicant 或 Secret schema；OBS 录制仍只显示已有状态。

### 功能实现路径

- 每个入口以 `PanelHeader` 显示身份、目标和状态，并按高频操作、次级工具与高级设置组织 Tiered Controls。
- 矩阵、通道与长内容使用组件内部滚动区域，避免页面级横向溢出；样式从内联声明迁移至 bundle 专属样式表与 UI 令牌。
- 有 Promise 回执的认证命令在失败时使用 Toast；本阶段未为 fire-and-forget 消息或未实现回执的命令伪造成功或 pending 状态。
- 设备入口继续绑定原有命令、Replicant 与认证调用路径；入口合同测试精确验证真实入口组件、渲染 API 和关键命令绑定。

### 已知 Bug

- 尚未在真实 ATEM、Mixer 或 OBS 硬件上完成端到端命令验收。
- 浏览器视觉截图验收留待后续 O5 阶段完成。
- OBS 录制目前仅显示既有状态，尚无开始或停止录制的命令协议；这不是本轮 UI 改造引入的回归。

### 预期解决方法

- 在具备真实设备、目标地址和可回滚测试窗口后，分别执行 ATEM、Mixer 与 OBS 的端到端命令验收。
- 在 O5 阶段按设计规范补充浏览器视觉截图，并检查 320、480 和 768px 宽度。
- 在独立协议任务中定义、实现并验收 OBS 录制命令后，再绑定常驻录制控制。

### 已解决 Bug 以及解决方法

- 解决 ATEM 删除当前选择后仍保留失效 IP 的问题：删除或清空交换机列表时，选中 IP 回退至首个可用项或空字符串。
- 解决 OBS 使用 `window.alert` 提示命令失败的问题：改用非阻塞 Toast 展示错误结果。
- 解决设备入口缺少错误边界的问题：ATEM、Mixer 与 OBS 的各 Dashboard 入口均以 `PanelErrorBoundary` 包裹根组件。
- 解决布局溢出和大量内联样式的问题：使用稳定的 Grid、内部滚动与 bundle 专属 CSS，移除对应入口的内联样式。

### 阶段验证

- `npm.cmd run core:check`：通过。
- `npm.cmd run ui:check`：通过。
- `npm.cmd test`：通过，76 项测试、0 项失败；Node 24 输出既有 `node:sqlite` experimental warning。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run build --workspace atem-control`：通过；仅输出既有 Vite `build.outDir` 与 root 父子目录关系警告。
- `npm.cmd run build --workspace mixer-control`：通过；仅输出既有 Vite `build.outDir` 与 root 父子目录关系警告。
- `npm.cmd run build --workspace obs-control`：通过；仅输出既有 Vite `build.outDir` 与 root 父子目录关系警告。
- `git diff --check`：通过。

## 2026-07-13 Dashboard UI 统一文档与最终验收说明

### 需求变化

- README 与英、中、日三语用户手册统一记录非 Graphics Dashboard 的 UI 开发、同步与验收流程，并链接 `docs/UI_DESIGN_GUIDELINES.md`。
- 文档明确 `shared/dashboard-ui/` 是权威源，8 个受管 Dashboard bundle 使用本地 `_leaf-ui` 快照；Dashboard 运行时禁止跨 bundle 或直接导入权威源。
- 可见 Dashboard UI 文案统一使用英文；Graphics 明确不属于本轮 UI 统一范围。

### 代码变动

- 更新 UI 设计规范的源码独立性状态：11 个需要共享核心的 bundle 已使用版本化 `_leaf-core` 快照，`core:check` 防止漂移；CI 已具备全部 17 个 bundle 的临时目录隔离安装与构建能力。
- 补充 Playwright 验收说明：12 个非 Graphics Dashboard 在 320、480、768px 下有 36 张 Windows Chromium 视觉基线，并保留 4 个关键交互流程。
- 补充 ConfirmDialog 的可访问性合同：`aria-labelledby` 绑定标题，`aria-describedby` 绑定说明正文。
- `.gitignore` 继续忽略 `playwright-report/` 与 `test-results/`，并明确 UI 规范、本地 `_leaf-ui` 快照和 Playwright snapshot PNG 受版本控制。

### 功能增减

- 新增统一的 UI 同步、漂移检查和视觉验收文档入口；有意刷新视觉基线使用 `npm run test:ui:update`。
- 未增加或移除业务功能，消息名、payload 与 Replicant schema 未因 UI 改造改变。

### 功能实现路径

- 开发者在 `shared/dashboard-ui/` 修改权威 UI 源，执行 `npm run ui:sync` 写入并提交各 bundle 本地 `_leaf-ui` 快照，再用 `npm run ui:check` 检查漂移。
- Bundle 单独复制后只依赖自身源码安装构建；需要共享 UI 或共享核心的 bundle 分别使用本地 `_leaf-ui` 或 `_leaf-core` 快照。CI 对全部 17 个 bundle 的临时目录隔离构建路径进行验证。
- 页面改动在 320、480、768px 检查无页面级溢出、焦点可见和运行时错误，随后由 `npm run test:ui` 比对 36 张视觉基线及 4 个交互流程。
- 本轮文档任务不执行 8 个核心 bundle 的最终隔离构建；该验收由主代理最终验证执行。

### 已知 Bug

- 真实 NodeCG、认证 socket 与 ATEM、Mixer、OBS、VB Matrix 等硬件尚未接入本轮验收环境，现有 UI 交互测试使用 stub，不能替代端到端设备验证。
- Playwright snapshot 基线限定 Windows Chromium；在其他浏览器或平台刷新 PNG 会引入非产品差异，当前仅记录该平台约束。
- `npm audit` 仍报告 11 个 moderate 漏洞；本轮仅记录，不擅自执行 `npm audit fix` 或破坏性升级。

### 预期解决方法

- 在具备真实 NodeCG、认证会话、目标硬件和可回滚窗口后，执行真实 socket 与设备端到端验收。
- 在 Windows Chromium CI 环境维护和审阅视觉基线；跨平台差异另建兼容性任务评估。
- 跟踪上游依赖修复，在独立升级分支评估兼容性后处理 11 个 moderate 漏洞。

### 已解决 Bug 以及解决方法

- 解决 UI 规范仍将源码级独立性描述为未成立的问题：文档改为记录已完成的 `_leaf-core` 快照、`core:check` 漂移检查和 17 bundle CI 隔离构建能力。
- 解决 ConfirmDialog 缺少稳定可访问名称与描述约束的问题：规范要求以 `aria-labelledby` 和 `aria-describedby` 分别绑定唯一的标题与说明节点。
- 解决 UI 快照、视觉基线和 Playwright 运行产物的版本控制边界不清的问题：保留运行产物忽略规则，同时明确受管快照和 PNG 基线不忽略。

### 阶段验证

- 静态/业务测试：80/80。
- Playwright：40/40，其中 36 个视觉基线与 4 个交互测试。
- 覆盖范围：12 个非 Graphics Dashboard；8 个受管共享 UI 快照；17 bundle 源码独立构建 CI。

## 2026-07-14 F1 终审真实 UI 行为修复

### 需求变化

- 终审要求 ATEM Macro、OBS Streaming/Connection 和 VB Patch 的异步认证命令在 Promise 完成前同步防重复提交，且不得改变既有命令、payload 或 Replicant 成功状态来源。
- OBS Scene 必须消除嵌套交互元素；Playlist 必须具备完整模态对话框焦点生命周期；VB Network 删除后需将焦点恢复到稳定的相邻删除按钮或新增按钮。

### 代码变动

- ATEM Macro、OBS Streaming、OBS Connection 与 VB Patch 分别加入 `useRef` 同步锁、可见 pending 状态、禁用控件和 `finally` 解锁；既有 toast 错误路径保持不变。
- OBS Scene 改为相邻的原生选择按钮与 "Switch to program" 按钮；后者只调用既有 `setOBSScene` 消息。
- OBS Playlist 加入 `role="dialog"`、模态语义、标题/描述关联、初始聚焦、Tab 圈定、Escape/遮罩关闭和仍连接触发元素的焦点恢复。
- VB Network 删除通过稳定的 `data-network-remove-id` 和 ref，在确认后恢复相邻删除按钮或 Add Configuration。
- 扩展 Dashboard AST/契约测试，覆盖同步锁、pending、`finally`、Scene 语义、Playlist 焦点合同与删除焦点恢复。

### 功能增减

- 新增命令在途阻断和可访问的 pending 提示；没有新增、删除或重命名任何 NodeCG 消息、bundle 名或命令 payload。

### 功能实现路径

- 所有锁在发送认证命令前立即写入 `ref.current`，React 状态仅负责渲染 pending；Promise 的 `catch` 仍写入现有 toast，`finally` 负责唯一解锁点。
- 焦点恢复以 DOM 稳定属性和 ref 为准，不按可见文本定位；Cancel 继续使用既有 ConfirmDialog 的原触发元素恢复路径。

### 已知 Bug

- 当前环境没有真实 ATEM、OBS 或 VB Matrix 设备与认证 NodeCG 会话；静态契约和构建不能替代真实设备命令往返验收。

### 预期解决方法

- 在具备可回滚设备窗口后，对 Macro、Start/Stop、Save/Connect/Disconnect/Remove、Patch 与 Playlist 键盘焦点路径执行端到端验收。

### 已解决 Bug 以及解决方法

- 解决快速重复点击可在 React 状态提交前重复发出认证命令：以同步 ref 在命令前加锁，并在 `finally` 释放。
- 解决 Scene 容器嵌套真实按钮导致的键盘语义冲突：拆分为相邻原生按钮。
- 解决 Playlist 缺少对话框语义和焦点管理：实现模态属性、焦点圈定和关闭恢复。
- 解决删除配置后焦点悬空：删除完成渲染后定位相邻稳定删除按钮，无相邻项则回退新增按钮。

### 阶段验证

- 实现提交：`b410358`（`fix: harden dashboard command interactions`）。
- 定向 RED：`node -r ts-node/register -e "require('./tests/dashboard-ui-device.test'); require('./tests/test-harness').runTests();"`，初始 7 项中 4 项失败，原因是缺少命令锁、Scene 按钮语义、Playlist 焦点合同和 Network 删除焦点；随后针对连接性恢复合同得到 1 项预期失败。
- 定向 GREEN：同一命令通过，7/7。
- `npm.cmd test`：84/84 通过；仅有既有 `node:sqlite` experimental warning。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run build --workspace atem-control`、`obs-control`、`vb-matrix-control`：通过；仅有既有 Vite `build.outDir` 警告。

## 2026-07-14 F1 独立审查 Important 修复

### 需求变化

- 独立审查要求删除焦点恢复不得依赖未转义 CSS selector，组件卸载后不得在异步完成路径写入状态，并要求静态合同能拒绝诱饵实现。

### 代码变动

- VB Network 以稳定 Remove 按钮 ref map 替代 `querySelector`；rAF 在组件/依赖变更时可取消，目标按钮已消失或断连时回退 Add Configuration。
- ATEM、OBS Streaming、OBS Connection、VB Patch 新增 mounted ref 生命周期保护；锁始终在 `finally` 无条件释放，异步后的 pending、保存成功状态与 toast 更新仅在挂载时执行。
- OBS Scene 删除原生按钮上的手写 Enter/Space 处理，交由浏览器默认 click 行为。
- Dashboard AST 合同改为验证真实 handler 的 guard、加锁、命令调用、同链 `finally`、mounted 状态保护与 pending 绑定，并加入多类负例夹具。

### 功能增减

- 未改变任何消息名、payload、bundle 名、Replicant 成功状态来源或 Graphics 内容。

### 功能实现路径

- 认证命令在同步锁写入后才进入真实命令/回调；`finally` 始终先释放锁，挂载检查只保护 React 状态与 toast。
- 删除后焦点从 ref map 获取相邻 Remove，获取失败才回退新增按钮；取消路径仍由 ConfirmDialog 管理。

### 已知 Bug

- 没有真实设备与认证 NodeCG 会话，仍需现场验证快速双击和辅助技术焦点行为。

### 预期解决方法

- 后续浏览器任务补充真实双击与焦点测试，并在设备窗口执行端到端验收。

### 已解决 Bug 以及解决方法

- 解决相邻 Remove 在 rAF 前消失时可能丢失焦点：ref map 查找失败回退 Add Configuration，并清理待执行 rAF。
- 解决异步结束后可能更新已卸载组件：mounted ref 守卫所有指定完成路径的状态更新。
- 解决 Scene 键盘激活可能重复调用展开逻辑：移除手写键盘处理。

### 阶段验证

- 实现提交：`dd5d521`（`fix: harden dashboard review contracts`）。
- 定向 RED：强化合同首次运行 6 项中 3 项失败，分别命中 mounted/真实锁链、Scene 手写键盘与 Network selector/ref map。
- 定向 GREEN：6/6 通过。
- `npm.cmd test`：83/83 通过；`npm.cmd run typecheck` 与 ATEM、OBS、VB 构建通过，仅有既有 warning。
