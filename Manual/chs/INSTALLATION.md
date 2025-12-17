# LeafSeamer 安装部署指南

本文档提供 LeafSeamer 1.0.0 的完整安装和部署说明。

## 系统要求

### 最低配置

- **操作系统**：Windows 10/11、macOS 10.15+、Linux（Ubuntu 20.04+）
- **Node.js**：v18.0.0 或更高版本
- **NPM**：v9.0.0 或更高版本
- **内存**：4GB RAM
- **磁盘空间**：至少 1GB 可用空间

### 推荐配置

- **Node.js**：v20.0.0+
- **内存**：8GB RAM 或以上
- **网络**：局域网环境，用于设备通信

## 安装步骤

### 1. 安装 Node.js 和 NPM

如果尚未安装 Node.js，请前往 [nodejs.org](https://nodejs.org/) 下载并安装 LTS 版本。

验证安装：

```bash
node --version  # 应显示 v18.0.0 或更高
npm --version   # 应显示 v9.0.0 或更高
```

### 2. 下载 LeafSeamer

#### 方式一：从 GitHub 克隆（推荐）

```bash
git clone https://github.com/ikenainanodesu/LeafSeamer.git
cd LeafSeamer
```

#### 方式二：下载源代码压缩包

1. 访问 GitHub 仓库的 Releases 页面
2. 下载最新版本的源代码压缩包
3. 解压到您选择的目录

### 3. 安装依赖

在项目根目录中运行：

```bash
npm install
```

> **注意**：首次安装可能需要几分钟时间，取决于网络速度。NPM 会自动安装所有必需的依赖包。

### 4. 构建项目

安装完成后，构建所有 bundles：

```bash
npm run build
```

此命令会：

- 编译所有 TypeScript 代码
- 构建所有 bundle 的 Extension 和 Dashboard
- 生成可执行的生产代码

## 配置说明

### NodeCG 核心配置

编辑 `cfg/nodecg.json` 配置文件：

```json
{
  "host": "0.0.0.0",
  "port": 9090,
  "logging": {
    "console": {
      "enabled": true,
      "level": "info"
    }
  }
}
```

**配置项说明**：

- `host`：服务器监听地址（`0.0.0.0` 允许其他设备访问）
- `port`：Dashboard 访问端口（默认 9090）
- `logging`：日志配置

### 模块配置

LeafSeamer 的核心功能模块（调音台、OBS、矩阵控制）**不需要**编辑配置文件。请直接在 **Dashboard** 界面中进行连接配置，系统会自动保存您的设置。

### Google Sheets API 配置（可选）

如果您需使用 `data-sync-service` bundle 同步外部数据，请创建 `cfg/data-sync-service.json` 配置文件：

```json
{
  "googleSheets": {
    "credentialsPath": "./credentials.json",
    "spreadsheetId": "your-spreadsheet-id"
  }
}
```

配置步骤：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google Sheets API
4. 创建服务账号并下载 JSON 密钥文件
5. 将密钥文件重命名为 `credentials.json` 并放置在项目根目录

## 启动服务

### 开发模式

```bash
npm start
# 或
npm run dev
```

启动后，控制台会显示：

```
NodeCG is listening on http://localhost:9090
```

### 访问 Dashboard

在浏览器中打开：

```
http://localhost:9090
```

如果从其他设备访问，请使用服务器的 IP 地址：

```
http://[服务器IP]:9090
```

### 确认所有 Bundles 已加载

在启动日志中，您应该看到类似以下的输出：

```
[nodecg] Loaded bundles:
  - seamer
  - mixer-control
  - obs-control
  - vb-matrix-control
  - graphics-package
  - schedule-manager
  - logger-system
  - backup-system
  - data-sync-service
```

## 停止服务

在运行 NodeCG 的终端窗口中按 `Ctrl+C` 停止服务。

### Windows 用户快速终止

如果遇到端口占用问题，可使用提供的辅助脚本：

```powershell
.\scripts\kill-nodecg.ps1
```

或手动终止占用 9090 端口的进程：

```powershell
Get-NetTCPConnection -LocalPort 9090 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## 防火墙和网络配置

### 开放端口

确保以下端口在防火墙中已开放（根据您的配置）：

- **9090**：NodeCG Dashboard 和 Graphics（必需）
- **49280**：Mixer RCP 通信（如使用 mixer-control）
- **4455**：OBS WebSocket（如使用 obs-control）
- **6980**：VB-Audio Matrix VBAN（如使用 vb-matrix-control）

### Windows 防火墙配置示例

```powershell
# 允许 NodeCG 入站连接
New-NetFirewallRule -DisplayName "NodeCG Server" -Direction Inbound -LocalPort 9090 -Protocol TCP -Action Allow
```

## 数据持久化

LeafSeamer 使用 NodeCG 的 Replicants 系统进行数据持久化：

- **存储路径**：`db/` 目录
- **备份路径**：`backups/` 目录
- **日志路径**：`logs/` 目录

> **重要**：定期备份 `db/` 目录以防数据丢失。可使用 Dashboard 中的 Backup System 进行手动或自动备份。

## .gitignore 说明

项目的 `.gitignore` 文件已配置排除以下内容：

- `node_modules/`：NPM 依赖包
- `db/`：数据库文件（包含用户数据）
- `logs/`：日志文件
- `backups/`：备份文件
- `dist/`：构建产物
- `.env`：环境变量文件
- `project-documents/`：项目文档（开发文档）
- `.agent/`：AI 辅助工具配置

如果您需要在团队中共享配置，建议：

1. 创建 `cfg/nodecg.json.example` 作为配置模板
2. 将实际配置文件 `cfg/nodecg.json` 和 `cfg/data-sync-service.json` 添加到 `.gitignore`
3. 团队成员根据模板创建自己的配置文件

## 故障排查

如果遇到问题，请检查日志系统。

常见问题快速检查：

1. **端口已被占用**：使用 `kill-nodecg.ps1` 脚本或更改配置文件中的端口
2. **Bundle 加载失败**：运行 `npm run build` 重新构建
3. **依赖缺失**：运行 `npm install` 重新安装依赖
4. **设备连接失败**：检查 Dashboard 面板中的 IP 地址和端口配置

## 下一步

完成安装后，请参阅 [用户使用手册](./USER_MANUAL.md) 了解如何使用各个功能模块。

## 技术支持

- **文档**：查看 [README.md](./README.md) 和 [USER_MANUAL.md](./USER_MANUAL.md)
