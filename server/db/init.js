import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');

function initDB() {
  console.log('🔌 Connecting to SQLite...');

  const db = new Database(dbPath);
  console.log('✅ Connected!');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

  console.log('📋 Running schema...');
  db.exec(schema);
  console.log('✅ Schema created successfully!');
  console.log('🌱 Seed data inserted (agents: AIA, DAIA, Blogs)');

  db.close();
  console.log('✅ Database initialized!');
}

initDB();
