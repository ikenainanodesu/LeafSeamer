import NodeCG from "nodecg/types";

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  active: boolean;
}

export class ScheduleLoader {
  private nodecg: NodeCG.ServerAPI;
  private scheduleDataRep: any;
  private sheetDataRep: any;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.scheduleDataRep = nodecg.Replicant<ScheduleItem[]>("scheduleData", {
      defaultValue: [],
    });

    // Listen to sheetData from data-sync-service
    this.sheetDataRep = nodecg.Replicant("sheetData", "data-sync-service");

    this.sheetDataRep.on("change", (newVal: any) => {
      if (newVal && newVal.sheet1) {
        this.parseSheetData(newVal.sheet1);
      }
    });
  }

  private parseSheetData(rows: any[]) {
    // Assuming row structure: [Time, Title, Description, Active]
    // Skip header row if needed (simple check)

    const schedule: ScheduleItem[] = [];

    rows.forEach((row, index) => {
      if (index === 0 && row[0] === "Time") return; // Skip header

      if (row.length >= 2) {
        schedule.push({
          id: `item-${index}`,
          time: row[0] || "",
          title: row[1] || "",
          description: row[2] || "",
          active: row[3] === "TRUE" || row[3] === "true" || row[3] === true,
        });
      }
    });

    this.scheduleDataRep.value = schedule;
    this.nodecg.log.info(`Parsed ${schedule.length} schedule items`);
  }
}
