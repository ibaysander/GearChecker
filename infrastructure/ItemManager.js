const sqlite3 = require('sqlite3').verbose();
const logger = require('../common/helpers/logger');

const db = new sqlite3.Database(
    './database/' + process.env.sqlite_database_name,
    sqlite3.OPEN_READONLY,
    (err) => {
        if (err) logger.error(`Failed to open SQLite database: ${err.message}`);
        else logger.info('SQLite database connected');
    }
);

function GetItems(itemList, callback) {
    const query = `SELECT * FROM items WHERE itemID IN (${itemList.join(', ')})`;

    db.all(query, (err, rows) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, rows);
    });
}

function healthCheck(callback) {
    db.get('SELECT 1 FROM items LIMIT 1', (err) => {
        callback(!err);
    });
}

function closeDb() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                logger.error(`Error closing database: ${err.message}`);
                reject(err);
            } else {
                logger.info('SQLite database connection closed');
                resolve();
            }
        });
    });
}

module.exports = { GetItems, healthCheck, closeDb };
