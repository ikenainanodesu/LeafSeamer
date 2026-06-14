import NodeCG from "nodecg/types";
import { IntegrationRegistry } from "./integration-registry";
import { TriggerManager } from "./trigger-manager";
import {
  SeamerCard,
  SeamerExtensionApi,
  TriggerModule,
} from "../src/types/seamer.types";
import { ensureOptionalLogCapture } from "./optional-log-capture";

module.exports = function (nodecg: NodeCG.ServerAPI): SeamerExtensionApi {
  ensureOptionalLogCapture(nodecg.Logger);
  nodecg.log.info("Starting Seamer Bundle");

  const registry = new IntegrationRegistry(nodecg);
  new TriggerManager(nodecg, registry);

  nodecg.Replicant<SeamerCard[]>("seamerCards", {
    defaultValue: [],
  });

  nodecg.listenFor("runSeamerCard", (card: SeamerCard) => {
    card.actions.forEach((action) => {
      const integration: TriggerModule =
        action.type === "mixer-fader"
          ? "mixer"
          : action.type === "vb-preset"
            ? "vb"
            : action.type === "obs-action"
              ? "obs"
              : "atem";
      void registry.execute(integration, action, "card");
    });
  });

  return {
    registerIntegration: (provider) => registry.register(provider),
    updateIntegrationState: (id, state) => registry.update(id, state),
  };
};
