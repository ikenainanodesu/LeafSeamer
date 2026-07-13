# Dashboard UI Operations Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一 Schedule Manager、Seamer 和 Backup System，并用 Playwright 多宽度检查和独立构建完成整个 Dashboard UI 项目的验收。

**Architecture:** 三个业务面板使用共享 UI 骨架但继续拥有自己的 Replicant、消息和编辑状态。最终测试通过本地静态服务器加载各 bundle 的构建产物，注入最小 NodeCG stub，检查 320、480、768px 的溢出、焦点和视觉基线。

**Tech Stack:** React 19.2、TypeScript 5.7、Vite 6、Lucide React 1.23.0、Playwright Test 1.61.1、Node.js 24。

## Global Constraints

- 必须依次完成源码独立性、UI Foundation、Reference Panels 和 Device Panels 计划。
- 本计划不新增 Schedule 同步、Seamer capability 或 Backup 数据功能，只整理现有功能的 UI。
- Schedule 的 `replaceSchedule`、Seamer 的 Replicant/`runSeamerCard`、Backup 的 `createBackup` payload 保持不变。
- L3 Secret 风险确认和最少 12 字符 passphrase 规则保持不变。
- UI 文案统一为英文，新增代码注释统一为中文。
- `graphics-package` 不得修改，也不进入 Playwright 页面清单。
- 最终验收必须包含八个目标 bundle 的独立构建和所有 Dashboard 页面截图。

---

### Task 1: 固定编排与服务面板合同

**Files:**
- Create: `tests/dashboard-ui-operations.test.ts`
- Modify: `tests/run-tests.ts`

**Interfaces:**
- Consumes: Schedule、Seamer、Backup Dashboard 入口和关键命令字符串。
- Produces: 本地 UI、Error Boundary 和业务命令兼容合同。

- [ ] **Step 1: 写入失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { ok, test } from "./test-harness";

const projectRoot = path.resolve(__dirname, "..");
const entries = [
  "bundles/schedule-manager/src/dashboard/schedule-panel.tsx",
  "bundles/seamer/src/dashboard/main.tsx",
  "bundles/backup-system/src/dashboard/backup-control.tsx",
];

test("operations dashboards use local UI snapshots and error boundaries", () => {
  for (const relative of entries) {
    const source = fs.readFileSync(path.join(projectRoot, relative), "utf8");
    ok(source.includes('_leaf-ui/index.css'));
    ok(source.includes("PanelErrorBoundary"));
  }
});

test("operations UI refactor preserves command names", () => {
  const schedule = fs.readFileSync(path.join(projectRoot, entries[0]), "utf8");
  const seamer = fs.readFileSync(
    path.join(projectRoot, "bundles/seamer/src/dashboard/App.tsx"),
    "utf8"
  );
  const backup = fs.readFileSync(path.join(projectRoot, entries[2]), "utf8");
  ok(schedule.includes('"replaceSchedule"'));
  ok(seamer.includes('"runSeamerCard"'));
  ok(backup.includes('"createBackup"'));
  ok(backup.includes("secretPassphrase"));
});
```

在 `tests/run-tests.ts` 加入：

```ts
import "./dashboard-ui-operations.test";
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，三个入口尚未导入本地 UI 或 Error Boundary；命令合同继续 PASS。

- [ ] **Step 3: 提交业务 UI 合同**

```bash
git add tests/dashboard-ui-operations.test.ts tests/run-tests.ts
git commit -m "test: protect operations dashboard contracts"
```

---

### Task 2: 统一 Schedule Manager

**Files:**
- Create: `bundles/schedule-manager/src/dashboard/schedule-dashboard.css`
- Modify: `bundles/schedule-manager/src/dashboard/schedule-panel.tsx`

**Interfaces:**
- Consumes: `scheduleData` Replicant 与 `replaceSchedule`。
- Produces: 本地与外部条目可区分、可扫描的播单面板；只允许编辑 local 条目。

- [ ] **Step 1: 接入本地 UI 与图标**

```tsx
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  IconButton,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./schedule-dashboard.css";
```

- [ ] **Step 2: 增加纯 UI 删除确认状态**

