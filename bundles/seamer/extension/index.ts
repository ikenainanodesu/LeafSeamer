import NodeCG from "nodecg/types";
import { TriggerManager } from "./trigger-manager";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Seamer Bundle");

  // Initialize Trigger Manager
  const triggerManager = new TriggerManager(nodecg);
};
