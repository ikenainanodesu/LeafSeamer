import NodeCG from "nodecg/types";
import * as fs from "node:fs";
import * as path from "node:path";
import archiver from "archiver";
import {
  buildBackupManifest,
  classifyBackupPath,
  encryptSecretPayload,
  normalizeBackupPath,
  normalizeBackupRequest,
} from "./backup-policy";
import type {
  BackupCandidate,
  BackupRequest,
} from "../src/types/backup.types";

export interface BackupFile {
  filename: string;
  timestamp: number;
  size: number;
}

export class BackupManager {
  private readonly backupDir: string;
  private readonly backupListRep: NodeCG.ServerReplicant<BackupFile[]>;

  constructor(private readonly nodecg: NodeCG.ServerAPI) {
    this.backupDir = path.join(process.cwd(), "backups");
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.backupListRep = nodecg.Replicant<BackupFile[]>("backupList", {
      defaultValue: [],
    });
    this.refreshBackupList();
  }

  async createBackup(request?: Partial<BackupRequest>): Promise<string> {
    const normalizedRequest = normalizeBackupRequest(request);
    const candidates = await this.collectCandidates();
    const selected = candidates.filter((candidate) =>
      normalizedRequest.levels.includes(classifyBackupPath(candidate.path))
    );
    const manifest = buildBackupManifest(selected, normalizedRequest.levels);
    const timestamp = manifest.createdAt.replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.zip`;
    const filePath = path.join(this.backupDir, filename);

    await this.writeArchive(filePath, selected, manifest, normalizedRequest);
    this.nodecg.log.info("Backup created: %s", filename);
    this.refreshBackupList();
    return filename;
  }

  private async collectCandidates(): Promise<BackupCandidate[]> {
    const candidates: BackupCandidate[] = [];
    for (const rootName of ["cfg", "db"]) {
      const rootPath = path.join(process.cwd(), rootName);
      if (fs.existsSync(rootPath)) {
        await this.collectDirectory(rootPath, rootName, candidates);
      }
    }
    return candidates;
  }

  private async collectDirectory(
    directory: string,
    relativeDirectory: string,
    candidates: BackupCandidate[]
  ): Promise<void> {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizeBackupPath(
        path.posix.join(relativeDirectory.replace(/\\/g, "/"), entry.name)
      );
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await this.collectDirectory(absolutePath, relativePath, candidates);
      } else if (entry.isFile()) {
        candidates.push({
          path: relativePath,
          content: await fs.promises.readFile(absolutePath),
        });
      }
    }
  }

  private async writeArchive(
    filePath: string,
    candidates: BackupCandidate[],
    manifest: ReturnType<typeof buildBackupManifest>,
    request: BackupRequest
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(filePath, { flags: "wx" });
      const archive = archiver("zip", { zlib: { level: 9 } });
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        output.destroy();
        void fs.promises.unlink(filePath).catch(() => undefined);
        reject(error);
      };

      output.on("close", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      output.on("error", fail);
      archive.on("error", fail);
      archive.pipe(output);

      for (const candidate of candidates) {
        if (classifyBackupPath(candidate.path) !== "L3") {
          archive.append(candidate.content, { name: candidate.path });
        }
      }

      const secrets = candidates.filter(
        (candidate) => classifyBackupPath(candidate.path) === "L3"
      );
      if (secrets.length > 0) {
        archive.append(
          encryptSecretPayload(secrets, request.secretPassphrase as string),
          { name: "l3-secrets.encrypted.json" }
        );
      }
      archive.append(JSON.stringify(manifest, null, 2), {
        name: "backup-manifest.json",
      });
      void archive.finalize().catch(fail);
    });
  }

  private refreshBackupList(): void {
    const backups = fs
      .readdirSync(this.backupDir)
      .filter((filename) => filename.endsWith(".zip"))
      .map((filename) => {
        const stats = fs.statSync(path.join(this.backupDir, filename));
        return { filename, timestamp: stats.mtimeMs, size: stats.size };
      })
      .sort((left, right) => right.timestamp - left.timestamp);
    this.backupListRep.value = backups;
  }
}
