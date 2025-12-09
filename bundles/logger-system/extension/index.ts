import NodeCG from "nodecg/types";
import { Logger } from "./logger";
import { Storage } from "./storage";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Logger System Bundle");
  const storage = new Storage(nodecg);
  const logger = new Logger(nodecg, storage);

  logger.log("info", "LoggerSystem", "Starting Logger System Bundle");

  // Expose logger to other bundles via extensions API
  // This allows other bundles (server-side) to call nodecg.extensions['logger-system'].log(...)
  return {
    log: (
      level: "info" | "warn" | "error",
      category: string,
      message: string
    ) => {
      logger.log(level, category, message);
    },
  };
};
