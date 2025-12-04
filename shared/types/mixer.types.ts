export interface MixerChannel {
  id: number;
  name: string;
  faderLevel: number; // 0.0 to 1.0
  isMuted: boolean;
  inputSource?: string;
}

export interface MixerOutput {
  id: number; // 1-6 for Mix, 7 for Stereo L, 8 for Stereo R (internal logic)
  name: string;
  faderLevel: number;
  isMuted: boolean;
  inputSends: {
    inputId: number;
    inputName: string;
    active: boolean; // If routed
    level: number; // Send level
  }[];
}

export interface MixerState {
  connected: boolean;
  channels: MixerChannel[];
  outputs: MixerOutput[];
  lastUpdate: number;
}

export type FaderLevel = number;

export interface MixerConnectionSettings {
  ip: string;
  port: string;
  protocol: "udp" | "tcp";
}
