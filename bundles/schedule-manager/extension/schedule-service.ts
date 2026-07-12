import NodeCG from "nodecg/types";
import {
  collectDueEvents,
  collectFieldChangeEvents,
  commitImport as applyImport,
  previewImport as createPreview,
} from "./schedule-import";
import type {
  PlaylistItem,
  ScheduleEvent,
  ScheduleImportBatch,
  ScheduleImportPreview,
  ScheduleImportStatus,
} from "../src/types/schedule.types";

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  active: boolean;
}

export interface ScheduleManagerApi {
  replaceSchedule: (items: ScheduleItem[]) => void;
  previewImport: (batch: ScheduleImportBatch) => ScheduleImportPreview;
  commitImport: (batch: ScheduleImportBatch) => ScheduleImportPreview;
  rollbackImport: () => boolean;
}

const EMPTY_STATUS: ScheduleImportStatus = {
  lastImportId: null,
  sourceId: null,
  sourceRevision: null,
  committedAt: null,
  itemCount: 0,
  error: null,
};

export class ScheduleService implements ScheduleManagerApi {
  private readonly scheduleDataRep: NodeCG.ServerReplicant<PlaylistItem[]>;
  private readonly scheduleEventsRep: NodeCG.ServerReplicant<ScheduleEvent[]>;
  private readonly importStatusRep: NodeCG.ServerReplicant<ScheduleImportStatus>;
  private readonly emittedDueEvents = new Set<string>();
  private previousItems: PlaylistItem[] | null = null;

  constructor(private readonly nodecg: NodeCG.ServerAPI) {
    this.scheduleDataRep = nodecg.Replicant<PlaylistItem[]>("scheduleData", {
      defaultValue: [],
    });
    this.scheduleEventsRep = nodecg.Replicant<ScheduleEvent[]>(
      "scheduleEvents",
      { defaultValue: [], persistent: false }
    );
    this.importStatusRep = nodecg.Replicant<ScheduleImportStatus>(
      "scheduleImportStatus",
      { defaultValue: EMPTY_STATUS }
    );

    // 旧版本 Replicant 只有基础字段，启动时迁移为 local 来源项。
    if (
      (this.scheduleDataRep.value || []).some(
        (item) => !(item as PlaylistItem).sourceId
      )
    ) {
      this.replaceSchedule(
        this.scheduleDataRep.value as unknown as ScheduleItem[]
      );
    }

    nodecg.listenFor("replaceSchedule", (items: ScheduleItem[]) => {
      this.replaceSchedule(items);
    });
    nodecg.listenFor("previewScheduleImport", (batch: ScheduleImportBatch, ack) => {
      this.acknowledge(ack, () => this.previewImport(batch));
    });
    nodecg.listenFor("commitScheduleImport", (batch: ScheduleImportBatch, ack) => {
      this.acknowledge(ack, () => this.commitImport(batch));
    });
    nodecg.listenFor("rollbackScheduleImport", (_data, ack) => {
      this.acknowledge(ack, () => this.rollbackImport());
    });

    const dueTimer = setInterval(() => this.publishDueEvents(), 1000);
    dueTimer.unref();
  }

  replaceSchedule(items: ScheduleItem[]): void {
    const now = Date.now();
    this.commitImport({
      importId: `local-${now}`,
      sourceId: "local",
      sourceRevision: String(now),
      fetchedAt: now,
      items: items.map((item, index) => ({
        id: String(item.id),
        sourceId: "local",
        externalId: String(item.id || index),
        revision: String(now),
        time: String(item.time || ""),
        plannedAt: null,
        title: String(item.title || ""),
        description: String(item.description || ""),
        state: "ready",
        active: Boolean(item.active),
        metadata: {},
        triggerMappings: [],
      })),
    });
  }

  previewImport(batch: ScheduleImportBatch): ScheduleImportPreview {
    return createPreview(this.scheduleDataRep.value || [], batch);
  }

  commitImport(batch: ScheduleImportBatch): ScheduleImportPreview {
    const result = applyImport(this.scheduleDataRep.value || [], batch);
    this.previousItems = result.previousItems;
    this.scheduleDataRep.value = result.items;
    this.publishEvents(
      collectFieldChangeEvents(result.previousItems, result.items)
    );
    this.importStatusRep.value = {
      lastImportId: batch.importId,
      sourceId: batch.sourceId,
      sourceRevision: batch.sourceRevision,
      committedAt: Date.now(),
      itemCount: batch.items.length,
      error: null,
    };
    this.nodecg.log.info(
      "[ScheduleManager] Committed import %s from %s with %d items",
      batch.importId,
      batch.sourceId,
      batch.items.length
    );
    return result.preview;
  }

  rollbackImport(): boolean {
    if (!this.previousItems) return false;
    const current = this.scheduleDataRep.value || [];
    this.scheduleDataRep.value = this.previousItems;
    this.previousItems = current;
    this.importStatusRep.value = {
      ...(this.importStatusRep.value || EMPTY_STATUS),
      committedAt: Date.now(),
      itemCount: this.scheduleDataRep.value.length,
      error: null,
    };
    this.nodecg.log.info("[ScheduleManager] Rolled back latest import");
    return true;
  }

  private publishDueEvents(): void {
    this.publishEvents(
      collectDueEvents(
        this.scheduleDataRep.value || [],
        Date.now(),
        this.emittedDueEvents
      )
    );
  }

  private publishEvents(events: ScheduleEvent[]): void {
    if (events.length === 0) return;
    this.scheduleEventsRep.value = [
      ...events,
      ...(this.scheduleEventsRep.value || []),
    ].slice(0, 100);
  }

  private acknowledge(
    ack: any,
    operation: () => unknown
  ): void {
    try {
      const result = operation();
      if (typeof ack === "function" && !ack.handled) ack(null, result);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.importStatusRep.value = {
        ...(this.importStatusRep.value || EMPTY_STATUS),
        error: normalized.message,
      };
      if (typeof ack === "function" && !ack.handled) ack(normalized);
    }
  }
}
