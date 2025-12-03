import NodeCG from "nodecg/types";
import { Storage } from "./storage";

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
}

export class Logger {
  private nodecg: NodeCG.ServerAPI;
  private storage: Storage;
  private recentLogsRep: any;

  constructor(nodecg: NodeCG.ServerAPI, storage: Storage) {
    this.nodecg = nodecg;
    this.storage = storage;
    this.recentLogsRep = nodecg.Replicant<LogEntry[]>("recentLogs", {
      defaultValue: [],
    });
  }

  log(level: "info" | "warn" | "error", category: string, message: string) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
    };

    // Update Replicant (Circular Buffer)
    const logs = this.recentLogsRep.value || [];
    logs.unshift(entry);
    if (logs.length > 100) {
      logs.pop();
    }
    this.recentLogsRep.value = logs;

    // Persist to storage
    this.storage.write(entry);

    // Also log to NodeCG console
    this.nodecg.log[level](`[${category}] ${message}`);
  }
}
