import NodeCG from "nodecg/types";
import {
  SeamerTrigger,
  TriggerCondition,
  TriggerResultAction,
  MixerTriggerCondition,
  AtemTriggerCondition,
  OBSTriggerCondition,
  VBTriggerCondition,
} from "../src/types/seamer.types";

// Import Shared Types or define local interfaces for Replicant values
import { MixerState } from "../../../shared/types/mixer.types";
import { AtemState } from "../../../shared/types/atem.types";
import { OBSState } from "../../../shared/types/obs.types";

interface CurrentPatchStatus {
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

interface AtemSwitcherInfo {
  ip: string;
  connected: boolean;
}

export class TriggerManager {
  private nodecg: NodeCG.ServerAPI;
  private triggersRep: NodeCG.ServerReplicant<SeamerTrigger[]>;
  private triggers: SeamerTrigger[] = [];

  // State Caches
  private mixerState: MixerState | null = null;
  private atemStates: Map<string, AtemState> = new Map();
  private obsStates: Record<string, OBSState> = {};
  private activePatches: CurrentPatchStatus[] = [];

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;

    // Initialize Triggers Replicant
    this.triggersRep = nodecg.Replicant<SeamerTrigger[]>("seamerTriggers", {
      defaultValue: [],
    });

    this.triggersRep.on("change", (newVal) => {
      this.triggers = newVal || [];
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.listenToMixer();
    this.listenToAtem();
    this.listenToOBS();
    this.listenToVB();
  }

  private listenToMixer() {
    const rep = this.nodecg.Replicant<MixerState>(
      "mixerState",
      "mixer-control",
      {
        defaultValue: {
          connected: false,
          channels: [],
          outputs: [],
          lastUpdate: 0,
        },
      }
    );

    rep.on("change", (newVal, oldVal) => {
      if (!newVal) return;
      this.mixerState = newVal;
      this.evaluateTriggers("mixer", newVal, oldVal);
    });
  }

  private listenToAtem() {
    // Watch switchers list to know which IPs to listen to
    const switchersRep = this.nodecg.Replicant<AtemSwitcherInfo[]>(
      "atem:switchers",
      "atem-control",
      {
        defaultValue: [],
      }
    );

    switchersRep.on("change", (newVal) => {
      if (!newVal) return;
      newVal.forEach((s) => {
        if (!this.atemStates.has(s.ip)) {
          this.subscribeToAtemState(s.ip);
        }
      });
    });
  }

  private subscribeToAtemState(ip: string) {
    const rep = this.nodecg.Replicant<AtemState>(
      `atem:state:${ip}`,
      "atem-control",
      {
        defaultValue: {
          programInput: 0,
          previewInput: 0,
          inTransition: false,
          transitionPosition: 0,
          transitionRate: 0,
          aux: {},
          sources: {},
          macros: {},
        },
      }
    );

    rep.on("change", (newVal, oldVal) => {
      if (!newVal) return;
      this.atemStates.set(ip, newVal);
      this.evaluateTriggers("atem", newVal, oldVal, ip);
    });
  }

  private listenToOBS() {
    const rep = this.nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      "obs-control",
      {
        defaultValue: {},
      }
    );

    rep.on("change", (newVal, oldVal) => {
      if (!newVal) return;
      this.obsStates = newVal;
      // Identify which OBS instance changed or check all?
      // Replicant sends full object.
      // We'll iterate all current states vs old states or just check conditions.
      // For simplicity/perf with small object, we can pass both.
      this.evaluateTriggers("obs", newVal, oldVal);
    });
  }

  private listenToVB() {
    const rep = this.nodecg.Replicant<CurrentPatchStatus[]>(
      "activePatches",
      "vb-matrix-control",
      {
        defaultValue: [],
      }
    );

    rep.on("change", (newVal, oldVal) => {
      if (!newVal) return;
      this.activePatches = newVal;
      this.evaluateTriggers("vb", newVal, oldVal);
    });
  }

