/// <reference path="../../../shared/types/global.d.ts" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
}

const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const recentLogsRep = nodecg.Replicant<LogEntry[]>("recentLogs");
    recentLogsRep.on("change", (newVal: any) => {
      if (newVal) {
        setLogs(newVal);
      }
    });
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.category.toLowerCase().includes(filter.toLowerCase())
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "#f44336";
      case "warn":
        return "#ff9800";
      default:
        return "#4caf50";
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#424242",
            color: "white",
            border: "1px solid #666",
            borderRadius: "4px",
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          padding: "10px",
        }}
      >
        {filteredLogs.map((log, index) => (
          <div
            key={index}
            style={{
              marginBottom: "5px",
              fontFamily: "monospace",
              fontSize: "12px",
              borderBottom: "1px solid #333",
              paddingBottom: "2px",
            }}
          >
            <span style={{ color: "#888", marginRight: "10px" }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span
              style={{
                color: getLevelColor(log.level),
                fontWeight: "bold",
                marginRight: "10px",
                width: "50px",
                display: "inline-block",
              }}
            >
              [{log.level.toUpperCase()}]
            </span>
            <span style={{ color: "#aaa", marginRight: "10px" }}>
              [{log.category}]
            </span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<LogViewer />);
