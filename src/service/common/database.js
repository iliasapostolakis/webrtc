const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:');

db.run(`CREATE TABLE rooms (
    id INTEGER PRIMARY KEY,
    name TEXT,
    participants TEXT 
)`);

module.exports = db;
