const express = require('express');
const logger = require('../common/logger');
const db = require('../common/database');
const router = express.Router();
const crypto = require('crypto'); 

router.get('/', (req, res) => {
    const sql = 'SELECT * FROM rooms';
    db.all(sql, [], (err, rows) => {
        if (err) {
            logger.error(`GET /api/room -> error: ${err.message}`);
            res.status(500).send(err.message);
        } else {
            logger.info(`GET /api/room -> ${rows.length} rows`);
            rows.forEach(row => {
                const participants = JSON.parse(row.participants);
                participants.forEach(p => delete p.client);
                row.participants = participants;
            });
            res.send(rows);
        }
    });
});

router.get('/:id', (req, res) => {
    const roomId = req.params.id;
    const sql = 'SELECT * FROM rooms WHERE id = ?';
    db.get(sql, [roomId], (err, row) => {
        if (err) {
            logger.error(`GET /api/room/${roomId} -> error: ${err.message}`);
            res.status(500).send(err.message);
        } else if (row) {
            logger.info(`GET /api/room/${roomId} -> ${JSON.stringify(row)}`);
            const participants = JSON.parse(row.participants);
            participants.forEach(p => delete p.client);
            row.participants = participants;
            res.send(row);
        } else {
            logger.warn(`GET /api/room/${roomId} -> NOT FOUND`);
            res.status(404).send('Room not found');
        }
    });
});

router.post('/join', (req, res) => {
    const roomName = req.body.room;
    const userName = req.body.user;
    const sql = 'SELECT * FROM rooms WHERE name = ?';
    db.get(sql, [roomName], (err, row) => {
        if (err) {
            logger.error(`POST /api/room/join -> error: ${err.message}`);
            res.status(500).send(err.message);
        } else if (row) {
            const participants = JSON.parse(row.participants);
            const participantNames = participants.map(p => p.name);
            if (participantNames.includes(userName)) {
                logger.warn(`POST /api/room/join -> ${userName} already in room`);
                res.status(400).send('User already in room');
                return;
            }
            const newClient = crypto.randomUUID();
            participants.push({ name: userName, client: newClient});
            const updateSql = 'UPDATE rooms SET participants = ? WHERE id = ?';
            db.run(updateSql, [JSON.stringify(participants), row.id], (err) => {
                if (err) {
                    logger.error(`POST /api/room/join -> error: ${err.message}`);
                    res.status(500).send(err.message);
                } else {
                    logger.info(`POST /api/room/join -> ${JSON.stringify(row)}`);
                    res.status(200).send({ client: newClient, roomId: row.id});
                }
            });
        } else {
            const insertSql = 'INSERT INTO rooms (name, participants) VALUES (?, ?)';
            const newClient = crypto.randomUUID();
            const participant = { name: userName, client: newClient}
            db.run(insertSql, [roomName, JSON.stringify([participant])], function (err) {
                if (err) {
                    logger.error(`POST /api/room/join -> error: ${err.message}`);
                    res.status(500).send(err.message);
                } else {
                    logger.info(`POST /api/room/join -> ${this.lastID}`);
                    res.status(200).send({ client: newClient, roomId: this.lastID});
                }
            });
        }
    });
});

module.exports = router;