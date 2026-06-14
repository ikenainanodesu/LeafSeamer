import NodeCG from "nodecg/types";
import { GoogleSheetsClient } from "./google-sheets-client";
import { ensureOptionalLogCapture } from "./optional-log-capture";

module.exports = function (nodecg: NodeCG.ServerAPI) {
  ensureOptionalLogCapture(nodecg.Logger);
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
