import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cctv_maintenance.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      entity TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_date TEXT,
      updated_date TEXT,
      PRIMARY KEY (entity, id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entity ON entities(entity)`);
});

export function getEntities(entityName, sortField, limit) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT data FROM entities WHERE entity = ? ORDER BY rowid DESC`,
      [entityName],
      (err, rows) => {
        if (err) return reject(err);
        let items = rows.map((r) => JSON.parse(r.data));

        if (sortField) {
          let isDesc = false;
          let field = sortField;
          if (field.startsWith('-')) {
            isDesc = true;
            field = field.substring(1);
          }
          items.sort((a, b) => {
            const av = a[field] ?? '';
            const bv = b[field] ?? '';
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return isDesc ? -cmp : cmp;
          });
        }

        if (limit && typeof limit === 'number') {
          items = items.slice(0, limit);
        }

        resolve(items);
      }
    );
  });
}

export function filterEntities(entityName, query = {}) {
  return getEntities(entityName).then((items) => {
    return items.filter((item) => {
      for (const [k, v] of Object.entries(query)) {
        if (String(item[k]) !== String(v)) return false;
      }
      return true;
    });
  });
}

export function getEntityById(entityName, id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data FROM entities WHERE entity = ? AND id = ?`,
      [entityName, String(id)],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        resolve(JSON.parse(row.data));
      }
    );
  });
}

export function saveEntity(entityName, record) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const id = String(record.id || `${entityName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`);
    const full = {
      created_date: now,
      updated_date: now,
      ...record,
      id
    };

    db.run(
      `INSERT INTO entities (entity, id, data, created_date, updated_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(entity, id) DO UPDATE SET data = excluded.data, updated_date = excluded.updated_date`,
      [entityName, id, JSON.stringify(full), full.created_date, full.updated_date],
      (err) => {
        if (err) return reject(err);
        resolve(full);
      }
    );
  });
}

export function updateEntity(entityName, id, payload) {
  return getEntityById(entityName, id).then((existing) => {
    if (!existing) {
      throw new Error(`Record with id ${id} not found in ${entityName}`);
    }
    const updated = {
      ...existing,
      ...payload,
      updated_date: new Date().toISOString()
    };
    return saveEntity(entityName, updated);
  });
}

export function deleteEntity(entityName, id) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM entities WHERE entity = ? AND id = ?`,
      [entityName, String(id)],
      (err) => {
        if (err) return reject(err);
        resolve({ success: true, id });
      }
    );
  });
}

export default db;
