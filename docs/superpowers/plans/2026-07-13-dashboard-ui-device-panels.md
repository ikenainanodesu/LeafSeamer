# Dashboard UI Device Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ATEM、Mixer 和 OBS 的连接与控制面板统一为 Dense Hardware Console，同时保持所有设备命令、认证流程和 Replicant 行为兼容。

**Architecture:** 每个设备 bundle 用共享 Header、Button、Disclosure、Confirm Dialog 和 Error Boundary 建立一致骨架，设备专属 CSS 负责 Program/Preview、通道条、Scene/Source 与推流状态。React state 和 NodeCG 调用留在现有组件中，不迁入共享 UI。

**Tech Stack:** React 19.2、TypeScript 5.7、Vite 6、Lucide React 1.23.0、Dashboard UI 1.0.0。

## Global Constraints

- 必须先完成源码独立性、UI Foundation 和 Reference Panels 三个计划。
- 所有 LeafSeamer 自有可见文案使用英文，新增代码注释使用中文。
- 所有被修改文件中的既有英文代码注释必须改为等义中文，不能原样保留。
- 不改变 ATEM、Mixer 或 OBS 的消息名、payload、Replicant 名称和 SecretManager 流程。
- CUT/AUTO、Scene 切换、Mute、Fader、Streaming 和 Recording 不增加确认步骤。
- 删除已保存连接等不可逆配置操作使用确认对话框。
- 设备状态只由现有 Replicant 或消息回执决定，不用前端假状态显示成功。
- `graphics-package` 不修改。

---

### Task 1: 固定设备面板入口与命令合同

**Files:**
- Create: `tests/dashboard-ui-device.test.ts`
- Modify: `tests/run-tests.ts`

**Interfaces:**
- Consumes: 六个设备 Dashboard 入口和现有命令字符串。
- Produces: 本地 UI、Error Boundary 和关键设备命令不变的回归检查。

- [ ] **Step 1: 写入失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");
const entries = [
  "bundles/atem-control/src/dashboard/atem-connection.tsx",
  "bundles/atem-control/src/dashboard/atem-control.tsx",
  "bundles/mixer-control/src/dashboard/mixer-connection.tsx",
  "bundles/mixer-control/src/dashboard/mixer-panel.tsx",
  "bundles/obs-control/src/dashboard/obs-connection.tsx",
  "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
];

test("device dashboards use local UI snapshots and error boundaries", () => {
  for (const relative of entries) {
    const source = fs.readFileSync(path.join(projectRoot, relative), "utf8");
    ok(source.includes('_leaf-ui/index.css'));
    ok(source.includes("PanelErrorBoundary"));
  }
});

test("device UI refactor preserves critical command names", () => {
  const files = [
    "bundles/atem-control/src/dashboard/atem-panel.tsx",
    "bundles/mixer-control/src/dashboard/mixer-control-panel.tsx",
    "bundles/mixer-control/src/dashboard/output-control-panel.tsx",
    "bundles/obs-control/src/dashboard/obs-control-panel.tsx",
  ];
  const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");
  for (const command of [
    "atem:cut",
    "atem:auto",
    "atem:setSource",
    "setMixerFader",
    "setMixerMute",
    "setMixerOutputFader",
    "setOBSScene",
    "obs.startStreaming",
    "obs.stopStreaming",
  ]) {
    ok(source.includes(command));
  }
});
```

在 `tests/run-tests.ts` 加入：

```ts
import "./dashboard-ui-device.test";
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，设备入口尚未导入本地 UI 或 Error Boundary；命令合同测试继续 PASS。

- [ ] **Step 3: 提交设备合同**

```bash
git add tests/dashboard-ui-device.test.ts tests/run-tests.ts
git commit -m "test: protect device dashboard UI contracts"
```

---

### Task 2: 统一 ATEM Connection 与 Control

**Files:**
- Create: `bundles/atem-control/src/dashboard/atem-dashboard.css`
- Modify: `bundles/atem-control/src/dashboard/atem-connection.tsx`
- Modify: `bundles/atem-control/src/dashboard/atem-control.tsx`
- Modify: `bundles/atem-control/src/dashboard/atem-panel.tsx`

