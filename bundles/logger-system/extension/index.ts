import NodeCG from "nodecg/types";
import { Logger } from "./logger";
import { Storage } from "./storage";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Logger System Bundle");

  const storage = new Storage(nodecg);
  const logger = new Logger(nodecg, storage);

  // Expose logger to other bundles via extensions API or event listener
  // For now, we listen for a 'logMessage' event
  nodecg.listenFor("logMessage", (data: any) => {
    logger.log(data.level, data.category, data.message);
  });
};
