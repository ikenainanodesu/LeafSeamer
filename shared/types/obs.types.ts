export interface OBSScene {
  name: string;
  index: number;
}

export type OBSConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";

// 场景中的Source项
export interface OBSSceneItem {
  sceneItemId: number; // OBS内部场景项ID
  sourceName: string; // 源名称
  sourceType: string; // 源类型（如 OBS_SOURCE_TYPE_INPUT）
  inputKind: string | null; // 输入类型（如 vlc_source, ffmpeg_source）
  sceneItemEnabled: boolean; // 是否可见
  sceneItemIndex: number; // 层级索引（0为最底层）
}

// 媒体播放状态
export interface OBSMediaState {
  mediaState: string; // 播放状态（如 OBS_MEDIA_STATE_PLAYING）
  mediaCursor: number | null; // 当前播放位置（毫秒）
  mediaDuration: number | null; // 总时长（毫秒）
}

// VLC播放列表项
export interface OBSPlaylistItem {
  value: string; // 文件路径
  selected: boolean;
  hidden: boolean;
}

export interface OBSState {
  connected: boolean;
  status: OBSConnectionStatus;
  currentScene: string;
  isStreaming: boolean;
  isRecording: boolean;
  scenes: OBSScene[];
  transitions: string[];
  currentTransition: string;
  streamStats?: StreamStats;
}

export interface StreamStats {
  fps: number;
  kbitsPerSec: number;
  averageFrameTime: number;
  outputTimecode?: string;
}

export interface OBSConnectionSettings {
  id: string;
  name?: string;
  host: string;
  port: string;
  password?: string;
}
