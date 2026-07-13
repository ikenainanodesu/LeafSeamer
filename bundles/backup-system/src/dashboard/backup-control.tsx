import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Archive } from "lucide-react";
import type { BackupLevel, BackupRequest } from "../types/backup.types";
import {
  Button,
  Disclosure,
  PanelErrorBoundary,
  PanelHeader,
} from "./_leaf-ui/components";
import "./_leaf-ui/index.css";
import "./backup-dashboard.css";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
    setCreating(true);
    nodecg.sendMessage("createBackup", request, (error: Error | null) => {
      setCreating(false);
      if (error) setErrorMessage(`Backup failed: ${error.message}`);
    });
  };

  const canCreate =
    !creating &&
    levels.length > 0 &&
    (!levels.includes("L3") ||
      (secretConfirmed && secretPassphrase.trim().length >= 12));

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
  };

  return (
    <main className="backup-shell leaf-panel">
      <PanelHeader
        kicker="Backup System"
        title="Create Backup"
        target={`${levels.length} data levels selected`}
        status={creating ? "Creating" : "Ready"}
        statusTone={creating ? "warning" : "success"}
      />
      <div className="leaf-sr-only" aria-live="polite" aria-atomic="true">
        {creating ? "Backup creation in progress." : "Backup creation ready."}
      </div>
      <div className="backup-content">
        {errorMessage ? (
          <div className="backup-error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <section className="backup-section" aria-labelledby="backup-levels">
          <div className="backup-section-heading">
            <h2 id="backup-levels">Data Levels</h2>
            <span>{levels.length}/4 selected</span>
          </div>
          <div className="backup-levels">
            {LEVEL_OPTIONS.map((option) => (
              <label
                key={option.level}
                className="backup-level"
                data-selected={levels.includes(option.level)}
              >
              <input
                type="checkbox"
                checked={levels.includes(option.level)}
                onChange={() => toggleLevel(option.level)}
              />
              <span className="backup-level-copy">
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
              </label>
            ))}
          </div>
        </section>

        {levels.includes("L3") ? (
          <section className="backup-secret" aria-labelledby="backup-secret-title">
            <div>
              <h2 id="backup-secret-title">Secret Data</h2>
              <p>L3 data is encrypted with the separate passphrase below.</p>
            </div>
            <label className="backup-confirm">
              <input
                type="checkbox"
                checked={secretConfirmed}
                onChange={(event) => setSecretConfirmed(event.target.checked)}
              />
              <span>I understand that this backup contains encrypted secret data.</span>
            </label>
            <label className="leaf-field">
              <span>Separate Passphrase</span>
              <input
                className="leaf-input"
                type="password"
                value={secretPassphrase}
                onChange={(event) => setSecretPassphrase(event.target.value)}
                placeholder="At least 12 characters"
                autoComplete="new-password"
              />
            </label>
          </section>
        ) : null}

        <div className="backup-create">
          <Button
            tone="primary"
            pending={creating}
            pendingLabel="Creating Backup"
            onClick={createBackup}
            disabled={!canCreate}
          >
            <Archive size={15} aria-hidden="true" />
            Create Backup
          </Button>
          {!canCreate && !creating ? (
            <p className="backup-create-hint">
              {levels.length === 0
                ? "Select at least one data level."
                : "Confirm secret data and enter a passphrase of at least 12 characters."}
            </p>
          ) : null}
        </div>

        <Disclosure
          title="Existing Backups"
          summary={`${backups.length} available`}
          defaultOpen
          storageKey="backup-system.existing-backups"
        >
          {backups.length === 0 ? (
            <p className="backup-empty">No backups found.</p>
          ) : (
            <ul className="backup-history">
              {backups.map((backup) => {
                const timestamp = new Date(backup.timestamp);

                return (
                  <li key={backup.filename} className="backup-history-row">
                    <strong className="backup-filename" title={backup.filename}>
                      {backup.filename}
                    </strong>
                    <span className="backup-size">{formatBytes(backup.size)}</span>
                    <time dateTime={timestamp.toISOString()}>{timestamp.toLocaleString()}</time>
                  </li>
                );
              })}
            </ul>
          )}
        </Disclosure>
      </div>
    </main>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <PanelErrorBoundary>
    <BackupControl />
  </PanelErrorBoundary>
);
