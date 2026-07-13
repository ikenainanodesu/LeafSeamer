# Dashboard UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Dense Hardware Console 的权威设计源、共享 React 组件、本地快照同步器和自动校验，为八个非 Graphics Dashboard 提供稳定基础。

**Architecture:** `shared/dashboard-ui/` 保存唯一权威源，`scripts/sync-dashboard-ui.ts` 将确定性快照写入各目标 bundle 的 `src/dashboard/_leaf-ui/`。每个 bundle 只导入自己的快照，Vite 把 UI 资源打包进本 bundle，运行时不依赖其他 bundle。

**Tech Stack:** React 19.2、TypeScript 5.7、Vite 6、Node.js 24、CSS Custom Properties、Lucide React 1.23.0、现有自定义 TypeScript 测试工具。

## Global Constraints

- 必须先完成 `2026-07-13-bundle-source-independence-prerequisite.md`。
- 视觉令牌必须与 `docs/UI_DESIGN_GUIDELINES.md` 1.0.0 完全一致。
- 所有新增代码注释使用中文；所有 LeafSeamer 自有 UI 文案使用英文。
- `graphics-package` 不得出现在同步目标或改动文件中。
- 共享组件不得访问 `nodecg`、Replicant、设备 API 或 bundle 业务状态。
- 各 bundle 的消息名、payload、Replicant schema 和设备控制逻辑保持不变。
- 本地快照纳入 Git，禁止在 bundle 构建时隐式改写快照。
- 每个任务结束时运行指定测试并独立提交。

---

### Task 1: 用测试固定 UI 目标与令牌合同

**Files:**
- Create: `tests/dashboard-ui-contract.test.ts`
- Modify: `tests/run-tests.ts`

**Interfaces:**
- Consumes: `tests/test-harness.ts`。
- Produces: `DASHBOARD_UI_TARGETS`、颜色令牌、版本和 Graphics 排除规则的回归合同。

- [ ] **Step 1: 写入失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { deepEqual, equal, ok, test } from "./test-harness";
import {
  DASHBOARD_UI_TARGETS,
  DASHBOARD_UI_VERSION,
} from "../scripts/sync-dashboard-ui";

const projectRoot = path.resolve(__dirname, "..");

test("dashboard UI target list excludes graphics", () => {
  deepEqual(DASHBOARD_UI_TARGETS, [
    "atem-control",
    "backup-system",
    "logger-system",
    "mixer-control",
    "obs-control",
    "schedule-manager",
    "seamer",
    "vb-matrix-control",
  ]);
  equal(DASHBOARD_UI_TARGETS.includes("graphics-package" as never), false);
  equal(DASHBOARD_UI_VERSION, "1.0.0");
});

test("dashboard UI tokens match the approved console palette", () => {
  const tokens = fs.readFileSync(
    path.join(projectRoot, "shared", "dashboard-ui", "tokens.css"),
    "utf8"
  );
  for (const declaration of [
    "--leaf-bg: #0c0e11",
    "--leaf-surface: #14171b",
    "--leaf-surface-raised: #20242a",
    "--leaf-surface-deep: #090b0d",
    "--leaf-border: #2a3037",
    "--leaf-text: #f2f4f6",
    "--leaf-text-muted: #959da7",
    "--leaf-command: #61a9ff",
    "--leaf-success: #52d273",
    "--leaf-warning: #ffbd4a",
    "--leaf-danger: #ff626b",
  ]) {
    ok(tokens.includes(declaration));
  }
});
```

在 `tests/run-tests.ts` 加入：

```ts
import "./dashboard-ui-contract.test";
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，报告缺少 `scripts/sync-dashboard-ui.ts` 或 `shared/dashboard-ui/tokens.css`。

- [ ] **Step 3: 提交合同测试**

```bash
git add tests/dashboard-ui-contract.test.ts tests/run-tests.ts
git commit -m "test: define dashboard UI design contract"
```

---

### Task 2: 创建权威 CSS 令牌与基础样式

**Files:**
- Create: `shared/dashboard-ui/manifest.json`
- Create: `shared/dashboard-ui/tokens.css`
- Create: `shared/dashboard-ui/base.css`
- Create: `shared/dashboard-ui/components.css`
- Create: `shared/dashboard-ui/index.css`

