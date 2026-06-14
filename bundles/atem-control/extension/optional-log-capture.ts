import NodeCG from "nodecg/types";
import { format } from "node:util";

type Entry = [string, string, string, string];
interface CaptureState {
  listener?: (...entry: Entry) => void;
  buffer: Entry[];
}

const CAPTURE_STATE = Symbol.for("leafseamer.logger.capture");
const CATEGORY_PREFIX = /^\[([^\]\r\n]{1,80})\]\s*/;

// 在 logger-system 未加载时保留有限日志，业务功能不依赖日志系统。
export const ensureOptionalLogCapture = (
  LoggerConstructor: new (name: string) => NodeCG.LoggerInterface
) => {
  const prototype = LoggerConstructor.prototype as NodeCG.LoggerInterface & {
    [CAPTURE_STATE]?: CaptureState;
  };
  if (prototype[CAPTURE_STATE]) return;

  const state: CaptureState = { buffer: [] };
  Object.defineProperty(prototype, CAPTURE_STATE, { value: state });
  (["info", "warn", "error"] as const).forEach((level) => {
    const original = prototype[level];
    prototype[level] = function (...args: unknown[]) {
      original.apply(this, args);
      const formatted = format(args[0], ...args.slice(1));
      const match = formatted.match(CATEGORY_PREFIX);
      const entry: Entry = [
        level,
        this.name || "unknown",
        match?.[1] || "Runtime",
        match ? formatted.slice(match[0].length) : formatted,
      ];
      if (state.listener) state.listener(...entry);
      else state.buffer = [...state.buffer.slice(-199), entry];
    };
  });
};
