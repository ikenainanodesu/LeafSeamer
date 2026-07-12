import { createCipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import type {
  BackupCandidate,
  BackupLevel,
  BackupManifest,
  BackupRequest,
} from "../src/types/backup.types";

const LEVELS: BackupLevel[] = ["L0", "L1", "L2", "L3"];
const SECRET_PATH_PATTERN =
  /(^|\/)(secrets?|credentials?)(\/|$)|(^|[-_.])(secret|credential|private[-_]?key|stream[-_]?key)([-_.]|$)|\.(pem|key|p12|pfx)$/i;
const KNOWN_SECRET_CONFIGS = new Set([
  "cfg/data-sync-service.json",
  "cfg/obs-control.json",
  "cfg/schedule-adapter-google-sheets.json",
  "cfg/schedule-adapter-postgresql.json",
]);

export const normalizeBackupPath = (candidatePath: string): string => {
  const portable = candidatePath.replace(/\\/g, "/");
  if (
    path.posix.isAbsolute(portable) ||
    /^[a-zA-Z]:\//.test(portable) ||
    portable.split("/").some((part) => part === "..")
  ) {
    throw new Error(`Unsafe backup path: ${candidatePath}`);
  }
  const normalized = path.posix.normalize(portable).replace(/^\.\//, "");
  if (!normalized || normalized === ".") {
    throw new Error("Backup path must identify a file");
  }
  return normalized;
};

export const classifyBackupPath = (candidatePath: string): BackupLevel => {
  const normalized = normalizeBackupPath(candidatePath);
  if (SECRET_PATH_PATTERN.test(normalized) || KNOWN_SECRET_CONFIGS.has(normalized)) {
    return "L3";
  }
  if (/\.example$/i.test(normalized) || /(^|\/)README(?:\.[^/]*)?$/i.test(normalized)) {
    return "L0";
  }
  if (normalized.startsWith("db/")) return "L2";
  return "L1";
};

export const normalizeBackupRequest = (
  request?: Partial<BackupRequest>
): BackupRequest => {
  const levels = request?.levels ?? ["L0", "L1"];
  const uniqueLevels = [...new Set(levels)];
  if (
    uniqueLevels.length === 0 ||
    uniqueLevels.some((level) => !LEVELS.includes(level))
  ) {
    throw new Error("Select at least one valid backup level");
  }
  const includeSecrets = request?.includeSecrets === true;
  const secretPassphrase = request?.secretPassphrase?.trim();
  if (uniqueLevels.includes("L3") && !includeSecrets) {
    throw new Error("L3 requires explicit secret inclusion");
  }
  if (uniqueLevels.includes("L3") && (!secretPassphrase || secretPassphrase.length < 12)) {
    throw new Error("L3 requires a separate passphrase of at least 12 characters");
  }
  return {
    levels: LEVELS.filter((level) => uniqueLevels.includes(level)),
    includeSecrets,
    secretPassphrase,
  };
};

export const buildBackupManifest = (
  candidates: BackupCandidate[],
  levels: BackupLevel[],
  createdAt = new Date().toISOString()
): BackupManifest => ({
  version: 1,
  createdAt,
  levels: [...levels],
  entries: candidates
    .map((candidate) => {
      const normalizedPath = normalizeBackupPath(candidate.path);
      const level = classifyBackupPath(normalizedPath);
      return {
        path: normalizedPath,
        level,
        size: candidate.content.byteLength,
        sha256: createHash("sha256").update(candidate.content).digest("hex"),
        encrypted: level === "L3",
      };
    })
    .filter((entry) => levels.includes(entry.level))
    .sort((left, right) => left.path.localeCompare(right.path)),
  secretPayload: levels.includes("L3") ? "l3-secrets.encrypted.json" : null,
});

export const encryptSecretPayload = (
  candidates: BackupCandidate[],
  passphrase: string
): string => {
  if (passphrase.trim().length < 12) {
    throw new Error("Secret passphrase must contain at least 12 characters");
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(
    JSON.stringify(
      Object.fromEntries(
        candidates.map((candidate) => [
          normalizeBackupPath(candidate.path),
          candidate.content.toString("base64"),
        ])
      )
    )
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    keyDerivation: "scrypt",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
};
