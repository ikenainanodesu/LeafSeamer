import type { EventEnvelope } from "../../../../shared/integration/types";

export type ScheduleScalar = string | number | boolean | null;

export interface ScheduleTriggerMapping {
  field: string;
  from?: ScheduleScalar;
  to?: ScheduleScalar;
}

export interface PlaylistItem {
  id: string;
  sourceId: string;
  externalId: string;
  revision: string;
  time: string;
  plannedAt: number | null;
  title: string;
  description: string;
  state: string;
  active: boolean;
  metadata: Record<string, ScheduleScalar>;
  triggerMappings: ScheduleTriggerMapping[];
}

export interface ScheduleImportBatch {
  importId: string;
  sourceId: string;
  sourceRevision: string;
  fetchedAt: number;
  items: PlaylistItem[];
}

export interface ScheduleImportPreview {
  batch: ScheduleImportBatch;
  added: string[];
  updated: string[];
  removed: string[];
  unchanged: string[];
  errors: string[];
}

export interface ScheduleCommitResult {
  items: PlaylistItem[];
  previousItems: PlaylistItem[];
  preview: ScheduleImportPreview;
}

export interface ScheduleEventPayload {
  itemId: string;
  sourceId: string;
  field?: string;
  previous?: ScheduleScalar;
  current?: ScheduleScalar;
}

export type ScheduleEvent = EventEnvelope<ScheduleEventPayload>;

export interface ScheduleImportStatus {
  lastImportId: string | null;
  sourceId: string | null;
  sourceRevision: string | null;
  committedAt: number | null;
  itemCount: number;
  error: string | null;
}
