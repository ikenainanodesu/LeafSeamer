import NodeCG from "nodecg/types";
import { ScheduleManagerApi, ScheduleService } from "./schedule-service";
import { ensureOptionalLogCapture } from "./optional-log-capture";

module.exports = function (nodecg: NodeCG.ServerAPI): ScheduleManagerApi {
  ensureOptionalLogCapture(nodecg.Logger);
  nodecg.log.info("Starting Schedule Manager Bundle");

  return new ScheduleService(nodecg);
};