  private evaluateTriggers(
    moduleName: string,
    newVal: any,
    oldVal: any,
    contextId?: string
  ) {
    if (!this.triggers) return;

    // Log all triggers for debugging
    if (this.triggers.length > 0) {
      this.nodecg.log.debug(
        `[TriggerManager] Evaluating ${this.triggers.length} total triggers for module: ${moduleName}`
      );
    }

    this.triggers.forEach((trigger, index) => {
      if (!trigger.enabled) {
        return; // Silent skip for disabled
      }
      if (trigger.condition.module !== moduleName) {
        return; // Silent skip for different modules
      }

      this.nodecg.log.debug(
        `[TriggerManager] [${index}] Checking trigger "${trigger.name}": condModule=${trigger.condition.module}, actionModule=${trigger.action.module}`
      );

      if (this.checkCondition(trigger.condition, newVal, oldVal, contextId)) {
        this.nodecg.log.info(
          `[TriggerManager] Trigger "${trigger.name}" MATCHED! Executing action: ${trigger.action.module} -> ${JSON.stringify(trigger.action)}`
        );
        this.executeAction(trigger.action, trigger.delay);
      }
    });
  }

  private checkCondition(
    condition: TriggerCondition,
    newVal: any,
    oldVal: any,
    contextId?: string // e.g. ATEM IP
  ): boolean {
    switch (condition.module) {
      case "mixer":
        return this.checkMixerCondition(
          condition as MixerTriggerCondition,
          newVal as MixerState,
          oldVal as MixerState
        );
      case "atem":
        return this.checkAtemCondition(
          condition as AtemTriggerCondition,
          newVal as AtemState,
          oldVal as AtemState,
          contextId || ""
        );
      case "obs":
        return this.checkOBSCondition(
          condition as OBSTriggerCondition,
          newVal as Record<string, OBSState>,
          oldVal as Record<string, OBSState>
        );
      case "vb":
        return this.checkVBCondition(
          condition as VBTriggerCondition,
          newVal as CurrentPatchStatus[],
          oldVal as CurrentPatchStatus[]
        );
      default:
        return false;
    }
  }

  // --- Condition Checkers ---

  private checkMixerCondition(
    cond: MixerTriggerCondition,
    newVal: MixerState,
    oldVal?: MixerState
  ): boolean {
    const channel = newVal.channels.find((c) => c.id === cond.channelId);
    if (!channel) return false;

    let currentValue: number | boolean;
    let prevValue: number | boolean | undefined;

    if (cond.property === "faderLevel") {
      // Note: faderLevel in MixerState is in raw format (dB * 100)
      // Convert to dB for comparison with trigger condition value
      currentValue = channel.faderLevel / 100;
      if (oldVal) {
        const oldChan = oldVal.channels.find((c) => c.id === cond.channelId);
        if (oldChan) prevValue = oldChan.faderLevel / 100;
      }
    } else {
      // isMuted
      currentValue = channel.isMuted;
      if (oldVal) {
        const oldChan = oldVal.channels.find((c) => c.id === cond.channelId);
        if (oldChan) prevValue = oldChan.isMuted;
      }
    }

    // Edge Detection: Only trigger if state CHANGED to meet condition
    // For Eq: (Prev != Target) && (Curr == Target)
    // For Gt: (Prev <= Target) && (Curr > Target)
    // For Lt: (Prev >= Target) && (Curr < Target)

    // Handling undefined prevValue (first run/init): Usually don't trigger?
    // Or assume it wasn't matched?
    // Let's assume initialized means "don't trigger all at startup".
    // So if prevValue is undefined, we return false to avoid startup spam.
    if (prevValue === undefined) return false;
    // Optimization: if value didn't change, return false
    if (prevValue === currentValue) return false;

    const target = cond.value;

    this.nodecg.log.debug(
      `[TriggerManager] checkMixerCondition: CH${cond.channelId} ${cond.property} - prev=${prevValue}, current=${currentValue}, target=${target}, operator=${cond.operator}`
    );

    if (cond.property === "isMuted") {
      // Boolean: only Equality check makes sense usually
      return currentValue === target && prevValue !== target;
    } else {
      // Number
      const curN = currentValue as number;
      const prevN = prevValue as number;
      const targetN = target as number;

      switch (cond.operator) {
        case "eq":
          // Use small epsilon for floats if needed, but mixer usually integers or strict?
          // Mixer fader is often float or int? Types says "number".
          return curN === targetN && prevN !== targetN;
        case "gt":
          return curN > targetN && prevN <= targetN;
        case "lt":
          return curN < targetN && prevN >= targetN;
      }
    }
    return false;
  }

