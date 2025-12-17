# LeafSeamer 用户使用手册

本手册详细介绍 LeafSeamer 各个功能模块的使用方法。

## 目录

1. [Dashboard 概览](#dashboard-概览)
2. [Seamer - 场景控制卡片系统](#seamer---场景控制卡片系统)
3. [Mixer Control - 调音台控制](#mixer-control---调音台控制)
4. [OBS Control - OBS 控制](#obs-control---obs-控制)
5. [VB Matrix Control - VB-Audio Matrix 控制](#vb-matrix-control---vb-audio-matrix-控制)
6. [Graphics Package - 图形包](#graphics-package---图形包)
7. [Schedule Manager - 日程管理](#schedule-manager---日程管理)
8. [Logger System - 日志系统](#logger-system---日志系统)
9. [Backup System - 备份系统](#backup-system---备份系统)

---

## Dashboard 概览

启动 LeafSeamer 后，访问 `http://localhost:9090` 打开 Dashboard。

### 工作区（Workspaces）

Dashboard 按功能组织为多个工作区，点击顶部标签可切换：

- **Seamer**：场景控制卡片系统
- **Mixer Control**：调音台连接和控制
- **OBS Control**：OBS 连接和控制
- **VB Control**：VB-Audio Matrix 配置和控制
- **Graphic Control**：图形包控制
- **Misc**：备份、日志等辅助功能

### 面板布局

每个工作区包含多个面板（Panel），面板可以在 Dashboard 中自由拖动和排列。

---

## Seamer - 场景控制卡片系统

Seamer 是 LeafSeamer 的核心功能，提供可视化的卡片式场景控制。

### 功能概述

- **卡片管理**：创建、编辑、删除控制卡片
- **多动作联动**：一个卡片可包含多个控制动作
- **预设系统**：保存和加载卡片布局预设
- **拖拽排序**：直观的拖拽操作调整卡片顺序

### 创建卡片

1. 在 **Seamer** 工作区中，点击 **"+ Add Card"** 按钮
2. 在弹出的编辑窗口中配置：
   - **卡片名称**：为卡片命名（如"开场场景"）
   - **卡片颜色**：选择卡片背景色便于识别
3. 点击 **"Add Action"** 添加动作

### 配置动作

每个卡片可包含多个动作，按顺序执行：

#### Mixer Control（调音台控制）

- **Fader**：控制通道推子
  - 选择输入通道
  - 设置目标电平（dB）
- **Sends**：配置发送
  - 选择输入和输出通道
  - 设置增益、On/Off、Pre/Post、Pan

#### OBS Control（OBS 控制）

- 选择 OBS 实例
- 选择目标场景
- 选择转场效果（可选）

<details><summary>延迟功能近期上线</summary>

~~Delay（延迟）
设置延迟时间（毫秒）
用于动作之间的时序控制~~

</details>

### 执行卡片

- **单次执行**：点击卡片即可触发其中的所有动作
- **动作顺序**：动作按添加顺序依次执行
- ~~**延迟控制**：使用 Delay 动作控制执行时序~~

### 预设管理

#### 保存预设

1. 编排好所有卡片后，点击 **"Save Preset"**
2. 输入预设名称
3. 预设会保存当前所有卡片的配置和排列

#### 加载预设

1. 点击 **"Load Preset"**
2. 从列表中选择要加载的预设
3. 当前卡片布局会被替换为预设内容

#### 删除预设

1. 在预设列表中找到要删除的预设
2. 点击删除按钮确认删除

### 最佳实践

- **场景化管理**：为不同节目环节创建专用预设（如"开场"、"访谈"、"结尾"）
- **颜色编码**：使用不同颜色区分卡片类型（如红色=紧急、绿色=常规）
- **命名规范**：使用清晰的命名便于快速识别

---

## Mixer Control - 调音台控制

通过 Yamaha RCP 协议控制调音台设备。

### 连接调音台

- 目前只支持 DM3
- 目前只在 DM3 上完成了既有功能测试
- 理论上DM7也可以使用，但是需要测试

1. 在 **Mixer Control** 工作区，找到 **"Mixer Connection"** 面板
2. 配置连接参数：
   - **IP Address**：调音台的 IP 地址
   - **Port**：RCP 端口（默认 49280）
3. 点击 **"Connect"** 建立连接
4. 连接成功后，状态指示器显示为绿色

### 推子控制（Fader）

在 **"Mixer Control"** 面板中：

1. 选择输入通道
2. 拖动推子滑块或输入数值
3. 电平变化会实时发送到调音台

### 输入发送（Input Send）

配置输入通道到输出通道的发送：

1. 选择**输入通道**（Input）
2. 选择**输出通道**（Output）
3. 配置参数：
   - **Gain**：发送增益（dB）
   - **On/Off**：启用或禁用发送
   - **Pre/Post**：发送点选择
     - Pre：推子前发送
     - Post：推子后发送
   - **Pan**：声像（L/R）

<details><summary>由于目前缺少RCP相关文档,patch功能仍在完善中</summary>

```
### patch配置

配置输入输出路由：

1. 在 Patch Control 区域：
   - 选择**输入设备**（Input Device）
   - 选择**输出设备**（Output Device）
2. 支持添加多个 Patch 面板
3. 点击 **"+"** 添加新 Patch 面板
4. 点击 **"×"** 删除 Patch 面板（第一个面板不可删除）
```

</details>

### 故障排查

- **连接失败**：
  - 检查 IP 地址和端口是否正确
  - 检查网络连接和防火墙设置

- **控制无响应**：
  - 确认连接状态为已连接
  - 查看日志系统中的错误信息
  - 部分命令可能不被调音台支持（如 Patch）

---

## OBS Control - OBS 控制

通过 WebSocket 协议控制 OBS Studio，支持多实例管理。

### 连接 OBS

#### 启用 OBS WebSocket

1. 打开 OBS Studio
2. 进入 **工具 → WebSocket 服务器设置**
3. 启用 WebSocket 服务器
4. 设置端口（默认 4455）和密码
5. 点击确定

#### 在 LeafSeamer 中连接

1. 在 **OBS Control** 工作区，找到 **"OBS Connection"** 面板
2. 点击 **"+ Add Connection"** 添加 OBS 实例
3. 配置连接参数：
   - **Instance Name**：实例标识（如"Main OBS"）
   - **IP Address**：OBS 运行的设备 IP（本机使用 `127.0.0.1`）
   - **Port**：WebSocket 端口（默认 4455）
   - **Password**：WebSocket 密码
4. 点击 **"Connect"** 连接

#### 连接状态

- **Connecting...**：正在尝试连接
- **Connected**：已成功连接
- **Disconnected**：未连接
- **Connection failed**：连接失败（会自动重试 3 次）

### 场景控制

在 **"OBS Control"** 面板中：

1. 选择 OBS 实例（如有多个）
2. 从场景列表中选择目标场景
3. 点击场景名称切换到该场景

### 转场效果

1. 在场景列表中选择转场类型
2. 场景切换时会应用选定的转场效果

### 实时状态

连接成功后会显示：

- 当前场景名称
- 录制状态
- 推流状态
- 推流统计信息（码率、帧率等）

### 多 OBS 实例管理

1. 可添加多个 OBS 实例（如主机、备机）
2. 每个实例独立管理和控制
3. 在 Seamer 卡片中可选择控制哪个实例

### 自动重连

- 连接断开后会自动尝试重连（最多 3 次）
- 重连间隔 2 秒
- 失败后显示错误提示

---

## VB Matrix Control - VB-Audio Matrix 控制

通过 VBAN 协议控制 VB-Audio Matrix 音频路由矩阵。

### 网络配置

在 **"VB Network Config"** 面板中：

1. **IP**：输入 VB-Audio Matrix 的 IP 地址
2. **Port**：输入 VBAN 端口（默认 6980）
3. **Stream**: 输入VB-Audio Matrix的Stream名称
   - 这里需要严格匹配matrix VBAN中的Stream名称
4. **Local IP**：显示本机 IP 地址（自动检测）
5. 点击 **"Ping Test"** 测试网络连通性：
   - **OK!!**（绿色）：网络畅通
   - **Fail**（红色）：网络不通

- VBAN连接需要严格匹配
  - IP地址
  - 端口
  - Stream名称

### Patch 控制

在 **"VB Matrix Control"** 面板中：

1. **Input Device**：选择输入设备
2. **Output Device**：选择输出设备
3. 选择后会自动应用路由配置

#### 多 Patch 面板

- 点击 **"+"** 按钮添加新的 Patch 控制面板
- 点击面板右上角的 **"×"** 删除该面板（第一个面板不可删除）
- 可同时配置多个输入输出路由

### 预设管理

- **Save Preset**：保存所有 Patch 面板的当前配置
- **Load Preset**：加载已保存的预设
- **Delete Preset**：删除预设

预设会保存：

- 所有 Patch 面板的数量和配置
- 每个面板的输入输出设备选择

### 注意事项

- 确保 VB-Audio Matrix 软件正在运行
- 确保 VBAN 功能已启用
- 使用 Ping Test 确认网络连通性

---

## Graphics Package - 图形包

提供 Lower Third、Scoreboard 等图形叠加功能。

### 访问图形页面

图形页面需要在 OBS 或其他视频软件中作为浏览器源添加：

```
http://localhost:9090/bundles/graphics-package/graphics/lower-third.html
http://localhost:9090/bundles/graphics-package/graphics/scoreboard.html
```

### Lower Third（字幕条）

1. 在 Dashboard 中配置：
   - **Name**：人物姓名
   - **Title**：职位/头衔
2. 点击 **"Show"** 显示字幕条
3. 点击 **"Hide"** 隐藏字幕条
4. 使用 GSAP 动画实现平滑的入场和出场效果

### Scoreboard（计分板）

1. 配置比赛信息：
   - 队伍名称
   - 分数
2. 点击 **"Update"** 更新显示
3. 支持自定义样式和动画

---

<details><summary>功能制作中</summary>

## Schedule Manager - 日程管理

管理节目时间表和日程显示。

### 创建日程

1. 在 **Schedule Manager** 工作区打开控制面板
2. 添加日程项目：
   - **时间**：节目开始时间
   - **标题**：节目名称
   - **描述**：节目简介
3. 点击 **"Save"** 保存日程

### 日程显示

将日程显示图形添加到 OBS：

```
http://localhost:9090/bundles/schedule-manager/graphics/schedule-display.html
```

### 数据同步

支持从 Google Sheets 同步日程数据（需配置 Google API）。

---

</details>

## Logger System - 日志系统

集中查看所有系统日志。

### 查看日志

在 **Misc** 工作区中找到 **"Log Viewer"** 面板：

1. 实时显示最新日志
2. 日志按时间倒序排列
3. 不同级别的日志用不同颜色标识：
   - **Info**：普通信息（蓝色）
   - **Warning**：警告（黄色）
   - **Error**：错误（红色）

### 日志文件

日志文件保存在 `logs/` 目录：

- 按日期分文件存储
- 支持日志轮转
- 可手动查看历史日志文件

---

## Backup System - 备份系统

自动或手动备份项目配置和数据。

### 创建备份

在 **Misc** 工作区中找到 **"Backup Control"** 面板：

1. 点击 **"Create Backup"** 创建备份
2. 备份文件会保存到 `backups/` 目录
3. 备份文件名格式：`backup-YYYY-MM-DD-HH-mm-ss.zip`

### 备份内容

备份包含：

- `db/` 目录（Replicants 数据）
- `cfg/` 目录（配置文件）
- 预设数据
- 其他用户数据

### 恢复备份

1. 解压备份文件
2. 将备份内容复制到对应目录
3. 重启 NodeCG

### 最佳实践

- 在重要操作前手动创建备份
- 定期备份（建议每周至少一次）
- 将备份文件保存到其他位置（如云存储、外部硬盘）

---

<details><summary>键盘快捷键 (未来版本支持)</summary>

## 键盘快捷键

目前 LeafSeamer 1.0.0 主要通过鼠标点击操作，未来版本将添加键盘快捷键支持。

---

</details>

## 技巧与建议

### 场景卡片设计

- 将频繁使用的场景放在顶部
- 使用颜色区分不同类型的卡片
- 为卡片使用清晰的命名

### 预设管理

- 为不同类型的节目创建专用预设
- 定期清理不用的预设
- 预设命名要有意义（如"新闻节目-标准配置"）

### 设备连接

- 在网络稳定的环境下使用
- 使用有线网络代替 Wi-Fi
- 定期检查设备连接状态

---

## 下一步

- 查看 [README.md](./README.md) 了解更多技术细节
- 查看 [INSTALLATION.md](./INSTALLATION.md) 了解安装配置

## 反馈与支持

如有问题或建议，请查看日志系统或检查 `logs/` 目录中的日志文件。
