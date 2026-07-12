import type {
  CapabilityManifest,
  CapabilityReference,
} from "../../../../shared/integration/types";

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

export interface DynamicSeamerTrigger {
  id: string;
  name?: string;
  condition: CapabilityReference;
  action: CapabilityReference;
  delay: number;
  enabled: boolean;
}

export type AnySeamerTrigger = SeamerTrigger | DynamicSeamerTrigger;

export const isDynamicSeamerTrigger = (
  trigger: AnySeamerTrigger
): trigger is DynamicSeamerTrigger =>
  "integrationId" in trigger.condition && "integrationId" in trigger.action;

// 以下 DTO 由可选适配器填充，Seamer 核心不直接依赖任何设备 bundle。
export interface MixerChannel {
  id: number;
  name: string;
  userLabel?: string;
  faderLevel: number;
  isMuted: boolean;
}

export interface MixerOutput {
  id: number;
  name: string;
  faderLevel: number;
  isMuted: boolean;
}

export interface MixerState {
  connected: boolean;
  channels: MixerChannel[];
  outputs: MixerOutput[];
  lastUpdate: number;
}

export interface OBSScene {
  name: string;
  index: number;
}

export interface OBSState {
  connected: boolean;
  status: "connected" | "disconnected" | "connecting" | "error";
  currentScene: string;
  isStreaming: boolean;
  isRecording: boolean;
  scenes: OBSScene[];
  transitions: string[];
  currentTransition: string;
}

export interface OBSConnectionSettings {
  id: string;
  name?: string;
  host: string;
  port: string;
  password?: string;
}

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

export interface DeviceInfo {
  connectionId: string;
  suid: string;
  name: string;
  inputs: number;
  outputs: number;
}

export interface CurrentPatchStatus {
  id: string;
  connectionId: string;
  inputDevice: string;
  inputChannel: number;
  outputDevice: string;
  outputChannel: number;
  gain: number;
  mute: boolean;
  exists?: boolean;
}

export interface MixerIntegrationState {
  mixerState: MixerState | null;
}

export interface OBSIntegrationState {
  connections: OBSConnectionSettings[];
  states: Record<string, OBSState>;
}

export interface AtemIntegrationState {
  switchers: AtemSwitcherInfo[];
  states: Record<string, AtemState>;
}

export interface VBIntegrationState {
  presets: Preset[];
  devices: DeviceInfo[];
  activePatches: CurrentPatchStatus[];
}

export interface SeamerIntegrationStateMap {
  mixer: MixerIntegrationState;
  atem: AtemIntegrationState;
  obs: OBSIntegrationState;
  vb: VBIntegrationState;
}

export interface SeamerIntegrationSnapshot {
  id: string;
  label: string;
  available: boolean;
  state: unknown;
  manifest: CapabilityManifest;
}

export type SeamerIntegrations = Record<string, SeamerIntegrationSnapshot>;

export type SeamerExecutionKind = "card" | "trigger";

export interface LegacySeamerIntegrationProvider<
  T extends TriggerModule = TriggerModule,
> {
  id: T;
  label: string;
  initialState: SeamerIntegrationStateMap[T];
  execute: (
    payload: SeamerAction | TriggerResultAction,
    kind: SeamerExecutionKind
  ) => void | Promise<void>;
}

export interface DynamicSeamerIntegrationProvider {
  manifest: CapabilityManifest;
  initialState: unknown;
  evaluateTrigger: (
    capabilityId: string,
    parameters: Record<string, unknown>,
    nextState: unknown,
    previousState: unknown
  ) => boolean;
  executeAction: (
    capabilityId: string,
    parameters: Record<string, unknown>
  ) => void | Promise<void>;
  executeLegacy?: (
    payload: SeamerAction | TriggerResultAction,
    kind: SeamerExecutionKind
  ) => void | Promise<void>;
}

export type SeamerIntegrationProvider<
  T extends TriggerModule = TriggerModule,
> = LegacySeamerIntegrationProvider<T> | DynamicSeamerIntegrationProvider;

export interface SeamerExtensionApi {
  registerIntegration: (provider: SeamerIntegrationProvider) => () => void;
  updateIntegrationState: (id: string, state: unknown) => void;
}
