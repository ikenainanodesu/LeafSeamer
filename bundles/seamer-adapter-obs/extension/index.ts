import NodeCG from "nodecg/types";
import type {
  OBSAction,
  OBSConnectionSettings,
  OBSIntegrationState,
  OBSState,
  OBSTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";
import { obsManifest } from "./manifest";
import type { OBSControlApi } from "../../obs-control/extension/index";
import { createServiceCommandEnvelope } from "../src/_leaf-core/security/nodecg-command";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extensions["seamer"] as SeamerExtensionApi;
  const obsControl = nodecg.extensions["obs-control"] as OBSControlApi;
  const connectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
    "obsConnections",
    "obs-control"
  );
  const statesRep = nodecg.Replicant<Record<string, OBSState>>(
    "obsStates",
    "obs-control"
  );
  const getState = (): OBSIntegrationState => ({
    connections: connectionsRep.value || [],
    states: statesRep.value || {},
  });

  const setScene = (connectionId: string, scene: string) =>
    nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
      id: connectionId,
      scene,
    });
  const setStreaming = async (connectionId: string, isStreaming: boolean) => {
    const result = await obsControl.executeCommand(
      createServiceCommandEnvelope(
        isStreaming ? "obs.startStreaming" : "obs.stopStreaming",
        { id: connectionId },
        "seamer-adapter-obs",
        ["broadcast"]
      )
    );
    if (!result.ok) {
      throw new Error(result.error?.message ?? "OBS streaming command failed");
    }
  };

  seamer.registerIntegration({
    manifest: obsManifest,
    initialState: getState(),
    evaluateTrigger: (capabilityId, parameters, nextValue, previousValue) => {
      const connectionId = String(parameters.connectionId);
      const next = (nextValue as OBSIntegrationState).states[connectionId];
      const previous = (previousValue as OBSIntegrationState).states[
        connectionId
      ];
      if (!next || !previous) return false;

      if (capabilityId === "scene.changed") {
        return (
          next.currentScene !== previous.currentScene &&
          next.currentScene === parameters.scene
        );
      }
      return (
        next.isStreaming !== previous.isStreaming &&
        next.isStreaming === Boolean(parameters.isStreaming)
      );
    },
    executeAction: async (capabilityId, parameters) => {
      if (capabilityId === "scene.set") {
        await setScene(String(parameters.connectionId), String(parameters.scene));
        return;
      }
      if (capabilityId === "streaming.set") {
        await setStreaming(
          String(parameters.connectionId),
          Boolean(parameters.isStreaming)
        );
      }
    },
    executeLegacy: async (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as OBSTriggerAction;
        if (action.actionType === "setScene") {
          await setScene(action.connectionId, String(action.value));
        } else {
          await setStreaming(action.connectionId, Boolean(action.value));
        }
        return;
      }

      const action = payload as OBSAction;
      if (action.transitionName) {
        await nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
          id: action.connectionId,
          transition: action.transitionName,
        });
      }
      if (action.sceneName) {
        await setScene(action.connectionId, action.sceneName);
      }
    },
  });

  const publish = () => seamer.updateIntegrationState("obs", getState());
  connectionsRep.on("change", publish);
  statesRep.on("change", publish);
};
