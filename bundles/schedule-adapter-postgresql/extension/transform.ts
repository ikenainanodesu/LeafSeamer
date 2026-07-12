import type {
  PlaylistItem,
  ScheduleImportBatch,
} from "../../schedule-manager/src/types/schedule.types";

export interface PostgresScheduleRow {
  external_id: string | number;
  time?: string | null;
  title: string;
  description?: string | null;
  state?: string | null;
  active?: boolean | number | string | null;
  planned_at?: string | Date | null;
  revision?: string | number | null;
}

interface TransformOptions {
  sourceId: string;
  sourceRevision: string;
  fetchedAt: number;
}

export const transformPostgresRows = (
  rows: PostgresScheduleRow[],
  options: TransformOptions
): ScheduleImportBatch => ({
  importId: `${options.sourceId}:${options.sourceRevision}`,
  sourceId: options.sourceId,
  sourceRevision: options.sourceRevision,
  fetchedAt: options.fetchedAt,
  items: rows.map((row) => {
    const externalId = String(row.external_id);
    const plannedAt = row.planned_at
      ? new Date(row.planned_at).getTime()
      : null;
    return {
      id: `${options.sourceId}:${externalId}`,
      sourceId: options.sourceId,
      externalId,
      revision: String(row.revision ?? options.sourceRevision),
      time: String(row.time ?? ""),
      plannedAt:
        plannedAt !== null && Number.isFinite(plannedAt) ? plannedAt : null,
      title: String(row.title),
      description: String(row.description ?? ""),
      state: String(row.state ?? "ready"),
      active:
        row.active === true ||
        row.active === 1 ||
        String(row.active).toLowerCase() === "true",
      metadata: {},
      triggerMappings: [],
    } satisfies PlaylistItem;
  }),
});