```tsx
const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
const localCount = schedule.filter((item) => item.sourceId === "local").length;
const externalCount = schedule.length - localCount;
```

现有 `removeItem` 函数保持不变。Delete IconButton 只设置 `pendingRemovalId`；确认对话框调用：

```tsx
<ConfirmDialog
  open={pendingRemovalId !== null}
  title="Delete Schedule Item"
  message="This permanently removes the selected local schedule item."
  confirmLabel="Delete Item"
  onCancel={() => setPendingRemovalId(null)}
  onConfirm={() => {
    if (pendingRemovalId) removeItem(pendingRemovalId);
    setPendingRemovalId(null);
  }}
/>
```

- [ ] **Step 3: 建立 Header 与紧凑条目布局**

```tsx
<PanelHeader
  kicker="Schedule Manager"
  title="Schedule Items"
  target={`${localCount} local · ${externalCount} external`}
  status={`${schedule.length} Items`}
  statusTone={schedule.length > 0 ? "success" : "neutral"}
  actions={
    <Button tone="primary" onClick={addItem}>
      <Plus size={15} aria-hidden="true" />
      Add Item
    </Button>
  }
/>
```

每个条目使用 `schedule-item`，显示 `sourceId` 与 `state`；现有 Time、Title、Description input 的 value、disabled 和 onChange 不变。Active 使用 checkbox/toggle，Delete 使用 `Trash2` IconButton，仅 local 条目可用。

- [ ] **Step 4: 创建 Schedule CSS**

```css
.schedule-shell { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.schedule-list { display: grid; gap: 6px; padding: 8px; }
.schedule-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 8px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.schedule-item[data-active="true"] { border-left: 3px solid var(--leaf-success); }
.schedule-fields { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 6px; min-width: 0; }
.schedule-description { grid-column: 1 / -1; }
.schedule-meta { display: flex; flex-wrap: wrap; gap: 6px; color: var(--leaf-text-muted); font: 11px/1.3 var(--leaf-font-mono); }
.schedule-actions { display: flex; align-items: start; gap: 6px; }
@media (max-width: 479px) {
  .schedule-item { grid-template-columns: 1fr; }
  .schedule-fields { grid-template-columns: 1fr; }
  .schedule-description { grid-column: auto; }
}
```

- [ ] **Step 5: 更新入口并验证**

文件末尾改为：

```tsx
createRoot(document.getElementById("root")!).render(
  <PanelErrorBoundary>
    <SchedulePanel />
  </PanelErrorBoundary>
);
```

Run: `npm test && npm run typecheck && npm run build --workspace schedule-manager`

Expected: 全部 exit 0；local 条目可编辑，external 条目保持只读。

- [ ] **Step 6: 提交 Schedule UI**

```bash
git add bundles/schedule-manager/src/dashboard
git commit -m "style: unify schedule manager UI"
```

---

### Task 3: 统一 Seamer Workspace 与 Trigger Editor

**Files:**
- Create: `bundles/seamer/src/dashboard/seamer-dashboard.css`
- Modify: `bundles/seamer/src/dashboard/main.tsx`
- Modify: `bundles/seamer/src/dashboard/App.tsx`
- Modify: `bundles/seamer/src/dashboard/components/Card.tsx`
- Create: `bundles/seamer/src/dashboard/components/EditorDialogFrame.tsx`
- Modify: `bundles/seamer/src/dashboard/components/EditCardModal.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/TriggerPage.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/DynamicTriggerModal.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/EditTriggerModal.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/CapabilityFields.tsx`

**Interfaces:**
- Consumes: `seamerCards`、`seamerIntegrations`、Seamer trigger Replicant、动态 capability 定义和现有 run/save/delete 行为。
- Produces: Workspace/Triggers 分段视图、紧凑卡片、When/Then 编辑器和一致对话框。

- [ ] **Step 1: 更新入口**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PanelErrorBoundary } from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./seamer-dashboard.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <PanelErrorBoundary>
      <App />
    </PanelErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 2: 改造 App Header、tabs 与删除确认**

增加 `pendingCardId`，把浏览器 `confirm` 改为共享 `ConfirmDialog`；确认后执行原有 Replicant filter。

Header 使用：

