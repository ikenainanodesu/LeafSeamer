export type SeamerActionType = "mixer-fader" | "vb-preset" | "obs-action";

export interface SeamerActionBase {
  id: string;
  type: SeamerActionType;
}

export interface MixerControlAction extends SeamerActionBase {
  type: "mixer-fader"; // Keeping raw type string "mixer-fader" for now to avoid breaking existing JSONs instantly, or should I migrate?
  // Plan says rename to "Mixer Control" in UI and Types.
  // Ideally type string should be "mixer-control" but that breaks existing cards.
  // Let's keep "mixer-fader" string for backward compat but rename interface.
  // OR better: use "mixer-control" and I'll handle migration in App.tsx if needed.
  // Actually, let's keep the discriminated union specific string as "mixer-fader" to minimize breakage,
  // but logically treat it as mixer-control.
  // WAIT, the user request says "rename ... to mixer control".
  // I will change the Interface name and add the fields.
  // I will KEEP the 'type' string as "mixer-fader" for now to avoid data migration complexity,
  // effectively "upgrading" the existing action type.
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

export type SeamerAction = MixerControlAction | VBPresetAction | OBSAction;

export interface Preset {
  id: string;
  name: string;
}

export interface SeamerCard {
  id: string;
  title: string;
  actions: SeamerAction[];
}