**Interfaces:**
- Consumes: `docs/UI_DESIGN_GUIDELINES.md` 1.0.0。
- Produces: `index.css` 入口和稳定的 `leaf-*` CSS 类。

- [ ] **Step 1: 创建版本与目标清单**

```json
{
  "version": "1.0.0",
  "targets": [
    "atem-control",
    "backup-system",
    "logger-system",
    "mixer-control",
    "obs-control",
    "schedule-manager",
    "seamer",
    "vb-matrix-control"
  ]
}
```

- [ ] **Step 2: 创建 `tokens.css`**

```css
/* LeafSeamer Dashboard UI 1.0.0 权威令牌。 */
:root {
  color-scheme: dark;
  --leaf-bg: #0c0e11;
  --leaf-surface: #14171b;
  --leaf-surface-raised: #20242a;
  --leaf-surface-deep: #090b0d;
  --leaf-border: #2a3037;
  --leaf-text: #f2f4f6;
  --leaf-text-muted: #959da7;
  --leaf-text-faint: #68717c;
  --leaf-command: #61a9ff;
  --leaf-success: #52d273;
  --leaf-warning: #ffbd4a;
  --leaf-danger: #ff626b;
  --leaf-space-1: 4px;
  --leaf-space-2: 8px;
  --leaf-space-3: 12px;
  --leaf-space-4: 16px;
  --leaf-space-6: 24px;
  --leaf-radius: 4px;
  --leaf-font-ui: Inter, "Segoe UI", Arial, sans-serif;
  --leaf-font-mono: "Cascadia Mono", Consolas, monospace;
  --leaf-focus: 0 0 0 2px rgb(97 169 255 / 35%);
}
```

- [ ] **Step 3: 创建 `base.css` 与入口**

```css
/* Dashboard 基础布局，不包含 bundle 业务样式。 */
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { min-width: 0; min-height: 100%; }
body {
  margin: 0;
  background: var(--leaf-bg);
  color: var(--leaf-text);
  font: 13px/1.45 var(--leaf-font-ui);
  letter-spacing: 0;
}
button, input, select, textarea { font: inherit; letter-spacing: 0; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible,
[tabindex]:focus-visible { outline: 0; box-shadow: var(--leaf-focus); }
.leaf-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

`shared/dashboard-ui/index.css`：

```css
@import "./tokens.css";
@import "./base.css";
@import "./components.css";
```

- [ ] **Step 4: 创建核心组件样式**

`components.css` 至少写入以下完整基础规则，bundle 专属布局在各自 CSS 中追加：

```css
.leaf-panel { min-width: 0; background: var(--leaf-bg); }
.leaf-panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid var(--leaf-border); background: var(--leaf-surface); }
.leaf-panel-title { margin: 0; font-size: 17px; line-height: 1.2; }
.leaf-panel-kicker, .leaf-section-kicker { color: var(--leaf-text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
.leaf-panel-target { margin-top: 4px; color: var(--leaf-text-muted); font-family: var(--leaf-font-mono); font-size: 12px; overflow-wrap: anywhere; }
.leaf-status { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 0 8px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface-deep); font: 700 11px/1 var(--leaf-font-mono); text-transform: uppercase; }
.leaf-status[data-tone="success"] { color: var(--leaf-success); }
.leaf-status[data-tone="warning"] { color: var(--leaf-warning); }
.leaf-status[data-tone="danger"] { color: var(--leaf-danger); }
.leaf-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.leaf-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; gap: 7px; padding: 0 10px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface-raised); color: var(--leaf-text); cursor: pointer; }
.leaf-button:hover:not(:disabled) { border-color: var(--leaf-text-faint); }
.leaf-button[data-tone="primary"] { border-color: var(--leaf-command); background: var(--leaf-command); color: #07111d; font-weight: 700; }
.leaf-button[data-tone="danger"] { border-color: var(--leaf-danger); color: var(--leaf-danger); }
.leaf-button:disabled { cursor: not-allowed; opacity: 0.55; }
.leaf-icon-button { width: 32px; padding: 0; }
.leaf-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: leaf-spin 700ms linear infinite; }
@keyframes leaf-spin { to { transform: rotate(360deg); } }
.leaf-section { border-top: 1px solid var(--leaf-border); background: var(--leaf-surface); }
.leaf-section-header { display: flex; min-height: 38px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; }
.leaf-section-body { padding: 12px; border-top: 1px solid var(--leaf-border); }
.leaf-field { display: grid; min-width: 0; gap: 4px; }
.leaf-field > span { color: var(--leaf-text-muted); font-size: 11px; font-weight: 700; }
.leaf-input { width: 100%; min-width: 0; min-height: 32px; padding: 6px 8px; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface-deep); color: var(--leaf-text); }
.leaf-dialog { width: min(420px, calc(100vw - 24px)); padding: 0; border: 1px solid var(--leaf-border); border-radius: var(--leaf-radius); background: var(--leaf-surface); color: var(--leaf-text); }
.leaf-dialog::backdrop { background: rgb(0 0 0 / 68%); }
.leaf-toast-region { position: fixed; right: 12px; bottom: 12px; z-index: 1000; display: grid; width: min(360px, calc(100vw - 24px)); gap: 8px; }
.leaf-toast { padding: 10px 12px; border: 1px solid var(--leaf-border); border-left: 3px solid var(--leaf-command); border-radius: var(--leaf-radius); background: var(--leaf-surface-raised); }
```

- [ ] **Step 5: 运行合同测试**

Run: `npm test`

Expected: 仍因同步脚本缺失失败，但令牌测试不再报告缺少 CSS。

- [ ] **Step 6: 提交权威样式源**

```bash
git add shared/dashboard-ui
git commit -m "feat: add dashboard UI design tokens"
```

---

### Task 3: 创建无业务状态的 React 组件

**Files:**
- Create: `shared/dashboard-ui/components/types.ts`
- Create: `shared/dashboard-ui/components/Button.tsx`
- Create: `shared/dashboard-ui/components/PanelHeader.tsx`
- Create: `shared/dashboard-ui/components/Disclosure.tsx`
- Create: `shared/dashboard-ui/components/ConfirmDialog.tsx`
- Create: `shared/dashboard-ui/components/ToastRegion.tsx`
- Create: `shared/dashboard-ui/components/PanelErrorBoundary.tsx`
- Create: `shared/dashboard-ui/components/index.ts`

**Interfaces:**
- Consumes: React 19。
- Produces: 后续面板计划唯一允许使用的共享组件 API。

- [ ] **Step 1: 定义公共类型**

```ts
import type { ReactNode } from "react";

