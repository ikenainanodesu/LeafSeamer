# F2 浏览器回归与测试服务器收紧报告

## 结果

- 状态：完成。
- 实现提交：`1f69523`（`fix: harden dashboard browser regressions`）。
- 报告与开发日志使用后续文档提交承载；本文件记录可验证的实现提交 SHA，避免提交内容自引用自身 SHA。
- `graphics-package`：HEAD 范围与工作树均无改动。

## 根因与实现

1. Playwright 1.61.1 在 Windows 忽略 `gracefulShutdown`，测试体完成后退回 `taskkill /T /F`，受管环境会卡在 `Terminating the WebServer`。已删除 `webServer` 配置，改由 `tests/ui/global-setup.mjs` 在 runner 进程内启动服务器并返回异步 teardown。
2. 原服务器从仓库根解析任意路径并带 10 秒 idle timer。现仅允许 8 个 bundle 的 `dashboard/` 与 `shared/` 文件，并逐级校验词法路径和 `realpath`，拒绝目录、穿越、文件 symlink 及 output directory junction 逃逸。
3. NodeCG stub 原本不能延迟认证 socket ack，也不能为 Scene/VLC 普通消息返回 fixture。现支持 event 级 pending queue、`resolveSocket`、`rejectSocket` 与 `messageResults`。
4. F1 交互回归全部在页面上下文同一 task 内连续点击，并精确检查 `window.__nodecgTest.calls` 的 event/command/payload 或 bundle/message/payload。
5. F1 将 VB Remove 从 `IconButton` 改为原生 ref 按钮时漏掉 `leaf-button` 类。浏览器快照捕获该视觉回归后补回基础类，VB 三张旧基线重新通过。

## RED/GREEN 与命令记录

| 阶段 | 命令 | 退出码 | 数量/结果 |
| --- | --- | ---: | --- |
| 生命周期 RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 0/1；缺少 `startDashboardServer` 导出 |
| 生命周期 GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 1/1 |
| 服务器定向 | `npx.cmd playwright test --workers=1 --reporter=line --grep "Dashboard test server"` | 0 | 2/2；teardown 正常退出 |
| ATEM 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "ATEM Macro"` | 1 | 0/1；pending 文案改变导致 locator 失配 |
| OBS Streaming 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Streaming"` | 0 | 1/1 |
| OBS Connection 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Connection Connect"` | 1 | 0/1；非精确名称同时匹配 Add Connection |
| OBS Scene 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Scene Switch"` | 0 | 1/1 |
| OBS Playlist 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Playlist"` | 0 | 1/1 |
| VB Patch 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Patch"` | 0 | 1/1 |
| VB Network 初跑 | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Network"` | 0 | 1/1；当时两个焦点分支在同一测试 |
| ATEM 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "ATEM Macro"` | 0 | 1/1 |
| OBS Streaming 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Streaming"` | 0 | 1/1 |
| OBS Connection 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Connection Connect"` | 0 | 1/1 |
| OBS Scene 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Scene Switch"` | 0 | 1/1 |
| OBS Playlist 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Playlist"` | 0 | 1/1 |
| VB Patch 增强回归 | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Patch"` | 0 | 1/1 |
| VB Network 相邻项 | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Network 删除后"` | 0 | 1/1 |
| VB Network 最后一项 | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Network 删除最后一项"` | 0 | 1/1 |
| symlink RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 1/2；启动 API 尚未使用 fixture root |
| symlink GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 2/2 |
| 服务器复验 | `npx.cmd playwright test --workers=1 --reporter=line --grep "Dashboard test server"` | 0 | 2/2；空闲 10.25 秒后仍为 200 |
| 首次全量 UI | `npm.cmd run test:ui -- --workers=1 --reporter=line` | 1 | 44/50；仅 OBS 3 张预期变化与 VB 3 张基础类回归 |
| VB 定向构建 | `npm.cmd run build --workspace vb-matrix-control` | 0 | 构建成功；无测试计数 |
| VB 旧基线复验 | `npx.cmd playwright test --workers=1 --reporter=line --grep "vb-network fits"` | 0 | 3/3 |
| OBS 基线更新 | `npx.cmd playwright test --workers=1 --reporter=line --grep "obs-control fits" --update-snapshots` | 0 | 3/3，仅更新 OBS 320/480/768 |
| 最终全量 UI | `npm.cmd run test:ui -- --workers=1 --reporter=line` | 0 | 50/50；17 bundle build 成功 |
| 单元/合同测试 | `npm.cmd test` | 0 | 83/83；仅既有 SQLite experimental warning |
| 类型检查 | `npm.cmd run typecheck` | 0 | 无测试计数；0 个类型错误 |
| 一行直接探针 | `node --input-type=module -e <direct probe>` | 1 | 0 项；PowerShell 引号解析失败，服务器未启动 |
| 永久直接探针 | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 3/3；含日志真实换行与 HTTP 200 |
| 格式检查 | `git diff --check` / `git diff --cached --check` | 0 | 无测试计数；无 whitespace error |
| Graphics 边界 | `git diff --name-only 4cb3af2..HEAD -- bundles/graphics-package` | 0 | 空输出 |
| 工作树 Graphics 边界 | `git diff --name-only -- bundles/graphics-package` | 0 | 空输出 |
| 服务器残留 | `Get-NetTCPConnection -LocalPort 4173 -State Listen` 包装检查 | 0 | 无监听 |

