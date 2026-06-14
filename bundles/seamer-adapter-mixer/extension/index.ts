import NodeCG from "nodecg/types";
import type {
  MixerControlAction,
  MixerIntegrationState,
  MixerState,
  MixerTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extension["seamer"] as SeamerExtensionApi;
  const mixerStateRep = nodecg.Replicant<MixerState>(
    "mixerState",
    "mixer-control"
  );
  const getState = (): MixerIntegrationState => ({
    mixerState: mixerStateRep.value || null,
  });

  seamer.registerIntegration({
    id: "mixer",
    label: "Mixer Control",
    initialState: getState(),
    execute: (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as MixerTriggerAction;
        nodecg.sendMessageToBundle(
          action.property === "faderLevel"
            ? "setMixerFader"
            : "setMixerMute",
          "mixer-control",
          action.property === "faderLevel"
            ? { channelId: action.channelId, level: action.value }
            : { channelId: action.channelId, isMuted: action.value }
        );
        return;
      }

      const action = payload as MixerControlAction;
      if ((action.subFunction || "fader") === "fader") {
        nodecg.sendMessageToBundle("setMixerFader", "mixer-control", {
          channelId: action.channelId,
          level: action.level,
        });
        return;
      }

      if (
        action.sendInputId === undefined ||
        action.sendOutputId === undefined
      ) {
        return;
      }
      const base = {
        inputId: action.sendInputId,
        outputId: action.sendOutputId,
      };
      if (action.sendLevel !== undefined) {
        nodecg.sendMessageToBundle(
          "setMixerInputSendLevel",
          "mixer-control",
          { ...base, level: action.sendLevel }
        );
      }
      if (action.sendOn !== undefined) {
        nodecg.sendMessageToBundle(
          "setMixerInputSendActive",
          "mixer-control",
          { ...base, active: action.sendOn }
        );
      }
      if (action.sendPre !== undefined) {
        nodecg.sendMessageToBundle(
          "setMixerInputSendPre",
          "mixer-control",
          { ...base, pre: action.sendPre }
        );
      }
      if (action.sendPan !== undefined) {
        nodecg.sendMessageToBundle("setMixerInputSendPan", "mixer-control", {
          ...base,
          pan: action.sendPan,
        });
      }
    },
  });

  mixerStateRep.on("change", () => {
    seamer.updateIntegrationState("mixer", getState());
  });
};
