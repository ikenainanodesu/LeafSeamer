import NodeCG from "nodecg/types";

type LogLevel = "info" | "warn" | "error";

export class Logger {
  private context: string;
  private nodecg?: NodeCG.ServerAPI;

  constructor(context: string) {
    this.context = context;
  }

  setNodeCG(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
  }

  // 统一交给 NodeCG logger 输出，logger-system 会从公共 Logger 原型采集。
  private write(level: LogLevel, message: string, args: unknown[]) {
    if (!this.nodecg) {
      process.stderr.write(
        `[${this.context}] Logger used before NodeCG initialization: ${message}\n`
      );
      return;
    }

    this.nodecg.log[level](`[${this.context}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.write("info", message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write("warn", message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write("error", message, args);
  }
}

export const createLogger = (context: string) => new Logger(context);