export type LeafTone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface ToastItem {
  id: string;
  message: string;
  tone: Exclude<LeafTone, "primary">;
}

export interface PanelHeaderProps {
  kicker: string;
  title: string;
  target?: string;
  status: string;
  statusTone: Exclude<LeafTone, "primary">;
  actions?: ReactNode;
}
```

- [ ] **Step 2: 实现 Button 与 IconButton**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LeafTone } from "./types";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: LeafTone;
  pending?: boolean;
  pendingLabel?: string;
}

export const Button = ({
  tone = "neutral",
  pending = false,
  pendingLabel = "Working",
  className = "",
  children,
  disabled,
  ...buttonProps
}: ButtonProps) => (
  <button
    {...buttonProps}
    className={`leaf-button ${className}`.trim()}
    data-tone={tone}
    disabled={disabled || pending}
    aria-busy={pending}
  >
    {pending ? <span className="leaf-spinner" aria-hidden="true" /> : null}
    {pending ? pendingLabel : children}
  </button>
);

interface IconButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
  icon: ReactNode;
}

export const IconButton = ({ label, icon, className = "", ...props }: IconButtonProps) => (
  <Button
    {...props}
    className={`leaf-icon-button ${className}`.trim()}
    aria-label={label}
    title={label}
  >
    {icon}
  </Button>
);
```

- [ ] **Step 3: 实现 Header 与 Disclosure**

