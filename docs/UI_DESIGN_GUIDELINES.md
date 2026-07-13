# LeafSeamer Dashboard UI 设计规范

- 规范版本：1.0.0
- 更新日期：2026-07-13
- 状态：已批准，等待实施
- 适用范围：所有非 Graphics NodeCG Dashboard
- 界面语言：英文

## 1. 使用目的

本规范是 LeafSeamer Dashboard 后续开发和评审的长期依据。新增面板、修改现有面板或接入新设备时，必须先遵循本规范，再补充 bundle 自己的业务需求。

本规范统一视觉与交互，不统一业务状态。每个 bundle 仍负责自己的 NodeCG 消息、Replicant、设备协议、权限和错误语义。

## 2. 强制边界

1. `graphics-package` 不适用本规范，除非后续需求明确纳入。
2. 每个 bundle 必须能够独立安装、构建和运行。
3. Dashboard 只能导入本 bundle 内的 `_leaf-ui` 快照，禁止运行时导入其他 bundle 或仓库级 UI 权威源。
4. 共享组件不得直接读取 Replicant、调用 `nodecg.sendMessage` 或保存 bundle 业务状态。
5. 改造 UI 时不得顺带更改消息名、payload、Replicant schema、权限检查或设备命令行为。
6. 所有新增代码注释使用中文；所有 LeafSeamer 自有可见 UI 文案使用英文。

## 3. 设计方向

### 3.1 Dense Hardware Console

界面应像专业设备控制台：深色、高对比、紧凑、稳定，优先支持长时间监看、快速扫描和重复操作。避免营销页面、装饰性渐变、大面积品牌色、漂浮卡片和多层卡片嵌套。

### 3.2 Tiered Controls

每个面板按以下顺序组织：

1. **Identity and status**：bundle、活动设备、连接状态和持续性错误。
2. **Primary operation**：直播期间最常用且需要立即访问的操作。
3. **Secondary tools**：来源、映射、预设、历史和低频工具。
4. **Advanced settings**：连接参数、认证、字段映射和高级配置。
5. **Danger zone**：删除、清空、重置等不可逆操作。

高频操作不得仅为缩短面板而隐藏到 tab 或多级菜单中。低频设置使用折叠章节，折叠状态仅保存在浏览器本地，不影响设备和 Replicant 状态。

## 4. 颜色令牌

| CSS 变量 | 值 | 用途 |
| --- | --- | --- |
| `--leaf-bg` | `#0c0e11` | Dashboard 根背景 |
| `--leaf-surface` | `#14171b` | 主内容表面 |
| `--leaf-surface-raised` | `#20242a` | 控件、悬停和展开表面 |
| `--leaf-surface-deep` | `#090b0d` | 输入框、日志和矩阵底色 |
| `--leaf-border` | `#2a3037` | 控件和分区边界 |
| `--leaf-text` | `#f2f4f6` | 标题、正文和关键读数 |
| `--leaf-text-muted` | `#959da7` | 标签和辅助信息 |
| `--leaf-text-faint` | `#68717c` | 占位和禁用信息 |
| `--leaf-command` | `#61a9ff` | 主命令、焦点和当前选择 |
| `--leaf-success` | `#52d273` | 已连接、成功和正常运行 |
| `--leaf-warning` | `#ffbd4a` | 降级、等待和警告 |
| `--leaf-danger` | `#ff626b` | 失败和不可逆操作 |

颜色规则：

- 蓝色只表示命令、焦点或当前选择，不表示设备健康。
- 绿色、黄色和红色只表示状态或风险，不作为装饰色。
- 状态必须同时提供文字或图标，不得只依赖颜色。
- 主界面不得由单一蓝色、紫色、米色或棕色系主导。

## 5. 尺寸与排版

### 5.1 间距

使用 4px 基础栅格：

- `--leaf-space-1: 4px`
- `--leaf-space-2: 8px`
- `--leaf-space-3: 12px`
- `--leaf-space-4: 16px`
- `--leaf-space-6: 24px`

控件和容器圆角统一为 `4px`。卡片仅用于重复项目、对话框和确实需要边框的工具，不把页面章节做成漂浮卡片，也不嵌套卡片。

### 5.2 字体