```tsx
<PanelHeader
  kicker="Seamer"
  title={activeTab === "workspace" ? "Workspace" : "Triggers"}
  target={`${Object.keys(integrations).length} integrations`}
  status={`${cards.length} Cards`}
  statusTone="neutral"
  actions={activeTab === "workspace" ? <Button tone="primary" onClick={createEmptyCard}>Add Card</Button> : undefined}
/>
```

把创建空卡片的现有 state 更新提取为 `createEmptyCard`，内容保持：

```ts
const createEmptyCard = () => {
  setCurrentCard({ id: uuidv4(), title: "New Card", actions: [] });
  setIsEditing(true);
};
```

Workspace/Triggers 使用 `role="tablist"` 与 `aria-selected`，class 为 `seamer-tabs`、`seamer-tab`。保留 `activeTab` 类型和值。

- [ ] **Step 3: 改造 Card 与 Trigger 列表**

Card 继续接收 `onRun`、`onEdit`、`onDelete`，只移除内联样式并使用 `Play`、`Pencil`、`Trash2`。Run 是主命令，Edit 中性，Delete 危险。

`TriggerPage.tsx` 增加 `pendingTriggerId` 与共享确认对话框；删除确认后调用现有 `deleteTrigger`。每个 trigger 显示 name、Enabled toggle、If、Then、Delay。Add/Edit/Delete 使用 `Plus`、`Pencil`、`Trash2`，不改变 dynamic/legacy modal 选择条件。

- [ ] **Step 4: 统一两个 Trigger Modal 和 Card Modal**

创建 `components/EditorDialogFrame.tsx`，三个 editor 只把现有字段 JSX作为 children 传入：