## 快照检查

- 人工打开并检查 `obs-control-320/480/768-chromium-win32.png`：Scene 选择按钮与 `Switch to program` 为相邻交互，三个宽度均无文本截断、重叠或横向溢出。
- VB Network 初次差异只位于 Remove 图标；补回 `leaf-button` 后旧基线 3/3 通过，没有更新 VB PNG。
- 最终 Git 快照变更仅包含三张 OBS Control PNG。

## 遗留风险

- 浏览器测试使用 NodeCG stub，不能替代真实登录会话、认证 socket 与 ATEM/OBS/VB 硬件往返验收。
- 视觉基线限定 Windows Chromium；其他平台不应直接刷新这些 PNG。
- 受管环境可能仍有接手前启动的历史 Playwright runner。本轮未广泛终止未知 Node 进程；所有 F2 runner 均得到真实退出码，global teardown 生效且 4173 无监听。

## 独立审查修复（2026-07-14）

### 结果

- 状态：五项 finding 全部修复。
- 实现提交：`7f154bd`（`fix: address F2 hardening review`）。
- 文档由后续提交承载，避免报告提交自引用自身 SHA。
- 未修改 `graphics-package`，未改变生产 bundle 命令契约。

### Finding 处置

1. **原始 HTTP 点段绕过**：在 WHATWG `new URL()` 规范化前，从 `request.url` 提取原始 pathname，百分号解码并将反斜线视作分隔符，拒绝独立 `.`/`..` 段。测试使用 `node:http` 的原始 request path，覆盖明文 `../`、`%2e%2e%2f` 和 `%2e%2e%5c`。
2. **bundles 根 junction**：解析 `realProjectRoot`，要求 `realBundlesRoot` 严格位于其内；保留 `realBundleRoot -> realBundlesRoot`、`realOutputRoot -> realBundleRoot`、`realTarget -> realOutputRoot` 全链校验。新增整个 `projectRoot/bundles` junction 指向外部时返回 404 的用例。
3. **设备命令精确断言**：读取全部 `socket.emit` 调用，不按 command 过滤；用 `toEqual` 比较完整 event、payload 数组、command 与业务 payload，仅 correlationId 使用 `expect.any(String)`。Streaming/Connect 在第一条 ack 前及第二条命令发出后分别断言完整序列。
4. **Windows 正常退出**：保留 Playwright global setup 同进程 stop；直接脚本仅在 Node IPC channel 存在时响应内部 shutdown 消息。生命周期测试用 `child_process.fork` 发送 IPC，等待 `{ code: 0, signal: null }`；`child.kill()` 只用于失败清理，不参与成功判定。`closeServer()` 明确 await `stopDashboardServer()`。
5. **并发 stop 完成边界**：模块级 `WeakMap` 按 server 缓存关闭 Promise，第二次调用返回同一对象，不因 `listening` 已变为 false 而提前完成。

