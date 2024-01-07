
const pino = require('pino');

const options = {
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level(level) {
        return { level }
      },
    },
    messageKey: "message",
  }
  
const logger = pino(options);

module.exports = logger;
