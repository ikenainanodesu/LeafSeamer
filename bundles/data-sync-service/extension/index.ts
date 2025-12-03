import NodeCG from "nodecg/types";
import { GoogleSheetsClient } from "./google-sheets-client";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  nodecg.log.info("Starting Data Sync Service Bundle");

  const client = new GoogleSheetsClient(nodecg);

  // Start polling if configured
  if (nodecg.bundleConfig && (nodecg.bundleConfig as any).googleSheets) {
    client.startPolling();
  } else {
    nodecg.log.warn(
      "Google Sheets configuration missing. Data sync will not run."
    );
  }
};
