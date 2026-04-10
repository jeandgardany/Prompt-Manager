import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'db', 'database.sqlite');

const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Convert PostgreSQL-style SQL to SQLite-compatible SQL
 */
function convertSQL(sql) {
  // Convert $1, $2, ... to ?
  let converted = sql.replace(/\$\d+/g, '?');
  // Convert NOW() to datetime('now')
  converted = converted.replace(/NOW\(\)/gi, "datetime('now')");
  return converted;
}

/**
 * Sanitize params for better-sqlite3
 */
function sanitizeParams(params) {
  if (!params) return [];
  return params.map(p => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

/**
 * Execute a query with PostgreSQL-compatible interface
 */
function query(sql, params) {
  const convertedSql = convertSQL(sql);
  const safeParams = sanitizeParams(params);

  // Handle transaction commands
  const upper = convertedSql.trim().toUpperCase();
  if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
    db.exec(convertedSql);
    return { rows: [], rowCount: 0 };
  }

  const stmt = db.prepare(convertedSql);

  if (upper.startsWith('SELECT')) {
    const rows = stmt.all(safeParams);
    return { rows, rowCount: rows.length };
  } else if (convertedSql.toUpperCase().includes('RETURNING')) {
    // SQLite 3.35+ supports RETURNING - use .all() to get the rows
    const rows = stmt.all(safeParams);
    return { rows, rowCount: rows.length };
  } else {
    const result = stmt.run(safeParams);
    return { rows: [], rowCount: result.changes };
  }
}

// Attach query method
db.query = query;

// Provide connect() for transaction support (PostgreSQL pool.connect() compatibility)
db.connect = async () => ({
  query: (sql, params) => query(sql, params),
  release: () => {},
});

export default db;
