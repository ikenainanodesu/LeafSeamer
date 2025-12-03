import NodeCG from "nodecg/types";
import { DataFetcher } from "./data-fetcher";
import { createLogger } from "../../../shared/utils/logger";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  const logger = createLogger("GraphicsPackage");
  logger.info("Starting Graphics Package Bundle");

  // Initialize Replicants
  nodecg.Replicant("graphicsData", {
    defaultValue: {
      lowerThird: {
        visible: false,
        line1: "Name",
        line2: "Title",
      },
      scoreboard: {
        visible: false,
        homeScore: 0,
        awayScore: 0,
      },
    },
  });

  const dataFetcher = new DataFetcher(nodecg);
};
