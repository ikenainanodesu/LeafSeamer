import NodeCG from "nodecg/types";
import type { ScheduleManagerApi } from "../../schedule-manager/extension/schedule-service";
import { transformPostgresRows, type PostgresScheduleRow } from "./transform";
import {
  executeReadOnlyScheduleQuery,
  validateReadOnlyScheduleQuery,
  type ReadOnlyQueryClient,
} from "./read-only-query";

interface PostgresPool {
  connect(): Promise<ReadOnlyQueryClient>;
}

interface PostgresPoolConstructor {
  new (options: { connectionString: string }): PostgresPool;
}

// pg 在部署安装时解析；本地类型边界避免 Adapter 合同依赖其内部类型。
const { Pool } = require("pg") as { Pool: PostgresPoolConstructor };

interface PostgresConfig {
  connectionStringEnv: string;
  query: string;
  sourceId?: string;
  pollIntervalMs?: number;
  statementTimeoutMs?: number;
}

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const config = (nodecg.bundleConfig as { postgresql?: PostgresConfig })
    ?.postgresql;
  if (!config) {
    nodecg.log.warn("[ScheduleAdapterPostgreSQL] Configuration missing");
    return;
  }
  const queryError = validateReadOnlyScheduleQuery(config.query);
  if (queryError) {
    nodecg.log.error("[ScheduleAdapterPostgreSQL] %s", queryError);
    return;
  }
  const connectionString = process.env[config.connectionStringEnv];
  if (!connectionString) {
    nodecg.log.error(
      "[ScheduleAdapterPostgreSQL] Environment variable %s is missing",
      config.connectionStringEnv
    );
    return;
  }

  const scheduleManager = nodecg.extensions[
    "schedule-manager"
  ] as ScheduleManagerApi;
  const pool = new Pool({ connectionString });
  const sourceId = config.sourceId || "postgresql";
  const poll = async () => {
    try {
      const rows = await executeReadOnlyScheduleQuery<PostgresScheduleRow>(
        pool,
        config.query,
        config.statementTimeoutMs || 10_000
      );
      const fetchedAt = Date.now();
      const batch = transformPostgresRows(rows, {
        sourceId,
        sourceRevision: String(fetchedAt),
        fetchedAt,
      });
      scheduleManager.commitImport(batch);
      nodecg.log.info(
        "[ScheduleAdapterPostgreSQL] Committed %d items",
        batch.items.length
      );
    } catch (error) {
      nodecg.log.error(
        "[ScheduleAdapterPostgreSQL] Sync failed: %s",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  void poll();
  const timer = setInterval(
    () => void poll(),
    Math.max(5_000, config.pollIntervalMs || 60_000)
  );
  timer.unref();
};
