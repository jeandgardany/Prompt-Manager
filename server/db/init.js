import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initDB() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected!');

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    console.log('📋 Running schema...');
    await client.query(schema);
    console.log('✅ Schema created successfully!');
    console.log('🌱 Seed data inserted (agents: AIA, DAIA, Blogs)');

    client.release();
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDB();
