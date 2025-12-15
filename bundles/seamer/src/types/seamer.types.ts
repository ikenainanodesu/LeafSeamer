export type SeamerActionType =
  | "mixer-fader"
  | "vb-preset"
  | "obs-transition"
  | "obs-scene";

export interface SeamerActionBase {
  id: string;
  type: SeamerActionType;
}

export interface MixerFaderAction extends SeamerActionBase {
  type: "mixer-fader";
  channelId: number;
  level: number; // Raw value or dB? User said dB. Fader usually takes raw int?
  // Existing mixer control takes int (-32768 to 1000).
  // I should probably store raw int, but UI shows dB.
}

export interface VBPresetAction extends SeamerActionBase {
  type: "vb-preset";
  presetId: string;
}

export interface OBSTransitionAction extends SeamerActionBase {
  type: "obs-transition";
  connectionId: string;
  transitionName: string;
}

export interface OBSSceneAction extends SeamerActionBase {
  type: "obs-scene";
  connectionId: string;
  sceneName: string;
}

export type SeamerAction =
  | MixerFaderAction
  | VBPresetAction
  | OBSTransitionAction
  | OBSSceneAction;

export interface Preset {
  id: string;
  name: string;
}

export interface SeamerCard {
  id: string;
  title: string;
  actions: SeamerAction[];
}
