"use strict";
class Logger {
  constructor(context) {
    this.context = context;
  }
  setNodeCG(nodecg) {
    this.nodecg = nodecg;
  }
  formatMessage(message) {
    return `[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.context}] ${message}`;
  }
  logToBundle(level, message, args) {
    if (this.nodecg && this.nodecg.extensions && this.nodecg.extensions["logger-system"]) {
      try {
        const loggerBundle = this.nodecg.extensions["logger-system"];
        const argString = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
        const fullMessage = args.length > 0 ? `${message} ${argString}` : message;
        loggerBundle.log(level, this.context, fullMessage);
      } catch (e) {
      }
    }
  }
  info(message, ...args) {
    console.log(this.formatMessage(message), ...args);
    this.logToBundle("info", message, args);
  }
  warn(message, ...args) {
    console.warn(this.formatMessage(message), ...args);
    this.logToBundle("warn", message, args);
  }
  error(message, ...args) {
    console.error(this.formatMessage(message), ...args);
    this.logToBundle("error", message, args);
  }
}
const createLogger = (context) => new Logger(context);
module.exports = function(nodecg) {
  const logger = createLogger("GraphicsPackage");
  logger.setNodeCG(nodecg);
  logger.info("Starting Graphics Package Bundle");
  nodecg.Replicant("graphicsData", {
    defaultValue: {
      lowerThird: {
        visible: false,
        line1: "Name",
        line2: "Title"
      },
      scoreboard: {
        visible: false,
        homeScore: 0,
        awayScore: 0
      }
    }
  });
};
