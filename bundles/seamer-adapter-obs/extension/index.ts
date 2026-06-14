import NodeCG from "nodecg/types";
import type {
  OBSAction,
  OBSConnectionSettings,
  OBSIntegrationState,
  OBSState,
  OBSTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extension["seamer"] as SeamerExtensionApi;
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

  seamer.registerIntegration({
    id: "obs",
    label: "OBS Control",
    initialState: getState(),
    execute: (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as OBSTriggerAction;
        if (action.actionType === "setScene") {
          nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
            id: action.connectionId,
            scene: action.value,
          });
        } else {
          nodecg.sendMessageToBundle(
            action.value ? "startStreaming" : "stopStreaming",
            "obs-control",
            { id: action.connectionId }
          );
        }
        return;
      }

      const action = payload as OBSAction;
      if (action.transitionName) {
        nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
          id: action.connectionId,
          transition: action.transitionName,
        });
      }
      if (action.sceneName) {
        nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
          id: action.connectionId,
          scene: action.sceneName,
        });
      }
    },
  });

  const publish = () => seamer.updateIntegrationState("obs", getState());
  connectionsRep.on("change", publish);
  statesRep.on("change", publish);
};
