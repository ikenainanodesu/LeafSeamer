import NodeCG from "nodecg/types";

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  active: boolean;
}

export interface ScheduleManagerApi {
  replaceSchedule: (items: ScheduleItem[]) => void;
}

export class ScheduleService implements ScheduleManagerApi {
  private readonly scheduleDataRep: NodeCG.ServerReplicant<ScheduleItem[]>;

  constructor(private readonly nodecg: NodeCG.ServerAPI) {
    this.scheduleDataRep = nodecg.Replicant<ScheduleItem[]>("scheduleData", {
      defaultValue: [],
    });

    nodecg.listenFor("replaceSchedule", (items: ScheduleItem[]) => {
      this.replaceSchedule(items);
    });
  }

  replaceSchedule(items: ScheduleItem[]): void {
    this.scheduleDataRep.value = items.map((item) => ({
      id: String(item.id),
      time: String(item.time || ""),
      title: String(item.title || ""),
      description: String(item.description || ""),
      active: Boolean(item.active),
    }));
    this.nodecg.log.info(
      "[ScheduleManager] Replaced schedule with %d items",
      items.length
    );
  }
}
