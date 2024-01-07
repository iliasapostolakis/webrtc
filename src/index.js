const logger = require("./service/common/logger");

const webServer = require("./service/server/web");
const webPort = process.env.PORT || 3000;

const socketServer = require("./service/server/socket");
const socketPort = process.env.SOCKET_PORT || 3001;

webServer.listen(webPort, () => {
  logger.info(`Web server listening on port ${webPort}`);
});

socketServer.listen(socketPort);
