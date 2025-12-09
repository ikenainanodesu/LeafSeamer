export interface NetworkConfig {
  ip: string;
  port: number;
  streamName: string; // Target stream name (e.g. "Command1")
}

export interface PatchPoint {
  input: number;
  output: number;
  gain: number;
  mute: boolean;
  phase: boolean;
  exists?: boolean; // If true, the patch point is active/connected
}

export interface PatchInfo {
  id: string; // Unique ID for keying
  inputDevice: string;
  inputChannel: number;
  outputDevice: string;
  outputChannel: number;
  status: PatchPoint;
}

// Current patch status: combines device/channel info with gain/mute
export interface CurrentPatchStatus {
  inputDevice: string;
  inputChannel: number;
  outputDevice: string;
  outputChannel: number;
  gain: number;
  mute: boolean;
  exists?: boolean;
}

export interface Preset {
  id: string;
  name: string;
  network: NetworkConfig;
  patches: PatchInfo[];
}

export interface DeviceInfo {
  suid: string;
  name: string;
  inputs: number;
  outputs: number;
}