- 正文与控件：12–13px。
- 面板标题：16–18px。
- 章节标签：11px。
- 行高：正文 1.4–1.55，紧凑表格 1.3–1.4。
- IP、端口、时间、计数、设备 ID 和日志元数据使用等宽字体。
- 字号不得随视口宽度缩放。
- 字距必须为 0，不使用负字距。

### 5.3 稳定尺寸

矩阵节点、图标按钮、计数器、状态徽标、通道条和工具栏必须有稳定的宽高或网格约束。loading、hover、状态文本和图标变化不得推动周围内容或造成明显布局跳动。

## 6. 组件规范

### 6.1 Panel Header

必须包含面板名称、活动设备或数据源、连接状态。持续性错误显示在 Header 下方的状态区域，不使用会自动消失的 Toast 代替。

### 6.2 Button

- **Primary**：蓝色，用于一个区域内最主要的明确命令。
- **Secondary**：中性表面，用于普通命令。
- **Danger**：红色，仅用于不可逆或高风险命令。
- **Icon Button**：优先使用 Lucide 图标，必须提供英文 tooltip 和可访问名称。
- pending 时保留原尺寸、显示进度并阻止重复提交。
- disabled 时必须能从附近文案理解原因。

可以使用文字按钮的命令示例：`Connect`、`Create Backup`、`Start Streaming`、`Save Trigger`。

应使用图标按钮的工具示例：刷新、删除、关闭、显示/隐藏、上一条、下一条、播放、暂停、停止。

### 6.3 Field

字段必须有可见标签或无障碍标签。错误显示在字段附近。Secret 字段默认遮罩，显示/隐藏使用图标按钮；已经保存的 Secret 不回填明文。

### 6.4 Toggle and Segmented Control

二元设置使用 Toggle 或 Checkbox。互斥且选项较少的模式使用 Segmented Control。不得用一组外观相同的普通按钮表达持续状态。

### 6.5 Disclosure

折叠区标题必须说明内容和当前摘要，例如 `Connection · 192.168.10.42`。Primary operation 不得默认折叠；Advanced settings 默认折叠。

### 6.6 Table, Log and Matrix

- 紧凑表格使用固定列策略，长内容省略并提供 tooltip。
- 日志时间、Level、Bundle 和 Category 保持可扫描。
- Matrix 与通道条在窄面板使用内部横向滚动，不缩小到不可点击。
- Matrix 的输入名称和输出表头在滚动时保持可见。
- 点击 Matrix 节点必须提供 pending、patched、unpatched、warning 和 error 状态。

### 6.7 Dialog and Toast

- 删除、清空和重置等不可逆操作使用 Confirm Dialog。
- CUT/AUTO、Scene 切换、Patch、Mute 等直播高频操作不增加确认步骤。
- Toast 用于临时命令结果；连接中断、认证失败和 Secret 缺失使用持续状态区。
- 对话框打开时移动焦点，关闭后把焦点返回触发控件。

### 6.8 Error Boundary

每个 Dashboard 入口必须有自己的 Error Boundary。渲染错误只影响当前 iframe，并显示英文错误摘要和 `Reload Panel` 操作。

## 7. 命令反馈原则

1. 有 callback、Promise ack 或可关联 Replicant 更新的命令，点击后进入 pending，并阻止同一命令重复提交。
2. 只有消息回执或 Replicant 更新后才显示成功。
3. 现有 fire-and-forget 消息在本次纯 UI 改造中不伪造成功或 pending；补充回执需要另立协议变更任务。
4. 失败时恢复最后确认状态，不伪造设备已成功执行。
5. 字段错误显示在字段附近；命令错误显示在操作附近并同步到 Toast。
6. `AUTH_REQUIRED`、Secret 不可用和连接中断显示为持续性错误，并使用项目文档中已有的解决语义。

## 8. 英文文案规则

- 使用短、直接、可操作的句子。
- 按钮使用动词或明确命令：`Connect`、`Refresh`、`Save Preset`。
- 状态使用结果词：`Online`、`Disconnected`、`Pending`、`Failed`。
- 不在界面中写设计说明、功能宣传、快捷键教程或视觉规范说明。
- 错误至少说明发生了什么；已知修复路径可补充一句操作建议。
- 保留设备、协议和产品的官方名称，如 `Voicemeeter Matrix`、`VBAN`、`OBS WebSocket`。

