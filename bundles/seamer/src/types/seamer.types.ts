export type SeamerActionType = "mixer-fader" | "vb-preset" | "obs-action";

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

export interface OBSAction extends SeamerActionBase {
  type: "obs-action";
  connectionId: string;
  sceneName?: string;
  transitionName?: string;
}

export type SeamerAction = MixerFaderAction | VBPresetAction | OBSAction;

export interface Preset {
  id: string;
  name: string;
}

export interface SeamerCard {
  id: string;
  title: string;
  actions: SeamerAction[];
}
