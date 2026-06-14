import NodeCG from "nodecg/types";
import type {
  CurrentPatchStatus,
  DeviceInfo,
  Preset,
  SeamerExtensionApi,
  VBIntegrationState,
  VBPresetAction,
  VBTriggerAction,
} from "../../seamer/src/types/seamer.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extension["seamer"] as SeamerExtensionApi;
  const presetsRep = nodecg.Replicant<Preset[]>(
    "presets",
    "vb-matrix-control"
  );
  const devicesRep = nodecg.Replicant<DeviceInfo[]>(
    "availableDevices",
    "vb-matrix-control"
  );
  const patchesRep = nodecg.Replicant<CurrentPatchStatus[]>(
    "activePatches",
    "vb-matrix-control"
  );
  const getState = (): VBIntegrationState => ({
    presets: presetsRep.value || [],
    devices: devicesRep.value || [],
    activePatches: patchesRep.value || [],
  });

  seamer.registerIntegration({
    id: "vb",
    label: "VB Matrix Control",
    initialState: getState(),
    execute: (payload, kind) => {
      if (kind === "card") {
        nodecg.sendMessageToBundle(
          "loadPreset",
          "vb-matrix-control",
          (payload as VBPresetAction).presetId
        );
        return;
      }

      const action = payload as VBTriggerAction;
      const current = (patchesRep.value || []).find(
        (patch) =>
          patch.connectionId === action.connectionId &&
          patch.inputDevice === action.inputDevice &&
          (patch.inputChannel || 1) === action.inputChannel &&
          patch.outputDevice === action.outputDevice &&
          (patch.outputChannel || 1) === action.outputChannel
      );
      const exists = Boolean(current?.exists);
      const shouldExist =
        action.actionType === "patch"
          ? true
          : action.actionType === "unpatch"
            ? false
            : !exists;

      nodecg.sendMessageToBundle("updatePatch", "vb-matrix-control", {
        id: current?.id || Math.random().toString(36).slice(2, 11),
        connectionId: action.connectionId,
        inputDevice: action.inputDevice,
        inputChannel: action.inputChannel,
        outputDevice: action.outputDevice,
        outputChannel: action.outputChannel,
        exists: shouldExist,
        gain: shouldExist && current?.gain === undefined ? 0 : current?.gain,
        mute: current?.mute || false,
      });
    },
  });

  const publish = () => seamer.updateIntegrationState("vb", getState());
  presetsRep.on("change", publish);
  devicesRep.on("change", publish);
  patchesRep.on("change", publish);
};