## 9. 响应式与可访问性

### 9.1 验收宽度

所有面板必须在 320、480 和 768px 内容宽度下检查。NodeCG 面板以 320px 为最低支持宽度。

### 9.2 响应式规则

- 工具栏整组换行，不缩小按钮文字和点击区域。
- 固定格式控件使用 `grid-template-columns`、`minmax()`、`aspect-ratio` 或明确尺寸。
- 长 IP、设备名和错误可换行或省略，并提供完整 tooltip。
- 页面级不得出现无意的水平滚动；Matrix、表格和通道条可以在自己的 viewport 内滚动。

### 9.3 可访问性规则

- 所有交互可通过键盘操作。
- 焦点环使用命令蓝，并与背景保持清晰对比。
- 图标按钮提供 `title` 或 tooltip，以及 `aria-label`。
- 状态变化使用合适的 `aria-live`。
- 禁用、pending 和错误状态不能只靠颜色表达。

## 10. Bundle 独立性规则

### 10.1 权威源与快照

- 权威源：`shared/dashboard-ui/`
- 本地快照：`bundles/<bundle>/src/dashboard/_leaf-ui/`
- 同步命令：`npm run ui:sync`
- 检查命令：`npm run ui:check`

快照纳入 Git。单独 bundle 构建只读取本地快照，不访问权威源。生成文件必须带中文注释说明来源和禁止手工修改。

### 10.2 依赖声明

每个使用图标的 bundle 必须在自己的 `package.json` 声明 `lucide-react`。不得仅依赖根 workspace 的隐式提升。

### 10.3 禁止项

- 禁止从 `shared/dashboard-ui/` 直接运行时导入。
- 禁止从 `bundles/<other-bundle>/` 导入 UI。
- 禁止通过另一个 bundle 提供主题 CSS URL。
- 禁止用全局 Replicant 同步纯视觉状态。

### 10.4 当前独立性前置条件

截至 2026-07-13，部分 bundle 源码仍直接导入仓库根目录的 `shared/security` 或 `shared/integration`。因此“构建产物可独立运行”已经成立，但“单独复制 bundle 源码后可安装并构建”尚未成立。UI 快照不得掩盖这项差异。

在宣称源码级独立之前，必须先执行 `docs/superpowers/plans/2026-07-13-bundle-source-independence-prerequisite.md`，把所需共享核心源码同步为各 bundle 的本地版本化快照，并通过真正的临时目录隔离构建验证。

## 11. 新面板检查清单

- [ ] UI 文案全部为英文。
- [ ] 使用本 bundle 的 `_leaf-ui` 快照。
- [ ] Header 显示身份、目标和连接状态。
- [ ] 高频操作常驻，低频配置分层折叠。
- [ ] 颜色符合命令色、状态色和危险色语义。
- [ ] 使用 Lucide 通用图标，并提供 tooltip 和可访问名称。
- [ ] pending、disabled、empty、error 和 disconnected 状态完整。
- [ ] 不可逆操作有确认，高频直播操作没有多余确认。
- [ ] 320、480、768px 下无文字遮挡和页面级意外溢出。
- [ ] 键盘焦点可见，状态不只依赖颜色。
- [ ] 消息名、payload 和 Replicant schema 没有因 UI 改造改变。
- [ ] 单独复制 bundle 后可以安装、构建和运行。

## 12. 规范变更流程

1. 先更新本文件和对应设计文档，说明语义变化与影响范围。
2. 修改 `shared/dashboard-ui/` 权威源。
3. 按语义版本更新 UI 版本：破坏性变更升主版本，新增兼容能力升次版本，视觉修正升修订版本。
4. 执行 `npm run ui:sync` 更新所有目标快照。
5. 执行 `npm run ui:check`、类型检查、逐 bundle 构建和视觉验收。
6. 更新 `DEVELOPMENT_MEMO.md`，记录需求、代码、功能、实现路径和已知问题变化。

## 13. 相关文档

- 设计背景与实施边界：`docs/superpowers/specs/2026-07-13-dashboard-ui-unification-design.md`
- 源码独立性前置计划：`docs/superpowers/plans/2026-07-13-bundle-source-independence-prerequisite.md`
- 分阶段实施计划：`docs/superpowers/plans/2026-07-13-dashboard-ui-*.md`
