import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'cctv_maintenance.db');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function migrateData() {
  console.log('Starting migration from SQLite to PostgreSQL...');
  
  // Read from SQLite
  const sqliteData = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT entity, id, data, created_date, updated_date FROM entities', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
      db.close();
    });
  });

  console.log(`Found ${sqliteData.length} records in SQLite`);

  // Write to PostgreSQL
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let migrated = 0;
    for (const row of sqliteData) {
      try {
        await client.query(
          `INSERT INTO entities (entity, id, data, created_date, updated_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (entity, id) DO UPDATE SET data = excluded.data, updated_date = excluded.updated_date`,
          [row.entity, row.id, row.data, row.created_date, row.updated_date]
        );
        migrated++;
      } catch (err) {
        console.error(`Failed to migrate record ${row.entity}/${row.id}:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully migrated ${migrated} records to PostgreSQL`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
  console.log('Migration complete!');
}

migrateData().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
