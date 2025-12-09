import { LogLevel } from "../types/common.types";

export class Logger {
  private context: string;

  private nodecg: any;

  constructor(context: string) {
    this.context = context;
  }

  setNodeCG(nodecg: any) {
    this.nodecg = nodecg;
  }

  private formatMessage(message: string): string {
    return `[${new Date().toISOString()}] [${this.context}] ${message}`;
  }

  private logToBundle(
    level: "info" | "warn" | "error",
    message: string,
    args: any[]
  ) {
    if (
      this.nodecg &&
      this.nodecg.extensions &&
      this.nodecg.extensions["logger-system"]
    ) {
      try {
        const loggerBundle = this.nodecg.extensions["logger-system"] as any;
        const argString = args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" ");
        const fullMessage =
          args.length > 0 ? `${message} ${argString}` : message;
        // Don't log if logger-system is not ready or if it fails
        loggerBundle.log(level, this.context, fullMessage);
      } catch (e) {
        // Silent failure to avoid breaking app if logging fails
      }
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage(message), ...args);
    this.logToBundle("info", message, args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(message), ...args);
    this.logToBundle("warn", message, args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage(message), ...args);
    this.logToBundle("error", message, args);
  }
}

export const createLogger = (context: string) => new Logger(context);
