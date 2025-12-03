export interface OBSScene {
  name: string;
  index: number;
}

export interface OBSState {
  connected: boolean;
  currentScene: string;
  isStreaming: boolean;
  isRecording: boolean;
  scenes: OBSScene[];
}

export interface StreamStats {
  fps: number;
  kbitsPerSec: number;
  averageFrameTime: number;
}

export interface OBSConnectionSettings {
  host: string;
  port: string;
  password?: string;
}
