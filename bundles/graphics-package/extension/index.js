"use strict";
class Logger {
  constructor(context) {
    this.context = context;
  }
  formatMessage(message) {
    return `[${(/* @__PURE__ */ new Date()).toISOString()}] [${this.context}] ${message}`;
  }
  info(message, ...args) {
    console.log(this.formatMessage(message), ...args);
  }
  warn(message, ...args) {
    console.warn(this.formatMessage(message), ...args);
  }
  error(message, ...args) {
    console.error(this.formatMessage(message), ...args);
  }
}
const createLogger = (context) => new Logger(context);
module.exports = function(nodecg) {
  const logger = createLogger("GraphicsPackage");
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