```tsx
import type { PropsWithChildren } from "react";
import { Button } from "../_leaf-ui/components";

interface EditorDialogFrameProps extends PropsWithChildren {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}

export const EditorDialogFrame = ({
  title,
  onCancel,
  onSave,
  saveDisabled = false,
  children,
}: EditorDialogFrameProps) => {
  const titleId = `seamer-editor-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="seamer-modal-backdrop" role="presentation">
      <section className="seamer-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="seamer-modal-header"><h2 id={titleId}>{title}</h2></header>
        <div className="seamer-modal-body">{children}</div>
        <footer className="seamer-modal-actions leaf-toolbar">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="primary" onClick={onSave} disabled={saveDisabled}>Save</Button>
        </footer>
      </section>
    </div>
  );
};
```

`DynamicTriggerModal` 使用 `title="Edit Trigger"`、`onSave={() => onSave(trigger)}`、`saveDisabled={!conditionDefinition || !actionDefinition}`；`EditTriggerModal` 的 `onSave` 继续构造现有 name/delay/enabled/condition/action 对象；`EditCardModal` 的 `onSave` 继续调用现有 `handleSave`。三个组件不得新建第二套业务 state。CapabilityFields 只把字段包装为 `leaf-field`/`leaf-input`，保留 parameter id、类型转换和 onChange。

- [ ] **Step 5: 创建 Seamer CSS**

```css
.seamer-app { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.seamer-tabs { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--leaf-border); background: var(--leaf-surface); }
.seamer-tab[aria-selected="true"] { border-color: var(--leaf-command); color: var(--leaf-command); }
.seamer-card-grid, .seamer-trigger-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; padding: 8px; }
.seamer-card, .seamer-trigger { min-width: 0; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.seamer-card-actions, .seamer-trigger-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.seamer-modal-backdrop { position: fixed; inset: 0; z-index: 900; display: grid; place-items: center; padding: 12px; background: rgb(0 0 0 / 68%); }
.seamer-modal { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; width: min(720px, 100%); max-height: calc(100vh - 24px); border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.seamer-modal-header, .seamer-modal-actions { padding: 10px 12px; border-bottom: 1px solid var(--leaf-border); }
.seamer-modal-actions { justify-content: flex-end; border-top: 1px solid var(--leaf-border); border-bottom: 0; }
.seamer-modal-body { min-width: 0; overflow: auto; padding: 12px; }
.seamer-condition-action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 479px) {
  .seamer-card-grid, .seamer-trigger-grid, .seamer-condition-action-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: 翻译触及文件中的英文代码注释**

把 `App.tsx`、Card、Modal 和 Trigger 文件中保留的英文代码注释改为等义中文；不改 UI 字符串和 symbol 名称。

- [ ] **Step 7: 验证 Seamer**

Run: `npm test && npm run typecheck && npm run build --workspace seamer`

Expected: capability、dynamic trigger 和 integration schema 既有测试全部 PASS。

手动检查：Workspace/Triggers 切换、Card 新建/编辑/运行/删除、JSON drop、legacy/dynamic Trigger 新建/编辑/启停/删除均可用。

- [ ] **Step 8: 提交 Seamer UI**

```bash
git add bundles/seamer/src/dashboard
git commit -m "style: unify seamer dashboard UI"
```

---

### Task 4: 统一 Backup System

**Files:**
- Create: `bundles/backup-system/src/dashboard/backup-dashboard.css`
- Modify: `bundles/backup-system/src/dashboard/backup-control.tsx`

**Interfaces:**
- Consumes: `backupList`、`BackupLevel`、`BackupRequest` 和 `createBackup`。
- Produces: 分级选择、L3 风险区、pending/error 与历史列表。

- [ ] **Step 1: 接入本地 UI**

```tsx
import { Archive } from "lucide-react";
import {
  Button,
  Disclosure,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./backup-dashboard.css";
```

- [ ] **Step 2: 用内联错误状态替代 alert**

增加：

```tsx
const [errorMessage, setErrorMessage] = useState<string | null>(null);
```

`createBackup` 开始时清空错误；callback 保留 `setCreating(false)`，错误分支改为：

```ts
if (error) setErrorMessage(`Backup failed: ${error.message}`);
```

顶部持续错误使用 `role="alert"`，不改变请求 payload、L3 确认或 12 字符规则。

- [ ] **Step 3: 建立信息层级**

```tsx
<PanelHeader
  kicker="Backup System"
  title="Create Backup"
  target={`${levels.length} data levels selected`}
  status={creating ? "Creating" : "Ready"}
  statusTone={creating ? "warning" : "success"}
/>
```

Data Levels 常驻；L3 选中时显示危险边界、确认 checkbox 和 passphrase field。Create Button 使用：

```tsx
<Button tone="primary" pending={creating} pendingLabel="Creating Backup" onClick={createBackup} disabled={!canCreate}>
  <Archive size={15} aria-hidden="true" />
  Create Backup
</Button>
```

Existing Backups 放入默认展开的 Disclosure，保留 filename、timestamp 与 size。

- [ ] **Step 4: 创建 Backup CSS**

```css
.backup-shell { min-width: 0; min-height: 100vh; background: var(--leaf-bg); }
.backup-content { display: grid; gap: 8px; padding: 8px; }
.backup-levels { display: grid; gap: 6px; }
.backup-level { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; padding: 8px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); }
.backup-level[data-selected="true"] { border-color: var(--leaf-command); }
.backup-secret { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--leaf-danger); border-radius: var(--leaf-radius); background: rgb(255 98 107 / 6%); }
.backup-history { display: grid; }
.backup-history-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 8px 0; border-top: 1px solid var(--leaf-border); }
.backup-filename { min-width: 0; overflow-wrap: anywhere; font-family: var(--leaf-font-mono); }
```

- [ ] **Step 5: 增加错误隔离并验证**

```tsx
createRoot(document.getElementById("root")!).render(
  <PanelErrorBoundary>
    <BackupControl />
  </PanelErrorBoundary>
);
```

Run: `npm test && npm run typecheck && npm run build --workspace backup-system`

Expected: backup-policy 既有测试 PASS，L3 request 字段不变。

- [ ] **Step 6: 提交 Backup UI**

```bash
git add bundles/backup-system/src/dashboard
git commit -m "style: unify backup dashboard UI"
```

---

### Task 5: 建立 Playwright 多宽度视觉检查

**Files:**
- Create: `playwright.config.ts`
- Create: `scripts/serve-dashboard-ui.mjs`
- Create: `tests/ui/nodecg-stub.ts`
- Create: `tests/ui/dashboard-panels.spec.ts`
- Create: `tests/ui/dashboard-panels.spec.ts-snapshots/`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: 所有非 Graphics Dashboard 构建产物。
- Produces: 320、480、768px 截图、页面溢出检查、基本键盘焦点检查。

- [ ] **Step 1: 安装 Playwright Test 精确版本**

Run: `npm install --save-dev --save-exact @playwright/test@1.61.1`

Expected: 根 `devDependencies` 包含 `"@playwright/test": "1.61.1"`。

- [ ] **Step 2: 创建静态服务器**

```js
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  const target = path.resolve(projectRoot, pathname.replace(/^\/+/, ""));
  if (!target.startsWith(`${projectRoot}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.setHeader("Content-Type", mime[path.extname(target)] ?? "application/octet-stream");
  fs.createReadStream(target).pipe(response);
}).listen(4173, "127.0.0.1", () => {
  process.stdout.write("Dashboard UI server: http://127.0.0.1:4173\n");
});
```

- [ ] **Step 3: 创建 Playwright 配置**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ui",
  outputDir: "test-results/ui",
  use: { baseURL: "http://127.0.0.1:4173", colorScheme: "dark" },
  webServer: {
    command: "node scripts/serve-dashboard-ui.mjs",
    url: "http://127.0.0.1:4173/bundles/logger-system/log-viewer.html",
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 4: 创建 NodeCG stub**

`tests/ui/nodecg-stub.ts` 导出以下接口；Replicant 注册 change listener 后用 microtask 发送 seed 值，消息 callback 返回 null error，authenticated socket 返回成功 ack：

```ts
import type { Page } from "@playwright/test";

