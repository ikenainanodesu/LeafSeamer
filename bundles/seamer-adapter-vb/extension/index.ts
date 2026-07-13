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
import { vbManifest } from "./manifest";
import type { VBMatrixControlApi } from "../../vb-matrix-control/extension/index";
import { createServiceCommandEnvelope } from "../../../shared/security/nodecg-command";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extensions["seamer"] as SeamerExtensionApi;
  const vbControl = nodecg.extensions["vb-matrix-control"] as VBMatrixControlApi;
  const presetsRep = nodecg.Replicant<Preset[]>("presets", "vb-matrix-control");
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

  const findPatch = (
    patches: CurrentPatchStatus[],
    parameters: Record<string, unknown>
  ) =>
    patches.find(
      (patch) =>
        patch.connectionId === String(parameters.connectionId) &&
        patch.inputDevice === String(parameters.inputDevice) &&
        (patch.inputChannel || 1) === Number(parameters.inputChannel) &&
        patch.outputDevice === String(parameters.outputDevice) &&
        (patch.outputChannel || 1) === Number(parameters.outputChannel)
    );

  const updatePatch = async (
    parameters: Record<string, unknown>,
    actionType: "patch" | "unpatch" | "toggle"
  ) => {
    const current = findPatch(patchesRep.value || [], parameters);
    const exists = Boolean(current?.exists);
    const shouldExist =
      actionType === "patch"
        ? true
        : actionType === "unpatch"
          ? false
          : !exists;

    const patch = {
      id: current?.id || Math.random().toString(36).slice(2, 11),
      connectionId: String(parameters.connectionId),
      inputDevice: String(parameters.inputDevice),
      inputChannel: Number(parameters.inputChannel),
      outputDevice: String(parameters.outputDevice),
      outputChannel: Number(parameters.outputChannel),
      exists: shouldExist,
      gain: shouldExist && current?.gain === undefined ? 0 : current?.gain,
      mute: current?.mute || false,
    };
    const result = await vbControl.executeCommand(
      createServiceCommandEnvelope(
        "vb.updatePatch",
        patch,
        "seamer-adapter-vb",
        ["audio"]
      )
    );
    if (!result.ok) {
      throw new Error(result.error?.message ?? "VB patch command failed");
    }
  };

  seamer.registerIntegration({
    manifest: vbManifest,
    initialState: getState(),
    evaluateTrigger: (capabilityId, parameters, nextValue, previousValue) => {
      if (capabilityId !== "patch.changed") return false;
      const current = Boolean(
        findPatch((nextValue as VBIntegrationState).activePatches, parameters)
          ?.exists
      );
      const previous = Boolean(
        findPatch(
          (previousValue as VBIntegrationState).activePatches,
          parameters
        )?.exists
      );
      return (
        current !== previous &&
        (parameters.status === "patched" ? current : !current)
      );
    },
    executeAction: async (capabilityId, parameters) => {
      if (capabilityId === "preset.load") {
        await nodecg.sendMessageToBundle(
          "loadPreset",
          "vb-matrix-control",
          String(parameters.presetId)
        );
        return;
      }
      if (capabilityId === "patch.set") {
        await updatePatch(
          parameters,
          String(parameters.actionType) as "patch" | "unpatch" | "toggle"
        );
      }
    },
    executeLegacy: async (payload, kind) => {
      if (kind === "card") {
        await nodecg.sendMessageToBundle(
          "loadPreset",
          "vb-matrix-control",
          (payload as VBPresetAction).presetId
        );
        return;
      }
      const action = payload as VBTriggerAction;
      await updatePatch(
        {
          connectionId: action.connectionId,
          inputDevice: action.inputDevice,
          inputChannel: action.inputChannel,
          outputDevice: action.outputDevice,
          outputChannel: action.outputChannel,
        },
        action.actionType
      );
    },
  });

  const publish = () => seamer.updateIntegrationState("vb", getState());
  presetsRep.on("change", publish);
  devicesRep.on("change", publish);
  patchesRep.on("change", publish);
};
