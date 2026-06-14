import { format } from "node:util";
const STATE = Symbol.for("leafseamer.logger.capture");
const PREFIX = /^\[([^\]\r\n]{1,80})\]\s*/;
// 本地桥保证 mixer-control 不依赖 logger-system。
export const ensureOptionalLogCapture = (LoggerConstructor: any) => {
  const prototype = LoggerConstructor.prototype;
  if (prototype[STATE]) return;
  const state: any = { buffer: [] };
  Object.defineProperty(prototype, STATE, { value: state });
  ["info", "warn", "error"].forEach((level) => {
    const original = prototype[level];
    prototype[level] = function (...args: unknown[]) {
      original.apply(this, args);
      const message = format(args[0], ...args.slice(1));
      const match = message.match(PREFIX);
      const entry = [level, this.name || "unknown", match?.[1] || "Runtime", match ? message.slice(match[0].length) : message];
      if (state.listener) state.listener(...entry);
      else state.buffer = [...state.buffer.slice(-199), entry];
    };
  });
};
