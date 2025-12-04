# LeafSeamer API 文档

> 创建时间: 2025-12-04  
> 最后更新: 2025-12-04  
> 版本: v1.0

本文档提供 LeafSeamer 系统各模块的 API 接口文档，包括 Replicants、Messages 和对外接口。

---

## 📋 目录

1. [Mixer Control API](#mixer-control-api)
2. [OBS Control API](#obs-control-api)
3. [Graphics Package API](#graphics-package-api)
4. [Schedule Manager API](#schedule-manager-api)
5. [Logger System API](#logger-system-api)
6. [Backup System API](#backup-system-api)
7. [Data Sync Service API](#data-sync-service-api)

---

## Mixer Control API

### Replicants

#### `mixerState`

**类型**: `MixerState`

**描述**: 调音台完整状态

**数据结构**:

```typescript
interface MixerState {
  timestamp: number; // 最后更新时间戳
  connected: boolean; // 连接状态
  connectionInfo: {
    ip: string; // 调音台 IP
    port: number; // OSC 端口
    subnetMask: string; // 子网掩码
  };
  mixStatus: {
    channelCount: number; // 通道总数
    mixCount: number; // Mix 总数
    fxCount: number; // FX 总数
    matrixCount: number; // Matrix 总数
  };
  channels: Channel[]; // 通道列表
  dcaGroups: DCAGroup[]; // DCA 组列表
  muteGroups: MuteGroup[]; // Mute 组列表
  ghostChannels: number[]; // 幽灵通道 ID 列表
}

interface Channel {
  id: number; // 通道 ID
  name: string; // 通道名称
  color: string; // 颜色 (hex)
  icon: string; // 图标名称
  on: boolean; // 开/关状态
  fader: number; // Fader 值 (-∞ 到 +10dB)
  pan: number; // Pan 值 (-100 到 +100)
  assignment: string[]; // 分配目标 (例: ['LR', 'Mix1'])
  link: number | null; // 绑定通道 ID (null 表示未绑定)
  sendOn: boolean[]; // Send 开关状态数组
  sendFrom: number[]; // Send 来源数组
}

interface DCAGroup {
  id: number; // DCA 组 ID
  name: string; // 组名称
  channels: number[]; // 包含的通道 ID 列表
  fader: number; // DCA Fader 值
}

interface MuteGroup {
  id: number; // Mute 组 ID
  name: string; // 组名称
  channels: number[]; // 包含的通道 ID 列表
  muted: boolean; // 是否静音
}
```

**使用示例**:

```typescript
// Extension 中访问
const mixerState = nodecg.Replicant<MixerState>("mixerState", "mixer-control");

// 监听变化
mixerState.on("change", (newValue) => {
  console.log("Mixer state updated:", newValue);
});

// 更新值
mixerState.value = {
  ...mixerState.value,
  connected: true,
  timestamp: Date.now(),
};
```

#### `mixerChannels` (独立可调用)

**类型**: `Channel[]`

**描述**: 仅获取通道列表，便于独立访问

```typescript
const channels = nodecg.Replicant<Channel[]>("mixerChannels", "mixer-control");
```

#### `mixerDCAGroups` (独立可调用)

**类型**: `DCAGroup[]`

**描述**: 仅获取 DCA 组列表

---

### Messages

#### `mixer:connect`

**描述**: 连接到调音台

**参数**:

```typescript
interface ConnectParams {
  ip: string;
  port: number;
}
```

**返回**: `Promise<void>`

**使用示例**:

```typescript
// Dashboard 中发送
nodecg.sendMessage(
  "mixer:connect",
  {
    ip: "192.168.1.100",
    port: 8000,
  },
  (error) => {
    if (error) {
      console.error("Connection failed:", error);
    } else {
      console.log("Connected successfully");
    }
  }
);
```

#### `mixer:disconnect`

**描述**: 断开调音台连接

**参数**: 无

**返回**: `Promise<void>`

---

#### `mixer:setFader`

**描述**: 设置通道 Fader 值

**参数**:

```typescript
interface SetFaderParams {
  channelId: number;
  value: number; // -∞ 到 +10dB
}
```

**返回**: `Promise<void>`

---

#### `mixer:setChannelOn`

**描述**: 设置通道开/关

**参数**:

```typescript
interface SetChannelOnParams {
  channelId: number;
  on: boolean;
}
```

**返回**: `Promise<void>`

---

#### `mixer:detectGhostChannels`

**描述**: 检测幽灵通道

**参数**: 无

**返回**: `Promise<number[]>` (幽灵通道 ID 列表)

---

#### `mixer:syncToCloud`

**描述**: 同步当前配置到 Google Sheets

**参数**: 无

**返回**: `Promise<void>`

---

## OBS Control API

### Replicants

#### `obsState`

**类型**: `OBSState`

**描述**: OBS 完整状态

**数据结构**:

```typescript
interface OBSState {
  timestamp: number; // 最后更新时间戳
  connected: boolean; // 连接状态
  connectionInfo: {
    host: string; // OBS WebSocket 地址
    port: number; // 端口
  };
  currentScene: string; // 当前场景名称
  currentProfile: string; // 当前 Profile 名称
  currentSceneCollection: string; // 当前 Scene Collection 名称
  scenes: Scene[]; // 场景列表
  videoQueue: VideoItem[]; // 视频队列
  streamStats: StreamStats; // 推流统计
  streaming: boolean; // 是否正在推流
  recording: boolean; // 是否正在录制
}

interface Scene {
  name: string; // 场景名称
  sources: Source[]; // 场景中的源列表
}

interface Source {
  name: string; // 源名称
  type: string; // 源类型 (例: 'browser_source', 'ffmpeg_source')
  visible: boolean; // 是否可见
}

interface VideoItem {
  id: string; // 唯一 ID
  name: string; // 视频文件名
  path: string; // 完整文件路径
  duration: number; // 时长 (秒)
  addedTimestamp: number; // 添加时间戳
}

interface StreamStats {
  bitrate: number; // 当前码率 (Kbps)
  droppedFrames: number; // 丢帧数
  totalFrames: number; // 总帧数
  droppedPercentage: number; // 丢帧率百分比
  audioLevel: number[]; // 音频电平 (dB) 数组 [left, right]
  timestamp: number; // 统计时间戳
}
```

---

### Messages

#### `obs:connect`

**描述**: 连接到 OBS

**参数**:

```typescript
interface ConnectParams {
  host: string;
  port: number;
  password: string;
}
```

**返回**: `Promise<void>`

---

#### `obs:disconnect`

**描述**: 断开 OBS 连接

**参数**: 无

**返回**: `Promise<void>`

---

#### `obs:setScene`

**描述**: 切换场景

**参数**:

```typescript
interface SetSceneParams {
  sceneName: string;
}
```

**返回**: `Promise<void>`

---

#### `obs:addToQueue`

**描述**: 添加视频到队列

**参数**:

```typescript
interface AddToQueueParams {
  path: string; // 视频文件完整路径
}
```

**返回**: `Promise<string>` (返回生成的视频 ID)

**使用示例**:

```typescript
nodecg.sendMessage(
  "obs:addToQueue",
  {
    path: "E:/videos/intro.mp4",
  },
  (error, videoId) => {
    if (!error) {
      console.log("Added to queue:", videoId);
    }
  }
);
```

---

#### `obs:playFromQueue`

**描述**: 播放队列首个视频

**参数**: 无

**返回**: `Promise<void>`

---

#### `obs:removeFromQueue`

**描述**: 从队列移除指定视频

**参数**:

```typescript
interface RemoveFromQueueParams {
  videoId: string;
}
```

**返回**: `Promise<void>`

---

#### `obs:startStreaming`

**描述**: 开始推流

**参数**: 无

**返回**: `Promise<void>`

---

#### `obs:stopStreaming`

**描述**: 停止推流

**参数**: 无

**返回**: `Promise<void>`

---

## Graphics Package API

### Replicants

#### `graphicsData`

**类型**: `GraphicsData`

**描述**: 图文包装展示数据

**数据结构**:

```typescript
interface GraphicsData {
  timestamp: number; // 最后更新时间戳
  lowerThird: LowerThirdData; // Lower Third 显示数据
  currentGame: GameInfo | null; // 当前游戏信息
  currentPlayers: PlayerInfo[]; // 当前玩家信息列表
  schedule: ScheduleItem[]; // 日程表
  language: "zh" | "ja" | "en"; // 当前语言
}

interface LowerThirdData {
  visible: boolean; // 是否显示 (控制 GSAP 动画)
  line1: string; // 第一行文字
  line2: string; // 第二行文字
}

interface GameInfo {
  id: string; // 游戏 ID
  name: {
    zh: string; // 中文名称
    ja: string; // 日文名称
    en: string; // 英文名称
  };
  platform: string; // 游戏机种 (例: 'Switch', 'PS5')
  year: number; // 游戏年份
  estimatedTime: string; // 预计时间 (例: '1:30:00')
  coverImage: string; // 封面图片 URL
}

interface PlayerInfo {
  id: string; // 玩家 ID
  name: string; // 玩家名称
  role: "runner" | "host" | "commentator"; // 角色
  avatar: string; // 头像 URL
  twitter: string; // Twitter 账号
}

interface ScheduleItem {
  id: string; // 日程项 ID
  gameId: string; // 关联游戏 ID
  startTime: number; // 开始时间戳
  endTime: number; // 结束时间戳
  players: string[]; // 玩家 ID 列表
}
```

> **注意**: `LowerThirdData.visible` 字段变化时,会触发 GSAP 入场/离场动画。

---

### Messages

#### `graphics:setCurrentGame`

**描述**: 设置当前游戏

**参数**:

```typescript
interface SetCurrentGameParams {
  gameId: string;
}
```

**返回**: `Promise<void>`

---

#### `graphics:setLanguage`

**描述**: 切换显示语言

**参数**:

```typescript
interface SetLanguageParams {
  language: "zh" | "ja" | "en";
}
```

**返回**: `Promise<void>`

---

#### `graphics:syncFromCloud`

**描述**: 从 Google Sheets 同步图文数据

**参数**: 无

**返回**: `Promise<void>`

---

## Logger System API

### Replicants

#### `recentLogs`

**类型**: `LogEntry[]`

**描述**: 最近的日志条目 (内存中，用于实时查询)

**数据结构**:

```typescript
interface LogEntry {
  id: string; // 日志 ID
  timestamp: number; // 时间戳
  level: "info" | "warn" | "error"; // 日志级别
  module: string; // 来源模块
  event: string; // 事件类型
  message: string; // 日志消息
  metadata?: Record<string, any>; // 附加元数据
}
```

---

### Messages

#### `logger:query`

**描述**: 查询日志

**参数**:

```typescript
interface QueryParams {
  startTime?: number; // 开始时间戳 (可选)
  endTime?: number; // 结束时间戳 (可选)
  level?: "info" | "warn" | "error"; // 日志级别过滤 (可选)
  module?: string; // 模块过滤 (可选)
  event?: string; // 事件过滤 (可选)
  limit?: number; // 返回条数限制 (默认 100)
}
```

**返回**: `Promise<LogEntry[]>`

**使用示例**:

```typescript
nodecg.sendMessage(
  "logger:query",
  {
    startTime: Date.now() - 3600000, // 最近 1 小时
    level: "error",
    limit: 50,
  },
  (error, logs) => {
    if (!error) {
      console.log("Error logs:", logs);
    }
  }
);
```

---

#### `logger:clearOldLogs`

**描述**: 手动触发清理过期日志

**参数**:

```typescript
interface ClearOldLogsParams {
  olderThanDays: number; // 清理多少天之前的日志
}
```

**返回**: `Promise<number>` (返回删除的文件数)

---

## Backup System API

### Replicants

#### `backupList`

**类型**: `BackupInfo[]`

**描述**: 可用备份列表

**数据结构**:

```typescript
interface BackupInfo {
  id: string; // 备份 ID
  filename: string; // 文件名
  path: string; // 完整路径
  timestamp: number; // 创建时间戳
  size: number; // 文件大小 (字节)
  type: "auto" | "manual"; // 备份类型
}
```

---

#### `backupConfig`

**类型**: `BackupConfig`

**描述**: 备份系统配置

**数据结构**:

```typescript
interface BackupConfig {
  autoBackup: boolean; // 是否启用自动备份
  schedule: string; // Cron 表达式 (例: '0 3 * * *')
  retention: number; // 保留天数
  cleanupEnabled: boolean; // 是否启用自动清理
}
```

---

### Messages

#### `backup:create`

**描述**: 手动创建备份

**参数**: 无

**返回**: `Promise<string>` (返回备份文件名)

---

#### `backup:restore`

**描述**: 恢复备份

**参数**:

```typescript
interface RestoreParams {
  backupId: string; // 要恢复的备份 ID
}
```

**返回**: `Promise<void>`

---

#### `backup:delete`

**描述**: 删除备份文件

**参数**:

```typescript
interface DeleteParams {
  backupId: string;
}
```

**返回**: `Promise<void>`

---

#### `backup:updateConfig`

**描述**: 更新备份配置

**参数**:

```typescript
type UpdateConfigParams = Partial<BackupConfig>;
```

**返回**: `Promise<void>`

---

## Data Sync Service API

### Messages

#### `sync:pullFromCloud`

**描述**: 从 Google Sheets 拉取配置

**参数**: 无

**返回**: `Promise<void>`

---

#### `sync:pushToCloud`

**描述**: 推送配置到 Google Sheets

**参数**:

```typescript
interface PushToCloudParams {
  module: "mixer" | "graphics"; // 要同步的模块
}
```

**返回**: `Promise<void>`

---

#### `sync:getCacheStatus`

**描述**: 获取缓存状态

**参数**: 无

**返回**: `Promise<CacheStatus>`

**返回数据结构**:

```typescript
interface CacheStatus {
  lastSync: number; // 最后同步时间戳
  cacheValid: boolean; // 缓存是否有效
  cacheSize: number; // 缓存大小 (字节)
}
```

---

## 📝 总结

本 API 文档涵盖了 LeafSeamer 系统各模块的核心接口：

- ✅ **Replicants**: 用于状态同步，可独立访问子状态
- ✅ **Messages**: 用于事件通信和操作触发
- ✅ **异步处理**: 所有操作返回 Promise，带时间戳
- ✅ **模块化**: 各模块 API 独立，便于扩展

---

> 本文档将随项目演进实时更新，保持与实际代码同步。
