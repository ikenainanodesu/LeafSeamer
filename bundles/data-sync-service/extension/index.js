"use strict";
const googleapis = require("googleapis");
const fs = require("fs");
const path = require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
class GoogleSheetsClient {
  constructor(nodecg) {
    this.spreadsheetId = "";
    this.pollingInterval = null;
    this.nodecg = nodecg;
    this.syncStatusRep = nodecg.Replicant("syncStatus", {
      defaultValue: { lastSync: 0, status: "idle", error: null }
    });
    this.sheetDataRep = nodecg.Replicant("sheetData", { defaultValue: {} });
    this.initializeClient();
  }
  async initializeClient() {
    var _a;
    const config = (_a = this.nodecg.bundleConfig) == null ? void 0 : _a.googleSheets;
    if (!config || !config.credentialsPath || !config.spreadsheetId) {
      this.nodecg.log.warn("Missing Google Sheets config");
      return;
    }
    this.spreadsheetId = config.spreadsheetId;
    const keyPath = path__namespace.isAbsolute(config.credentialsPath) ? config.credentialsPath : path__namespace.join(process.cwd(), config.credentialsPath);
    if (!fs__namespace.existsSync(keyPath)) {
      this.nodecg.log.error(`Credentials file not found at ${keyPath}`);
      return;
    }
    const auth = new googleapis.google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    const authClient = await auth.getClient();
    this.sheets = googleapis.google.sheets({ version: "v4", auth: authClient });
    this.nodecg.log.info("Google Sheets client initialized");
  }
  startPolling() {
    if (this.pollingInterval) return;
    this.fetchData();
    this.pollingInterval = setInterval(() => {
      this.fetchData();
    }, 6e4);
  }
  async fetchData() {
    if (!this.sheets) return;
    try {
      this.syncStatusRep.value = {
        ...this.syncStatusRep.value,
        status: "syncing"
      };
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Sheet1!A1:E10"
      });
      const rows = response.data.values;
      if (rows && rows.length) {
        this.sheetDataRep.value = { sheet1: rows };
        this.syncStatusRep.value = {
          lastSync: Date.now(),
          status: "success",
          error: null
        };
        this.nodecg.log.info("Data synced from Google Sheets");
      } else {
        this.nodecg.log.info("No data found in sheet");
      }
    } catch (err) {
      this.nodecg.log.error("The API returned an error: " + err);
      this.syncStatusRep.value = {
        ...this.syncStatusRep.value,
        status: "error",
        error: err.message
      };
    }
  }
}
module.exports = function(nodecg) {
  nodecg.log.info("Starting Data Sync Service Bundle");
  const client = new GoogleSheetsClient(nodecg);
  if (nodecg.bundleConfig && nodecg.bundleConfig.googleSheets) {
    client.startPolling();
  } else {
    nodecg.log.warn(
      "Google Sheets configuration missing. Data sync will not run."
    );
  }
};
