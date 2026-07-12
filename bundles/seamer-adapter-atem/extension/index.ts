import NodeCG from "nodecg/types";
import type {
  AtemControlAction,
  AtemIntegrationState,
  AtemState,
  AtemSwitcherInfo,
  AtemTriggerAction,
  SeamerExtensionApi,
} from "../../seamer/src/types/seamer.types";
import { atemManifest } from "./manifest";

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

  const setSource = (
    switcherIp: string,
    target: "program" | "preview" | "aux",
    source: number,
    auxId = 0
  ) =>
    target === "aux"
      ? nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
          ip: switcherIp,
          auxId,
          source,
        })
      : nodecg.sendMessageToBundle("atem:setSource", "atem-control", {
          ip: switcherIp,
          type: target,
          source,
        });

  const subscribe = (ip: string) => {
    if (subscribed.has(ip)) return;
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
    manifest: atemManifest,
    initialState: getState(),
    evaluateTrigger: (capabilityId, parameters, nextValue, previousValue) => {
      if (capabilityId !== "program.changed") return false;
      const ip = String(parameters.switcherIp);
      const next = (nextValue as AtemIntegrationState).states[ip]?.programInput;
      const previous = (previousValue as AtemIntegrationState).states[ip]
        ?.programInput;
      return (
        next !== undefined &&
        previous !== undefined &&
        next !== previous &&
        next === Number(parameters.source)
      );
    },
    executeAction: async (capabilityId, parameters) => {
      if (capabilityId === "macro.run") {
        await nodecg.sendMessageToBundle("atem:runMacro", "atem-control", {
          ip: String(parameters.switcherIp),
          macroIndex: Number(parameters.macroIndex),
        });
        return;
      }
      if (capabilityId === "source.set") {
        await setSource(
          String(parameters.switcherIp),
          String(parameters.target) as "program" | "preview" | "aux",
          Number(parameters.source),
          Number(parameters.auxId ?? 0)
        );
      }
    },
    executeLegacy: async (payload, kind) => {
      if (kind === "trigger") {
        const action = payload as AtemTriggerAction;
        await setSource(
          action.switcherIp,
          action.target,
          action.source,
          action.auxId
        );
        return;
      }

      const action = payload as AtemControlAction;
      if (action.functionType === "macro") {
        if (action.macroIndex !== undefined) {
          await nodecg.sendMessageToBundle("atem:runMacro", "atem-control", {
            ip: action.switcherIp,
            macroIndex: action.macroIndex,
          });
        }
        return;
      }
      if (action.sourceId === undefined) return;
      const target = action.target || "preview";
      if (target === "output" || target === "webcam") {
        await nodecg.sendMessageToBundle("atem:setAuxSource", "atem-control", {
          ip: action.switcherIp,
          auxId: target === "output" ? 0 : 1,
          source: action.sourceId,
        });
      } else if (target === "program" && action.transition === "auto") {
        await setSource(action.switcherIp, "preview", action.sourceId);
        setTimeout(() => {
          nodecg.sendMessageToBundle("atem:auto", "atem-control", {
            ip: action.switcherIp,
          });
        }, 100);
      } else {
        await setSource(action.switcherIp, target, action.sourceId);
      }
    },
  });

  switchersRep.on("change", (switchers) => {
    (switchers || []).forEach((switcher) => subscribe(switcher.ip));
    publish();
  });
  (switchersRep.value || []).forEach((switcher) => subscribe(switcher.ip));
};
