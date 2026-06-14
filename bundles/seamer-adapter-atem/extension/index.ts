import NodeCG from "nodecg/types";
import type {
  AtemControlAction,
  AtemIntegrationState,
  AtemState,
  AtemSwitcherInfo,
  AtemTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extension["seamer"] as SeamerExtensionApi;
  const switchersRep = nodecg.Replicant<AtemSwitcherInfo[]>(
    "atem:switchers",
    "atem-control"
  );
  const states: Record<string, AtemState> = {};
  const subscribed = new Set<string>();
  const getState = (): AtemIntegrationState => ({
    switchers: switchersRep.value || [],
    states: { ...states },
  });
  const publish = () => seamer.updateIntegrationState("atem", getState());

  const subscribe = (ip: string) => {
    if (subscribed.has(ip)) {
      return;
    }
    subscribed.add(ip);
    const stateRep = nodecg.Replicant<AtemState>(
      `atem:state:${ip}`,
      "atem-control"
    );
    stateRep.on("change", (value) => {
      if (value) {
        states[ip] = value;
        publish();
      }
    });
  };

  seamer.registerIntegration({
    id: "atem",
    label: "ATEM Control",
    initialState: getState(),
    execute: (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as AtemTriggerAction;
        if (action.target === "aux") {
          nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
            ip: action.switcherIp,
            auxId: action.auxId,
            source: action.source,
          });
        } else {
          nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
            ip: action.switcherIp,
            type: action.target,
            source: action.source,
          });
        }
        return;
      }

      const action = payload as AtemControlAction;
      if (action.functionType === "macro") {
        if (action.macroIndex !== undefined) {
          nodecg.sendMessageToBundle("atem:runMacro", "atem-control", {
            ip: action.switcherIp,
            macroIndex: action.macroIndex,
          });
        }
        return;
      }
      if (action.sourceId === undefined) {
        return;
      }
      const target = action.target || "preview";
      if (target === "output" || target === "webcam") {
        nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
          ip: action.switcherIp,
          auxId: target === "output" ? 0 : 1,
          source: action.sourceId,
        });
      } else if (target === "program" && action.transition === "auto") {
        nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
          ip: action.switcherIp,
          type: "preview",
          source: action.sourceId,
        });
        setTimeout(() => {
          nodecg.sendMessageToBundle("atem:auto", "atem-control", {
            ip: action.switcherIp,
          });
        }, 100);
      } else {
        nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
          ip: action.switcherIp,
          type: target,
          source: action.sourceId,
        });
      }
    },
  });

  switchersRep.on("change", (switchers) => {
    (switchers || []).forEach((switcher) => subscribe(switcher.ip));
    publish();
  });
  (switchersRep.value || []).forEach((switcher) => subscribe(switcher.ip));
};
