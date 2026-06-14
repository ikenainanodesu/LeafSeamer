import NodeCG from "nodecg/types";
import type {
  ScheduleItem,
  ScheduleManagerApi,
} from "../../schedule-manager/extension/schedule-service";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const scheduleManager = nodecg.extension[
    "schedule-manager"
  ] as ScheduleManagerApi;
  const sheetDataRep = nodecg.Replicant<Record<string, unknown[][]>>(
    "sheetData",
    "data-sync-service"
  );

  sheetDataRep.on("change", (sheetData) => {
    const rows = sheetData?.sheet1;
    if (!Array.isArray(rows)) {
      return;
    }

    const schedule: ScheduleItem[] = rows.flatMap((row, index) => {
      if (index === 0 && row[0] === "Time") {
        return [];
      }
      if (row.length < 2) {
        return [];
      }

      return [
        {
          id: `sheet-item-${index}`,
          time: String(row[0] || ""),
          title: String(row[1] || ""),
          description: String(row[2] || ""),
          active:
            row[3] === true ||
            String(row[3]).toLowerCase() === "true",
        },
      ];
    });

    scheduleManager.replaceSchedule(schedule);
    nodecg.log.info(
      "[ScheduleAdapterGoogleSheets] Imported %d schedule items",
      schedule.length
    );
  });
};
