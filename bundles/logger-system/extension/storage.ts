import NodeCG from "nodecg/types";
import * as fs from "fs";
import * as path from "path";
import * as async from "async";
import { LogEntry } from "./logger";

export class Storage {
  private nodecg: NodeCG.ServerAPI;
  private logDir: string;
  private queue: async.QueueObject<LogEntry>;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.logDir = path.join(__dirname, "../logs");

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Create a queue with concurrency 1 to ensure sequential writes
    this.queue = async.queue((task: LogEntry, callback) => {
      this.writeToFile(task, callback);
    }, 1);
  }

  write(entry: LogEntry) {
    this.queue.push(entry);
  }

  private writeToFile(entry: LogEntry, callback: async.ErrorCallback) {
    const date = new Date(entry.timestamp);
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `leafseamer-${dateStr}.log`;
    const filePath = path.join(this.logDir, filename);

    const timeStr = date.toISOString().split("T")[1].replace("Z", "");
    const line = `[${timeStr}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}\n`;

    fs.appendFile(filePath, line, (err) => {
      if (err) {
        this.nodecg.log.error("Failed to write to log file", err);
      }
      callback(err || undefined);
    });
  }
}