export type NodecgSeed = Record<string, unknown>;

export const installNodecgStub = async (page: Page, seed: NodecgSeed): Promise<void> => {
  await page.addInitScript(({ values }) => {
    const replicants = new Map<string, { value: unknown; listeners: Set<(value: unknown) => void> }>();
    const Replicant = (name: string, options?: { defaultValue?: unknown }) => {
      const record = replicants.get(name) ?? {
        value: Object.prototype.hasOwnProperty.call(values, name) ? values[name] : options?.defaultValue,
        listeners: new Set<(value: unknown) => void>(),
      };
      replicants.set(name, record);
      return {
        get value() { return record.value; },
        set value(next: unknown) {
          record.value = next;
          for (const listener of record.listeners) listener(next);
        },
        on(event: string, listener: (value: unknown) => void) {
          if (event !== "change") return;
          record.listeners.add(listener);
          queueMicrotask(() => listener(record.value));
        },
        removeListener(_event: string, listener: (value: unknown) => void) {
          record.listeners.delete(listener);
        },
      };
    };
    const complete = (args: unknown[]) => {
      const callback = [...args].reverse().find((item) => typeof item === "function") as ((error: null, result?: unknown) => void) | undefined;
      callback?.(null, []);
      return Promise.resolve([]);
    };
    const getValue = (name: string) => {
      const record = replicants.get(name);
      return record ? record.value : values[name];
    };
    (window as unknown as { nodecg: unknown }).nodecg = {
      Replicant,
      sendMessage: (...args: unknown[]) => complete(args),
      sendMessageToBundle: (...args: unknown[]) => complete(args),
      readReplicant: (name: string, callback: (value: unknown) => void) => queueMicrotask(() => callback(getValue(name))),
      listenFor: () => undefined,
      unlisten: () => undefined,
      socket: { emit: (_event: string, _request: unknown, acknowledge: (value: unknown) => void) => acknowledge({ ok: true, result: null }) },
      bundleConfig: {},
    };
    (window as unknown as { NodeCG: unknown }).NodeCG = {};
  }, { values: seed });
};
```

- [ ] **Step 5: 创建页面与宽度测试**

页面清单必须包含 12 个 Dashboard HTML：ATEM 2、Mixer 2、OBS 2、VB 2、Logger、Schedule、Seamer、Backup。测试主体使用：

```ts
import { expect, test } from "@playwright/test";
import { installNodecgStub, type NodecgSeed } from "./nodecg-stub";

