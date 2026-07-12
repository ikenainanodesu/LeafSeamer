import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BackupLevel, BackupRequest } from "../types/backup.types";

interface BackupFile {
  filename: string;
  timestamp: number;
  size: number;
}

const LEVEL_OPTIONS: Array<{ level: BackupLevel; label: string; detail: string }> = [
  { level: "L0", label: "L0 Public", detail: "Examples and public metadata" },
  { level: "L1", label: "L1 Operational", detail: "Standard runtime configuration" },
  { level: "L2", label: "L2 Confidential", detail: "Databases and internal state" },
  { level: "L3", label: "L3 Secret", detail: "Credentials and private keys" },
];

const BackupControl = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [levels, setLevels] = useState<BackupLevel[]>(["L0", "L1"]);
  const [secretConfirmed, setSecretConfirmed] = useState(false);
  const [secretPassphrase, setSecretPassphrase] = useState("");

  useEffect(() => {
    const replicant = nodecg.Replicant<BackupFile[]>("backupList");
    const update = (value: BackupFile[] | undefined) => setBackups(value ?? []);
    replicant.on("change", update);
    return () => replicant.removeListener("change", update);
  }, []);

  const toggleLevel = (level: BackupLevel) => {
    setLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    );
    if (level === "L3" && levels.includes("L3")) {
      setSecretConfirmed(false);
      setSecretPassphrase("");
    }
  };

  const createBackup = () => {
    const request: BackupRequest = {
      levels,
      includeSecrets: levels.includes("L3") && secretConfirmed,
      secretPassphrase: levels.includes("L3") ? secretPassphrase : undefined,
    };
    setCreating(true);
    nodecg.sendMessage("createBackup", request, (error: Error | null) => {
      setCreating(false);
      if (error) window.alert(`Backup failed: ${error.message}`);
    });
  };

  const canCreate =
    !creating &&
    levels.length > 0 &&
    (!levels.includes("L3") ||
      (secretConfirmed && secretPassphrase.trim().length >= 12));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
  };

  return (
    <main style={{ padding: 16, color: "#e5e7eb", background: "#17191d" }}>
      <section aria-labelledby="backup-levels">
        <h2 id="backup-levels" style={{ margin: "0 0 12px", fontSize: 16 }}>
          Data levels
        </h2>
        <div style={{ display: "grid", gap: 8 }}>
          {LEVEL_OPTIONS.map((option) => (
            <label key={option.level} style={{ display: "flex", gap: 10 }}>
              <input
                type="checkbox"
                checked={levels.includes(option.level)}
                onChange={() => toggleLevel(option.level)}
              />
              <span>
                <strong>{option.label}</strong>
                <small style={{ display: "block", color: "#9ca3af" }}>
                  {option.detail}
                </small>
              </span>
            </label>
          ))}
        </div>
      </section>

      {levels.includes("L3") && (
        <section style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #34373d" }}>
          <label style={{ display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              checked={secretConfirmed}
              onChange={(event) => setSecretConfirmed(event.target.checked)}
            />
            I understand that this backup contains encrypted secret data.
          </label>
          <input
            type="password"
            value={secretPassphrase}
            onChange={(event) => setSecretPassphrase(event.target.value)}
            placeholder="Separate passphrase (12+ characters)"
            autoComplete="new-password"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: 8 }}
          />
        </section>
      )}

      <button
        type="button"
        onClick={createBackup}
        disabled={!canCreate}
        style={{ width: "100%", marginTop: 16, padding: 10, cursor: canCreate ? "pointer" : "default" }}
      >
        {creating ? "Creating backup..." : "Create backup"}
      </button>

      <section style={{ marginTop: 20 }} aria-labelledby="existing-backups">
        <h2 id="existing-backups" style={{ fontSize: 16 }}>Existing backups</h2>
        {backups.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No backups found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {backups.map((backup) => (
              <li key={backup.filename} style={{ padding: "10px 0", borderTop: "1px solid #34373d" }}>
                <strong>{backup.filename}</strong>
                <small style={{ display: "flex", justifyContent: "space-between", color: "#9ca3af" }}>
                  <span>{new Date(backup.timestamp).toLocaleString()}</span>
                  <span>{formatSize(backup.size)}</span>
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

createRoot(document.getElementById("root")!).render(<BackupControl />);
