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

// --- Trigger Types ---

export type TriggerModule = "mixer" | "atem" | "obs" | "vb";

// Conditions
export interface TriggerConditionBase {
  module: TriggerModule;
}

export interface MixerTriggerCondition extends TriggerConditionBase {
  module: "mixer";
  channelId: number;
  property: "faderLevel" | "isMuted";
  operator: "eq" | "gt" | "lt";
  value: number | boolean;
}

export interface AtemTriggerCondition extends TriggerConditionBase {
  module: "atem";
  switcherIp: string;
  property: "programInput";
  value: number; // Source ID
}

export interface OBSTriggerCondition extends TriggerConditionBase {
  module: "obs";
  connectionId: string;
  property: "currentScene" | "isStreaming";
  value: string | boolean;
}

export interface VBTriggerCondition extends TriggerConditionBase {
  module: "vb";
  connectionId: string;
  inputDevice: string;
  inputChannel: number;
  outputDevice: string;
  outputChannel: number;
  status: "patched" | "unpatched";
}

export type TriggerCondition =
  | MixerTriggerCondition
  | AtemTriggerCondition
  | OBSTriggerCondition
  | VBTriggerCondition;

// Actions (Results)
export interface OutputActionBase {
  module: TriggerModule;
}

export interface MixerTriggerAction extends OutputActionBase {
  module: "mixer";
  channelId: number;
  property: "faderLevel" | "isMuted";
  value: number | boolean;
}

export interface AtemTriggerAction extends OutputActionBase {
  module: "atem";
  switcherIp: string;
  target: "program" | "preview" | "aux";
  auxId?: number; // Required if target is aux
  source: number;
}

export interface OBSTriggerAction extends OutputActionBase {
  module: "obs";
  connectionId: string;
  actionType: "setScene" | "setStreaming";
  value: string | boolean; // Scene Name or Streaming State
}

export interface VBTriggerAction extends OutputActionBase {
  module: "vb";
  connectionId: string;
  inputDevice: string;
  inputChannel: number;
  outputDevice: string;
  outputChannel: number;
  actionType: "patch" | "unpatch" | "toggle";
}

export type TriggerResultAction =
  | MixerTriggerAction
  | AtemTriggerAction
  | OBSTriggerAction
  | VBTriggerAction;

export interface SeamerTrigger {
  id: string;
  name?: string;
  condition: TriggerCondition;
  action: TriggerResultAction;
  delay: number; // ms
  enabled: boolean;
}
