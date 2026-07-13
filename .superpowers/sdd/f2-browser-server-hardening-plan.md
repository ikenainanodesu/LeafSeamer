# F2 浏览器服务器收紧实施计划

> **执行要求：** 按系统化调试与 TDD 顺序逐项完成；每项先观察预期失败，再实施最小修复并重新验证。

**目标：** 让 Dashboard UI 测试服务器只暴露获准构建输出，并由 Playwright 在同一 Node 进程中可靠启动和关闭，同时补齐 F1 设备交互的真实 Chromium 回归。

**架构：** `scripts/serve-dashboard-ui.mjs` 导出显式启动/关闭 API，直接执行脚本时仍监听固定端口。`tests/ui/global-setup.ts` 在 Playwright runner 进程内启动服务器并返回异步 teardown；`playwright.config.ts` 不再配置 `webServer` 子进程。

**技术栈：** Node.js HTTP/ESM、Playwright 1.61.1、TypeScript、Chromium。

## 全局约束

- 不修改 `graphics-package`，不改变生产命令、bundle 名或 payload。
- 保留并审查现有三份未提交在途改动，不撤销他人工作。
- 所有新增代码注释使用中文，可见 UI 文案使用英文。
- 不恢复 idle timer，不依赖 Windows `taskkill /T /F`。

---

### 任务 1：服务器生命周期模块化

**文件：**
- 新建：`tests/dashboard-server-lifecycle.test.mjs`
- 修改：`scripts/serve-dashboard-ui.mjs`

- [ ] 编写测试，要求 `startDashboardServer({ port: 0 })` 返回正在监听的服务器，并可由 `await stopDashboardServer(server)` 完整关闭。
- [ ] 运行 `node --test tests/dashboard-server-lifecycle.test.mjs`，确认因导出缺失而 RED。
- [ ] 将请求处理器、启动、关闭与直接执行入口分离；信号处理只属于直接执行入口。
- [ ] 重跑生命周期测试，确认 1/1 GREEN 且进程自行退出。

### 任务 2：Playwright 同进程托管与服务器边界

**文件：**
- 新建：`tests/ui/global-setup.ts`
- 修改：`playwright.config.ts`
- 修改：`tests/ui/dashboard-panels.spec.ts`

- [ ] 在 global setup 中启动 `127.0.0.1:4173`，返回调用关闭 API 的异步 teardown。
- [ ] 删除 `webServer` 配置，保留原有 `baseURL` 和命令契约。
- [ ] 验证 dashboard/shared 有效文件、GET/HEAD、405、仓库与 Graphics 路径 404，以及空闲超过 10 秒仍存活。
- [ ] 用 `npx.cmd playwright test --workers=1 --reporter=line --grep "Dashboard test server"` 验证测试与 teardown 均正常退出。

### 任务 3：NodeCG 测试桩与八项交互回归

**文件：**
- 修改：`tests/ui/nodecg-stub.ts`
- 修改：`tests/ui/dashboard-panels.spec.ts`

- [ ] 保留完整 init 参数解构，支持按 socket event 延迟 ack 并由测试 resolve/reject。
- [ ] 支持按普通消息名返回 Scene item 与 VLC Playlist 结果。
- [ ] 逐项运行 ATEM Macro、OBS Streaming、OBS Connection、OBS Scene、OBS Playlist、VB Patch、VB Network 两种焦点分支回归。
- [ ] 所有重复点击在页面上下文同一 task 内执行，并断言真实 calls 的 command、bundle/message 和 payload。

### 任务 4：全量验证、日志与提交

**文件：**
- 修改：`DEVELOPMENT_MEMO.md`
- 新建：`.superpowers/sdd/f2-browser-server-hardening-report.md`

- [ ] 运行 `npm.cmd run test:ui`，人工检查任何快照变化；仅接受 Scene 合理结构变化。
- [ ] 运行 `npm.cmd test`、`npm.cmd run typecheck`、`git diff --check` 和 Graphics 边界检查。
- [ ] 核对无残留测试服务器进程，记录每条命令、退出码、测试数量和遗留风险。
- [ ] 更新开发日志与 F2 报告，审查最终差异后提交全部 F2 改动。
