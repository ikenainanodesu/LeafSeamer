# Modular Integration Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不引入中央强依赖 Bundle 的前提下，实现动态 Seamer Capability、Schedule 多数据源与显式自动化、共享安全 Library、分级备份、日志脱敏和独立审计。

**Architecture:** 使用 `shared/integration`、`shared/security` 和 `shared/audit` 中可被各 Bundle 打包的 TypeScript Library。核心 Bundle 保持独立；只有 Adapter 声明两侧运行时依赖。Replicant 保存当前快照，Event/Command Envelope 传递变化与命令，SQLite + WAL 保存审计历史。

**Tech Stack:** TypeScript 5.7、Node.js、NodeCG 2.6、React 19、Vite 6、Node crypto、Node test assertions、PostgreSQL `pg`

## Global Constraints

- 所有 Dashboard 和 Graphic UI 文案使用英文。
- 所有新增代码注释使用中文。
- 不采用 Python sidecar。
- Graphics Package 不在本轮修改。
- 新能力不得让 Seamer、Schedule、Logger 或设备核心产生新的强 NodeCG Bundle 依赖。
- L3 Secret 默认不进入普通备份，且加密密钥不进入同一归档。

---

### Task 1: 测试入口与 Integration SDK

**Files:**
- Modify: `package.json`
- Create: `tests/run-tests.ts`
- Create: `shared/integration/types.ts`
- Create: `shared/integration/schema.ts`
- Create: `tests/integration-schema.test.ts`

**Interfaces:**
- Produces: `CapabilityManifest`、`CommandEnvelope`、`EventEnvelope`、`CommandAck`、`validateParameterValues()`。

- [x] 先编写失败测试，覆盖 Manifest 版本、重复 capability ID、必填参数、枚举与 number/boolean/string 类型校验。
- [x] 运行 `npm test`，确认因 `shared/integration/schema` 不存在失败。
- [x] 实现最小 SDK 与 schema 校验器。
- [x] 运行 `npm test` 和 `npm run typecheck`，确认通过。

### Task 2: Seamer 动态 Provider Registry 与 Trigger Engine

**Files:**
- Modify: `bundles/seamer/src/types/seamer.types.ts`
- Modify: `bundles/seamer/extension/integration-registry.ts`
- Modify: `bundles/seamer/extension/trigger-manager.ts`
- Modify: `bundles/seamer/extension/index.ts`
- Create: `tests/seamer-capability.test.ts`

**Interfaces:**
- Consumes: `CapabilityManifest`。
- Produces: 任意 string integration ID 的 `registerIntegration()`、`evaluateCondition()` 与 `executeCapability()`；保留 legacy card/trigger 兼容入口。

- [x] 写失败测试：注册 `schedule` Provider 后 Registry 发布 Manifest，条件 evaluator 只在状态跨越目标时返回 true，卸载后配置不可执行。
- [x] 运行测试确认固定 `TriggerModule` 无法通过。
- [x] 将 Registry 改为 string ID + Manifest，并把固定条件判断迁到 Provider evaluator。
- [x] 保留现有四模块 legacy 转换器，避免已有 Replicant 数据失效。
- [x] 运行测试、Seamer build 和 typecheck。

### Task 3: Seamer Schema-Driven Trigger UI

**Files:**
- Create: `bundles/seamer/src/dashboard/trigger/CapabilityFields.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/EditTriggerModal.tsx`
- Modify: `bundles/seamer/src/dashboard/trigger/TriggerPage.tsx`
- Modify: `bundles/seamer/src/dashboard/App.tsx`
- Create: `tests/capability-fields.test.ts`

**Interfaces:**
- Consumes: `seamerIntegrations` 中的 Manifest 与 options。
- Produces: 动态 trigger/action selector 和参数值对象；不可用 Provider 只读显示。

- [x] 写失败测试：string、number、boolean、enum parameter schema 生成稳定默认值并保留未知旧值。
- [x] 实现纯函数 `createDefaultParameters()` 与 `coerceParameterValue()`。
- [x] 实现英文动态字段组件，替换固定四模块 selector；legacy 配置自动转换显示。
- [x] 运行测试、Dashboard build 和 typecheck。

### Task 4: 迁移设备 Adapter 到统一 Manifest

**Files:**
- Modify: `bundles/seamer-adapter-atem/extension/index.ts`
- Modify: `bundles/seamer-adapter-mixer/extension/index.ts`
- Modify: `bundles/seamer-adapter-obs/extension/index.ts`
- Modify: `bundles/seamer-adapter-vb/extension/index.ts`
- Create: `tests/device-manifests.test.ts`

**Interfaces:**
- Produces: 四个版本化 Capability Manifest、参数 options 和 Provider evaluator/executor。

- [x] 写失败测试验证四个 Manifest ID 唯一、schema 合法、每个触发器和动作有 executor/evaluator。
- [x] 迁移 Adapter，保持现有 NodeCG message 名称与设备状态 Replicant 不变。
- [x] 运行测试、四个 Adapter build、Seamer build 和 typecheck。

### Task 5: Schedule Import API 与显式事件

**Files:**
- Create: `bundles/schedule-manager/src/types/schedule.types.ts`
- Modify: `bundles/schedule-manager/extension/schedule-service.ts`
- Modify: `bundles/schedule-manager/extension/index.ts`
- Modify: `bundles/schedule-manager/src/dashboard/schedule-panel.tsx`
- Modify: `bundles/schedule-manager/src/graphics/schedule-display.tsx`
- Create: `tests/schedule-import.test.ts`

**Interfaces:**
- Produces: `PlaylistItem`、`ScheduleImportBatch`、`previewImport()`、`commitImport()`、`rollbackImport()`、`scheduleEvents` Replicant/Event。

