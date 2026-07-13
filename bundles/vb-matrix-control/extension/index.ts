import NodeCG from "nodecg/types";
import { MatrixManager } from "./manager";
import { ensureOptionalLogCapture } from "./optional-log-capture";
import { CommandGateway } from "../src/_leaf-core/security/command-gateway";
import { createOptionalAuditWriter } from "../src/_leaf-core/security/nodecg-command";
import { installAuthenticatedCommandSocket } from "../src/_leaf-core/security/authenticated-command";
import type { CommandEnvelope } from "../src/_leaf-core/integration/types";

export interface VBMatrixControlApi {
  executeCommand: (envelope: CommandEnvelope) => ReturnType<CommandGateway["execute"]>;
}

module.exports = (nodecg: NodeCG.ServerAPI) => {
  ensureOptionalLogCapture(nodecg.Logger);
  try {
    nodecg.log.info("VB Matrix Control Extension starting...");
    const commandGateway = new CommandGateway(createOptionalAuditWriter(nodecg));
    new MatrixManager(nodecg, commandGateway);
    installAuthenticatedCommandSocket(
      nodecg,
      commandGateway,
      "vb-matrix-control"
    );
    return {
      executeCommand: (envelope: CommandEnvelope) =>
        commandGateway.execute(envelope),
    } satisfies VBMatrixControlApi;
  } catch (err: any) {
    nodecg.log.error("Failed to start VB Matrix Control:", err);
  }
};
