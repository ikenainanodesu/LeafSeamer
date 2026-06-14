import NodeCG from "nodecg/types";
import { format } from "node:util";
import { LogLevel } from "./logger";

type LogListener = (
  level: LogLevel,
  bundle: string,
  category: string,
  message: string
) => void;

interface CaptureState {
  listener: LogListener;
}

type CapturedLoggerPrototype = NodeCG.LoggerInterface & {
  [CAPTURE_STATE]?: CaptureState;
};

const CAPTURE_STATE = Symbol.for("leafseamer.logger.capture");
const CATEGORY_PREFIX = /^\[([^\]\r\n]{1,80})\]\s*/;

// 从日志正文开头提取分类，未提供分类时统一归入 Runtime。
const splitCategory = (message: string) => {
  const match = message.match(CATEGORY_PREFIX);

  if (!match) {
    return {
      category: "Runtime",
      message,
    };
  }

  return {
    category: match[1],
    message: message.slice(match[0].length),
  };
};

// 包装 NodeCG 公共 Logger 原型，使所有 bundle 的日志自动汇聚。
export const installLogCapture = (
  LoggerConstructor: new (name: string) => NodeCG.LoggerInterface,
  listener: LogListener
) => {
  const prototype = LoggerConstructor.prototype as CapturedLoggerPrototype;
  const existingState = prototype[CAPTURE_STATE];

  // 热重载时替换监听器，避免重复包装同一个 Logger 原型。
  if (existingState) {
    existingState.listener = listener;
    return;
  }

  const state: CaptureState = { listener };
  Object.defineProperty(prototype, CAPTURE_STATE, {
    configurable: false,
    enumerable: false,
    value: state,
    writable: false,
  });

  (["info", "warn", "error"] as const).forEach((level) => {
    const original = prototype[level];

    prototype[level] = function (...args: unknown[]) {
      original.apply(this, args);

      try {
        const formattedMessage = format(args[0], ...args.slice(1));
        const parsed = splitCategory(formattedMessage);
        state.listener(
          level,
          this.name || "unknown",
          parsed.category,
          parsed.message
        );
      } catch (error) {
        // 采集失败不能打断原始日志链路，也不能再次调用 NodeCG logger。
        process.stderr.write(
          `[logger-system] Failed to capture log: ${String(error)}\n`
        );
      }
    };
  });
};
