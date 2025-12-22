export type SeamerActionType =
  | "mixer-fader"
  | "vb-preset"
  | "obs-action"
  | "atem-action";

export interface SeamerActionBase {
  id: string;
  type: SeamerActionType;
}

export interface MixerControlAction extends SeamerActionBase {
  type: "mixer-fader";
  subFunction?: "fader" | "send"; // Default to 'fader' if undefined

  // Fader Specific
  channelId: number;
  level: number;

  // Send Specific
  sendInputId?: number;
  sendOutputId?: number;
  sendLevel?: number; // dB * 100
  sendOn?: boolean;
  sendPre?: boolean;
  sendPan?: number;
}

export interface VBPresetAction extends SeamerActionBase {
  type: "vb-preset";
  presetId: string;
}

export interface OBSAction extends SeamerActionBase {
  type: "obs-action";
  connectionId: string;
  sceneName?: string;
  transitionName?: string;
}

export type AtemFunctionType = "macro" | "source";
export type AtemTargetType = "program" | "preview" | "output" | "webcam";
export type AtemTransitionType = "cut" | "auto";

export interface AtemControlAction extends SeamerActionBase {
  type: "atem-action";
  switcherIp: string;
  functionType: AtemFunctionType;
  // Macro
  macroIndex?: number;
  // Source
  target?: AtemTargetType;
  sourceId?: number;
  transition?: AtemTransitionType; // Only for Program target
}

export type SeamerAction =
  | MixerControlAction
  | VBPresetAction
  | OBSAction
  | AtemControlAction;

export interface Preset {
  id: string;
  name: string;
}

export interface SeamerCard {
  id: string;
  title: string;
  actions: SeamerAction[];
}
