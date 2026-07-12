import type {
  PlaylistItem,
  ScheduleCommitResult,
  ScheduleEvent,
  ScheduleImportBatch,
  ScheduleImportPreview,
  ScheduleScalar,
} from "../src/types/schedule.types";

const itemKey = (item: PlaylistItem): string =>
  `${item.sourceId}:${item.externalId}`;

const isScalar = (value: unknown): value is ScheduleScalar =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

export const validateImportBatch = (
  batch: ScheduleImportBatch
): string[] => {
  const errors: string[] = [];
  if (!batch.importId || !batch.sourceId || !batch.sourceRevision) {
    errors.push("importId, sourceId and sourceRevision are required");
  }
  if (!Number.isFinite(batch.fetchedAt)) {
    errors.push("fetchedAt must be a finite timestamp");
  }

  const externalIds = new Set<string>();
  for (const item of batch.items) {
    if (item.sourceId !== batch.sourceId) {
      errors.push(`${item.id} sourceId does not match batch sourceId`);
    }
    if (!item.id || !item.externalId || !item.revision || !item.title) {
      errors.push(`${item.id || "item"} is missing required fields`);
    }
    if (externalIds.has(item.externalId)) {
      errors.push(`duplicate externalId ${item.externalId}`);
    }
    externalIds.add(item.externalId);
    if (item.plannedAt !== null && !Number.isFinite(item.plannedAt)) {
      errors.push(`${item.id} plannedAt must be null or a finite timestamp`);
    }
    if (!Object.values(item.metadata).every(isScalar)) {
      errors.push(`${item.id} metadata contains unsupported values`);
    }
  }
  return errors;
};

export const previewImport = (
  currentItems: PlaylistItem[],
  batch: ScheduleImportBatch
): ScheduleImportPreview => {
  const errors = validateImportBatch(batch);
  const currentSource = new Map(
    currentItems
      .filter((item) => item.sourceId === batch.sourceId)
      .map((item) => [itemKey(item), item])
  );
  const incoming = new Map(batch.items.map((item) => [itemKey(item), item]));
  const added: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];

  for (const item of batch.items) {
    const previous = currentSource.get(itemKey(item));
    if (!previous) {
      added.push(item.id);
    } else if (
      previous.revision !== item.revision ||
      JSON.stringify(previous) !== JSON.stringify(item)
    ) {
      updated.push(item.id);
    } else {
      unchanged.push(item.id);
    }
  }

  const removed = [...currentSource.entries()]
    .filter(([key]) => !incoming.has(key))
    .map(([, item]) => item.id);

  return { batch, added, updated, removed, unchanged, errors };
};

export const commitImport = (
  currentItems: PlaylistItem[],
  batch: ScheduleImportBatch
): ScheduleCommitResult => {
  const preview = previewImport(currentItems, batch);
  if (preview.errors.length > 0) {
    throw new Error(`Invalid schedule import: ${preview.errors.join("; ")}`);
  }

  return {
    previousItems: currentItems.map((item) => ({ ...item })),
    items: [
      ...currentItems.filter((item) => item.sourceId !== batch.sourceId),
      ...batch.items,
    ],
    preview,
  };
};

export const collectDueEvents = (
  items: PlaylistItem[],
  now: number,
  emittedKeys: Set<string>
): ScheduleEvent[] => {
  const events: ScheduleEvent[] = [];
  for (const item of items) {
    if (!item.active || item.plannedAt === null || item.plannedAt > now) {
      continue;
    }
    const key = `due:${item.id}:${item.revision}`;
    if (emittedKeys.has(key)) continue;
    emittedKeys.add(key);
    events.push({
      version: "1",
      event: "schedule.item_due",
      eventId: key,
      occurredAt: now,
      source: "schedule-manager",
      payload: { itemId: item.id, sourceId: item.sourceId },
    });
  }
  return events;
};

export const collectFieldChangeEvents = (
  previousItems: PlaylistItem[],
  nextItems: PlaylistItem[],
  occurredAt = Date.now()
): ScheduleEvent[] => {
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const events: ScheduleEvent[] = [];

  for (const item of nextItems) {
    const previous = previousById.get(item.id);
    if (!previous) continue;

    for (const mapping of item.triggerMappings) {
      const before = readField(previous, mapping.field);
      const after = readField(item, mapping.field);
      if (
        before === after ||
        (mapping.from !== undefined && before !== mapping.from) ||
        (mapping.to !== undefined && after !== mapping.to)
      ) {
        continue;
      }
      events.push({
        version: "1",
        event: "schedule.field_changed",
        eventId: `field:${item.id}:${mapping.field}:${item.revision}`,
        occurredAt,
        source: "schedule-manager",
        payload: {
          itemId: item.id,
          sourceId: item.sourceId,
          field: mapping.field,
          previous: before,
          current: after,
        },
      });
    }
  }
  return events;
};

const readField = (item: PlaylistItem, field: string): ScheduleScalar => {
  if (field in item.metadata) return item.metadata[field];
  const value = (item as unknown as Record<string, unknown>)[field];
  return isScalar(value) ? value : null;
};
