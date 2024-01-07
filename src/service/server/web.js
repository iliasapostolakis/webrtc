const express = require("express");
const path = require("path");
const server = express();

server.use(express.json());

server.use('/app', express.static(path.join(__dirname, "../../app")));

server.use('/api/room', require('../room/api'));

module.exports = server;