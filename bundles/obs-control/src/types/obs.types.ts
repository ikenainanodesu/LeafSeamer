export interface OBSScene {
  name: string;
  index: number;
}

export type OBSConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";

export interface OBSSceneItem {
  sceneItemId: number;
  sourceName: string;
  sourceType: string;
  inputKind: string | null;
  sceneItemEnabled: boolean;
  sceneItemIndex: number;
}

export interface OBSMediaState {
  mediaState: string;
  mediaCursor: number | null;
  mediaDuration: number | null;
}

export interface OBSPlaylistItem {
  value: string;
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
  streamStats?: {
    fps: number;
    kbitsPerSec: number;
    averageFrameTime: number;
    outputTimecode?: string;
  };
}

export interface OBSConnectionSettings {
  id: string;
  name?: string;
  host: string;
  port: string;
  passwordConfigured: boolean;
}

export interface OBSConnectionDraft extends Omit<OBSConnectionSettings, "passwordConfigured"> {
  password?: string;
  clearPassword?: boolean;
  passwordConfigured?: boolean;
}

export interface OBSStreamSettings {
  server: string;
  useAuth: boolean;
  username: string;
  keyConfigured: boolean;
  passwordConfigured: boolean;
}

export interface OBSStreamSettingsDraft extends Omit<
  OBSStreamSettings,
  "keyConfigured" | "passwordConfigured"
> {
  key?: string;
  password?: string;
  clearKey?: boolean;
  clearPassword?: boolean;
  keyConfigured?: boolean;
  passwordConfigured?: boolean;
}
