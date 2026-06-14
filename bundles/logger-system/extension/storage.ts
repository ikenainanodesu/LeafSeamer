import * as fs from "fs";
import * as path from "path";
import * as async from "async";
import type { LogEntry } from "./logger";

export interface CleanupResult {
  deletedFiles: number;
  deletedLines: number;
}

type StorageTask =
  | { type: "write"; entry: LogEntry }
  | { type: "cleanup"; cutoff: number };

export class Storage {
  private logDir: string;
  private queue: async.QueueObject<StorageTask>;

  constructor() {
    this.logDir = path.join(__dirname, "../logs");

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 写入和清理共用单并发队列，防止清理时覆盖正在追加的日志。
    this.queue = async.queue<StorageTask>(async (task) => {
      if (task.type === "write") {
        await this.writeToFile(task.entry);
        return;
      }

      return this.cleanupFiles(task.cutoff);
    }, 1);
  }

  write(entry: LogEntry) {
    void this.queue.push<void>({ type: "write", entry });
  }

  cleanup(cutoff: number) {
    return this.queue.push<CleanupResult>({ type: "cleanup", cutoff });
  }

  private async writeToFile(entry: LogEntry) {
    const date = new Date(entry.timestamp);
    const dateStr = date.toISOString().split("T")[0];
    const filename = `leafseamer-${dateStr}.log`;
    const filePath = path.join(this.logDir, filename);

    const timeStr = date.toISOString().split("T")[1].replace("Z", "");
    const line = `[${timeStr}] [${entry.level.toUpperCase()}] [${entry.bundle}] [${entry.category}] ${entry.message}\n`;

    try {
      await fs.promises.appendFile(filePath, line);
    } catch (error) {
      // 避免存储失败再次进入日志采集器并形成递归写入。
      const message =
        error instanceof Error ? error.message : "Unknown storage error";
      process.stderr.write(
        `[logger-system] Failed to write log file: ${message}\n`
      );
    }
  }

  private async cleanupFiles(cutoff: number): Promise<CleanupResult> {
    const filenames = await fs.promises.readdir(this.logDir);
    const result: CleanupResult = {
      deletedFiles: 0,
      deletedLines: 0,
    };

    for (const filename of filenames) {
      if (!/^leafseamer-\d{4}-\d{2}-\d{2}\.log$/.test(filename)) {
        continue;
      }

      const filePath = path.join(this.logDir, filename);
      const content = await fs.promises.readFile(filePath, "utf8");
      const lines = content.split(/\r?\n/).filter((line) => line.length > 0);
      const retainedLines = lines.filter((line) => {
        const timestamp = this.parseLineTimestamp(filename, line);

        // 无法识别的旧格式行继续保留，避免自动清理误删数据。
        return timestamp === null || timestamp >= cutoff;
      });

      result.deletedLines += lines.length - retainedLines.length;

      if (retainedLines.length === 0) {
        await fs.promises.unlink(filePath);
        result.deletedFiles += 1;
        continue;
      }

      if (retainedLines.length !== lines.length) {
        await fs.promises.writeFile(
          filePath,
          `${retainedLines.join("\n")}\n`,
          "utf8"
        );
      }
    }

    return result;
  }

  private parseLineTimestamp(filename: string, line: string) {
    const dateMatch = filename.match(
      /^leafseamer-(\d{4}-\d{2}-\d{2})\.log$/
    );
    const timeMatch = line.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/);

    if (!dateMatch || !timeMatch) {
      return null;
    }

    const timestamp = Date.parse(`${dateMatch[1]}T${timeMatch[1]}Z`);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
}