```tsx
import type { PropsWithChildren } from "react";
import type { PanelHeaderProps } from "./types";

export const PanelHeader = ({ kicker, title, target, status, statusTone, actions }: PanelHeaderProps) => (
  <header className="leaf-panel-header">
    <div>
      <div className="leaf-panel-kicker">{kicker}</div>
      <h1 className="leaf-panel-title">{title}</h1>
      {target ? <div className="leaf-panel-target">{target}</div> : null}
    </div>
    <div className="leaf-toolbar">
      <span className="leaf-status" data-tone={statusTone}>{status}</span>
      {actions}
    </div>
  </header>
);

interface DisclosureProps extends PropsWithChildren {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  storageKey?: string;
}

export const Disclosure = ({ title, summary, defaultOpen = false, storageKey, children }: DisclosureProps) => {
  const stored = storageKey ? globalThis.localStorage?.getItem(storageKey) : null;
  const initialOpen = stored === null ? defaultOpen : stored === "open";
  return (
    <details
      className="leaf-section"
      defaultOpen={initialOpen}
      onToggle={(event) => {
        if (!storageKey) return;
        globalThis.localStorage?.setItem(storageKey, event.currentTarget.open ? "open" : "closed");
      }}
    >
      <summary className="leaf-section-header">
        <strong>{title}</strong>
        {summary ? <span className="leaf-panel-target">{summary}</span> : null}
      </summary>
      <div className="leaf-section-body">{children}</div>
    </details>
  );
};
```

- [ ] **Step 4: 实现确认、Toast 与 Error Boundary**

```tsx
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import type { ToastItem } from "./types";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="leaf-dialog" onCancel={onCancel}>
      <div className="leaf-section-body">
        <h2 className="leaf-panel-title">{title}</h2>
        <p>{message}</p>
        <div className="leaf-toolbar">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
};

export const ToastRegion = ({ items }: { items: ToastItem[] }) => (
  <div className="leaf-toast-region" aria-live="polite" aria-atomic="false">
    {items.map((item) => <div className="leaf-toast" data-tone={item.tone} key={item.id}>{item.message}</div>)}
  </div>
);

export const useToast = () => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const pushToast = useCallback((message: string, tone: ToastItem["tone"] = "danger") => {
    const id = globalThis.crypto.randomUUID();
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);
  return { items, pushToast };
};

interface ErrorBoundaryState { error: Error | null; }

export class PanelErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Dashboard render failed", error, info);
  }
  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="leaf-section-body" role="alert">
        <h1 className="leaf-panel-title">Panel unavailable</h1>
        <p>{this.state.error.message}</p>
        <Button tone="primary" onClick={() => globalThis.location.reload()}>Reload Panel</Button>
      </div>
    );
  }
}
```

`components/index.ts`：

```ts
export * from "./types";
export * from "./Button";
export * from "./PanelHeader";
export * from "./Disclosure";
export * from "./ConfirmDialog";
export * from "./ToastRegion";
export * from "./PanelErrorBoundary";
```

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`

Expected: exit 0，共享组件没有 `nodecg` 导入。

- [ ] **Step 6: 提交组件 API**

```bash
git add shared/dashboard-ui/components
git commit -m "feat: add dashboard UI primitives"
```

---

### Task 4: 实现 UI 快照同步与漂移检查

**Files:**
- Create: `scripts/sync-dashboard-ui.ts`
- Modify: `package.json`
- Modify: `tests/dashboard-ui-contract.test.ts`
- Create: `bundles/atem-control/src/dashboard/_leaf-ui/`
- Create: `bundles/backup-system/src/dashboard/_leaf-ui/`
- Create: `bundles/logger-system/src/dashboard/_leaf-ui/`
- Create: `bundles/mixer-control/src/dashboard/_leaf-ui/`
- Create: `bundles/obs-control/src/dashboard/_leaf-ui/`
- Create: `bundles/schedule-manager/src/dashboard/_leaf-ui/`
- Create: `bundles/seamer/src/dashboard/_leaf-ui/`
- Create: `bundles/vb-matrix-control/src/dashboard/_leaf-ui/`

**Interfaces:**
- Consumes: `shared/dashboard-ui/manifest.json` 与权威源文件。
- Produces: `DASHBOARD_UI_VERSION`、`DASHBOARD_UI_TARGETS`、`syncDashboardUiSnapshots`、`checkDashboardUiSnapshots`。

- [ ] **Step 1: 在合同测试加入快照检查**

```ts
import { checkDashboardUiSnapshots } from "../scripts/sync-dashboard-ui";

