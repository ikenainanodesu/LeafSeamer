import NodeCG from "nodecg/types";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

export class GoogleSheetsClient {
  private nodecg: NodeCG.ServerAPI;
  private sheets: any;
  private spreadsheetId: string = "";
  private syncStatusRep: any;
  private sheetDataRep: any;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(nodecg: NodeCG.ServerAPI) {
    this.nodecg = nodecg;
    this.syncStatusRep = nodecg.Replicant("syncStatus", {
      defaultValue: { lastSync: 0, status: "idle", error: null },
    });
    this.sheetDataRep = nodecg.Replicant("sheetData", { defaultValue: {} });

    this.initializeClient();
  }

  private async initializeClient() {
    const config = (this.nodecg.bundleConfig as any)?.googleSheets;
    if (!config || !config.credentialsPath || !config.spreadsheetId) {
      this.nodecg.log.warn("Missing Google Sheets config");
      return;
    }

    this.spreadsheetId = config.spreadsheetId;
    const keyPath = path.isAbsolute(config.credentialsPath)
      ? config.credentialsPath
      : path.join(process.cwd(), config.credentialsPath);

    if (!fs.existsSync(keyPath)) {
      this.nodecg.log.error(`Credentials file not found at ${keyPath}`);
      return;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const authClient = await auth.getClient();
    this.sheets = google.sheets({ version: "v4", auth: authClient as any });
    this.nodecg.log.info("Google Sheets client initialized");
  }

  startPolling() {
    if (this.pollingInterval) return;

    // Initial fetch
    this.fetchData();

    // Poll every 60 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchData();
    }, 60000);
  }

  async fetchData() {
    if (!this.sheets) return;

    try {
      this.syncStatusRep.value = {
        ...this.syncStatusRep.value,
        status: "syncing",
      };

      // Example: Fetch 'Sheet1!A1:E10'
      // In a real app, ranges would be configurable
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Sheet1!A1:E10",
      });

      const rows = response.data.values;
      if (rows && rows.length) {
        this.sheetDataRep.value = { sheet1: rows };
        this.syncStatusRep.value = {
          lastSync: Date.now(),
          status: "success",
          error: null,
        };
        this.nodecg.log.info("Data synced from Google Sheets");
      } else {
        this.nodecg.log.info("No data found in sheet");
      }
    } catch (err: any) {
      this.nodecg.log.error("The API returned an error: " + err);
      this.syncStatusRep.value = {
        ...this.syncStatusRep.value,
        status: "error",
        error: err.message,
      };
    }
  }
}
