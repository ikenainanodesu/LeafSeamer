"use strict";
class ScheduleLoader {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.scheduleDataRep = nodecg.Replicant("scheduleData", {
      defaultValue: []
    });
    this.sheetDataRep = nodecg.Replicant("sheetData", "data-sync-service");
    this.sheetDataRep.on("change", (newVal) => {
      if (newVal && newVal.sheet1) {
        this.parseSheetData(newVal.sheet1);
      }
    });
  }
  parseSheetData(rows) {
    const schedule = [];
    rows.forEach((row, index) => {
      if (index === 0 && row[0] === "Time") return;
      if (row.length >= 2) {
        schedule.push({
          id: `item-${index}`,
          time: row[0] || "",
          title: row[1] || "",
          description: row[2] || "",
          active: row[3] === "TRUE" || row[3] === "true" || row[3] === true
        });
      }
    });
    this.scheduleDataRep.value = schedule;
    this.nodecg.log.info(`Parsed ${schedule.length} schedule items`);
  }
}
module.exports = function(nodecg) {
  nodecg.log.info("Starting Schedule Manager Bundle");
  new ScheduleLoader(nodecg);
};
