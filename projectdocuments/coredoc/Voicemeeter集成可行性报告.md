# Voicemeeter 集成可行性报告

## 1. 概述

本报告旨在评估将 Voicemeeter Matrix 控制与查看功能集成到 LeafSeamer 项目中的可行性。目标是利用 `voicemeeter-connector` (基于 Voicemeeter Remote API) 实现对 Voicemeeter 的远程控制和状态监控。

## 2. 技术可行性

### 2.1 核心库

- **库名称**: `voicemeeter-connector`
- **来源**: npm (Node.js wrapper for Voicemeeter Remote API)
- **原理**: 通过 Node.js 的 FFI (Foreign Function Interface) 调用 Voicemeeter 安装目录下提供的 `VoicemeeterRemote64.dll` (或 32位版本)。
- **兼容性**: 支持 Voicemeeter Standard, Banana, Potato。

### 2.2 环境要求

- **操作系统**: Windows (Voicemeeter 仅限 Windows)。
- **软件**: 必须安装 Voicemeeter (推荐 Potato 以获得最大 Matrix 功能)。
- **Node.js**: 项目已具备。

## 3. 功能支持详情

### 3.1 基础控制 (Strip & Bus)

完全支持。可以通过 API 读取和设置以下参数：

- **Strip (输入)**: Gain, Mute, Solo, Mono, Gate, Comp, EQ, 路由 (A1-A5, B1-B3)。
- **Bus (输出)**: Gain, Mute, EQ, Mode (Normal, Amix, Composite 等)。

### 3.2 Matrix 控制

Voicemeeter 中的 "Matrix" 通常指两种功能，API 支持程度不同：

1.  **路由矩阵 (Routing Matrix)**:
    - 即将任意输入 (Strip) 发送到任意输出 (Bus)。
    - **支持**: 完全支持。例如 `Strip[0].A1 = 1` 将第一个麦克风发送到 A1 输出。

2.  **8x8 内部矩阵 (Internal Matrix / VBAN Matrix)**:
    - Voicemeeter Potato 拥有一个 8x8 的增益矩阵视图。
    - **支持**: API 允许通过 `Bus[i].Mode.Matrix` 启用矩阵模式。具体的矩阵增益点 (Cross-points) 控制可能需要特定的参数调用 (如 `Bus[i].Gain` 配合特定的 API 扩展或 VBAN 协议)，或者通过加载预设 (Config) 来实现复杂切换。
    - **SDK 示例**: 官方 SDK 包含 `Matrix8x8` 示例，证明底层 API 支持此功能。

### 3.3 状态监控 (Level Monitoring)

- **支持**: 可以实时获取输入和输出的电平值 (Peak meters)，用于在 Web 界面显示跳动的音量条。

## 4. VB-Audio Matrix (Coconut) 特别说明

用户提到的 "Matrix Coconuts" 指的是 **VB-Audio Matrix Coconut** 版本 (支持 512x512 通道)。这是一个独立于 Voicemeeter 的高级音频路由软件。

### 4.1 控制方式

与 Voicemeeter 不同，VB-Audio Matrix (Coconut) **没有** 官方的 Node.js SDK 或 DLL 封装库。

- **主要控制协议**: **VBAN-TEXT** (基于 UDP/TCP)。
- **原理**: 向 Matrix 的 IP 地址和端口发送特定的文本指令 (Text Request)。
- **Node.js 实现**: 使用 Node.js 内置的 `dgram` 模块发送 UDP 数据包即可实现控制。

### 4.2 可行性

- **可行性**: **高**。虽然没有现成库，但 VBAN-TEXT 协议非常简单，易于在 Node.js 中实现。
- **功能**: 可以控制路由连接、增益、静音等。
- **注意**: 需要查阅 VB-Audio Matrix 的具体 VBAN-TEXT 指令集 (通常在官方论坛或手册中)。

## 5. 应用场景 (Application Scenarios)

集成 Voicemeeter 后，LeafSeamer 可以实现以下自动化和远程控制场景：

### 5.1 场景联动音频路由 (Scene-Based Routing)

- **描述**: 当 OBS 切换场景时，自动改变 Voicemeeter 的路由。
- **示例**:
  - **"Just Chatting" 场景**: 开启麦克风 (Strip 0 -> B1)，开启背景音乐 (Strip 2 -> B1)。
  - **"Be Right Back" 场景**: 自动静音麦克风 (Strip 0 Mute = 1)，提高音乐音量。
  - **"Game" 场景**: 将游戏声音路由到直播输出，同时降低 Discord 队友语音的音量。

### 5.2 自动闪避 (Auto-Ducking)

- **描述**: 当检测到麦克风有信号输入时，自动降低背景音乐或游戏音量。
- **实现**: Node.js 监听 `Strip[Mic].Level`，当超过阈值时，通过 API 平滑降低 `Strip[Music].Gain`。

### 5.3 远程 Web 控制面板

- **描述**: 在 LeafSeamer 的 Web 界面 (手机/平板) 上直接控制 Voicemeeter。
- **功能**:
  - 远程静音/取消静音。
  - 调整推子音量。
  - 查看实时电平跳表。
  - **解决痛点**: 全屏游戏时无需切回桌面即可调整混音。

### 5.4 复杂监听切换

- **描述**: 快速切换监听设备 (耳机/音箱) 或监听源。
- **示例**: 一键将 "直播输出 (B1)" 的监听切换到 "本地耳机 (A1)"，用于检查直播流声音是否正常。

## 6. 结论

集成是**完全可行**的。

- 对于 **Voicemeeter**: 使用 `voicemeeter-connector`。
- 对于 **VB-Audio Matrix (Coconut)**: 使用 Node.js `dgram` 发送 VBAN-TEXT 指令。

建议先从基础的 Strip/Bus 控制和电平监控开始实现，逐步扩展到复杂的自动化逻辑。
