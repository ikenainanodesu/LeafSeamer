"use strict";
const fs = require("fs");
const path = require("path");
const async = require("async");
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
const async__namespace = /* @__PURE__ */ _interopNamespaceDefault(async);
class Logger {
  constructor(nodecg, storage) {
    this.nodecg = nodecg;
    this.storage = storage;
    this.recentLogsRep = nodecg.Replicant("recentLogs", {
      defaultValue: []
    });
  }
  log(level, category, message) {
    const entry = {
      timestamp: Date.now(),
      level,
      category,
      message
    };
    const logs = this.recentLogsRep.value || [];
    logs.unshift(entry);
    if (logs.length > 100) {
      logs.pop();
    }
    this.recentLogsRep.value = logs;
    this.storage.write(entry);
    this.nodecg.log[level](`[${category}] ${message}`);
  }
}
class Storage {
  constructor(nodecg) {
    this.nodecg = nodecg;
    this.logDir = path__namespace.join(__dirname, "../logs");
    if (!fs__namespace.existsSync(this.logDir)) {
      fs__namespace.mkdirSync(this.logDir, { recursive: true });
    }
    this.queue = async__namespace.queue((task, callback) => {
      this.writeToFile(task, callback);
    }, 1);
  }
  write(entry) {
    this.queue.push(entry);
  }
  writeToFile(entry, callback) {
    const date = new Date(entry.timestamp);
    const dateStr = date.toISOString().split("T")[0];
    const filename = `leafseamer-${dateStr}.log`;
    const filePath = path__namespace.join(this.logDir, filename);
    const timeStr = date.toISOString().split("T")[1].replace("Z", "");
    const line = `[${timeStr}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}
`;
    fs__namespace.appendFile(filePath, line, (err) => {
      if (err) {
        this.nodecg.log.error("Failed to write to log file", err);
      }
      callback(err || void 0);
    });
  }
}
module.exports = function(nodecg) {
  nodecg.log.info("Starting Logger System Bundle");
  const storage = new Storage(nodecg);
  const logger = new Logger(nodecg, storage);
  logger.log("info", "LoggerSystem", "Starting Logger System Bundle");
  return {
    log: (level, category, message) => {
      logger.log(level, category, message);
    }
  };
};
