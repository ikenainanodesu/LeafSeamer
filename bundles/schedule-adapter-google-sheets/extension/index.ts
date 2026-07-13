import NodeCG from "nodecg/types";
import type { ScheduleManagerApi } from "../../schedule-manager/extension/schedule-service";
import { transformSheetRows } from "./transform";

interface SyncStatus {
  lastSync: number;
  status: string;
  error: string | null;
}

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const scheduleManager = nodecg.extensions[
    "schedule-manager"
  ] as ScheduleManagerApi;
  const sheetDataRep = nodecg.Replicant<Record<string, unknown[][]>>(
    "sheetData",
    "data-sync-service"
  );
  const syncStatusRep = nodecg.Replicant<SyncStatus>(
    "syncStatus",
    "data-sync-service"
  );

  sheetDataRep.on("change", (sheetData) => {
    const rows = sheetData?.sheet1;
    if (!Array.isArray(rows)) return;

    const fetchedAt = syncStatusRep.value?.lastSync || Date.now();
    const batch = transformSheetRows(rows, {
      sourceId: "google-sheets",
      sourceRevision: String(fetchedAt),
      fetchedAt,
    });
    const preview = scheduleManager.commitImport(batch);
    nodecg.log.info(
      "[ScheduleAdapterGoogleSheets] Committed %d items (%d added, %d updated)",
      batch.items.length,
      preview.added.length,
      preview.updated.length
    );
  });
};
