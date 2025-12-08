"use strict";
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
class BackupManager {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.backupDir = path__namespace.join(process.cwd(), "backups");
    if (!fs__namespace.existsSync(this.backupDir)) {
      fs__namespace.mkdirSync(this.backupDir, { recursive: true });
    }
    this.backupListRep = nodecg.Replicant("backupList", {
      defaultValue: []
    });
    this.refreshBackupList();
  }
  async createBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${timestamp}.zip`;
      const filePath = path__namespace.join(this.backupDir, filename);
      const output = fs__namespace.createWriteStream(filePath);
      const archive = archiver("zip", {
        zlib: { level: 9 }
        // Sets the compression level.
      });
      output.on("close", () => {
        this.nodecg.log.info(archive.pointer() + " total bytes");
        this.nodecg.log.info("Backup created: " + filename);
        this.refreshBackupList();
        resolve(filename);
      });
      archive.on("error", (err) => {
        reject(err);
      });
      archive.pipe(output);
      const cfgDir = path__namespace.join(process.cwd(), "cfg");
      if (fs__namespace.existsSync(cfgDir)) {
        archive.directory(cfgDir, "cfg");
      }
      const dbDir = path__namespace.join(process.cwd(), "db");
      if (fs__namespace.existsSync(dbDir)) {
        archive.directory(dbDir, "db");
      }
      archive.finalize();
    });
  }
  refreshBackupList() {
    if (!fs__namespace.existsSync(this.backupDir)) return;
    const files = fs__namespace.readdirSync(this.backupDir).filter((f) => f.endsWith(".zip"));
    const backups = files.map((f) => {
      const stats = fs__namespace.statSync(path__namespace.join(this.backupDir, f));
      return {
        filename: f,
        timestamp: stats.mtimeMs,
        size: stats.size
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
    this.backupListRep.value = backups;
  }
}
module.exports = function(nodecg) {
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
        ack(err);
      }
    }
  });
};
