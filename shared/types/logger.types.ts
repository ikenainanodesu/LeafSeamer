export const LOG_CLEANUP_PERIODS = [
  { value: 0, label: "Cleanup: Off" },
  { value: 60 * 60 * 1000, label: "Keep 1 hour" },
  { value: 6 * 60 * 60 * 1000, label: "Keep 6 hours" },
  { value: 24 * 60 * 60 * 1000, label: "Keep 24 hours" },
  { value: 7 * 24 * 60 * 60 * 1000, label: "Keep 7 days" },
  { value: 30 * 24 * 60 * 60 * 1000, label: "Keep 30 days" },
] as const;

export type LogCleanupPeriodMs =
  (typeof LOG_CLEANUP_PERIODS)[number]["value"];

export const DEFAULT_LOG_CLEANUP_PERIOD_MS: LogCleanupPeriodMs = 0;
export const LOG_CLEANUP_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// 仅接受界面提供的固定周期，避免异常值导致日志被意外清空。
export const isLogCleanupPeriodMs = (
  value: number
): value is LogCleanupPeriodMs =>
  LOG_CLEANUP_PERIODS.some((period) => period.value === value);
