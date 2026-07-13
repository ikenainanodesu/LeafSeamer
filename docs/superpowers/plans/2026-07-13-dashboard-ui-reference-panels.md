# Dashboard UI Reference Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Logger System 与 VB Matrix Control 改造成 Dense Hardware Console 的参考实现，并验证 Tiered Controls 在日志、网络配置和矩阵操作中的可用性。

**Architecture:** 两个 bundle 只导入自己的 `_leaf-ui` 快照；共享组件负责 Header、按钮、折叠、确认和错误隔离，现有组件继续拥有 Replicant 与 NodeCG 消息逻辑。局部 CSS 只描述日志列表、矩阵、patch 行和网络配置等业务布局。

**Tech Stack:** React 19.2、TypeScript 5.7、Vite 6、Lucide React 1.23.0、共享 Dashboard UI 1.0.0。

## Global Constraints

- 必须先完成源码独立性前置计划和 Dashboard UI Foundation 计划。
- 不新增 Log Viewer 功能；保留搜索、Bundle/Level 筛选和自动清理周期。
- 不改变 VB Matrix 的 `refreshMatrix`、patch/de-patch、preset 和网络配置消息或 Replicant。
- Matrix 节点点击不得增加确认；删除网络配置和 preset 继续要求确认。
- UI 文案统一为英文，新增代码注释统一为中文。
- 所有被修改文件中的既有英文代码注释必须改为等义中文，不能原样保留。
- `graphics-package` 不修改。
- 320、480、768px 下页面级不得意外横向溢出；Matrix 允许内部横向滚动。

---

### Task 1: 用静态合同固定参考面板入口

**Files:**
- Create: `tests/dashboard-ui-reference.test.ts`
- Modify: `tests/run-tests.ts`

**Interfaces:**
- Consumes: 本地 `_leaf-ui/index.css` 与 `PanelErrorBoundary`。
- Produces: 三个 Dashboard 入口的导入与错误隔离合同。

- [ ] **Step 1: 写入失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");
const entries = [
  "bundles/logger-system/src/dashboard/log-viewer.tsx",
  "bundles/vb-matrix-control/src/dashboard/panel.tsx",
  "bundles/vb-matrix-control/src/dashboard/network-config-panel.tsx",
];

test("reference dashboards use the local UI snapshot and error boundary", () => {
  for (const relative of entries) {
    const source = fs.readFileSync(path.join(projectRoot, relative), "utf8");
    ok(source.includes('_leaf-ui/index.css'));
    ok(source.includes("PanelErrorBoundary"));
  }
});

test("VB matrix keeps authenticated point toggling", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "bundles/vb-matrix-control/src/dashboard/components/MatrixView.tsx"),
    "utf8"
  );
  ok(source.includes('"vb.updatePatch"'));
  ok(source.includes("exists: !isPatched"));
});
```

在 `tests/run-tests.ts` 加入：

```ts
import "./dashboard-ui-reference.test";
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，三个入口尚未导入 `_leaf-ui` 或 `PanelErrorBoundary`。

- [ ] **Step 3: 提交参考合同**

```bash
git add tests/dashboard-ui-reference.test.ts tests/run-tests.ts
git commit -m "test: define reference dashboard UI contract"
```

---

### Task 2: 统一 Log Viewer

**Files:**
- Modify: `bundles/logger-system/src/dashboard/log-viewer.tsx`
- Modify: `bundles/logger-system/src/dashboard/log-viewer.css`

**Interfaces:**
- Consumes: `PanelHeader`、`PanelErrorBoundary`、`IconButton` 与本地 UI CSS。
- Produces: 参考日志面板；业务状态仍由 `logs`、`logCleanupPeriodMs` 和现有筛选 state 管理。

- [ ] **Step 1: 接入本地 UI 与 Lucide**

在现有导入区加入：

```tsx
import { Search, X } from "lucide-react";
import {
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
```

- [ ] **Step 2: 用共享 Header 保留现有读数**

把现有 `viewer-header` 替换为以下结构，保持 `levelCounts` 与 `logs.length` 计算不变：

```tsx
<PanelHeader
  kicker="Logger System"
  title="Runtime Logs"
  target={`${logs.length} events`}
  status="Live"
  statusTone="success"
  actions={
    <div className="level-summary" aria-label="Log level summary">
      <span data-tone="neutral"><strong>{levelCounts.info}</strong> Info</span>
      <span data-tone="warning"><strong>{levelCounts.warn}</strong> Warn</span>
      <span data-tone="danger"><strong>{levelCounts.error}</strong> Error</span>
    </div>
  }
/>
```

搜索字段左侧使用 `<Search size={14} aria-hidden="true" />`；清除搜索使用：

```tsx
<IconButton
  label="Clear search"
  icon={<X size={14} aria-hidden="true" />}
  onClick={() => setQuery("")}
/>
```

Level 保持 `aria-pressed` 分段控制；Bundle 与 cleanup period 继续使用原 select，不改变 value 或更新函数。

- [ ] **Step 3: 在入口增加错误隔离**

把文件末尾 render 改为：

