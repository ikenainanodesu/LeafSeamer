import { transformSheetRows } from "../bundles/schedule-adapter-google-sheets/extension/transform";
import { transformPostgresRows } from "../bundles/schedule-adapter-postgresql/extension/transform";
import {
  executeReadOnlyScheduleQuery,
  validateReadOnlyScheduleQuery,
} from "../bundles/schedule-adapter-postgresql/extension/read-only-query";
import { scheduleManifest } from "../bundles/seamer-adapter-schedule/extension/manifest";
import { validateCapabilityManifest } from "../shared/integration/schema";
import { deepEqual, equal, rejects, test } from "./test-harness";

test("google sheets and postgresql produce the same playlist model", () => {
  const sheet = transformSheetRows(
    [
      ["ExternalId", "Time", "Title", "Description", "State", "Active", "PlannedAt", "Revision"],
      ["item-1", "10:00", "Opening", "Start", "ready", true, "2026-07-12T10:00:00Z", "2"],
    ],
    { sourceId: "playlist", sourceRevision: "source-2", fetchedAt: 100 }
  );
  const postgres = transformPostgresRows(
    [
      {
        external_id: "item-1",
        time: "10:00",
        title: "Opening",
        description: "Start",
        state: "ready",
        active: true,
        planned_at: "2026-07-12T10:00:00Z",
        revision: "2",
      },
    ],
    { sourceId: "playlist", sourceRevision: "source-2", fetchedAt: 100 }
  );

  deepEqual(sheet.items, postgres.items);
  equal(sheet.sourceId, "playlist");
});

test("schedule manifest exposes explicit trigger classes only", () => {
  deepEqual(validateCapabilityManifest(scheduleManifest), []);
  deepEqual(
    scheduleManifest.triggers.map((trigger) => trigger.id),
    ["item.due", "field.changed"]
  );
  equal(scheduleManifest.actions.length, 0);
});

test("runs PostgreSQL schedule imports inside a read-only transaction", async () => {
  const calls: string[] = [];
  const rows = [{ external_id: "row-1", time: "10:00", title: "Opening" }];
  const result = await executeReadOnlyScheduleQuery(
    {
      connect: async () => ({
        query: async (query: string) => {
          calls.push(query);
          return { rows: query.startsWith("SELECT") ? rows : [] };
        },
        release: () => calls.push("RELEASE"),
      }),
    },
    "SELECT external_id, time, title FROM playlist",
    5_000
  );

  deepEqual(result, rows);
  deepEqual(calls, [
    "BEGIN TRANSACTION READ ONLY",
    "SET LOCAL statement_timeout = 5000",
    "SELECT external_id, time, title FROM playlist",
    "COMMIT",
    "RELEASE",
  ]);
});

test("rolls back and releases PostgreSQL clients after query failure", async () => {
  const calls: string[] = [];
  await rejects(() =>
    executeReadOnlyScheduleQuery(
      {
        connect: async () => ({
          query: async (query: string) => {
            calls.push(query);
            if (query.startsWith("SELECT")) throw new Error("database failed");
            return { rows: [] };
          },
          release: () => calls.push("RELEASE"),
        }),
      },
      "SELECT external_id FROM playlist",
      5_000
    )
  );
  deepEqual(calls.slice(-2), ["ROLLBACK", "RELEASE"]);
});

test("rejects writable or multi-statement PostgreSQL schedule queries", () => {
  equal(validateReadOnlyScheduleQuery("SELECT * FROM playlist"), null);
  equal(validateReadOnlyScheduleQuery("UPDATE playlist SET active = true") !== null, true);
  equal(validateReadOnlyScheduleQuery("SELECT * FROM playlist; DELETE FROM playlist") !== null, true);
  equal(validateReadOnlyScheduleQuery("SELECT * FROM playlist FOR UPDATE") !== null, true);
});
