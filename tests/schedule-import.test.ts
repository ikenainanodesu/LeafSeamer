import {
  collectDueEvents,
  collectFieldChangeEvents,
  commitImport,
  previewImport,
  validateImportBatch,
} from "../bundles/schedule-manager/extension/schedule-import";
import type {
  PlaylistItem,
  ScheduleImportBatch,
} from "../bundles/schedule-manager/src/types/schedule.types";
import { deepEqual, equal, test } from "./test-harness";

const item = (overrides: Partial<PlaylistItem> = {}): PlaylistItem => ({
  id: "sheet:item-1",
  sourceId: "sheet",
  externalId: "item-1",
  revision: "1",
  time: "10:00",
  plannedAt: 1_000,
  title: "Opening",
  description: "",
  state: "ready",
  active: true,
  metadata: {},
  triggerMappings: [],
  ...overrides,
});

const batch = (items: PlaylistItem[]): ScheduleImportBatch => ({
  importId: "import-1",
  sourceId: "sheet",
  sourceRevision: "rev-1",
  fetchedAt: 900,
  items,
});

test("validates import batches and rejects duplicate external ids", () => {
  deepEqual(validateImportBatch(batch([item()])), []);
  const errors = validateImportBatch(
    batch([item(), item({ id: "sheet:item-2" })])
  );
  equal(errors.some((error) => error.includes("externalId")), true);
});

test("previews and commits one source without deleting local items", () => {
  const current = [
    item({ revision: "1", title: "Old" }),
    item({ id: "local:1", sourceId: "local", externalId: "1", title: "Local" }),
  ];
  const incoming = batch([
    item({ revision: "2", title: "Updated" }),
    item({ id: "sheet:item-2", externalId: "item-2", title: "New" }),
  ]);
  const preview = previewImport(current, incoming);

  deepEqual(preview.added, ["sheet:item-2"]);
  deepEqual(preview.updated, ["sheet:item-1"]);
  deepEqual(preview.removed, []);
  equal(commitImport(current, incoming).items.length, 3);
});

test("emits due events once and configured field transitions only", () => {
  const emitted = new Set<string>();
  const due = collectDueEvents([item()], 1_000, emitted);
  equal(due.length, 1);
  equal(collectDueEvents([item()], 2_000, emitted).length, 0);

  const previous = item({ state: "ready", triggerMappings: [{ field: "state", from: "ready", to: "on_air" }] });
  const next = item({ state: "on_air", triggerMappings: previous.triggerMappings });
  const events = collectFieldChangeEvents([previous], [next]);
  equal(events.length, 1);
  equal(events[0].event, "schedule.field_changed");
});

test("rejects invalid batches before commit", () => {
  const invalid = batch([item({ plannedAt: Number.NaN })]);
  equal(validateImportBatch(invalid).length > 0, true);
  equal(previewImport([], invalid).errors.length > 0, true);
});
