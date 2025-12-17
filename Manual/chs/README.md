# LeafSeamer

基于 NodeCG 的广播制作控制系统，集成调音台、OBS、图形 Overlay、VB-Audio Matrix 等多种设备和服务的统一控制平台。

## 项目概述

LeafSeamer 是一个现代化的广播制作控制系统，为视频直播和节目制作提供集中化的设备控制和状态管理。项目采用模块化架构，每个功能独立为 NodeCG bundle，便于维护和扩展。

## 核心功能特性

### 🎛️ 卡片式场景控制（Seamer）

- **可视化卡片编排**：使用直观的卡片界面配置和管理各种控制动作
- **多动作集成**：单个卡片可触发多个设备的联动操作
- **预设管理**：保存和加载卡片布局预设，快速切换制作场景
- **支持的动作类型**：
  - Mixer Control（调音台控制）：推子、发送、静音等
  - OBS Control（OBS 控制）：场景切换、转场效果
  - ~~Delay（延迟动作）：精确的时序控制~~

### 🎚️ 设备控制模块

#### Mixer Control - 调音台控制

- 支持控制混音器（RCP 协议）
- 实时显示输入通道状态和路由信息
- 通道推子控制
- Input Send 配置（增益、On/Off、Pre/Post、Pan）
- ~~Patch 配置（输入输出路由）~~
- 预设保存与加载
- Web Dashboard 连接管理和实时控制

#### OBS Control - OBS Studio 控制

- 通过 WebSocket 连接和控制多个 OBS 实例
- 场景切换、转场效果选择
- ~~录制~~、推流控制
- 实时状态监控（流状态、统计信息）
- 自动重连机制（最多 3 次，2 秒间隔）
- 连接状态反馈

#### VB Matrix Control - VB-Audio Matrix 控制

- 通过 VBAN 协议控制 VB-Audio Matrix
- 音频路由矩阵管理
- Patch 控制（支持多个 Patch 面板）
- 网络配置和 Ping 测试
- 本地 IP 地址显示
- 预设保存与加载

### 🎨 图形和显示模块

#### Graphics Package - 图形叠加包

- 集成 GSAP 动画库
- Lower Third（字幕条）图形
- Scoreboard（计分板）显示
- 平滑的入场和出场动画
- 自定义动画效果

<details><summary>功能测试中,近期上线</summary>
#### Schedule Manager - 日程管理

- 节目时间表管理
- 日程显示图形输出
- Dashboard 控制面板

### 🛠️ 系统服务模块

#### Logger System - 日志系统

- 集中化日志收集和查看
- 实时日志查看器（Live Log Viewer）
- 异步日志处理
- 统一宽度的 Dashboard 面板

#### Backup System - 备份系统

- 自动备份项目配置和数据
- 使用 archiver 进行文件打包
- Dashboard 备份控制面板
- 支持手动触发备份

#### Data Sync Service - 数据同步服务

- Google APIs 集成
- 后台数据同步（无 Dashboard 界面）
- Google Sheets 数据读取

</details>

## 技术栈

### 核心框架

- **NodeCG** v2.6.4 - 广播图形框架
- **React** v19.2.1 - UI 组件库
- **TypeScript** v5.7.2 - 类型安全开发

### 构建工具

- **Vite** v6.0.1 - 前端构建工具
- **esbuild** v0.27.1 - JavaScript 打包器
- **ts-node** - TypeScript 执行环境

### 主要依赖

- **GSAP** v3.13.0 - 高性能动画库
- **obs-websocket-js** v5.0.7 - OBS WebSocket 客户端
- ~~**node-osc** v11.1.1 - OSC 协议支持~~
- **googleapis** v166.0.0 - Google API 客户端
- **archiver** v7.0.1 - 文件归档工具
- **@dnd-kit/core** v6.3.1 - 拖拽功能支持
- **uuid** - 唯一标识符生成

## 项目结构

```
LeafSeamer/
├── bundles/                      # NodeCG bundles 模块目录
│   ├── seamer/                   # 场景控制卡片系统
│   ├── mixer-control/            # 调音台控制
│   ├── obs-control/              # OBS 控制
│   ├── vb-matrix-control/        # VB-Audio Matrix 控制
│   ├── graphics-package/         # 图形包（GSAP 动画）
│   ├── schedule-manager/         # 日程管理
│   ├── logger-system/            # 日志系统
│   ├── backup-system/            # 备份系统
│   └── data-sync-service/        # 数据同步服务
├── shared/                       # 共享资源
│   ├── types/                    # TypeScript 类型定义
│   ├── utils/                    # 工具函数
│   └── constants/                # 常量定义
├── scripts/                      # 构建和工具脚本
│   └── kill-nodecg.ps1          # NodeCG 进程终止脚本
├── cfg/                          # NodeCG 配置文件
│   ├── nodecg.json              # NodeCG 核心配置
│   └── leafseamer.json          # LeafSeamer 自定义配置
├── db/                           # 数据库文件（Replicants 持久化）
├── logs/                         # 日志文件
├── backups/                      # 备份文件
├── assets/                       # 静态资源
├── vite.config.dashboard.ts      # Vite Dashboard 配置
├── vite.config.extension.ts      # Vite Extension 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # 项目配置
```

## Dashboard 工作区（Workspaces）

LeafSeamer 的 Dashboard 按功能组织为多个工作区：

- **Seamer**：场景控制卡片系统
- **Mixer Control**：调音台连接和控制
- **OBS Control**：OBS 连接和控制
- **VB Control**：VB-Audio Matrix 网络配置和矩阵控制
- **Graphic Control**：图形包控制
- **Misc**：备份控制、日志查看器等辅助功能

## 快速开始

详细的安装和使用说明，请参阅：

- [安装部署指南](./INSTALLATION.md)
- [用户使用手册](./USER_MANUAL.md)

### 基本命令

```bash
# 安装依赖
npm install

# 启动 NodeCG 服务
npm start

# 开发模式
npm run dev

# 构建所有 bundles
npm run build

# 类型检查
npm run typecheck
```

### 访问地址

启动后访问：

- **Dashboard**：`http://localhost:9090`
- **Graphics**：`http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## 配置说明

- NodeCG 核心配置：`cfg/nodecg.json`
- 业务模块配置：主要通过 Dashboard 界面进行动态配置（持久化存储于 `db/`）
- Google Sheets 配置：`cfg/data-sync-service.json`（可选）
- 各 bundle 的配置在各自的 `package.json` 中定义
- TypeScript 配置：`tsconfig.json`
- Vite 构建配置：`vite.config.dashboard.ts` and `vite.config.extension.ts`

## 版本信息

**当前版本**：1.0.0
**发布日期**：2025-12-17
**Last Update**: 2025-12-17

## 许可证

GPL-3.0
