# Bundle Source Independence Prerequisite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 bundle 源码对仓库根 `shared/` 的直接导入，使每个受影响 bundle 在被单独复制后仍可安装、构建和运行。

**Architecture:** 保留 `shared/integration` 与 `shared/security` 作为权威源，通过确定性的同步脚本生成到各 bundle 的 `src/_leaf-core/` 本地快照。源码只导入本 bundle 快照；CI 在不复制根 `shared/` 的临时目录中执行真实隔离构建。

**Tech Stack:** Node.js 24、TypeScript 5.7、Vite 6、npm workspaces、现有自定义 TypeScript 测试工具、GitHub Actions。

## Global Constraints

- 所有新增代码注释必须使用中文。
- LeafSeamer 自有 UI 文案保持英文；本计划不修改可见 UI。
- 权威源保持在 `shared/integration` 与 `shared/security`，生成快照不得手工修改。
- 不改变消息名、payload、Replicant schema、权限检查、SecretManager 或 CommandGateway 行为。
- 不引入中央运行时 bundle；本地快照必须被各 bundle 自己的 Vite 构建打包。
- `graphics-package` 不在本计划范围内。
- 每个任务结束时只提交该任务列出的文件，保留工作区其他未提交改动。

---

### Task 1: 用测试固定受影响 bundle 与失败条件

**Files:**
- Create: `tests/bundle-source-independence.test.ts`
- Modify: `tests/run-tests.ts`

**Interfaces:**
- Consumes: 现有 `tests/test-harness.ts` 的 `test`、`deepEqual` 和 `equal`。
- Produces: 固定的 `CORE_SNAPSHOT_TARGETS` 预期清单与“不得直接导入根 shared”回归检查。

- [ ] **Step 1: 写入失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { deepEqual, equal, test } from "./test-harness";
import { CORE_SNAPSHOT_TARGETS } from "../scripts/sync-bundle-core";

const projectRoot = path.resolve(__dirname, "..");
const expectedTargets = [
  "atem-control",
  "logger-system",
  "obs-control",
  "schedule-manager",
  "seamer",
  "seamer-adapter-atem",
  "seamer-adapter-mixer",
  "seamer-adapter-obs",
  "seamer-adapter-schedule",
  "seamer-adapter-vb",
  "vb-matrix-control",
];

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });

test("core snapshot target list is explicit and stable", () => {
  deepEqual(CORE_SNAPSHOT_TARGETS, expectedTargets);
});

test("bundle source does not import repository shared directories", () => {
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const bundleDir = path.join(projectRoot, "bundles", bundle);
    for (const file of sourceFiles(bundleDir)) {
      if (file.includes(`${path.sep}src${path.sep}_leaf-core${path.sep}`)) continue;
      const source = fs.readFileSync(file, "utf8");
      equal(/from\s+["'][^"']*\.\.\/[^"']*shared\//.test(source), false);
    }
  }
});
```

在 `tests/run-tests.ts` 的测试导入区加入：

```ts
import "./bundle-source-independence.test";
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，TypeScript 报告无法找到 `../scripts/sync-bundle-core`，或现有源码仍匹配根 `shared/` 导入。

- [ ] **Step 3: 提交测试**

```bash
git add tests/bundle-source-independence.test.ts tests/run-tests.ts
git commit -m "test: define bundle source independence contract"
```

---

### Task 2: 实现共享核心快照同步器

**Files:**
- Create: `scripts/sync-bundle-core.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `shared/integration/**/*.ts`、`shared/security/**/*.ts`。
- Produces: `CORE_SNAPSHOT_TARGETS`、`syncBundleCoreSnapshots(projectRoot)`、`checkBundleCoreSnapshots(projectRoot)`。

- [ ] **Step 1: 实现确定性同步器**

`scripts/sync-bundle-core.ts` 必须使用以下公开接口和 CLI 行为：

```ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CORE_SNAPSHOT_VERSION = "1.0.0";
export const CORE_SNAPSHOT_TARGETS = [
  "atem-control",
  "logger-system",
  "obs-control",
  "schedule-manager",
  "seamer",
  "seamer-adapter-atem",
  "seamer-adapter-mixer",
  "seamer-adapter-obs",
  "seamer-adapter-schedule",
  "seamer-adapter-vb",
  "vb-matrix-control",
] as const;

