import NodeCG from "nodecg/types";
import type { SeamerExtensionApi } from "../../seamer/src/types/seamer.types";
import type { ScheduleEvent } from "../../schedule-manager/src/types/schedule.types";
import { scheduleManifest } from "./manifest";

interface ScheduleIntegrationState {
  lastEvent: ScheduleEvent | null;
}

const matchesOptional = (expected: unknown, actual: unknown): boolean =>
  expected === undefined || expected === "" || String(expected) === String(actual);

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const seamer = nodecg.extensions["seamer"] as SeamerExtensionApi;
  const eventsRep = nodecg.Replicant<ScheduleEvent[]>(
    "scheduleEvents",
    "schedule-manager"
  );
  const getState = (): ScheduleIntegrationState => ({
    lastEvent: eventsRep.value?.[0] || null,
  });

  seamer.registerIntegration({
    manifest: scheduleManifest,
    initialState: getState(),
    evaluateTrigger: (capabilityId, parameters, nextValue, previousValue) => {
      const next = (nextValue as ScheduleIntegrationState).lastEvent;
      const previous = (previousValue as ScheduleIntegrationState).lastEvent;
      if (!next || next.eventId === previous?.eventId) return false;
      if (capabilityId === "item.due" && next.event !== "schedule.item_due") {
        return false;
      }
      if (
        capabilityId === "field.changed" &&
        next.event !== "schedule.field_changed"
      ) {
        return false;
      }
      return (
        matchesOptional(parameters.sourceId, next.payload.sourceId) &&
        matchesOptional(parameters.itemId, next.payload.itemId) &&
        matchesOptional(parameters.field, next.payload.field) &&
        matchesOptional(parameters.from, next.payload.previous) &&
        matchesOptional(parameters.to, next.payload.current)
      );
    },
    executeAction: async () => undefined,
  });

  eventsRep.on("change", () => {
    seamer.updateIntegrationState("schedule", getState());
  });
};