```tsx
root.render(
  <PanelErrorBoundary>
    <LogViewer />
  </PanelErrorBoundary>
);
```

- [ ] **Step 4: 收敛局部 CSS**

删除 `log-viewer.css` 中与 `tokens.css` 重复的根颜色变量、body reset 和通用按钮规则；保留日志专属类。根布局改为：

```css
.log-viewer { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.viewer-tools { display: grid; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--leaf-border); background: var(--leaf-surface); }
.filter-primary-row { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(120px, auto) minmax(120px, auto); gap: 8px; }
.search-control { display: grid; grid-template-columns: 18px minmax(0, 1fr) 32px; align-items: center; min-width: 0; }
.level-filter { display: flex; flex-wrap: wrap; gap: 4px; }
.log-surface { min-width: 0; background: var(--leaf-surface-deep); }
.log-entry { display: grid; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--leaf-border); }
.log-time, .log-bundle, .log-category { font-family: var(--leaf-font-mono); }
@media (max-width: 479px) {
  .filter-primary-row { grid-template-columns: 1fr; }
  .level-summary { width: 100%; }
}
```

- [ ] **Step 5: 验证 Log Viewer**

Run: `npm test && npm run build --workspace logger-system`

Expected: 全部 PASS；`logger-system/log-viewer.html` 构建成功。

手动检查：搜索、Bundle、Level 和 cleanup period 保持功能；空状态与新日志提示不改变。

- [ ] **Step 6: 提交 Logger 参考实现**

```bash
git add bundles/logger-system/src/dashboard
git commit -m "style: unify log viewer console UI"
```

---

### Task 3: 统一 VB Network Configuration

**Files:**
- Modify: `bundles/vb-matrix-control/src/dashboard/network-config-panel.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/NetworkConfigList.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/vb-control.css`

**Interfaces:**
- Consumes: `PanelHeader`、`Button`、`IconButton`、`ConfirmDialog`、`PanelErrorBoundary`。
- Produces: 窄面板可读的 Network Configuration；Replicant `networkConfigs` 与 `hostInfo` 保持原样。

- [ ] **Step 1: 更新入口**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import NetworkConfigList from "./components/NetworkConfigList";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./vb-control.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <NetworkConfigList />
    </PanelErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 2: 使用共享 Header 与图标按钮**

在 `NetworkConfigList.tsx` 导入 `Plus`、`Trash2`，并使用：

```tsx
<PanelHeader
  kicker="VBAN Matrix"
  title="Network Configuration"
  target={localIPs.length > 0 ? localIPs.join(" · ") : "No local IPs"}
  status={`${configs.length} Configs`}
  statusTone={configs.length > 0 ? "success" : "warning"}
/>
```

新增配置按钮改为：

```tsx
<Button tone="primary" onClick={handleAdd}>
  <Plus size={15} aria-hidden="true" />
  Add Configuration
</Button>
```

删除按钮改用 `IconButton` + `Trash2`，不再显示手写 `X`。

- [ ] **Step 3: 用共享确认对话框替换浏览器 confirm**

增加 `pendingRemovalId` state；`handleRemove` 只执行已有 Replicant 更新。对话框使用：

```tsx
<ConfirmDialog
  open={pendingRemovalId !== null}
  title="Remove Connection"
  message="This removes the selected Matrix connection from this NodeCG instance."
  confirmLabel="Remove Connection"
  onCancel={() => setPendingRemovalId(null)}
  onConfirm={() => {
    if (pendingRemovalId) handleRemove(pendingRemovalId);
    setPendingRemovalId(null);
  }}
/>
```

- [ ] **Step 4: 修正窄面板布局**

```css
.vb-shell--compact .config-list { display: grid; gap: 8px; padding: 8px; }
.network-card { position: relative; display: grid; gap: 8px; min-width: 0; padding: 10px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.network-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.network-remove { position: absolute; top: 8px; right: 8px; }
@media (max-width: 479px) {
  .network-fields { grid-template-columns: 1fr 1fr; }
  .field--name { padding-right: 40px; }
}
@media (max-width: 359px) {
  .network-fields { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: 验证 Network Configuration**

Run: `npm run typecheck && npm run build --workspace vb-matrix-control`

Expected: exit 0；320px 下 IP、Port、Stream 字段不重叠。

- [ ] **Step 6: 提交网络面板**

```bash
git add bundles/vb-matrix-control/src/dashboard
git commit -m "style: unify VB network configuration UI"
```

---

### Task 4: 统一 VB Matrix Control 与 Tiered Controls

**Files:**
- Modify: `bundles/vb-matrix-control/src/dashboard/panel.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/Panel.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/MatrixView.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/PatchStatus.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/BankSlot.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/vb-control.css`

**Interfaces:**
- Consumes: `PanelHeader`、`Disclosure`、`IconButton`、Lucide `Plus`、`RefreshCw`、`Trash2`。
- Produces: Matrix 常驻，Patch Control、Preset Manager、Preset Bank 分层；消息调用保持原样。

- [ ] **Step 1: 更新入口错误隔离**

在 `panel.tsx` 导入本地 UI CSS 和 `PanelErrorBoundary`，render 使用：

```tsx
root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <Panel />
    </PanelErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 2: 建立层级**

