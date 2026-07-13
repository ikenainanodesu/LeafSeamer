import { executeReadOnlyScheduleQuery } from "../bundles/schedule-adapter-postgresql/extension/read-only-query";
import {
  transformPostgresRows,
  type PostgresScheduleRow,
} from "../bundles/schedule-adapter-postgresql/extension/transform";
import { equal, test } from "./test-harness";

const connectionString = process.env.LEAFSEAMER_TEST_POSTGRES_URL;

if (connectionString) {
  test("imports a schedule batch through a live PostgreSQL read-only transaction", async () => {
    const { Pool } = require("pg") as {
      Pool: new (options: { connectionString: string }) => {
        connect(): Promise<any>;
        end(): Promise<void>;
      };
    };
    const pool = new Pool({ connectionString });
    try {
      const rows = await executeReadOnlyScheduleQuery<PostgresScheduleRow>(
        pool,
        `SELECT
          'live-row-1'::text AS external_id,
          '10:00'::text AS time,
          'Live PostgreSQL item'::text AS title,
          ''::text AS description,
          'ready'::text AS state,
          true AS active,
          '2026-07-13T10:00:00.000Z'::text AS planned_at,
          'live-rev-1'::text AS revision`,
        5_000
      );
      const batch = transformPostgresRows(rows, {
        sourceId: "postgresql-live-test",
        sourceRevision: "live-test-1",
        fetchedAt: Date.parse("2026-07-13T09:00:00.000Z"),
      });
      equal(batch.items.length, 1);
      equal(batch.items[0].externalId, "live-row-1");
      equal(batch.items[0].title, "Live PostgreSQL item");
    } finally {
      await pool.end();
    }
  });
}