**Interfaces:**
- Consumes: `atem:switchers`、现有 ATEM 命令和共享 UI 组件。
- Produces: Connection、Program/Preview、Transition、Outputs、Sources 和 Macros 的分层界面。

- [ ] **Step 1: 接入本地 UI 与错误隔离**

两个入口都导入：

```tsx
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./atem-dashboard.css";
```

两个入口的 root render 都使用：

```tsx
root.render(
  <PanelErrorBoundary>
    <AtemConnection />
  </PanelErrorBoundary>
);
```

`atem-control.tsx` 中对应子组件必须为 `<AtemControl />`，不得误用 Connection 组件。

- [ ] **Step 2: 改造 Connection 面板**

用 `switchers.some((item) => item.connected)` 计算 `hasConnectedSwitcher`，Header 使用：

```tsx
<PanelHeader
  kicker="ATEM Control"
  title="Switcher Connection"
  target={`${switchers.length} configured`}
  status={hasConnectedSwitcher ? "Connected" : "Disconnected"}
  statusTone={hasConnectedSwitcher ? "success" : "warning"}
/>
```

Add Switcher 区使用 `leaf-field`、`leaf-input` 和共享 Button；Switcher 项目作为重复卡片显示 alias、IP 和真实 connected 状态。Connect/Disconnect 保留原 handler。Delete 使用 `Trash2` IconButton 与 `ConfirmDialog`，确认后仍调用：

```ts
nodecg.sendMessage("atem:remove", pendingRemovalIp);
```

删除现有的模拟 discovery 注释；在 discovery 尚未实现时不显示无功能控件。

- [ ] **Step 3: 改造 Control 与 AtemPanel 层级**

`atem-control.tsx` 使用 Header 和 `Plus` IconButton 管理页面；空状态使用英文 `No active switchers. Configure a connection first.`。

`atem-panel.tsx` 保持 Preview、Transition、Program 常驻；把当前 Outputs、Sources、Macros JSX 改为以下结构：

```tsx
<Disclosure title="Outputs" defaultOpen storageKey={`atem.${selectedIp}.outputs`}>
  <div className="atem-output-grid">
    {[{ index: 0, label: "Output" }, { index: 1, label: "Webcam Out" }].map((output) => (
      <label className="leaf-field" key={output.index}>
        <span>{output.label}</span>
        <select
          className="leaf-input"
          value={state.aux ? state.aux[output.index] : 0}
          onChange={(event) => handleAuxSource(output.index, parseInt(event.target.value))}
        >
          <option value={0}>Select Source</option>
          {filterSources(state.sources, true).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </label>
    ))}
  </div>
</Disclosure>
<Disclosure title="Sources" summary="Drag to Program or Preview" storageKey={`atem.${selectedIp}.sources`}>
  <div className="atem-source-grid">
    {filterSources(state.sources, false).map(([id, name]) => (
      <button
        className="leaf-button"
        draggable
        key={id}
        onDragStart={(event) => onDragStart(event, parseInt(id))}
        onClick={() => handleSourceChange("preview", parseInt(id))}
        type="button"
      >
        {name}
      </button>
    ))}
  </div>
</Disclosure>
<Disclosure title="Macros" summary={`${Object.keys(state.macros).length} available`} storageKey={`atem.${selectedIp}.macros`}>
  <div className="atem-macro-grid">
    {Object.entries(state.macros).map(([id, name]) => (
      <Button key={id} onClick={() => handleRunMacro(parseInt(id))}>{String(name)}</Button>
    ))}
    {Object.keys(state.macros).length === 0 ? <div>No macros found.</div> : null}
  </div>
</Disclosure>
```

Macros 的 summary 修正为 `${Object.keys(state.macros).length} available`。CUT/AUTO 使用共享 Button，但 onClick 继续指向 `handleCut` 与 `handleAuto`。

`AtemPanel` 使用 `const { items: toasts, pushToast } = useToast()`，把 `handleRunMacro` 的 `window.alert` 改为 `pushToast(message, "danger")`，并在面板根节点末尾渲染 `<ToastRegion items={toasts} />`。Macro command 名称和 payload 不变。

