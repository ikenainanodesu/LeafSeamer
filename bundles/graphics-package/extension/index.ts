import NodeCG from "nodecg/types";
import { DataFetcher } from "./data-fetcher";
import { ensureOptionalLogCapture } from "./optional-log-capture";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  ensureOptionalLogCapture(nodecg.Logger);
  nodecg.log.info("[GraphicsPackage] Starting Graphics Package Bundle");

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
