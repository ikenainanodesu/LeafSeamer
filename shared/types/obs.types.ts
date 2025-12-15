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
