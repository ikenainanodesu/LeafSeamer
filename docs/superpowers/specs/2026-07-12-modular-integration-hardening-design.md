# LeafSeamer 模块化集成与安全治理设计

## 目标

在保持 Logger、Seamer、Schedule Manager 和各设备 Bundle 可独立安装、独立运行的前提下，建立统一的集成 API、安全命令边界、敏感数据管理、可审计备份和外部播单自动化能力。

## 已确认决策

- 暂不采用 Python sidecar；Google Sheets 与 PostgreSQL 使用可选 Node.js Adapter。
- Schedule 自动化首期只支持“到达计划时间”和“指定字段发生状态变化”两类显式触发，不把任意行变化默认视为播出命令。
- Graphics Package 保留现状，风险仍记录为 P2，但实施状态标记为 Deferred。
- 核心 Bundle 不强制依赖 Seamer、Logger、Secret Manager 或 Command Gateway NodeCG Bundle。
- 共享能力以可打包的 TypeScript SDK/Library 提供；运行时协作由可选 Adapter 完成。
- L3 Secret 默认不进入普通备份；用户选择备份时必须独立加密，且恢复密钥不保存在同一归档中。

## 方案比较

### 方案 A：模块化 SDK + 可选 Adapter（采用）

共享 SDK 定义 Capability Manifest、Command Envelope、Event Envelope、Schema Version、Ack、Secret Provider 和 Audit Event。每个核心 Bundle 自己注册命令与状态；Seamer 和 Schedule 通过可选 Adapter 发现能力。

优点：保持独立部署、便于逐 Bundle 迁移、第三方模块可扩展。缺点：需要清晰的版本合同和兼容性测试。

### 方案 B：中央平台 Bundle

所有模块强制依赖一个包含 Secret、Command、Event Bus 和 Audit 的中央 Bundle。

优点：管理集中。缺点：形成单点故障和强运行时依赖，违背独立 Bundle 目标，因此不采用。

### 方案 C：外部 Python 编排进程

把数据同步与自动化放在 Python sidecar，通过 HTTP/WebSocket 控制 NodeCG。

优点：ETL 生态强。缺点：增加进程守护、认证、端口和部署成本；用户已确认首期不采用。

## 统一 Integration API

### Capability Manifest

每个 Adapter 向 Seamer 注册：

- `integrationId`、`displayName`、`apiVersion`
- 可用触发器及其参数 schema
- 可用动作及其参数 schema
- Dashboard 表单所需的 UI hints
- 当前能力与只读状态快照
- 条件比较器和动作执行器

Seamer 不再把 `mixer/atem/obs/vb` 写入封闭联合类型和固定表单。新 Adapter 注册 Manifest 后，触发器编辑器自动显示其功能；卸载 Adapter 后，已有配置保留但标记为 unavailable。

### 数据通道

- Replicant：低频配置和当前状态快照。
- Event Envelope：状态变化和一次性业务事件。
- Command Envelope：需要执行和确认的操作。
- Ack：统一返回成功、错误码、错误文本和 `correlationId`。
- SQLite + WAL：审计、同步历史、版本和查询，不承担实时 UI 分发。

## Schedule Manager

Schedule Manager 只拥有标准化播单、版本、状态机和到期事件，不直接依赖 Google 或 PostgreSQL。

### 标准播单项

建议字段：

- `id`、`sourceId`、`externalId`、`revision`
- `title`、`description`、`plannedAt`
- `state`、`active`、`metadata`
- `triggerMappings`

### 数据源 Adapter

- `schedule-adapter-google-sheets`
- `schedule-adapter-postgresql`

Adapter 将来源数据转换为统一 Import Batch，包含来源、版本、获取时间、记录和校验结果。Schedule Manager 执行 dry-run、diff、冲突检查、提交和回滚。

### Seamer 自动化

新增 `seamer-adapter-schedule`，注册两类触发器：

- `schedule.item_due`：到达 `plannedAt`。
- `schedule.field_changed`：指定字段从条件 A 变为条件 B。

任意新增行或任意字段变化不会默认触发动作，避免外部数据整理误触发播出。

## Command Gateway

Command Gateway 是 SDK 中的服务端中间件，不是必须安装的中央 Bundle。每个 Bundle 注册命令时声明：

- 命令名和版本
- Payload schema
- 所需权限
- 目标解析和 allowlist
- 是否需要二次确认
- 执行 handler

执行顺序：身份 → 权限 → schema → allowlist → 执行 → 脱敏审计。首期先迁移 OBS 推流、ATEM Macro、VB Patch、Backup 和 Secret 保存等高风险命令。

## Secret Manager

Secret Manager 以共享 Library 提供统一接口，Bundle 通过 namespace 独立存储：

- OBS：WebSocket password、stream key、RTMP 认证。
- Data Source Adapter：Google service account、PostgreSQL DSN/password。
- 未来设备模块：控制密码或 token。

可逆 Secret 使用 AES-256-GCM 等可认证加密；master key 来自环境变量或操作系统 Secret Store。访问码使用 Argon2id 或 bcrypt 单向哈希。Dashboard 只接收 `configured`、更新时间和脱敏标签。

## Backup 分级

- L0 Public：模板和文档，默认包含。
- L1 Operational：Cards、Presets、Schedule，默认包含。
- L2 Confidential：日志、设备地址、历史状态，管理员选择。
- L3 Secret：密码、token、stream key、service account，默认排除；选择时必须生成独立加密载荷。

每次备份生成 manifest，记录路径、级别、大小、哈希、是否包含和加密状态。L3 恢复密钥不写入归档。

## Logger 与 Audit

Logger 写入前执行结构化字段 redaction 和字符串敏感模式检测。普通运行日志继续使用现有自动清理周期。

Audit Store 独立使用 SQLite + WAL，记录时间、身份组、命令、目标、结果和 `correlationId`，参数必须先脱敏。Audit 使用独立保留策略，不受普通日志清理影响。

## 部署边界

- 单机：NodeCG 绑定 `127.0.0.1`。
- 播控局域网：绑定播控网卡 IP，Windows 防火墙限制来源网段。
- 跨网访问：反向代理终止 TLS，接入 OIDC/Basic Auth/访问码身份组。
- VLAN 在可管理交换机划分，并由路由器或三层交换机 ACL 控制互访；只有 VLAN、没有 ACL 不构成完整隔离。

## 实施顺序

1. Integration API 与 Seamer 动态 Capability。
2. Schedule Import API、Google Adapter 重构、PostgreSQL Adapter、Seamer Schedule Adapter。
3. Secret Library、Command Gateway 和高风险命令迁移。
4. Backup 分级、选择、manifest 和 L3 加密载荷。
5. Logger redaction 与独立 Audit Store。
6. CI 独立 Bundle 组合验证。

Graphics UI 统一不在本轮范围。

## 验收标准

- 新 Adapter 无需修改 Seamer 核心即可注册动作和触发器。
- Seamer 单独安装时仍可加载，缺失 Adapter 只显示 unavailable。
- Schedule 可从 Google Sheets 或 PostgreSQL 导入统一播单，并只按显式规则触发 Seamer。
- L3 Secret 不进入普通 zip；加密备份与密钥分离。
- 高风险命令经过 schema、权限和目标校验并产生脱敏审计。
- 普通日志清理不会删除 Audit Store。
- 所有核心 Bundle 的最小安装构建与 smoke test 通过。
