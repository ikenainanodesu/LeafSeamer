import NodeCG from "nodecg/types";
import { Storage, type CleanupResult } from "./storage";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  bundle: string;
  category: string;
  message: string;
}

const MAX_RECENT_LOGS = 500;

export class Logger {
  private storage: Storage;
  private recentLogsRep: NodeCG.ServerReplicant<LogEntry[]>;
  private availableBundlesRep: NodeCG.ServerReplicant<string[]>;

  constructor(nodecg: NodeCG.ServerAPI, storage: Storage) {
    this.storage = storage;
    this.recentLogsRep = nodecg.Replicant<LogEntry[]>("recentLogs", {
      defaultValue: [],
    });
    this.availableBundlesRep = nodecg.Replicant<string[]>("availableBundles", {
      defaultValue: [],
    });
  }

  // 将日志写入共享 Replicant 和按日期存储的日志文件。
  record(
    level: LogLevel,
    bundle: string,
    category: string,
    message: string
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      bundle,
      category,
      message,
    };

    const logs = this.recentLogsRep.value ?? [];
    this.recentLogsRep.value = [entry, ...logs].slice(0, MAX_RECENT_LOGS);
    this.storage.write(entry);
  }

  // 发布可筛选的 bundle 清单，日志中临时出现的来源仍会由前端补充。
  setAvailableBundles(bundleNames: string[]) {
    this.availableBundlesRep.value = [...new Set(bundleNames)].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  // 同时清理内存日志和磁盘日志，确保界面与持久化文件使用同一保留周期。
  async cleanupOlderThan(cutoff: number): Promise<CleanupResult> {
    const logs = this.recentLogsRep.value ?? [];
    const retainedLogs = logs.filter((log) => log.timestamp >= cutoff);
    const deletedRecentLogs = logs.length - retainedLogs.length;

    if (deletedRecentLogs > 0) {
      this.recentLogsRep.value = retainedLogs;
    }

    const storageResult = await this.storage.cleanup(cutoff);
    return {
      deletedFiles: storageResult.deletedFiles,
      deletedLines: storageResult.deletedLines + deletedRecentLogs,
    };
  }
}
