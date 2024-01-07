const { Server } = require("socket.io");
const logger = require("../common/logger");
const db = require("../common/database");

const server = new Server({
  serveClient: false,
  cors: {
    origin: "*",
  },
});

server.on("connection", (socket) => {
  logger.info(`Socket ${socket.id} connected`);

  socket.on("join", ({ roomId, clientId }) => {
    logger.info(
      `Socket ${socket.id} trying to join room ${roomId} on client ${clientId}`
    );
    const sql = "SELECT * FROM rooms WHERE id = ?";
    db.get(sql, [roomId], (err, row) => {
      if (!err && row) {
        socket.clientId = clientId;
        socket.roomId = roomId;
        const participants = JSON.parse(row.participants);
        const participant = participants.find((p) => p.client === clientId);
        if (participant) {
          const room = server.sockets.adapter.rooms.get(roomId) || { size: 0 };
          shouldInitiate = room.size === 0;
          socket.join(roomId);
          logger.info(
            `Socket ${socket.id} joined room ${roomId} on client ${clientId}`
          );
          socket.emit("joined", shouldInitiate);
        } else {
          logger.warn(
            `Socket ${socket.id} not allowed to join room ${roomId} on client ${clientId}`
          );
        }
      } else {
        logger.warn(
          `Socket ${socket.id} not allowed to join room ${roomId} on client ${clientId}`
        );
      }
    });
  });

  socket.on("ready", (roomId) => {
    logger.info(`Socket ${socket.id} ready in room ${roomId}`);
    socket.broadcast.to(roomId).emit("ready");
  });

  socket.on("offer", ({ sdp, room }) => {
    socket.broadcast.to(room).emit("offer", sdp);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket ${socket.id} disconnected`);
    console.log(socket.clientId, socket.roomId);
    sql = "SELECT * FROM rooms WHERE id = ?";
    db.get(sql, [socket.roomId], (err, row) => {
      if (!err && row) {
        const participants = JSON.parse(row.participants);
        const participant = participants.find(
          (p) => p.client === socket.clientId
        );
        if (participant) {
          participants.splice(participants.indexOf(participant), 1);
          const sql = "UPDATE rooms SET participants = ? WHERE id = ?";
          db.run(sql, [JSON.stringify(participants), socket.roomId], (err) => {
            if (err) {
              logger.error(
                `Socket ${socket.id} failed to leave room ${socket.roomId}`
              );
            } else {
              logger.info(
                `Socket ${socket.id} left room ${socket.roomId} on client ${socket.clientId}`
              );
            }
          });
        } else {
          logger.warn(
            `Socket ${socket.id} not allowed to leave room ${socket.roomId} on client ${socket.clientId}`
          );
        }
      } else {
        logger.warn(
          `Socket ${socket.id} not allowed to leave room ${socket.roomId} on client ${socket.clientId}`
        );
      }
    });
    socket.broadcast.emit("disconnected", socket.id);
  });

  socket.on("answer", ({ sdp, room }) => {
    socket.broadcast.to(room).emit("answer", sdp);
  });

  socket.on("candidate", (event) => {
    socket.broadcast.to(event.room).emit("candidate", event);
  });

  socket.on("message", (event) => {
    const sql = "SELECT * FROM rooms WHERE id = ?";
    db.get(sql, [event.room], (err, row) => {
      if (!err && row) {
        const participants = JSON.parse(row.participants);
        const participant = participants.find((p) => p.client === event.clientId);
        if (participant) {
          event.name = participant.name;
          logger.info(
            `Socket ${socket.id} sent message in room ${event.room} on client ${event.client}`
          );
          socket.to(event.room).emit("message", event);
        }
      } else {
        if (err) {
          logger.error(
            `Socket ${socket.id} not allowed to send message in room ${event.room} on client ${event.clientId}`
          );
        } else {
          logger.warn(
            `Socket ${socket.id} not allowed to send message in room ${event.room} on client ${event.clientId}`
          );
        }
      }
    });
  });
});

module.exports = server;
