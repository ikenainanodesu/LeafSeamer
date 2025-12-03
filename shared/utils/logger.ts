import { LogLevel } from "../types/common.types";

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return `[${new Date().toISOString()}] [${this.context}] ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage(message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage(message), ...args);
  }
}

export const createLogger = (context: string) => new Logger(context);
