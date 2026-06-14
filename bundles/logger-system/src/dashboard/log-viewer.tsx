/// <reference path="../../../../shared/types/global.d.ts" />
import {
  LOG_CLEANUP_PERIODS,
  LogCleanupPeriodMs,
  isLogCleanupPeriodMs,
} from "@shared/types/logger.types";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./log-viewer.css";

type LogLevel = "info" | "warn" | "error";
type LevelFilter = "all" | LogLevel;

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  bundle?: string;
  category: string;
  message: string;
}

interface LevelOption {
  value: LevelFilter;
  label: string;
}

// 级别选项保持固定顺序，方便快速定位严重日志。
const LEVEL_OPTIONS: LevelOption[] = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

const getBundleName = (log: LogEntry) => log.bundle?.trim() || "legacy";

// 使用稳定的时间格式，避免不同日志行宽度频繁跳动。
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [availableBundles, setAvailableBundles] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [bundleFilter, setBundleFilter] = useState("all");
  const [cleanupPeriodMs, setCleanupPeriodMs] =
    useState<LogCleanupPeriodMs>(0);
  const [lastCleanupAt, setLastCleanupAt] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const recentLogsRep = nodecg.Replicant<LogEntry[]>("recentLogs");
    const availableBundlesRep =
      nodecg.Replicant<string[]>("availableBundles");
    const cleanupPeriodRep =
      nodecg.Replicant<LogCleanupPeriodMs>("logCleanupPeriodMs");
    const lastCleanupAtRep = nodecg.Replicant<number>("lastLogCleanupAt");

    const handleLogsChange = (newValue: LogEntry[] | undefined) => {
      setLogs(newValue ?? []);
    };
    const handleBundlesChange = (newValue: string[] | undefined) => {
      setAvailableBundles(newValue ?? []);
    };
    const handleCleanupPeriodChange = (
      newValue: LogCleanupPeriodMs | undefined
    ) => {
      if (newValue !== undefined && isLogCleanupPeriodMs(newValue)) {
        setCleanupPeriodMs(newValue);
      }
    };
    const handleLastCleanupChange = (newValue: number | undefined) => {
      setLastCleanupAt(newValue ?? 0);
    };

    recentLogsRep.on("change", handleLogsChange);
    availableBundlesRep.on("change", handleBundlesChange);
    cleanupPeriodRep.on("change", handleCleanupPeriodChange);
    lastCleanupAtRep.on("change", handleLastCleanupChange);

    return () => {
      recentLogsRep.removeListener("change", handleLogsChange);
      availableBundlesRep.removeListener("change", handleBundlesChange);
      cleanupPeriodRep.removeListener("change", handleCleanupPeriodChange);
      lastCleanupAtRep.removeListener("change", handleLastCleanupChange);
    };
  }, []);

  const updateCleanupPeriod = (value: number) => {
    if (!isLogCleanupPeriodMs(value)) {
      return;
    }

    // 先更新界面，再由持久化 Replicant 同步到后端执行清理。
    setCleanupPeriodMs(value);
    nodecg.Replicant<LogCleanupPeriodMs>("logCleanupPeriodMs").value = value;
  };

  // 统计值从日志直接派生，避免维护重复状态。
  const levelCounts = useMemo(
    () =>
      logs.reduce(
        (counts, log) => {
          counts[log.level] += 1;
          return counts;
        },
        { info: 0, warn: 0, error: 0 }
      ),
    [logs]
  );

  // 合并后端清单和日志来源，保证历史来源也能出现在筛选器中。
  const bundleOptions = useMemo(() => {
    const bundleNames = new Set(availableBundles);

    logs.forEach((log) => {
      const bundleName = getBundleName(log);
      const isCompatibleSource =
        availableBundles.length === 0 ||
        availableBundles.includes(bundleName) ||
        bundleName === "legacy" ||
        bundleName === "external";

      if (isCompatibleSource) {
        bundleNames.add(bundleName);
      }
    });

    return [...bundleNames].sort((a, b) => a.localeCompare(b));
  }, [availableBundles, logs]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return logs.filter((log) => {
      const bundleName = getBundleName(log);
      const matchesLevel =
        levelFilter === "all" || log.level === levelFilter;
      const matchesBundle =
        bundleFilter === "all" || bundleName === bundleFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        log.message.toLowerCase().includes(normalizedQuery) ||
        log.category.toLowerCase().includes(normalizedQuery) ||
        bundleName.toLowerCase().includes(normalizedQuery);

      return matchesLevel && matchesBundle && matchesQuery;
    });
  }, [bundleFilter, deferredQuery, levelFilter, logs]);

  const hasActiveFilters =
    query.length > 0 || levelFilter !== "all" || bundleFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setLevelFilter("all");
    setBundleFilter("all");
  };

  return (
    <main className="log-viewer">
      <header className="viewer-header">
        <div>
          <h1 className="viewer-title">Runtime logs</h1>
          <p className="viewer-subtitle">
            <span className="live-indicator" aria-hidden="true" />
            Live feed
            <span className="viewer-subtitle-divider" aria-hidden="true">
              /
            </span>
            {logs.length} events
          </p>
        </div>

        <div className="level-summary" aria-label="Log level summary">
          <span className="summary-item summary-item--info">
            <strong>{levelCounts.info}</strong>
            Info
          </span>
          <span className="summary-item summary-item--warn">
            <strong>{levelCounts.warn}</strong>
            Warn
          </span>
          <span className="summary-item summary-item--error">
            <strong>{levelCounts.error}</strong>
            Error
          </span>
        </div>
      </header>

      <section className="viewer-tools" aria-label="Log filters">
        <div className="filter-primary-row">
          <div className="search-control">
            <label className="sr-only" htmlFor="log-search">
              Search logs
            </label>
            <input
              id="log-search"
              className="search-input"
              type="search"
              placeholder="Search logs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.length > 0 ? (
              <button
                className="search-clear"
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="bundle-filter-control">
            <label className="sr-only" htmlFor="bundle-filter">
              Filter by bundle
            </label>
            <select
              id="bundle-filter"
              className="bundle-filter-select"
              value={bundleFilter}
              onChange={(event) => setBundleFilter(event.target.value)}
            >
              <option value="all">All bundles</option>
              {bundleOptions.map((bundleName) => (
                <option key={bundleName} value={bundleName}>
                  {bundleName}
                </option>
              ))}
            </select>
          </div>

          <div className="cleanup-filter-control">
            <label className="sr-only" htmlFor="cleanup-period">
              Automatic cleanup period
            </label>
            <select
              id="cleanup-period"
              className="cleanup-period-select"
              value={cleanupPeriodMs}
              title="Automatic cleanup period"
              onChange={(event) =>
                updateCleanupPeriod(Number(event.target.value))
              }
            >
              {LOG_CLEANUP_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="level-filter" role="group" aria-label="Filter by level">
          {LEVEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`level-filter-button level-filter-button--${option.value}`}
              type="button"
              aria-pressed={levelFilter === option.value}
              onClick={() => setLevelFilter(option.value)}
            >
              {option.value !== "all" ? (
                <span className="level-dot" aria-hidden="true" />
              ) : null}
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="log-surface" aria-label="Log entries">
        {filteredLogs.length > 0 ? (
          <div className="log-list" role="log" aria-live="polite">
            {filteredLogs.map((log, index) => (
              <article
                className={`log-entry log-entry--${log.level}`}
                key={`${log.timestamp}-${getBundleName(log)}-${log.category}-${index}`}
              >
                <div className="log-entry-meta">
                  <time
                    className="log-time"
                    dateTime={new Date(log.timestamp).toISOString()}
                    title={new Date(log.timestamp).toLocaleString()}
                  >
                    {timeFormatter.format(log.timestamp)}
                  </time>
                  <span className={`level-badge level-badge--${log.level}`}>
                    {LEVEL_LABELS[log.level]}
                  </span>
                  <span className="log-origin">
                    <span
                      className="log-bundle"
                      title={`Bundle: ${getBundleName(log)}`}
                    >
                      {getBundleName(log)}
                    </span>
                    <span className="log-category" title={log.category}>
                      {log.category}
                    </span>
                  </span>
                </div>
                <p className="log-message">{log.message}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-mark" aria-hidden="true">
              {hasActiveFilters ? "0" : "..."}
            </div>
            <h2>{hasActiveFilters ? "No matching logs" : "Waiting for logs"}</h2>
            <p>
              {hasActiveFilters
                ? "Try another search term or reset the filters."
                : "New runtime events will appear here automatically."}
            </p>
            {hasActiveFilters ? (
              <button
                className="empty-state-action"
                type="button"
                onClick={clearFilters}
              >
                Reset filters
              </button>
            ) : null}
          </div>
        )}
      </section>

      <footer className="viewer-footer">
        <span>
          Showing <strong>{filteredLogs.length}</strong> of{" "}
          <strong>{logs.length}</strong>
        </span>
        <span aria-live="polite">
          {cleanupPeriodMs === 0
            ? "Auto cleanup off"
            : lastCleanupAt > 0
              ? `Cleaned ${timeFormatter.format(lastCleanupAt)}`
              : "Cleanup pending"}
        </span>
      </footer>
    </main>
  );
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Log viewer root element was not found.");
}

const root = createRoot(rootElement);
root.render(<LogViewer />);