interface CoreSnapshotManifest {
  version: string;
  sourceHash: string;
  files: string[];
}

const sourceDirectories = ["integration", "security"] as const;
const generatedHeader = "// 此文件由 scripts/sync-bundle-core.ts 生成，请勿手工修改。\n";

const listFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });

const expectedFiles = (projectRoot: string): Map<string, string> => {
  const root = path.join(projectRoot, "shared");
  const files = sourceDirectories.flatMap((directory) =>
    listFiles(path.join(root, directory))
  );
  return new Map(
    files.map((file) => {
      const relative = path.relative(root, file).replaceAll("\\", "/");
      const source = fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
      return [relative, `${generatedHeader}${source}`];
    })
  );
};

const createManifest = (files: Map<string, string>): CoreSnapshotManifest => {
  const names = [...files.keys()].sort();
  const hash = crypto.createHash("sha256");
  for (const name of names) {
    hash.update(name);
    hash.update("\0");
    hash.update(files.get(name) ?? "");
    hash.update("\0");
  }
  return { version: CORE_SNAPSHOT_VERSION, sourceHash: hash.digest("hex"), files: names };
};

const snapshotDirectory = (projectRoot: string, bundle: string): string =>
  path.join(projectRoot, "bundles", bundle, "src", "_leaf-core");

export const syncBundleCoreSnapshots = (projectRoot: string): void => {
  const files = expectedFiles(projectRoot);
  const manifest = createManifest(files);
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const output = snapshotDirectory(projectRoot, bundle);
    const bundlesRoot = path.join(projectRoot, "bundles");
    if (!output.startsWith(`${bundlesRoot}${path.sep}`)) {
      throw new Error(`Refusing to write outside bundles: ${output}`);
    }
    fs.rmSync(output, { recursive: true, force: true });
    for (const [relative, content] of files) {
      const target = path.join(output, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    }
    fs.writeFileSync(
      path.join(output, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );
  }
};

export const checkBundleCoreSnapshots = (projectRoot: string): string[] => {
  const files = expectedFiles(projectRoot);
  const expectedManifest = createManifest(files);
  const errors: string[] = [];
  for (const bundle of CORE_SNAPSHOT_TARGETS) {
    const output = snapshotDirectory(projectRoot, bundle);
    const manifestPath = path.join(output, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      errors.push(`${bundle}: missing manifest.json`);
      continue;
    }
    const actualManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CoreSnapshotManifest;
    if (JSON.stringify(actualManifest) !== JSON.stringify(expectedManifest)) {
      errors.push(`${bundle}: manifest mismatch`);
    }
    for (const [relative, content] of files) {
      const target = path.join(output, relative);
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) {
        errors.push(`${bundle}: stale ${relative}`);
      }
    }
  }
  return errors;
};

