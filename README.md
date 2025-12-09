# LeafSeamer

基于 NodeCG 的广播制作控制系统,集成调音台、OBS、图形overlay、VB-Audio Matrix等多种设备和服务的统一控制平台。

## 项目概述

LeafSeamer 是一个现代化的广播制作控制系统,为视频直播和节目制作提供集中化的设备控制和状态管理。项目采用模块化架构,每个功能独立为 NodeCG bundle,便于维护和扩展。

## 核心功能模块

### 设备控制模块

- **mixer-control** - 调音台控制模块
  - 支持通过 OSC 协议控制混音器
  - 实时显示输入通道状态和路由信息
  - 提供 Web Dashboard 进行连接管理和控制

- **obs-control** - OBS 控制模块
  - 通过 WebSocket 连接和控制 OBS Studio
  - 场景切换、录制、推流控制
  - 实时状态监控

- **vb-matrix-control** - VB-Audio Matrix 控制模块
  - 通过 VBAN 协议控制 VB-Audio Matrix
  - 音频路由矩阵管理
  - 网络配置和 Ping 测试
  - 本地 IP 地址显示

### 图形和显示模块

- **graphics-package** - 图形叠加包
  - 集成 GSAP 动画库
  - 提供 Lower Third (字幕条) 图形
  - Scoreboard (计分板) 显示
  - 平滑的入场和出场动画

- **schedule-manager** - 日程管理模块
  - 节目时间表管理
  - 日程显示图形输出
  - Dashboard 控制面板

### 系统服务模块

- **logger-system** - 日志系统
  - 集中化日志收集和查看
  - 实时日志查看器
  - 异步日志处理

- **backup-system** - 备份系统
  - 自动备份项目配置和数据
  - 使用 archiver 进行文件打包
  - Dashboard 备份控制面板

- **data-sync-service** - 数据同步服务
  - Google APIs 集成
  - 后台数据同步(无 Dashboard 界面)

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
- **node-osc** v11.1.1 - OSC 协议支持
- **googleapis** v166.0.0 - Google API 客户端
- **archiver** v7.0.1 - 文件归档工具

## 项目结构

```
LeafSeamer/
├── bundles/                      # NodeCG bundles 模块目录
│   ├── backup-system/           # 备份系统
│   ├── data-sync-service/       # 数据同步服务
│   ├── graphics-package/        # 图形包 (GSAP动画)
│   ├── logger-system/           # 日志系统
│   ├── mixer-control/           # 调音台控制
│   ├── obs-control/             # OBS控制
│   ├── schedule-manager/        # 日程管理
│   └── vb-matrix-control/       # VB-Audio Matrix控制
├── shared/                       # 共享资源
│   ├── types/                   # TypeScript 类型定义
│   ├── utils/                   # 工具函数
│   └── constants/               # 常量定义
├── scripts/                      # 构建脚本
├── cfg/                         # NodeCG 配置
├── db/                          # 数据库文件
├── logs/                        # 日志文件
├── project-documents/           # 项目文档
│   └── core-doc/               # 核心文档
├── vite.config.dashboard.ts     # Vite Dashboard 配置
├── vite.config.extension.ts     # Vite Extension 配置
├── tsconfig.json                # TypeScript 配置
└── package.json                 # 项目配置
```

## 开发说明

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm start
# 或
npm run dev
```

### 构建项目

```bash
# 构建所有 bundles
npm run build

# 类型检查
npm run typecheck
```

### Bundle 开发

每个 bundle 都有独立的构建配置:

```bash
cd bundles/[bundle-name]

# 构建 Extension
npm run build:extension

# 构建 Dashboard
npm run build:dashboard

# 完整构建
npm run build

# 监听模式
npm run watch
```

## 配置说明

- NodeCG 配置文件位于 `cfg/` 目录
- 各 bundle 的配置在各自的 `package.json` 中定义
- TypeScript 配置统一使用根目录的 `tsconfig.json`
- Vite 构建配置分为 Dashboard 和 Extension 两套

## 访问地址

启动后访问:

- Dashboard: `http://localhost:9090`
- Graphics: `http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## 许可证

ISC

## 维护状态

当前版本: 1.0.0  
最后更新: 2025-12-10
