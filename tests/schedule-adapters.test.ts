import { transformSheetRows } from "../bundles/schedule-adapter-google-sheets/extension/transform";
import { transformPostgresRows } from "../bundles/schedule-adapter-postgresql/extension/transform";
import { scheduleManifest } from "../bundles/seamer-adapter-schedule/extension/manifest";
import { validateCapabilityManifest } from "../shared/integration/schema";
import { deepEqual, equal, test } from "./test-harness";

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
