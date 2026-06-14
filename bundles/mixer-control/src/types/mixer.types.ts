export interface MixerChannel {
  id: number;
  name: string;
  faderLevel: number;
  isMuted: boolean;
  inputSource?: string;
  patch?: string;
}

export interface MixerOutput {
  id: number;
  name: string;
  faderLevel: number;
  isMuted: boolean;
  inputSends: Array<{
    inputId: number;
    inputName: string;
    active: boolean;
    level: number;
    pre: boolean;
    pan: number;
  }>;
}

export interface MixerState {
  connected: boolean;
  channels: MixerChannel[];
  outputs: MixerOutput[];
  lastUpdate: number;
}

export interface MixerConnectionSettings {
  ip: string;
  port: string;
  protocol: "udp" | "tcp";
}