const atemSwitcher = { ip: "192.168.10.20", alias: "Studio ATEM", connected: true };
const atemState = {
  programInput: 1,
  previewInput: 2,
  inTransition: false,
  transitionPosition: 0,
  transitionRate: 25,
  aux: { 0: 1, 1: 2 },
  sources: { 1: "CAM 1", 2: "CAM 2", 3: "PLAYOUT" },
  macros: { 1: "OPEN", 2: "CLOSE" },
};
const mixerState = {
  connected: true,
  channels: [{ id: 1, name: "Host", faderLevel: 0, isMuted: false, patch: "Input 1" }],
  outputs: [{ id: 1, name: "Program", faderLevel: 0, isMuted: false, inputSends: [] }],
  lastUpdate: 1710000000000,
};
const obsConnection = { id: "obs-1", name: "Studio OBS", host: "127.0.0.1", port: "4455", passwordConfigured: true };
const obsState = {
  connected: true,
  status: "connected",
  currentScene: "CAM 1",
  isStreaming: false,
  isRecording: false,
  scenes: [{ name: "CAM 1", index: 0 }, { name: "CAM 2", index: 1 }],
  transitions: ["Fade", "Cut"],
  currentTransition: "Fade",
};
const matrixConfig = { id: "matrix-1", name: "Studio Matrix", ip: "192.168.10.42", port: 6980, streamName: "Command1" };
const matrixDevices = [
  { connectionId: "matrix-1", suid: "vaio", pointDevice: "VAIO", name: "VAIO", inputs: 2, outputs: 0 },
  { connectionId: "matrix-1", suid: "a1", pointDevice: "A1", name: "A1", inputs: 0, outputs: 2 },
];
const matrixPoint = {
  key: "matrix-1|VAIO|1|A1|1",
  connectionId: "matrix-1",
  inputDevice: "VAIO",
  inputChannel: 1,
  outputDevice: "A1",
  outputChannel: 1,
  gain: 0,
  mute: false,
  exists: true,
  updatedAt: 1710000000000,
};
const pages: Array<{ name: string; path: string; seed: NodecgSeed }> = [
  { name: "atem-connection", path: "/bundles/atem-control/atem-connection.html", seed: { "atem:switchers": [atemSwitcher] } },
  { name: "atem-control", path: "/bundles/atem-control/atem-control.html", seed: { "atem:switchers": [atemSwitcher], "atem:state:192.168.10.20": atemState } },
  { name: "mixer-connection", path: "/bundles/mixer-control/mixer-connection.html", seed: { mixerState, mixerConnectionSettings: { ip: "127.0.0.1", port: "9000", protocol: "udp" } } },
  { name: "mixer-panel", path: "/bundles/mixer-control/mixer-panel.html", seed: { mixerState } },
  { name: "obs-connection", path: "/bundles/obs-control/obs-connection.html", seed: { obsConnections: [obsConnection], obsStates: { "obs-1": obsState } } },
  { name: "obs-control", path: "/bundles/obs-control/obs-control-panel.html", seed: { obsConnections: [obsConnection], obsStates: { "obs-1": obsState }, obsStreamSettings: { "obs-1": { server: "rtmp://example.invalid/live", useAuth: false, username: "", keyConfigured: true, passwordConfigured: false } } } },
  { name: "vb-network", path: "/bundles/vb-matrix-control/network-config.html", seed: { networkConfigs: [matrixConfig], hostInfo: { ips: ["192.168.10.10"] } } },
  { name: "vb-control", path: "/bundles/vb-matrix-control/control-panel.html", seed: { networkConfigs: [matrixConfig], activePatches: [], availableDevices: matrixDevices, matrixPoints: [matrixPoint], presets: [] } },
  { name: "logger", path: "/bundles/logger-system/log-viewer.html", seed: { recentLogs: [{ timestamp: 1710000000000, level: "info", bundle: "seamer", category: "runtime", message: "Ready" }], availableBundles: ["seamer"], logCleanupPeriodMs: 3600000, lastLogCleanupAt: 0 } },
  { name: "schedule", path: "/bundles/schedule-manager/schedule-panel.html", seed: { scheduleData: [{ id: "item-1", sourceId: "local", externalId: "item-1", revision: "1", time: "14:00", plannedAt: null, title: "Opening", description: "Program open", state: "ready", active: true, metadata: {}, triggerMappings: [] }] } },
  { name: "seamer", path: "/bundles/seamer/seamer.html", seed: { seamerCards: [{ id: "card-1", title: "Program Open", actions: [] }], seamerIntegrations: {}, seamerTriggers: [] } },
  { name: "backup", path: "/bundles/backup-system/backup-control.html", seed: { backupList: [] } },
];

