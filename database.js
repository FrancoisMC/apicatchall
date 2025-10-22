const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./database.sqlite');
        this.init();
    }

    init() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                ip_source TEXT NOT NULL,
                user_agent TEXT,
                content_type TEXT,
                content_length INTEGER,
                headers TEXT,
                payload TEXT,
                query_params TEXT
            )
        `;
        
        this.db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Erreur lors de la création de la table:', err.message);
            } else {
                console.log('Base de données initialisée avec succès');
            }
        });
    }

    insertRequest(requestData) {
        const {
            method,
            url,
            ipSource,
            userAgent,
            contentType,
            contentLength,
            headers,
            payload,
            queryParams
        } = requestData;

        const insertQuery = `
            INSERT INTO requests 
            (method, url, ip_source, user_agent, content_type, content_length, headers, payload, query_params)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.run(insertQuery, [
            method,
            url,
            ipSource,
            userAgent || null,
            contentType || null,
            contentLength || null,
            JSON.stringify(headers),
            payload || null,
            JSON.stringify(queryParams)
        ], function(err) {
            if (err) {
                console.error('Erreur lors de l\'insertion:', err.message);
            }
        });
    }

    getAllRequests(callback) {
        const selectQuery = `
            SELECT * FROM requests 
            ORDER BY timestamp DESC
        `;
        
        this.db.all(selectQuery, [], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des données:', err.message);
                callback(err, null);
            } else {
                // Parser les données JSON stockées
                const parsedRows = rows.map(row => ({
                    ...row,
                    headers: row.headers ? JSON.parse(row.headers) : {},
                    query_params: row.query_params ? JSON.parse(row.query_params) : {}
                }));
                callback(null, parsedRows);
            }
        });
    }

    getRequestCount(callback) {
        const countQuery = 'SELECT COUNT(*) as count FROM requests';
        this.db.get(countQuery, [], (err, row) => {
            if (err) {
                console.error('Erreur lors du comptage:', err.message);
                callback(err, null);
            } else {
                callback(null, row.count);
            }
        });
    }

    clearAllRequests(callback) {
        const deleteQuery = 'DELETE FROM requests';
        this.db.run(deleteQuery, [], function(err) {
            if (err) {
                console.error('Erreur lors de la suppression:', err.message);
                callback(err, null);
            } else {
                callback(null, this.changes);
            }
        });
    }

    deleteRequestById(id, callback) {
        const deleteQuery = 'DELETE FROM requests WHERE id = ?';
        this.db.run(deleteQuery, [id], function(err) {
            if (err) {
                console.error('Erreur lors de la suppression de la requête:', err.message);
                callback(err, null);
            } else {
                callback(null, this.changes);
            }
        });
    }

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Erreur lors de la fermeture de la base:', err.message);
            } else {
                console.log('Base de données fermée');
            }
        });
    }
}

module.exports = Database;
