import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

// Initialize database schema
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS entities (
        entity TEXT NOT NULL,
        id TEXT NOT NULL,
        data JSONB NOT NULL,
        created_date TIMESTAMPTZ,
        updated_date TIMESTAMPTZ,
        PRIMARY KEY (entity, id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entity ON entities(entity)`);
  } finally {
    client.release();
  }
}

initializeSchema().catch(err => console.error('Failed to initialize database schema:', err));

export function getEntities(entityName, sortField, limit) {
  return pool.query(
    `SELECT data FROM entities WHERE entity = $1 ORDER BY created_date DESC`,
    [entityName]
  ).then(({ rows }) => {
    let items = rows.map((r) => r.data);

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

    return items;
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
  return pool.query(
    `SELECT data FROM entities WHERE entity = $1 AND id = $2`,
    [entityName, String(id)]
  ).then(({ rows }) => {
    if (rows.length === 0) return null;
    return rows[0].data;
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
  return (async () => {
    const now = new Date().toISOString();
    const id = String(record.id || `${entityName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`);
    const normalized = await normalizeAndValidateRecord(entityName, { ...record, id }, id);
    const full = {
      created_date: now,
      updated_date: now,
      ...normalized,
      id
    };

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO entities (entity, id, data, created_date, updated_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (entity, id) DO UPDATE SET data = excluded.data, updated_date = excluded.updated_date`,
        [entityName, id, JSON.stringify(full), full.created_date, full.updated_date]
      );
      return full;
    } finally {
      client.release();
    }
  })();
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
  return (async () => {
    if (entityName === USER_ENTITY) {
      const user = await getEntityById(entityName, id);
      if (user && (user.role === 'super_admin' || normalizeEmail(user.email) === SUPER_ADMIN_EMAIL)) {
        throw new EntityError('The Super Admin account cannot be deleted.', 403);
      }
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM entities WHERE entity = $1 AND id = $2`,
        [entityName, String(id)]
      );
      if (result.rowCount === 0) {
        throw new EntityError(`Record with id ${id} not found in ${entityName}`, 404);
      }
      return { success: true, id };
    } finally {
      client.release();
    }
  })();
}

export function transaction(operations) {
  return (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const op of operations) {
        const result = await op();
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })();
}

export default pool;
