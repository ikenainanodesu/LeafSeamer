import NodeCG from "nodecg/types";
import { MatrixManager } from "./manager";
import { ensureOptionalLogCapture } from "./optional-log-capture";
import { CommandGateway } from "../../../shared/security/command-gateway";
import { createOptionalAuditWriter } from "../../../shared/security/nodecg-command";

module.exports = (nodecg: NodeCG.ServerAPI) => {
  ensureOptionalLogCapture(nodecg.Logger);
  try {
    nodecg.log.info("VB Matrix Control Extension starting...");
    const commandGateway = new CommandGateway(createOptionalAuditWriter(nodecg));
    new MatrixManager(nodecg, commandGateway);
  } catch (err: any) {
    nodecg.log.error("Failed to start VB Matrix Control:", err);
  }
};
