import NodeCG from "nodecg/types";
import { BackupManager } from "./backup-manager";
import { ensureOptionalLogCapture } from "./optional-log-capture";
import type { BackupRequest } from "../src/types/backup.types";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  ensureOptionalLogCapture(nodecg.Logger);
  nodecg.log.info("Starting Backup System Bundle");

  const backupManager = new BackupManager(nodecg);

  nodecg.listenFor("createBackup", async (data: Partial<BackupRequest>, ack) => {
    try {
      const filename = await backupManager.createBackup(data);
      if (ack && !ack.handled) {
        ack(null, filename);
      }
    } catch (err) {
      nodecg.log.error("Failed to create backup:", err);
      if (ack && !ack.handled) {
        ack(err as Error);
      }
    }
  });
};
