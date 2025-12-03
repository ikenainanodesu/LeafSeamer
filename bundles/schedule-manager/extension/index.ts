import NodeCG from "nodecg/types";
import { ScheduleLoader } from "./schedule-loader";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Schedule Manager Bundle");

  const scheduleLoader = new ScheduleLoader(nodecg);
};