  private checkAtemCondition(
    cond: AtemTriggerCondition,
    newVal: AtemState,
    oldVal: AtemState | undefined,
    ip: string
  ): boolean {
    if (cond.switcherIp !== ip) return false;

    // Property: programInput
    const current = newVal.programInput;
    const prev = oldVal ? oldVal.programInput : undefined;

    if (prev === undefined) return false;
    if (current === prev) return false;

    if (cond.property === "programInput") {
      return current === cond.value;
    }
    return false;
  }

  private checkOBSCondition(
    cond: OBSTriggerCondition,
    newVal: Record<string, OBSState>,
    oldVal: Record<string, OBSState> | undefined
  ): boolean {
    const obsId = cond.connectionId;
    const newState = newVal[obsId];
    const oldState = oldVal ? oldVal[obsId] : undefined;

    this.nodecg.log.debug(
      `[TriggerManager] checkOBSCondition: obsId=${obsId}, available keys=${Object.keys(newVal).join(",")}`
    );

    if (!newState) {
      this.nodecg.log.debug(
        `[TriggerManager] checkOBSCondition: newState not found for obsId=${obsId}`
      );
      return false;
    }
    if (!oldState) {
      this.nodecg.log.debug(
        `[TriggerManager] checkOBSCondition: oldState not found (startup)`
      );
      return false;
    }

    if (cond.property === "currentScene") {
      const current = newState.currentScene;
      const prev = oldState.currentScene;
      this.nodecg.log.debug(
        `[TriggerManager] checkOBSCondition: currentScene check - prev="${prev}", current="${current}", target="${cond.value}"`
      );
      if (current === prev) return false;
      return current === cond.value;
    } else if (cond.property === "isStreaming") {
      const current = newState.isStreaming;
      const prev = oldState.isStreaming;
      if (current === prev) return false;
      return current === cond.value;
    }
    return false;
  }

  private checkVBCondition(
    cond: VBTriggerCondition,
    newVal: CurrentPatchStatus[],
    oldVal: CurrentPatchStatus[] | undefined
  ): boolean {
    // Check specific patch status
    // A patch is identified by connectionId, Input(Device/CH), Output(Device/CH)

    // Helper to find patch
    const findPatch = (list: CurrentPatchStatus[]) => {
      return list.find(
        (p) =>
          p.connectionId === cond.connectionId &&
          p.inputDevice === cond.inputDevice &&
          (p.inputChannel || 1) === cond.inputChannel &&
          p.outputDevice === cond.outputDevice &&
          (p.outputChannel || 1) === cond.outputChannel
      );
    };

    const newPatch = findPatch(newVal);
    const oldPatch = oldVal ? findPatch(oldVal) : undefined;

    // Status: 'patched' (exists=true) | 'unpatched' (exists=false or not found)
    const isPatchedNow = !!(newPatch && newPatch.exists);
    const wasPatched = !!(oldPatch && oldPatch.exists);

    if (isPatchedNow === wasPatched) return false;

    if (cond.status === "patched") {
      return isPatchedNow;
    } else {
      return !isPatchedNow;
    }
  }

  // --- Action Execution ---

  private executeAction(action: TriggerResultAction, delay: number) {
    this.nodecg.log.info(
      `Trigger executing action: ${action.module} in ${delay}ms`
    );

    setTimeout(
      () => {
        switch (action.module) {
          case "mixer":
            this.executeMixerAction(action as any);
            break;
          case "atem":
            this.executeAtemAction(action as any);
            break;
          case "obs":
            this.executeOBSAction(action as any);
            break;
          case "vb":
            this.executeVBAction(action as any);
            break;
        }
      },
      Math.max(0, delay)
    );
  }

