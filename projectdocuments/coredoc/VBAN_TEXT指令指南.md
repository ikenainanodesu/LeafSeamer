# VBAN-TEXT 指令指南 (适用于 VB-Audio Matrix Coconut)

## 1. 概述

VB-Audio Matrix Coconut 主要通过 **VBAN-TEXT** 协议进行远程控制。该协议基于 UDP，允许发送文本指令来控制 Matrix 的内部参数。

**通信参数:**

- **协议**: UDP
- **端口**: 6980 (默认 VBAN 端口)
- **目标**: 发送至运行 Matrix 的 PC IP 地址。

## 2. 核心指令列表

虽然官方手册包含最详尽的列表，但以下是基于社区和现有文档整理的核心指令集：

### 2.1 路由点控制 (Cross-Point Control)

这是 Matrix 最核心的功能，用于控制输入到输出的连接点。

- **设置增益 (Gain)**:
  `Point(in, out).dBGain = <value>;`
  - `in`: 输入通道名称或索引 (例如 `ASIO64A.IN[6]` 或索引号)。
  - `out`: 输出通道名称或索引 (例如 `ASIO64A.OUT[3]` 或索引号)。
  - `<value>`: 增益值，单位 dB (例如 `0.0`, `-6.0`, `-144.0` 为静音)。
  - _示例_: `Point(0, 0).dBGain = -6.0;` (将输入1发送到输出1，衰减6dB)

- **相位反转 (Phase)**:
  `Point(in, out).Phase = <0 or 1>;`
  - `0`: 正常相位。
  - `1`: 反相。

- **开启/关闭 (Mute/On)**:
  通常通过设置增益为 `-144.0` 来实现静音，或设置回 `0.0` (或其他值) 来开启。

### 2.2 预设控制 (Preset Management)

- **加载预设**:
  `Command.LoadPreset = <index>;`
  - `<index>`: 预设编号 (1-12 等)。

### 2.3 系统指令 (System Commands)

- **重启音频引擎**: `Command.Restart = 1;`
- **保存配置**: `Command.Save = 1;`

## 3. Node.js 实现示例

```javascript
const dgram = require("dgram");
const client = dgram.createSocket("udp4");

const PORT = 6980;
const HOST = "127.0.0.1"; // 目标 IP

// VBAN-TEXT 数据包格式:
// Header (28 bytes) + Text Data
// 这里简化为直接发送文本 (某些 VBAN 实现可能需要封装头部，视具体版本而定，
// 但通常 VBAN-TEXT 作为一个独立流，可以直接发送 ASCII 字符串到特定端口监听器，
// 或者需要构建标准的 VBAN 头部，Stream Name 为 "Command1")。

// *注意*: 标准 VBAN 协议要求 28 字节头部。
// 头部标识: 'VBAN' (4 bytes)
// 采样率/格式: 0 (1 byte for Text)
// ... (其他头部字段)

// 简单测试指令
const message = Buffer.from("Point(0,0).dBGain = -10.0;");

// 在实际开发中，建议使用现成的 VBAN 库来构建头部，
// 或者手动构建 Buffer。
```

## 4. 限制与注意事项

1.  **单向通信**: VBAN-TEXT 通常是“发送即忘”(Fire and Forget)。你发送指令，但很难直接获取“指令是否执行成功”的回执，除非你通过另一个通道 (如 Voicemeeter 的 Remote API) 轮询状态，但 Matrix Coconut 没有 Remote API。
2.  **准确性**: 输入输出的名称/索引必须与 Matrix 中的配置严格对应。
