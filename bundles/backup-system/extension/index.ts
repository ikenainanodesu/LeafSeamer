import NodeCG from "nodecg/types";
import { BackupManager } from "./backup-manager";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Backup System Bundle");

  const backupManager = new BackupManager(nodecg);

  nodecg.listenFor("createBackup", async (data, ack) => {
    try {
      const filename = await backupManager.createBackup();
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
