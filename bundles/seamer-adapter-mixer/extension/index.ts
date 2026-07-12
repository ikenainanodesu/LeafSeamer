import NodeCG from "nodecg/types";
import type {
  MixerControlAction,
  MixerIntegrationState,
  MixerState,
  MixerTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";
import { mixerManifest } from "./manifest";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extension["seamer"] as SeamerExtensionApi;
  const mixerStateRep = nodecg.Replicant<MixerState>(
    "mixerState",
    "mixer-control"
  );
  const getState = (): MixerIntegrationState => ({
    mixerState: mixerStateRep.value || null,
  });

  const setFader = (channelId: number, level: number) =>
    nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
      channelId,
      level,
    });
  const setMute = (channelId: number, isMuted: boolean) =>
    nodecg.sendMessageToBundle("setMixerMute", "mixer-control", {
      channelId,
      isMuted,
    });

  seamer.registerIntegration({
    manifest: mixerManifest,
    initialState: getState(),
    evaluateTrigger: (capabilityId, parameters, nextValue, previousValue) => {
      const channelId = Number(parameters.channelId);
      const next = (nextValue as MixerIntegrationState).mixerState?.channels.find(
        (channel) => channel.id === channelId
      );
      const previous = (
        previousValue as MixerIntegrationState
      ).mixerState?.channels.find((channel) => channel.id === channelId);
      if (!next || !previous) return false;

      if (capabilityId === "channel.mute_changed") {
        return (
          next.isMuted !== previous.isMuted &&
          next.isMuted === Boolean(parameters.value)
        );
      }

      const target = Number(parameters.value);
      const operator = String(parameters.operator);
      const current = next.faderLevel / 100;
      const prior = previous.faderLevel / 100;
      if (operator === "gt") return current > target && prior <= target;
      if (operator === "lt") return current < target && prior >= target;
      return current === target && prior !== target;
    },
    executeAction: async (capabilityId, parameters) => {
      if (capabilityId === "channel.set_fader") {
        await setFader(Number(parameters.channelId), Number(parameters.level));
        return;
      }
      if (capabilityId === "channel.set_mute") {
        await setMute(
          Number(parameters.channelId),
          Boolean(parameters.isMuted)
        );
      }
    },
    executeLegacy: async (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as MixerTriggerAction;
        if (action.property === "faderLevel") {
          await setFader(action.channelId, Number(action.value));
        } else {
          await setMute(action.channelId, Boolean(action.value));
        }
        return;
      }

      const action = payload as MixerControlAction;
      if ((action.subFunction || "fader") === "fader") {
        await setFader(action.channelId, action.level);
        return;
      }
      if (action.sendInputId === undefined || action.sendOutputId === undefined) {
        return;
      }
      const base = { inputId: action.sendInputId, outputId: action.sendOutputId };
      if (action.sendLevel !== undefined) {
        await nodecg.sendMessageToBundle("setMixerInputSendLevel", "mixer-control", { ...base, level: action.sendLevel });
      }
      if (action.sendOn !== undefined) {
        await nodecg.sendMessageToBundle("setMixerInputSendActive", "mixer-control", { ...base, active: action.sendOn });
      }
      if (action.sendPre !== undefined) {
        await nodecg.sendMessageToBundle("setMixerInputSendPre", "mixer-control", { ...base, pre: action.sendPre });
      }
      if (action.sendPan !== undefined) {
        await nodecg.sendMessageToBundle("setMixerInputSendPan", "mixer-control", { ...base, pan: action.sendPan });
      }
    },
  });

  mixerStateRep.on("change", () => {
    seamer.updateIntegrationState("mixer", getState());
  });
};