  private executeMixerAction(action: any) {
    // action: MixerTriggerAction
    // Use sendMessageToBundle to send to mixer-control bundle
    if (action.property === "faderLevel") {
      this.nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
        channelId: action.channelId,
        level: action.value,
      });
    } else {
      this.nodecg.sendMessageToBundle("setMixerMute", "mixer-control", {
        channelId: action.channelId,
        isMuted: action.value,
      });
    }
  }

  private executeAtemAction(action: any) {
    // action: AtemTriggerAction
    // target: 'program' | 'preview' | 'aux'
    const { switcherIp, target, source, auxId } = action;
    const ME = 0; // Default ME

    this.nodecg.log.info(
      `[TriggerManager] executeAtemAction: ip=${switcherIp}, target=${target}, source=${source}, auxId=${auxId}`
    );

    // Use sendMessageToBundle to send to atem-control bundle
    if (target === "program") {
      this.nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
        ip: switcherIp,
        type: "program",
        source,
        me: ME,
      });
    } else if (target === "preview") {
      this.nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
        ip: switcherIp,
        type: "preview",
        source,
        me: ME,
      });
    } else if (target === "aux") {
      // "Output" and "Webcam" requests map to Aux usually.
      // The user must specify WHICH aux.
      if (auxId !== undefined) {
        this.nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
          ip: switcherIp,
          auxId: auxId,
          source: source,
        });
      } else {
        this.nodecg.log.warn("Atem Trigger: Aux target missing auxId");
      }
    }
  }

  private executeOBSAction(action: any) {
    // action: OBSTriggerAction
    // Use sendMessageToBundle to send to obs-control bundle
    const { connectionId, actionType, value } = action;
    if (actionType === "setScene") {
      this.nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
        id: connectionId,
        scene: value,
      });
    } else if (actionType === "setStreaming") {
      if (value === true) {
        this.nodecg.sendMessageToBundle("startStreaming", "obs-control", {
          id: connectionId,
        });
      } else {
        this.nodecg.sendMessageToBundle("stopStreaming", "obs-control", {
          id: connectionId,
        });
      }
    }
  }

  private executeVBAction(action: any) {
    // action: VBTriggerAction
    // actionType: 'patch' | 'unpatch' | 'toggle'
    const {
      connectionId,
      inputDevice,
      inputChannel,
      outputDevice,
      outputChannel,
      actionType,
    } = action;

    // Need current status for Toggle
    // We can use cached this.activePatches
    const findPatch = () => {
      return this.activePatches.find(
        (p) =>
          p.connectionId === connectionId &&
          p.inputDevice === inputDevice &&
          (p.inputChannel || 1) === inputChannel &&
          p.outputDevice === outputDevice &&
          (p.outputChannel || 1) === outputChannel
      );
    };

    const currentPatch = findPatch();
    const exists = !!(currentPatch && currentPatch.exists);

    let shouldExist = false;
    if (actionType === "patch") shouldExist = true;
    else if (actionType === "unpatch") shouldExist = false;
    else if (actionType === "toggle") shouldExist = !exists;

    // Construct Patch Payload
    const payload = {
      id: currentPatch
        ? currentPatch.id
        : Math.random().toString(36).substr(2, 9), // ID needed?
      connectionId,
      inputDevice,
      inputChannel,
      outputDevice,
      outputChannel,
      exists: shouldExist,
      // If patching, default gain?
      gain:
        shouldExist && (!currentPatch || currentPatch.gain === undefined)
          ? 0
          : undefined,
      mute: false,
    };

    // Use sendMessageToBundle to send to vb-matrix-control bundle
    this.nodecg.sendMessageToBundle(
      "updatePatch",
      "vb-matrix-control",
      payload
    );
  }
}
