import NodeCG from "nodecg/types";
import {
  DEFAULT_LOG_CLEANUP_PERIOD_MS,
  isLogCleanupPeriodMs,
  LOG_CLEANUP_CHECK_INTERVAL_MS,
  LogCleanupPeriodMs,
} from "../src/types/logger.types";
import { installLogCapture } from "./log-capture";
import { Logger, LogLevel } from "./logger";
import { Storage } from "./storage";
import path from "node:path";
import {
  SQLiteAuditStore,
  type AuditInput,
  type AuditQuery,
} from "./audit-store";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const storage = new Storage();
  const logger = new Logger(nodecg, storage);
  let auditStore: SQLiteAuditStore | null = null;
  try {
    auditStore = new SQLiteAuditStore(
      path.join(process.cwd(), "db", "leafseamer-audit.sqlite")
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `[logger-system] Audit store disabled: ${message}\n`
    );
  }
  const cleanupPeriodRep = nodecg.Replicant<LogCleanupPeriodMs>(
    "logCleanupPeriodMs",
    {
      defaultValue: DEFAULT_LOG_CLEANUP_PERIOD_MS,
      persistent: true,
    }
  );
  const lastCleanupAtRep = nodecg.Replicant<number>("lastLogCleanupAt", {
    defaultValue: 0,
    persistent: false,
  });

  // 必须先安装采集器，再输出 logger-system 自身的启动日志。
  installLogCapture(nodecg.Logger, (level, bundle, category, message) => {
    logger.record(level, bundle, category, message);
  });

  nodecg.log.info("[LoggerSystem] Logger capture initialized");

  // 清理请求串行执行；周期变化时立即清理，定时检查时静默运行。
  let cleanupChain = Promise.resolve();
  const requestCleanup = (announceResult: boolean) => {
    cleanupChain = cleanupChain
      .catch(() => undefined)
      .then(async () => {
        const period = cleanupPeriodRep.value;

        if (!isLogCleanupPeriodMs(period) || period === 0) {
          return;
        }

        const result = await logger.cleanupOlderThan(Date.now() - period);
        lastCleanupAtRep.value = Date.now();

        if (announceResult) {
          nodecg.log.info(
            "[LoggerSystem] Auto cleanup applied: %d log lines and %d files removed",
            result.deletedLines,
            result.deletedFiles
          );
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown cleanup error";
        nodecg.log.error("[LoggerSystem] Auto cleanup failed: %s", message);
      });
  };

  cleanupPeriodRep.on("change", (newValue) => {
    if (!isLogCleanupPeriodMs(newValue)) {
      cleanupPeriodRep.value = DEFAULT_LOG_CLEANUP_PERIOD_MS;
      return;
    }

    requestCleanup(true);
  });

  const cleanupTimer = setInterval(() => {
    requestCleanup(false);
  }, LOG_CLEANUP_CHECK_INTERVAL_MS);

  // 定时器不应阻止 NodeCG 进程正常退出。
  cleanupTimer.unref();

  // 所有扩展加载完成后发布完整 bundle 清单，供前端下拉筛选。
  nodecg.on("extensionsLoaded", () => {
    logger.setAvailableBundles(Object.keys(nodecg.extension));
  });

  process.on("warning", (warning) => {
    nodecg.log.warn("[System] Process warning: %s", warning.stack);
  });

  return {
    // 保留旧扩展 API，调用方可显式提交带 bundle 来源的日志。
    log: (
      level: LogLevel,
      category: string,
      message: string,
      bundle = "external"
    ) => {
      logger.record(level, bundle, category, message);
    },
    audit: (event: AuditInput) => {
      if (!auditStore) throw new Error("Audit store is unavailable");
      auditStore.append(event);
    },
    queryAudit: (query: AuditQuery = {}) => auditStore?.query(query) ?? [],
  };
};