### 本轮 RED/GREEN 与命令记录

| 阶段 | 命令 | 退出码 | 数量/结果 |
| --- | --- | ---: | --- |
| 原始点段 RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 3/4；原始 `../` 实际返回 200 |
| 原始点段 GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 4/4 |
| bundles junction RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 4/5；外部 bundles junction 实际返回 200 |
| bundles junction GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 5/5 |
| IPC 自然退出 RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 4/5；内部关闭请求超时 |
| IPC 自然退出 GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 5/5；自然退出 code 0、signal null |
| 并发 stop RED | `node --test tests/dashboard-server-lifecycle.test.mjs` | 1 | 5/6；两次调用不是同一 Promise |
| 生命周期最终 GREEN | `node --test tests/dashboard-server-lifecycle.test.mjs` | 0 | 6/6；最终复验耗时 377.7ms |
| socket 精确负控 RED | `npx.cmd playwright test --workers=1 --reporter=line --grep "ATEM Macro"` | 1 | 0/1；临时额外 emit 被完整序列断言捕获 |
| ATEM Macro GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "ATEM Macro"` | 0 | 1/1 |
| OBS Streaming GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Streaming"` | 0 | 1/1 |
| OBS Connection GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Connection Connect"` | 0 | 1/1 |
| OBS Scene GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Scene Switch"` | 0 | 1/1 |
| OBS Playlist GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "OBS Playlist"` | 0 | 1/1 |
| VB Patch GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Patch"` | 0 | 1/1 |
| VB Network 相邻项 GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Network 删除后"` | 0 | 1/1 |
| VB Network 最后一项 GREEN | `npx.cmd playwright test --workers=1 --reporter=line --grep "VB Network 删除最后一项"` | 0 | 1/1 |
| 服务器 Playwright | `npx.cmd playwright test --workers=1 --reporter=line --grep "Dashboard test server"` | 0 | 2/2；teardown 正常退出 |
| 全量 UI | `npm.cmd run test:ui -- --workers=1 --reporter=line` | 0 | 50/50；17 个 bundle 构建成功，总命令 109.7s |
| 单元/合同测试 | `npm.cmd test` | 0 | 83/83；仅既有 SQLite experimental warning |
| 类型检查 | `npm.cmd run typecheck` | 0 | 0 个类型错误 |
| 工作树格式检查 | `git diff --check` | 0 | 无 whitespace error；仅 Git 的 LF/CRLF 提示 |
| 暂存区格式检查 | `git diff --cached --check` | 0 | 无 whitespace error |
| Graphics 工作树边界 | `git diff --name-only -- bundles/graphics-package` | 0 | 空输出 |
| Graphics 基线范围 | `git diff --name-only 4cb3af2..HEAD -- bundles/graphics-package` | 0 | 空输出 |
| 服务器残留 | `Get-NetTCPConnection -LocalPort 4173 -State Listen` 包装检查 | 0 | 无监听 |

### 快照复核

- 本轮修复没有新增或更新快照；全量 50/50 继续通过。
- 保留此前人工确认的 OBS Control 320/480/768 三张 Scene 双按钮快照；三个宽度清晰、无截断、重叠或溢出。
- VB Network 320/480/768 继续匹配旧基线，没有更新。

### 遗留风险

- NodeCG stub 无法替代真实登录会话、认证 socket 与设备硬件往返验收。
- Windows Chromium PNG 不代表其他平台的字体栅格化结果；跨平台不应直接刷新当前基线。
- IPC shutdown 只在父进程显式创建 IPC channel 时启用，不是网络端点；直接人工运行仍通过既有 SIGINT/SIGTERM 路径关闭。
