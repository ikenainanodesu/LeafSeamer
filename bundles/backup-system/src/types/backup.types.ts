export type BackupLevel = "L0" | "L1" | "L2" | "L3";

export interface BackupRequest {
  levels: BackupLevel[];
  includeSecrets: boolean;
  secretPassphrase?: string;
}

export interface BackupManifestEntry {
  path: string;
  level: BackupLevel;
  size: number;
  sha256: string;
  encrypted: boolean;
}

export interface BackupManifest {
  version: 1;
  createdAt: string;
  levels: BackupLevel[];
  entries: BackupManifestEntry[];
  secretPayload: string | null;
}

export interface BackupCandidate {
  path: string;
  content: Buffer;
}