- [ ] **Step 4: 创建 ATEM 专属 CSS**

```css
.atem-shell { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.atem-content { display: grid; gap: 8px; padding: 8px; }
.atem-switcher-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.atem-switcher-card { border: 1px solid var(--leaf-border); border-left: 3px solid var(--leaf-text-faint); border-radius: var(--leaf-radius); background: var(--leaf-surface); padding: 10px; }
.atem-switcher-card[data-connected="true"] { border-left-color: var(--leaf-success); }
.atem-live-grid { display: grid; grid-template-columns: minmax(0, 1fr) 150px minmax(0, 1fr); gap: 8px; }
.atem-bus { min-width: 0; border: 1px solid var(--leaf-border); background: var(--leaf-surface-deep); }
.atem-transition { display: grid; align-content: start; gap: 8px; }
.atem-source-grid, .atem-output-grid, .atem-macro-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; }
@media (max-width: 479px) {
  .atem-live-grid { grid-template-columns: 1fr; }
  .atem-transition { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 5: 验证 ATEM**

先把三个 ATEM TSX 文件中的英文行注释和 JSX 注释改为等义中文，并删除冗长的推测性注释；保留仍有价值的过滤与路由说明。

Run: `npm test && npm run typecheck && npm run build --workspace atem-control`

Expected: 全部 exit 0；关键命令合同 PASS。

手动检查：连接、断开、删除、Program/Preview、CUT/AUTO、Transition、Aux、Source drag 和 Macro 均保持可用。

- [ ] **Step 6: 提交 ATEM 面板**

```bash
git add bundles/atem-control/src/dashboard
git commit -m "style: unify ATEM dashboard UI"
```

---

### Task 3: 统一 Mixer Connection 与 Channel Strips

**Files:**
- Create: `bundles/mixer-control/src/dashboard/mixer-dashboard.css`
- Modify: `bundles/mixer-control/src/dashboard/mixer-connection.tsx`
- Modify: `bundles/mixer-control/src/dashboard/mixer-panel.tsx`
- Modify: `bundles/mixer-control/src/dashboard/mixer-control-panel.tsx`
- Modify: `bundles/mixer-control/src/dashboard/output-control-panel.tsx`

**Interfaces:**
- Consumes: `mixerState`、connection settings 和全部现有 Mixer 消息。
- Produces: 连接设置、输入/输出通道条和 Input Sends 的密集控制台布局。

- [ ] **Step 1: 接入本地 UI**

`mixer-connection.tsx` 与 `mixer-panel.tsx` 导入 `_leaf-ui/index.css`、`mixer-dashboard.css` 和 `PanelErrorBoundary`。两个入口分别包裹现有 `MixerConnection` 与 `MixerPanel`。

- [ ] **Step 2: 改造连接面板**

Header 使用真实 `connected`：

```tsx
<PanelHeader
  kicker="Mixer Control"
  title="Mixer Connection"
  target={`${settings.ip}:${settings.port}`}
  status={connected ? "Connected" : "Disconnected"}
  statusTone={connected ? "success" : "warning"}
/>
```

Host、Port、Username、Password 使用 field 网格；连接时继续禁用原字段。Connect/Disconnect 使用共享 Button 并保留 `connectMixer`、`disconnectMixer` 调用。

- [ ] **Step 3: 改造输入与输出通道**

`mixer-panel.tsx` 使用两个 Disclosure：

```tsx
<Disclosure title="Input Channels" defaultOpen storageKey="mixer.inputs.open">
  <MixerControlPanel />
</Disclosure>
<Disclosure title="Output Channels" defaultOpen storageKey="mixer.outputs.open">
  <OutputControlPanel />
