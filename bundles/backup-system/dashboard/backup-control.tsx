/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface BackupFile {
  filename: string;
  timestamp: number;
  size: number;
}

const BackupControl = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const backupListRep = nodecg.Replicant<BackupFile[]>("backupList");
    backupListRep.on("change", (newVal: any) => {
      if (newVal) {
        setBackups(newVal);
      }
    });
  }, []);

  const handleCreateBackup = () => {
    setCreating(true);
    nodecg.sendMessage("createBackup", {}, (err: any, filename: any) => {
      setCreating(false);
      if (err) {
        console.error("Backup failed:", err);
        alert("Backup failed: " + err.message);
      } else {
        console.log("Backup created:", filename);
      }
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div style={{ padding: "20px" }}>
      <button
        onClick={handleCreateBackup}
        disabled={creating}
        style={{
          padding: "10px 20px",
          backgroundColor: creating ? "#666" : "#2196f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: creating ? "default" : "pointer",
          fontSize: "16px",
          marginBottom: "20px",
          width: "100%",
        }}
      >
        {creating ? "Creating Backup..." : "Create New Backup"}
      </button>

      <div
        style={{
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          padding: "10px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "10px",
            borderBottom: "1px solid #333",
            paddingBottom: "5px",
          }}
        >
          Existing Backups
        </h3>
        {backups.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", padding: "20px" }}>
            No backups found.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {backups.map((backup) => (
              <li
                key={backup.filename}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #333",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                    {backup.filename}
                  </div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>
                    {new Date(backup.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: "#ccc" }}>
                  {formatSize(backup.size)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<BackupControl />);