- [x] 写失败测试覆盖批次校验、diff、冲突拒绝、commit、rollback、item_due 去重和配置字段迁移事件。
- [x] 实现标准模型与纯导入逻辑。
- [x] Schedule Service 发布当前快照、最近 import metadata 和显式事件；Dashboard 不再直接写权威 Replicant。
- [x] 运行测试、Schedule build 和 typecheck。

### Task 6: Google Sheets、PostgreSQL 与 Seamer Schedule Adapter

**Files:**
- Modify: `bundles/schedule-adapter-google-sheets/extension/index.ts`
- Modify: `bundles/schedule-adapter-google-sheets/package.json`
- Create: `bundles/schedule-adapter-postgresql/package.json`
- Create: `bundles/schedule-adapter-postgresql/tsconfig.json`
- Create: `bundles/schedule-adapter-postgresql/vite.config.mjs`
- Create: `bundles/schedule-adapter-postgresql/extension/index.ts`
- Create: `bundles/seamer-adapter-schedule/package.json`
- Create: `bundles/seamer-adapter-schedule/tsconfig.json`
- Create: `bundles/seamer-adapter-schedule/vite.config.mjs`
- Create: `bundles/seamer-adapter-schedule/extension/index.ts`
- Create: `cfg/schedule-adapter-postgresql.json.example`
- Create: `tests/schedule-adapters.test.ts`

**Interfaces:**
- Google/PostgreSQL Produces: `ScheduleImportBatch`。
- Seamer Schedule Produces: `schedule.item_due`、`schedule.field_changed` Capability。

- [x] 写失败测试验证 Google row 与 PostgreSQL row 转换为同一 Batch，并验证 Schedule Manifest 只包含两类显式触发器。
- [x] 重构 Google Adapter，删除固定整表替换。
- [x] 新增只读 PostgreSQL Adapter，SQL、轮询间隔和字段映射由配置提供，参数值与凭据分离。
- [x] 新增 Seamer Schedule Adapter。
- [x] 安装 `pg` 并更新 lockfile；运行测试、三个 Adapter build、Schedule/Seamer build 和 typecheck。

### Task 7: Secret Library 与 Command Gateway

**Files:**
- Create: `shared/security/secret-manager.ts`
- Create: `shared/security/command-gateway.ts`
- Create: `shared/security/redaction.ts`
- Create: `tests/security.test.ts`
- Modify: `bundles/obs-control/extension/index.ts`
- Modify: `bundles/vb-matrix-control/extension/index.ts`
- Modify: `bundles/atem-control/extension/index.ts`

**Interfaces:**
- Produces: namespace Secret Provider、AES-256-GCM 文件格式、Command Handler Registry、脱敏 Audit Event。

- [x] 写失败测试覆盖加密往返、错误 key/tag、明文缺失、schema/权限/allowlist 拒绝和 correlationId Ack。
- [x] 实现 Library，master key 仅来自环境变量或显式 provider。
- [x] 先迁移 OBS stream settings、VB patch 和 ATEM Macro 高风险命令，保留旧 message 兼容 wrapper。
- [x] 运行测试、三个 Bundle build 和 typecheck。

### Task 8: Backup L0-L3、Manifest 与 L3 加密载荷

**Files:**
- Create: `bundles/backup-system/src/types/backup.types.ts`
- Modify: `bundles/backup-system/extension/backup-manager.ts`
- Modify: `bundles/backup-system/extension/index.ts`
- Modify: `bundles/backup-system/src/dashboard/backup-control.tsx`
- Create: `tests/backup-policy.test.ts`

**Interfaces:**
- Consumes: `BackupRequest { levels, includeSecrets, secretPassphrase? }`。
- Produces: zip、manifest、可选加密 L3 payload；不返回明文 Secret。

- [x] 写失败测试覆盖默认 L0/L1、L2 opt-in、L3 无密钥拒绝、manifest 哈希和路径穿越拒绝。
- [x] 实现路径分类 registry 与 manifest builder。
- [x] Dashboard 使用英文复选框和强制风险确认；L3 通过独立 passphrase 派生 key 加密。
- [x] 运行测试、Backup build 和 typecheck。

### Task 9: Logger Redaction 与 Audit Store

**Files:**
- Modify: `bundles/logger-system/extension/logger.ts`
- Create: `bundles/logger-system/extension/audit-store.ts`
- Modify: `bundles/logger-system/extension/index.ts`
- Create: `tests/logger-security.test.ts`

**Interfaces:**
- Produces: 写入前 redaction；SQLite + WAL Audit Store；普通清理不影响审计。

- [x] 写失败测试覆盖字段/pattern redaction、误报保护、Audit insert/query、普通 cleanup 后审计保留。
- [x] 接入 shared redaction；使用 Node `node:sqlite`，不可用时给出明确启动警告并禁用 Audit，不影响 Logger 基础功能。
- [x] 运行测试、Logger build 和 typecheck。

### Task 10: CI、文档、报告与完整验证

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: `DEVELOPMENT_MEMO.md`
- Modify: `LeafSeamer_Project_Status_Report.html`

**Interfaces:**
- Produces: root test/typecheck/build、关键单 Bundle build、独立组合 smoke matrix。

- [x] 添加 CI：`npm test`、`npm run typecheck`、`npm run build`、关键 Bundle 单 build。
- [x] 更新 README、配置模板、开发日志和报告，把已实现与 Deferred 明确区分。
- [x] 运行完整测试、typecheck、全量 build、报告检查和 git diff check。
- [x] 同步外部 HTML 并验证 SHA256。
