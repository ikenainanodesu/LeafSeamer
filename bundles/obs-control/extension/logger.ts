import NodeCG from "nodecg/types";

type LogLevel = "info" | "warn" | "error";

export class Logger {
  private nodecg?: NodeCG.ServerAPI;

  constructor(private readonly context: string) {}

  setNodeCG(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
  }

  private write(level: LogLevel, message: string, args: unknown[]) {
    if (!this.nodecg) {
      process.stderr.write(`[${this.context}] ${message}\n`);
      return;
    }
    this.nodecg.log[level](`[${this.context}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.write("info", message, args);
  }

  warn(message: string, ...args: unknown[]) {
    this.write("warn", message, args);
  }

  error(message: string, ...args: unknown[]) {
    this.write("error", message, args);
  }
}

export const createLogger = (context: string) => new Logger(context);
