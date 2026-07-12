import NodeCG from "nodecg/types";
import { IntegrationRegistry } from "./integration-registry";
import {
  AtemIntegrationState,
  AtemTriggerCondition,
  AnySeamerTrigger,
  CurrentPatchStatus,
  MixerIntegrationState,
  MixerState,
  MixerTriggerCondition,
  OBSIntegrationState,
  OBSTriggerCondition,
  SeamerTrigger,
  TriggerCondition,
  TriggerModule,
  VBIntegrationState,
  VBTriggerCondition,
  isDynamicSeamerTrigger,
} from "../src/types/seamer.types";

export class TriggerManager {
  private triggers: AnySeamerTrigger[] = [];

  constructor(
    private readonly nodecg: NodeCG.ServerAPI,
    private readonly registry: IntegrationRegistry
  ) {
    const triggersRep = nodecg.Replicant<AnySeamerTrigger[]>("seamerTriggers", {
      defaultValue: [],
    });

    triggersRep.on("change", (newValue) => {
      this.triggers = newValue || [];
    });

    registry.onStateChange((moduleName, nextState, previousState) => {
      this.evaluateTriggers(moduleName, nextState, previousState);
    });
  }

  private evaluateTriggers(
    moduleName: string,
    nextState: unknown,
    previousState: unknown
  ): void {
    this.triggers.forEach((trigger) => {
      if (isDynamicSeamerTrigger(trigger)) {
        if (
          !trigger.enabled ||
          trigger.condition.integrationId !== moduleName ||
          !this.registry.evaluateTrigger(
            trigger.condition.integrationId,
            trigger.condition.capabilityId,
            trigger.condition.parameters,
            nextState,
            previousState
          )
        ) {
          return;
        }

        this.nodecg.log.info(
          '[Seamer] Dynamic trigger matched: "%s"',
          trigger.name || trigger.id
        );
        setTimeout(() => {
          void this.registry.executeCapability(
            trigger.action.integrationId,
            trigger.action.capabilityId,
            trigger.action.parameters
          );
        }, Math.max(0, trigger.delay));
        return;
      }

      if (
        !trigger.enabled ||
        trigger.condition.module !== moduleName ||
        !this.checkCondition(trigger.condition, nextState, previousState)
      ) {
        return;
      }

      this.nodecg.log.info(
        '[Seamer] Trigger matched: "%s"',
        trigger.name || trigger.id
      );
      setTimeout(() => {
        void this.registry.execute(
          trigger.action.module,
          trigger.action,
          "trigger"
        );
      }, Math.max(0, trigger.delay));
    });
  }

  private checkCondition(
    condition: TriggerCondition,
    nextState: unknown,
    previousState: unknown
  ): boolean {
    switch (condition.module) {
      case "mixer":
        return this.checkMixerCondition(
          condition,
          nextState as MixerIntegrationState,
          previousState as MixerIntegrationState
        );
      case "atem":
        return this.checkAtemCondition(
          condition,
          nextState as AtemIntegrationState,
          previousState as AtemIntegrationState
        );
      case "obs":
        return this.checkOBSCondition(
          condition,
          nextState as OBSIntegrationState,
          previousState as OBSIntegrationState
        );
      case "vb":
        return this.checkVBCondition(
          condition,
          nextState as VBIntegrationState,
          previousState as VBIntegrationState
        );
    }
  }

  private checkMixerCondition(
    condition: MixerTriggerCondition,
    next: MixerIntegrationState,
    previous: MixerIntegrationState
  ): boolean {
    const nextChannel = next.mixerState?.channels.find(
      (channel) => channel.id === condition.channelId
    );
    const previousChannel = previous.mixerState?.channels.find(
      (channel) => channel.id === condition.channelId
    );
    if (!nextChannel || !previousChannel) {
      return false;
    }

    const current =
      condition.property === "faderLevel"
        ? nextChannel.faderLevel / 100
        : nextChannel.isMuted;
    const prior =
      condition.property === "faderLevel"
        ? previousChannel.faderLevel / 100
        : previousChannel.isMuted;
    if (current === prior) {
      return false;
    }

    if (condition.property === "isMuted") {
      return current === condition.value;
    }

    const currentNumber = current as number;
    const priorNumber = prior as number;
    const target = condition.value as number;
    switch (condition.operator) {
      case "eq":
        return currentNumber === target && priorNumber !== target;
      case "gt":
        return currentNumber > target && priorNumber <= target;
      case "lt":
        return currentNumber < target && priorNumber >= target;
    }
  }

  private checkAtemCondition(
    condition: AtemTriggerCondition,
    next: AtemIntegrationState,
    previous: AtemIntegrationState
  ): boolean {
    const current = next.states[condition.switcherIp]?.programInput;
    const prior = previous.states[condition.switcherIp]?.programInput;
    return (
      current !== undefined &&
      prior !== undefined &&
      current !== prior &&
      current === condition.value
    );
  }

  private checkOBSCondition(
    condition: OBSTriggerCondition,
    next: OBSIntegrationState,
    previous: OBSIntegrationState
  ): boolean {
    const current = next.states[condition.connectionId];
    const prior = previous.states[condition.connectionId];
    if (!current || !prior) {
      return false;
    }

    if (condition.property === "currentScene") {
      return (
        current.currentScene !== prior.currentScene &&
        current.currentScene === condition.value
      );
    }

    return (
      current.isStreaming !== prior.isStreaming &&
      current.isStreaming === condition.value
    );
  }

  private checkVBCondition(
    condition: VBTriggerCondition,
    next: VBIntegrationState,
    previous: VBIntegrationState
  ): boolean {
    const findPatch = (patches: CurrentPatchStatus[]) =>
      patches.find(
        (patch) =>
          patch.connectionId === condition.connectionId &&
          patch.inputDevice === condition.inputDevice &&
          (patch.inputChannel || 1) === condition.inputChannel &&
          patch.outputDevice === condition.outputDevice &&
          (patch.outputChannel || 1) === condition.outputChannel
      );
    const current = Boolean(findPatch(next.activePatches)?.exists);
    const prior = Boolean(findPatch(previous.activePatches)?.exists);

    return (
      current !== prior &&
      (condition.status === "patched" ? current : !current)
    );
  }
}
