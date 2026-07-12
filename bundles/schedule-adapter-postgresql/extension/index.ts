import NodeCG from "nodecg/types";
import type { ScheduleManagerApi } from "../../schedule-manager/extension/schedule-service";
import { transformPostgresRows, type PostgresScheduleRow } from "./transform";

interface QueryResult<T> {
  rows: T[];
}

interface PostgresPool {
  query<T>(query: string): Promise<QueryResult<T>>;
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
}

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const config = (nodecg.bundleConfig as { postgresql?: PostgresConfig })
    ?.postgresql;
  if (!config) {
    nodecg.log.warn("[ScheduleAdapterPostgreSQL] Configuration missing");
    return;
  }
  if (!/^\s*select\b/i.test(config.query) || config.query.includes(";")) {
    nodecg.log.error("[ScheduleAdapterPostgreSQL] Query must be one SELECT statement");
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

  const scheduleManager = nodecg.extension[
    "schedule-manager"
  ] as ScheduleManagerApi;
  const pool = new Pool({ connectionString });
  const sourceId = config.sourceId || "postgresql";
  const poll = async () => {
    try {
      const result = await pool.query<PostgresScheduleRow>(config.query);
      const fetchedAt = Date.now();
      const batch = transformPostgresRows(result.rows, {
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
