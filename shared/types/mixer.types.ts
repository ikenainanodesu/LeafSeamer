export interface MixerChannel {
  id: number;
  name: string;
  faderLevel: number; // 0.0 to 1.0
  isMuted: boolean;
  inputSource?: string;
}

export interface MixerState {
  connected: boolean;
  channels: MixerChannel[];
  lastUpdate: number;
}

export type FaderLevel = number;

export interface MixerConnectionSettings {
  ip: string;
  port: string;
  protocol: "udp" | "tcp";
}