for (const panel of pages) {
  for (const width of [320, 480, 768]) {
    test(`${panel.name} fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await installNodecgStub(page, panel.seed);
      await page.goto(panel.path);
      await expect(page.locator("#root")).not.toBeEmpty();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toBeVisible();
      await expect(page).toHaveScreenshot(`${panel.name}-${width}.png`, { fullPage: true });
    });
  }
}
```

- [ ] **Step 6: 增加命令并生成基线**

在 `package.json` 加入：

```json
"test:ui": "playwright test",
"test:ui:update": "playwright test --update-snapshots"
```

Run: `npx playwright install chromium`

Run: `npm run build && npm run test:ui:update`

Expected: 36 张基线截图生成，所有 overflow 和 focus 检查 PASS。

- [ ] **Step 7: 更新 CI**

在 `verify` job 的 build 后加入：

```yaml
- run: npx playwright install chromium
- run: npm run test:ui
```

- [ ] **Step 8: 提交视觉测试**

```bash
git add playwright.config.ts scripts/serve-dashboard-ui.mjs tests/ui package.json package-lock.json .github/workflows/ci.yml
git commit -m "test: add dashboard visual regression coverage"
```

---

### Task 6: 最终独立性、文档与开发日志验收

**Files:**
- Modify: `README.md`
- Modify: `Manual/eng/USER_MANUAL.md`
- Modify: `Manual/chs/USER_MANUAL.md`
- Modify: `Manual/jpn/USER_MANUAL.md`
- Modify: `DEVELOPMENT_MEMO.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 五份实施计划、UI 规范、截图和隔离构建脚本。
- Produces: 后续开发可执行的入口说明与完整日志。

- [ ] **Step 1: 更新 README 与手册**

英文 README 加入以下开发命令，中文和日文手册给出等义说明并保留命令：

```powershell
npm run ui:check
npm run ui:sync
npm run test:ui
```

链接 `docs/UI_DESIGN_GUIDELINES.md`，说明新 Dashboard 必须使用本地 `_leaf-ui` 快照，Graphics 暂不纳入。

- [ ] **Step 2: 更新开发日志**

在 `DEVELOPMENT_MEMO.md` 按日期 `2026-07-13` 更新需求变化、代码变动、功能增减、实现路径、已知 bug 和已解决 bug。明确记录现有业务消息未改变、Playwright 覆盖范围、未连接真实硬件时的剩余风险。

- [ ] **Step 3: 检查 `.gitignore`**

保证以下内容不被忽略：

```gitignore
!docs/UI_DESIGN_GUIDELINES.md
!bundles/*/src/dashboard/_leaf-ui/**
!tests/ui/**/*-snapshots/**
```

继续忽略 `test-results/`、Playwright 临时输出、每个 bundle 的 `node_modules/` 和本地设备 Secret。

- [ ] **Step 4: 运行最终自动验证**

Run: `npm run core:check && npm run ui:check && npm test && npm run typecheck && npm run build && npm run test:ui`

Expected: 所有命令 exit 0，36 张截图与基线一致。

- [ ] **Step 5: 运行八个隔离构建**

依次运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle atem-control
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle backup-system
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle logger-system
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle mixer-control
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle obs-control
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle schedule-manager
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle seamer
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle vb-matrix-control
```

Expected: 八个 bundle 在临时隔离目录中安装与构建成功。

- [ ] **Step 6: 确认 Graphics 无变化**

Run: `git diff --name-only HEAD~1 -- bundles/graphics-package`

Expected: 无输出。

- [ ] **Step 7: 提交最终文档**

```bash
git add README.md Manual DEVELOPMENT_MEMO.md .gitignore
git commit -m "docs: document unified dashboard UI workflow"
```
