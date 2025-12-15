export interface OBSScene {
  name: string;
  index: number;
}

export type OBSConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";

export interface OBSState {
  connected: boolean;
  status: OBSConnectionStatus;
  currentScene: string;
  isStreaming: boolean;
  isRecording: boolean;
  scenes: OBSScene[];
  transitions: string[];
  currentTransition: string;
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
