import NodeCG from "nodecg/types";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";

export interface BackupFile {
  filename: string;
  timestamp: number;
  size: number;
}

export class BackupManager {
  private nodecg: NodeCG.ServerAPI;
  private backupDir: string;
  private backupListRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    // Backups stored in root/backups
    // Note: nodecg.bundlePath is inside bundles/backup-system
    // We want to go up to root.
    // Assuming standard structure: root/bundles/backup-system
    // So root is ../../
    // But safer to use process.cwd() if running from root, or resolve relative to bundlePath.
    // Let's assume process.cwd() is the NodeCG root (usually true when running `nodecg start`).
    this.backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.backupListRep = nodecg.Replicant<BackupFile[]>("backupList", {
      defaultValue: [],
    });
    this.refreshBackupList();
  }

  async createBackup(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${timestamp}.zip`;
      const filePath = path.join(this.backupDir, filename);
      const output = fs.createWriteStream(filePath);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Sets the compression level.
      });

      output.on("close", () => {
        this.nodecg.log.info(archive.pointer() + " total bytes");
        this.nodecg.log.info("Backup created: " + filename);
        this.refreshBackupList();
        resolve(filename);
      });

      archive.on("error", (err: any) => {
        reject(err);
      });

      archive.pipe(output);

      // Append cfg directory
      const cfgDir = path.join(process.cwd(), "cfg");
      if (fs.existsSync(cfgDir)) {
        archive.directory(cfgDir, "cfg");
      }

      // Append db directory
      const dbDir = path.join(process.cwd(), "db");
      if (fs.existsSync(dbDir)) {
        archive.directory(dbDir, "db");
      }

      archive.finalize();
    });
  }

  private refreshBackupList() {
    if (!fs.existsSync(this.backupDir)) return;

    const files = fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith(".zip"));
    const backups: BackupFile[] = files
      .map((f) => {
        const stats = fs.statSync(path.join(this.backupDir, f));
        return {
          filename: f,
          timestamp: stats.mtimeMs,
          size: stats.size,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    this.backupListRep.value = backups;
  }
}