</Disclosure>
```

输入和输出组件移除内联颜色，使用 `mixer-channel`、`mixer-fader`、`mixer-meter` 和 `mixer-mute` 类。Mute 继续直接调用现有 handler，不增加确认。Output 的 Input Sends 保持每个 output 内的 Disclosure，展开时继续触发 `queryOutputRouting`。

- [ ] **Step 4: 创建通道条 CSS**

```css
.mixer-shell { min-width: 0; background: var(--leaf-bg); }
.mixer-channel-viewport { max-width: 100%; overflow-x: auto; padding: 8px; }
.mixer-channel-grid { display: grid; grid-auto-flow: column; grid-auto-columns: 150px; width: max-content; min-width: 100%; gap: 6px; }
.mixer-channel { display: grid; grid-template-rows: auto minmax(150px, 1fr) auto; gap: 8px; min-height: 280px; padding: 8px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.mixer-channel[data-muted="true"] { border-color: var(--leaf-danger); }
.mixer-fader { width: 100%; accent-color: var(--leaf-command); }
.mixer-mute[aria-pressed="true"] { border-color: var(--leaf-danger); color: var(--leaf-danger); }
.mixer-send-grid { display: grid; gap: 6px; min-width: 320px; }
```

- [ ] **Step 5: 验证 Mixer**

先把三个 Mixer 控制组件中的英文行注释和 JSX 注释改为等义中文，包括 Input Sends、Pre、Pan 和 dB 范围说明。

Run: `npm test && npm run typecheck && npm run build --workspace mixer-control`

Expected: 全部 exit 0。

手动检查：连接/断开、Input patch、Fader、Mute、Output Fader、Output Mute、Input Sends pre/active/level/pan 均可用。

- [ ] **Step 6: 提交 Mixer 面板**

```bash
git add bundles/mixer-control/src/dashboard
git commit -m "style: unify mixer dashboard UI"
```

---

### Task 4: 统一 OBS Connection 与 Live Control

**Files:**
- Modify: `bundles/obs-control/src/dashboard/obs-connection.tsx`
- Modify: `bundles/obs-control/src/dashboard/obs-connection.css`
- Modify: `bundles/obs-control/src/dashboard/obs-control-panel.tsx`
- Modify: `bundles/obs-control/src/dashboard/obs-control-panel.css`

**Interfaces:**
- Consumes: 现有 OBS connection、scene/source、media、stream settings、SecretManager 与 authenticated command API。
- Produces: Live 常驻，Scenes/Sources 与 Connection/Advanced 分层的 OBS 控制台。

- [ ] **Step 1: 更新两个入口**

两个 TSX 文件都导入本地 `_leaf-ui/index.css`、共享 `PanelErrorBoundary` 和现有局部 CSS；root render 包裹各自原组件。不得改变 `sendAuthenticatedCommand` 的本地 `_leaf-core` 导入。

两个组件分别使用 `useToast` 与 `ToastRegion`：`obs-connection.tsx` 的 `showCommandError` 改为调用 `pushToast(message, "danger")`；`obs-control-panel.tsx` 中 Streaming 设置与启动失败的两个 `window.alert` 改为同一 hook。所有 authenticated command 名称、顺序和 payload 保持不变。

- [ ] **Step 2: 改造 Connection**

使用当前连接数组计算真实在线数量：

```tsx
<PanelHeader
  kicker="OBS Control"
  title="OBS Connection"
  target={`${connections.length} configured`}
  status={connectedCount > 0 ? `${connectedCount} Online` : "Offline"}
  statusTone={connectedCount > 0 ? "success" : "warning"}
/>
```

连接表单放入默认展开的 `Connection` Disclosure；已经保存的 WebSocket password 继续只显示配置状态，不回填明文。Connect、Disconnect、Save、Clear Secret 继续使用原 command 和 payload。

- [ ] **Step 3: 建立 Live、Sources、Advanced 层级**

每个 OBS card 保持当前 Scene、Transition、Streaming 和 Recording 常驻。把当前 `obs-stream-settings` 中 Server 到 authentication password 的字段（现文件第 860–978 行）原样移动到默认关闭的 Disclosure，并把 Streaming action 移到 Disclosure 之前：

```tsx
<div className="obs-live-actions">
  <Button tone={isStreaming ? "danger" : "primary"} onClick={toggleStreaming}>
    {isStreaming ? "Stop Streaming" : "Start Streaming"}
  </Button>
  {isStreaming && streamStats ? (
    <div className="obs-stream-stats">
      <span>Time: {streamStats.outputTimecode || "00:00:00"}</span>
      {streamStats.kbitsPerSec > 0 ? <span>Bitrate: {streamStats.kbitsPerSec} kbps</span> : null}
    </div>
  ) : null}
</div>
<Disclosure
  title="Stream Destination"
  summary={isStreaming ? "Locked while live" : "Ready"}
  storageKey={`obs.${id}.destination`}
>
  <div className="obs-settings-grid">
    <label className="leaf-field">
      <span>Server</span>
      <input
        className="leaf-input"
        type="text"
        value={localSettings.server}
        onChange={(event) => handleLocalSettingChange("server", event.target.value)}
        disabled={isStreaming}
        placeholder="rtmp://..."
      />
    </label>
  </div>
</Disclosure>
```

上述代码显示 Server 字段的最终 class 和 handler；Stream Key、Use authentication、Username、Password 与 clear checkbox 使用相同的 `leaf-field`/`leaf-input` 结构，并逐项保留当前 `localSettings` value、`handleLocalSettingChange` key、`isStreaming` disabled 条件和 configured placeholder。Scenes 默认展开，Source 列表继续随 scene 展开；media transport 使用 `SkipBack`、`Play`、`Pause`、`Square`、`RotateCcw`、`SkipForward` 和 `ListVideo` 图标，保留现有 handler 与 title。Streaming/Recording 按钮状态由现有 `isStreaming`、`isRecording` 决定。

- [ ] **Step 4: 收敛 OBS CSS**

```css
.obs-shell { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.obs-card-list { display: grid; gap: 8px; padding: 8px; }
.obs-control-card { min-width: 0; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.obs-live-strip { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--leaf-border); }
.obs-scenes { display: grid; gap: 4px; }
.obs-scene[aria-current="true"] { border-color: var(--leaf-success); }
.obs-scene[aria-selected="true"] { border-color: var(--leaf-command); }
.obs-source-row { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.obs-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 479px) {
  .obs-live-strip, .obs-settings-grid { grid-template-columns: 1fr; }
}
```

删除旧 CSS 中独立的绿色主按钮、蓝色普通按钮和大圆角定义，状态颜色改用共享令牌。

- [ ] **Step 5: 验证 OBS**

先把两个 OBS CSS 中的英文分区注释以及 `obs-connection.tsx` 中的英文注释改为等义中文；现有中文媒体与 Scene 注释保留。

Run: `npm test && npm run typecheck && npm run build --workspace obs-control`

Expected: 全部 exit 0；`obs-secret-settings` 与 authenticated command 既有测试 PASS。

手动检查：连接、Scene 选择与切换、Source 显示/隐藏与排序、media transport、stream credentials 保存/清除、Streaming 与 Recording 均保持可用。

- [ ] **Step 6: 提交 OBS 面板**

```bash
git add bundles/obs-control/src/dashboard
git commit -m "style: unify OBS dashboard UI"
```

---

### Task 5: 设备阶段回归

**Files:**
- Modify: `DEVELOPMENT_MEMO.md`

**Interfaces:**
- Consumes: 三个设备 bundle 的最终 UI。
- Produces: 设备面板改造记录与阶段验收结果。

- [ ] **Step 1: 运行阶段总验证**

Run: `npm run core:check && npm run ui:check && npm test && npm run typecheck`

Expected: 全部 exit 0。

Run: `npm run build --workspace atem-control && npm run build --workspace mixer-control && npm run build --workspace obs-control`

Expected: 三个 bundle 分别构建成功。

- [ ] **Step 2: 更新开发日志**

在 `DEVELOPMENT_MEMO.md` 的需求变化、代码变动、功能实现路径和已知/已解决 bug 中记录 `2026-07-13` 的 ATEM、Mixer、OBS UI 统一结果与剩余手动设备测试限制。

- [ ] **Step 3: 提交阶段日志**

```bash
git add DEVELOPMENT_MEMO.md
git commit -m "docs: record device dashboard UI rollout"
```