if (require.main === module) {
  const projectRoot = path.resolve(__dirname, "..");
  if (process.argv.includes("--check")) {
    const errors = checkBundleCoreSnapshots(projectRoot);
    if (errors.length > 0) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  } else {
    syncBundleCoreSnapshots(projectRoot);
  }
}
```

- [ ] **Step 2: 增加根命令**

在 `package.json` 的 `scripts` 中加入：

```json
"core:sync": "ts-node scripts/sync-bundle-core.ts",
"core:check": "ts-node scripts/sync-bundle-core.ts --check"
```

- [ ] **Step 3: 生成快照并验证检查器**

Run: `npm run core:sync`

Expected: 11 个目标 bundle 出现 `src/_leaf-core/manifest.json`。

Run: `npm run core:check`

Expected: exit 0，无输出。

- [ ] **Step 4: 提交同步器与快照**

```bash
git add scripts/sync-bundle-core.ts package.json bundles/*/src/_leaf-core
git commit -m "build: vendor shared core into bundles"
```

---

### Task 3: 把根 shared 导入迁移到本地快照

**Files:**
- Modify: `bundles/atem-control/extension/index.ts`
- Modify: `bundles/atem-control/src/dashboard/atem-panel.tsx`
- Modify: `bundles/logger-system/extension/audit-store.ts`
- Modify: `bundles/logger-system/extension/logger.ts`
- Modify: `bundles/obs-control/extension/connection.ts`
- Modify: `bundles/obs-control/extension/index.ts`
- Modify: `bundles/obs-control/extension/secret-settings.ts`
- Modify: `bundles/obs-control/src/dashboard/obs-connection.tsx`
- Modify: `bundles/obs-control/src/dashboard/obs-control-panel.tsx`
- Modify: `bundles/schedule-manager/src/types/schedule.types.ts`
- Modify: `bundles/seamer/extension/integration-registry.ts`
- Modify: `bundles/seamer/src/dashboard/trigger/CapabilityFields.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/DynamicTriggerModal.tsx`
- Modify: `bundles/seamer/src/types/seamer.types.ts`
- Modify: `bundles/seamer-adapter-atem/extension/index.ts`
- Modify: `bundles/seamer-adapter-atem/extension/manifest.ts`
- Modify: `bundles/seamer-adapter-mixer/extension/manifest.ts`
- Modify: `bundles/seamer-adapter-obs/extension/index.ts`
- Modify: `bundles/seamer-adapter-obs/extension/manifest.ts`
- Modify: `bundles/seamer-adapter-schedule/extension/manifest.ts`
- Modify: `bundles/seamer-adapter-vb/extension/index.ts`
- Modify: `bundles/seamer-adapter-vb/extension/manifest.ts`
- Modify: `bundles/vb-matrix-control/extension/index.ts`
- Modify: `bundles/vb-matrix-control/extension/manager.ts`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/MatrixView.tsx`
- Modify: `bundles/vb-matrix-control/src/dashboard/components/PatchStatus.tsx`

**Interfaces:**
- Consumes: `src/_leaf-core/integration/*` 与 `src/_leaf-core/security/*`。
- Produces: 所有目标 bundle 内部相对导入，不再访问仓库根 `shared/`。

- [ ] **Step 1: 机械替换导入基准**

按文件深度使用以下确定路径，不改变导入的 symbol：

```ts
// extension/*.ts
import { CommandGateway } from "../src/_leaf-core/security/command-gateway";

// src/dashboard/*.tsx
import { sendAuthenticatedCommand } from "../_leaf-core/security/authenticated-command-client";

// src/dashboard/components/*.tsx
import { sendAuthenticatedCommand } from "../../_leaf-core/security/authenticated-command-client";

// src/types/*.ts
import type { EventEnvelope } from "../_leaf-core/integration/types";

// src/dashboard/trigger/*.tsx
import type { CapabilityDefinition } from "../../_leaf-core/integration/types";
```

Adapter 的 `extension/*.ts` 统一从 `../src/_leaf-core/` 导入。对同目录更深文件先计算相对路径，再用 `npm run typecheck` 验证，不改 symbol 名称。

- [ ] **Step 2: 运行契约测试并确认通过**

Run: `npm test`

Expected: `bundle source does not import repository shared directories` PASS，全部既有测试 PASS。

- [ ] **Step 3: 运行类型与构建验证**

Run: `npm run typecheck`

Expected: exit 0。

Run: `npm run build`

Expected: 所有 bundle 构建成功，extension 输出仍为各 bundle 自有 `extension/index.js`。

- [ ] **Step 4: 提交导入迁移**

```bash
git add bundles
git commit -m "refactor: use bundle-local core snapshots"
```

---

### Task 4: 建立真正的隔离构建 CI

**Files:**
- Create: `scripts/test-standalone-bundle.ps1`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: bundle 名称参数与 bundle 自己的 `package.json`、`src/`、`extension/`、`vite.config.mjs`。
- Produces: 不复制根 `shared/`、根 `node_modules/` 或其他 bundle 的临时目录构建结果。

- [ ] **Step 1: 编写隔离构建脚本**

```powershell
param(
  [Parameter(Mandatory = $true)]
  [string]$Bundle
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "bundles\$Bundle"
$targetRoot = Join-Path ([System.IO.Path]::GetTempPath()) "leafseamer-standalone"
$target = Join-Path $targetRoot $Bundle
$resolvedTargetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$resolvedTarget = [System.IO.Path]::GetFullPath($target)

if (-not (Test-Path -LiteralPath $source)) {
  throw "Bundle not found: $Bundle"
}

if (-not $resolvedTarget.StartsWith("$resolvedTargetRoot$([System.IO.Path]::DirectorySeparatorChar)")) {
  throw "Refusing to use a target outside the standalone test root: $resolvedTarget"
}

if (Test-Path -LiteralPath $resolvedTarget) {
  Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
}

New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $resolvedTarget -Recurse

Push-Location $resolvedTarget
try {
  npm install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm install failed for $Bundle" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed for $Bundle" }
} finally {
  Pop-Location
}
```

- [ ] **Step 2: 增加本地命令**

在 `package.json` 的 `scripts` 中加入：

```json
"test:standalone": "powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1"
```

- [ ] **Step 3: 更新 CI matrix**

将 `.github/workflows/ci.yml` 的 `standalone-bundles` matrix 改为：

```yaml
matrix:
  bundle:
    - atem-control
    - backup-system
    - data-sync-service
    - graphics-package
    - logger-system
    - mixer-control
    - obs-control
    - schedule-adapter-google-sheets
    - schedule-adapter-postgresql
    - schedule-manager
    - seamer
    - seamer-adapter-atem
    - seamer-adapter-mixer
    - seamer-adapter-obs
    - seamer-adapter-schedule
    - seamer-adapter-vb
    - vb-matrix-control
```

把构建步骤替换为：

```yaml
- run: powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle "${{ matrix.bundle }}"
```

在 `verify` job 的 `npm test` 前加入：

```yaml
- run: npm run core:check
```

- [ ] **Step 4: 本地验证两个代表 bundle**

Run: `powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle atem-control`

Expected: 临时目录中 `npm install` 与 `npm run build` exit 0。

Run: `powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle seamer`

Expected: 在没有根 `shared/` 时构建成功。

- [ ] **Step 5: 提交隔离构建验证**

```bash
git add scripts/test-standalone-bundle.ps1 .github/workflows/ci.yml package.json
git commit -m "ci: verify isolated bundle source builds"
```

---

### Task 5: 更新独立性文档和开发日志

**Files:**
- Modify: `README.md`
- Modify: `Manual/eng/INSTALLATION.md`
- Modify: `Manual/chs/INSTALLATION.md`
- Modify: `Manual/jpn/INSTALLATION.md`
- Modify: `DEVELOPMENT_MEMO.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `core:sync`、`core:check` 与 `test-standalone-bundle.ps1`。
- Produces: 三种语言一致的独立构建说明和开发日志记录。

- [ ] **Step 1: 写入文档说明**

英文手册使用以下命令块，中文和日文手册提供等义说明但保留命令原文：

```powershell
npm run core:check
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle seamer
```

明确说明 `src/_leaf-core/` 是版本化生成快照，不能手工修改；更新权威源后执行 `npm run core:sync`。

- [ ] **Step 2: 更新开发日志**

在 `DEVELOPMENT_MEMO.md` 的需求变化、代码变动、功能实现路径和已解决 bug 中记录日期 `2026-07-13`，说明旧 CI 不是隔离构建、现已改为本地快照与临时目录验证。

- [ ] **Step 3: 检查忽略规则**

确认 `.gitignore` 不忽略 `bundles/*/src/_leaf-core/`，同时继续忽略每个 bundle 的 `node_modules/` 和测试临时产物。

- [ ] **Step 4: 运行最终验证**

Run: `npm run core:check && npm test && npm run typecheck && npm run build`

Expected: 四个命令全部 exit 0。

- [ ] **Step 5: 提交文档**

```bash
git add README.md Manual DEVELOPMENT_MEMO.md .gitignore
git commit -m "docs: document bundle source independence"
```