test("dashboard UI snapshots match the canonical source", () => {
  deepEqual(checkDashboardUiSnapshots(projectRoot), []);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，八个 bundle 缺少 `_leaf-ui/manifest.json`。

- [ ] **Step 3: 实现同步器公开合同**

创建完整的 `scripts/sync-dashboard-ui.ts`：

```ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DASHBOARD_UI_VERSION = "1.0.0";
export const DASHBOARD_UI_TARGETS = [
  "atem-control",
  "backup-system",
  "logger-system",
  "mixer-control",
  "obs-control",
  "schedule-manager",
  "seamer",
  "vb-matrix-control",
] as const;

interface DashboardUiManifest {
  version: string;
  sourceHash: string;
  files: string[];
}

interface DashboardUiSnapshot {
  files: Map<string, string>;
  manifest: DashboardUiManifest;
}

const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });

const generatedHeader = (relative: string): string =>
  relative.endsWith(".css")
    ? "/* 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。 */\n"
    : "// 此文件由 scripts/sync-dashboard-ui.ts 生成，请勿手工修改。\n";

const buildDashboardUiSnapshot = (projectRoot: string): DashboardUiSnapshot => {
  const sourceRoot = path.join(projectRoot, "shared", "dashboard-ui");
  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(sourceRoot, "manifest.json"), "utf8")
  ) as { version: string; targets: string[] };
  if (sourceManifest.version !== DASHBOARD_UI_VERSION) {
    throw new Error("Dashboard UI version does not match manifest.json");
  }
  if (JSON.stringify(sourceManifest.targets) !== JSON.stringify(DASHBOARD_UI_TARGETS)) {
    throw new Error("Dashboard UI targets do not match manifest.json");
  }

  const files = new Map<string, string>();
  for (const file of listFiles(sourceRoot)) {
    const relative = path.relative(sourceRoot, file).replaceAll("\\", "/");
    if (relative === "manifest.json") continue;
    const source = fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
    files.set(relative, `${generatedHeader(relative)}${source}`);
  }

  const names = [...files.keys()].sort();
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    hash.update(name);
    hash.update("\0");
    hash.update(files.get(name) ?? "");
    hash.update("\0");
  }
  return {
    files,
    manifest: {
      version: DASHBOARD_UI_VERSION,
      sourceHash: hash.digest("hex"),
      files: names,
    },
  };
};

const snapshotDirectory = (projectRoot: string, bundle: string): string =>
  path.join(projectRoot, "bundles", bundle, "src", "dashboard", "_leaf-ui");

const writeDashboardUiSnapshot = (
  projectRoot: string,
  bundle: string,
  snapshot: DashboardUiSnapshot
): void => {
  const output = snapshotDirectory(projectRoot, bundle);
  const bundlesRoot = path.join(projectRoot, "bundles");
  if (!output.startsWith(`${bundlesRoot}${path.sep}`)) {
    throw new Error(`Refusing to write outside bundles: ${output}`);
  }
  fs.rmSync(output, { recursive: true, force: true });
  for (const [relative, content] of snapshot.files) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  fs.writeFileSync(
    path.join(output, "manifest.json"),
    `${JSON.stringify(snapshot.manifest, null, 2)}\n`,
    "utf8"
  );
};

const compareDashboardUiSnapshot = (
  projectRoot: string,
  bundle: string,
  snapshot: DashboardUiSnapshot
): string[] => {
  const output = snapshotDirectory(projectRoot, bundle);
  const manifestPath = path.join(output, "manifest.json");
  if (!fs.existsSync(manifestPath)) return [`${bundle}: missing manifest.json`];

  const errors: string[] = [];
  const actualManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as DashboardUiManifest;
  if (JSON.stringify(actualManifest) !== JSON.stringify(snapshot.manifest)) {
    errors.push(`${bundle}: manifest mismatch`);
  }
  for (const [relative, content] of snapshot.files) {
    const target = path.join(output, relative);
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
      errors.push(`${bundle}: stale ${relative}`);
    }
  }
  const actualFiles = listFiles(output)
    .map((file) => path.relative(output, file).replaceAll("\\", "/"))
    .filter((file) => file !== "manifest.json")
    .sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(snapshot.manifest.files)) {
    errors.push(`${bundle}: unexpected snapshot files`);
  }
  return errors;
};

export const syncDashboardUiSnapshots = (projectRoot: string): void => {
  const snapshot = buildDashboardUiSnapshot(projectRoot);
  for (const bundle of DASHBOARD_UI_TARGETS) {
    writeDashboardUiSnapshot(projectRoot, bundle, snapshot);
  }
};

export const checkDashboardUiSnapshots = (projectRoot: string): string[] => {
  const snapshot = buildDashboardUiSnapshot(projectRoot);
  return DASHBOARD_UI_TARGETS.flatMap((bundle) =>
    compareDashboardUiSnapshot(projectRoot, bundle, snapshot)
  );
};

if (require.main === module) {
  const projectRoot = path.resolve(__dirname, "..");
  if (process.argv.includes("--check")) {
    const errors = checkDashboardUiSnapshots(projectRoot);
    if (errors.length > 0) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  } else {
    syncDashboardUiSnapshots(projectRoot);
  }
}
```

- [ ] **Step 4: 增加根命令**

在 `package.json` 的 `scripts` 中加入，并让总构建先检查两个快照：

```json
"ui:sync": "ts-node scripts/sync-dashboard-ui.ts",
"ui:check": "ts-node scripts/sync-dashboard-ui.ts --check",
"build": "npm run core:check && npm run ui:check && ts-node scripts/build-bundles.ts"
```

- [ ] **Step 5: 生成快照并运行测试**

Run: `npm run ui:sync`

Expected: 八个目标 bundle 出现 `_leaf-ui/index.css`、`_leaf-ui/components/index.ts` 和 `_leaf-ui/manifest.json`，`graphics-package` 没有 `_leaf-ui`。

Run: `npm test && npm run ui:check`

Expected: 全部 PASS，检查命令 exit 0。

- [ ] **Step 6: 提交同步器和快照**

```bash
git add scripts/sync-dashboard-ui.ts package.json tests/dashboard-ui-contract.test.ts bundles/*/src/dashboard/_leaf-ui
git commit -m "build: sync dashboard UI snapshots"
```

---

### Task 5: 固定独立图标依赖和 CI 校验

**Files:**
- Modify: `bundles/atem-control/package.json`
- Modify: `bundles/backup-system/package.json`
- Modify: `bundles/logger-system/package.json`
- Modify: `bundles/mixer-control/package.json`
- Modify: `bundles/obs-control/package.json`
- Modify: `bundles/schedule-manager/package.json`
- Modify: `bundles/seamer/package.json`
- Modify: `bundles/vb-matrix-control/package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `tests/dashboard-ui-contract.test.ts`

**Interfaces:**
- Consumes: Lucide React 1.23.0。
- Produces: 每个目标 bundle 明确声明图标依赖，CI 阻止快照漂移。

- [ ] **Step 1: 增加依赖合同测试**

```ts
test("each dashboard bundle declares its icon dependency", () => {
  for (const bundle of DASHBOARD_UI_TARGETS) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "bundles", bundle, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };
    equal(packageJson.dependencies?.["lucide-react"], "1.23.0");
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，目标 bundle 尚未声明 `lucide-react`。

- [ ] **Step 3: 为每个 bundle 安装精确版本**

Run:

```powershell
npm install --save-exact lucide-react@1.23.0 --workspace atem-control --workspace backup-system --workspace logger-system --workspace mixer-control --workspace obs-control --workspace schedule-manager --workspace seamer --workspace vb-matrix-control
```

Expected: 八个 `package.json` 的 dependencies 包含 `"lucide-react": "1.23.0"`，`package-lock.json` 更新。

- [ ] **Step 4: 更新 CI**

在 `.github/workflows/ci.yml` 的 `verify` job 中，`npm test` 前依次加入：

```yaml
- run: npm run core:check
- run: npm run ui:check
```

确认 `standalone-bundles` matrix 包含 `mixer-control` 和八个 UI 目标。

- [ ] **Step 5: 运行基础阶段总验证**

Run: `npm run core:check && npm run ui:check && npm test && npm run typecheck && npm run build`

Expected: 所有命令 exit 0，八个目标 bundle 构建成功。

- [ ] **Step 6: 提交依赖和 CI**

```bash
git add bundles/*/package.json package-lock.json .github/workflows/ci.yml tests/dashboard-ui-contract.test.ts
git commit -m "build: enforce dashboard UI dependencies"
```
