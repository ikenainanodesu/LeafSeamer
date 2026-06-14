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
  transitionPosition: number;
  transitionRate: number;
  aux: Record<number, number>;
  sources: Record<number, string>;
  macros: Record<number, string>;
}

export interface DiscoveredSwitcher {
  ip: string;
  name: string;
  model?: string;
}
