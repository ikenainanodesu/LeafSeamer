export interface AtemSwitcherInfo {
  ip: string;
  alias?: string;
  model?: string;
  connected: boolean;
}

export interface AtemState {
  programInput: number;
  previewInput: number;
  inTransition: boolean;
  transitionPosition: number; // 0-1
  transitionRate: number; // frames
  aux: { [id: number]: number }; // auxId -> sourceId
  sources: { [id: number]: string }; // id -> name
  macros: { [id: number]: string }; // id -> name
}

export interface DiscoveredSwitcher {
  ip: string;
  name: string;
  model?: string;
}
