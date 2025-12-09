import NodeCG from "nodecg/types";
import { MatrixManager } from "./manager";

module.exports = (nodecg: NodeCG.ServerAPI) => {
  try {
    nodecg.log.info("VB Matrix Control Extension starting...");
    new MatrixManager(nodecg);
  } catch (err: any) {
    nodecg.log.error("Failed to start VB Matrix Control:", err);
  }
};