`Panel.tsx` 顶部使用：

```tsx
<PanelHeader
  kicker="VBAN Matrix"
  title="VB Matrix Control"
  target={activeConnection ? `${activeConnection.name} · ${activeConnection.ip}` : "Not configured"}
  status={activeConnectionId ? "Configured" : "Not Configured"}
  statusTone={activeConnectionId ? "neutral" : "warning"}
/>
```

`MatrixView` 保持常驻。其后使用三个独立折叠区：

```tsx
<Disclosure title="Patch Control" summary={`${filteredPatches.length} active`} defaultOpen storageKey="vb.patch-control.open">
  <div className="leaf-toolbar">
    <Button tone="primary" onClick={handleAddPatch}>
      <Plus size={15} aria-hidden="true" />
      Add Patch
    </Button>
  </div>
  {filteredPatches.length === 0 ? <div className="empty-state">No patches for this matrix.</div> : null}
  <div className="patch-list">
    {filteredPatches.map((patch, index) => (
      <article className="patch-row" key={patch.id}>
        <div className="patch-row-heading">
          <span className="patch-index">Patch {index + 1}</span>
          {index > 0 ? (
            <IconButton
              tone="danger"
              label={`Remove patch ${index + 1}`}
              icon={<Trash2 size={14} aria-hidden="true" />}
              onClick={() => handleRemovePatch(patch.id)}
            />
          ) : null}
        </div>
        <PatchSelector
          patchId={patch.id}
          connectionId={activeConnectionId}
          status={patch}
          onSelectionChange={() => {}}
        />
        <PatchStatus status={patch} />
      </article>
    ))}
  </div>
</Disclosure>
<Disclosure title="Preset Manager" defaultOpen={false} storageKey="vb.preset-manager.open">
  <PresetManager name={presetName} setName={setPresetName} />
</Disclosure>
<Disclosure title="Preset Bank" defaultOpen={false} storageKey="vb.preset-bank.open">
  <Bank />
</Disclosure>
```

为上述 JSX 导入共享 `Button`、`IconButton` 和 Lucide `Plus`、`Trash2`；`PatchSelector`、`PatchStatus` props 与 `handleRemovePatch` 保持原签名。

- [ ] **Step 3: 替换手写工具符号**

- Add patch：`<Plus size={15} />`
- Refresh Matrix：`<RefreshCw size={15} />`
- Remove patch/preset：`<Trash2 size={14} />`

所有图标按钮使用 `IconButton`，保留现有 click handler 和英文 label。

`MatrixView` 导入 `ToastRegion` 与 `useToast`，声明 `const { items: toasts, pushToast } = useToast()`，并在组件根节点末尾渲染 `<ToastRegion items={toasts} />`。Authenticated command 使用真实 Promise 生命周期清理 pending，不再使用固定 700ms 计时器：

```ts
void sendAuthenticatedCommand("vb-matrix-control", "vb.updatePatch", patch)
  .catch((error) => {
    pushToast(error instanceof Error ? error.message : String(error), "danger");
  })
  .finally(() => {
    setPendingKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  });
```

Matrix cell 增加 `aria-busy={isPending}` 与 `disabled={isPending}`，command 和 patch payload 保持不变。

`PatchStatus.tsx` 同样使用自己的 `useToast`/`ToastRegion`，把该文件现有的 `window.alert` 改为 `pushToast(message, "danger")`；连接、断开、Gain 和 Mute command 保持不变。

- [ ] **Step 4: 固定 Matrix 尺寸与滚动**

```css
.matrix-panel { min-width: 0; }
.matrix-scroll { max-width: 100%; overflow: auto; overscroll-behavior: contain; background: var(--leaf-surface-deep); }
.matrix-grid { width: max-content; min-width: 100%; grid-auto-columns: 30px; }
.matrix-cell { width: 28px; height: 28px; min-width: 28px; padding: 0; border-radius: 2px; }
.matrix-output-header { position: sticky; top: 0; z-index: 3; background: var(--leaf-surface-deep); }
.matrix-input-header { position: sticky; left: 0; z-index: 2; background: var(--leaf-surface-deep); }
.matrix-cell[aria-busy="true"] { box-shadow: inset 0 0 0 2px var(--leaf-warning); }
```

不要修改 `togglePoint` 中的 `sendAuthenticatedCommand` command 名称或 payload。

- [ ] **Step 5: 运行参考阶段验证**

先把 `Panel.tsx`、`NetworkConfigList.tsx`、`BankSlot.tsx` 和 `MatrixView.tsx` 中触及代码附近的英文注释改为等义中文，不改 symbol 或 UI 文案。

Run: `npm test && npm run typecheck && npm run build --workspace logger-system && npm run build --workspace vb-matrix-control`

Expected: 全部 exit 0。

手动验证：Matrix 节点 patch/de-patch、刷新、Patch Control、preset 保存/载入/删除和网络配置均可操作。

- [ ] **Step 6: 提交 VB 主面板**

```bash
git add bundles/vb-matrix-control/src/dashboard
git commit -m "style: unify VB matrix control UI"
```
