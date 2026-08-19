import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const USER_ENTITY = 'User';
const SUPER_ADMIN_EMAIL = 'slebeloane@stallion.co.za';
const VALID_USER_ROLES = new Set(['super_admin', 'admin', 'maintenance', 'readonly']);
const VALID_USER_STATUSES = new Set(['active', 'pending', 'disabled', 'deactivated', 'rejected']);

export class EntityError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'EntityError';
    this.statusCode = statusCode;
  }
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

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

async function normalizeAndValidateRecord(entityName, record, existingId) {
  if (entityName !== USER_ENTITY) {
    return record;
  }

  const normalized = { ...record };
  const email = normalizeEmail(normalized.email);
  if (!email) {
    throw new EntityError('User email is required.', 400);
  }
  normalized.email = email;

  if (!normalized.full_name || !String(normalized.full_name).trim()) {
    normalized.full_name = email.split('@')[0] || email;
  }

  if (!normalized.password_hash || !String(normalized.password_hash).trim()) {
    throw new EntityError('User password hash is required.', 400);
  }

  if (normalized.role && !VALID_USER_ROLES.has(normalized.role)) {
    throw new EntityError('Invalid user role.', 400);
  }

  if (normalized.status && !VALID_USER_STATUSES.has(normalized.status)) {
    throw new EntityError('Invalid user status.', 400);
  }

  const users = await getEntities(USER_ENTITY);
  const duplicate = users.find((user) => {
    const otherEmail = normalizeEmail(user.email);
    const sameEmail = otherEmail === email;
    const sameRecord = String(user.id) === String(existingId ?? normalized.id);
    return sameEmail && !sameRecord;
  });

  if (duplicate) {
    throw new EntityError(`An account with email ${email} already exists.`, 409);
  }

  return normalized;
}

export function saveEntity(entityName, record) {
  return new Promise((resolve, reject) => {
    (async () => {
      const now = new Date().toISOString();
      const id = String(record.id || `${entityName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`);
      const normalized = await normalizeAndValidateRecord(entityName, { ...record, id }, id);
      const full = {
        created_date: now,
        updated_date: now,
        ...normalized,
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
    })().catch(reject);
  });
}

export function updateEntity(entityName, id, payload) {
  return getEntityById(entityName, id).then(async (existing) => {
    if (!existing) {
      throw new EntityError(`Record with id ${id} not found in ${entityName}`, 404);
    }
    const updated = {
      ...existing,
      ...payload,
      updated_date: new Date().toISOString()
    };
    const normalized = await normalizeAndValidateRecord(entityName, updated, existing.id);
    return saveEntity(entityName, normalized);
  });
}

export function deleteEntity(entityName, id) {
  return new Promise((resolve, reject) => {
    (async () => {
      if (entityName === USER_ENTITY) {
        const user = await getEntityById(entityName, id);
        if (user && (user.role === 'super_admin' || normalizeEmail(user.email) === SUPER_ADMIN_EMAIL)) {
          throw new EntityError('The Super Admin account cannot be deleted.', 403);
        }
      }

      db.run(
        `DELETE FROM entities WHERE entity = ? AND id = ?`,
        [entityName, String(id)],
        function onDelete(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            return reject(new EntityError(`Record with id ${id} not found in ${entityName}`, 404));
          }
          resolve({ success: true, id });
        }
      );
    })().catch(reject);
  });
}

export default db;
