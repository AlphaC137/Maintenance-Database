import express from 'express';
import cors from 'cors';
import { getEntities, filterEntities, getEntityById, saveEntity, updateEntity, deleteEntity } from './db.js';
import { seedDatabase } from './seed.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

function sendError(res, err) {
  const status = err?.statusCode || err?.status || 500;
  const message = err?.message || 'Unexpected server error.';
  res.status(status).json({ error: message });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'CCTV Maintenance Docker API' });
});

// List Entities
app.get('/api/entities/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const { sort, limit, ...filters } = req.query;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    if (limit && Number.isNaN(parsedLimit)) {
      return res.status(400).json({ error: 'Invalid limit query parameter.' });
    }

    let items;
    if (Object.keys(filters).length > 0) {
      items = await filterEntities(entity, filters);
    } else {
      items = await getEntities(entity, sort, parsedLimit);
    }
    res.json(items);
  } catch (err) {
    sendError(res, err);
  }
});

// Get Single Entity
app.get('/api/entities/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const item = await getEntityById(entity, id);
    if (!item) return res.status(404).json({ error: `Record ${id} not found in ${entity}` });
    res.json(item);
  } catch (err) {
    sendError(res, err);
  }
});

// Create Entity
app.post('/api/entities/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const created = await saveEntity(entity, req.body);
    res.status(201).json(created);
  } catch (err) {
    sendError(res, err);
  }
});

// Update Entity
app.put('/api/entities/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const updated = await updateEntity(entity, id, req.body);
    res.json(updated);
  } catch (err) {
    sendError(res, err);
  }
});

// Batch Update Entity
app.patch('/api/entities/:entity/batch', async (req, res) => {
  try {
    const { entity } = req.params;
    const { ids, updates } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'updates object required' });

    const results = [];
    for (const id of ids) {
      const updated = await updateEntity(entity, id, updates);
      results.push(updated);
    }
    res.json(results);
  } catch (err) {
    sendError(res, err);
  }
});

// Delete Entity
app.delete('/api/entities/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const result = await deleteEntity(entity, id);
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// Auth Endpoints for User Operations
app.post('/api/auth/users', async (req, res) => {
  try {
    const { email, password, full_name, role = 'readonly', status = 'active' } = req.body;
    
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    const user = await saveEntity('User', {
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role,
      status,
      password_hash: hash
    });

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/auth/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, status, password } = req.body;

    const existing = await getEntityById('User', id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updateData = {};
    if (email) updateData.email = email.trim().toLowerCase();
    if (full_name) updateData.full_name = full_name.trim();
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const crypto = await import('crypto');
      updateData.password_hash = crypto.createHash('sha256').update(password).digest('hex');
    }

    const updated = await updateEntity('User', id, updateData);
    const { password_hash, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteEntity('User', id);
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// Auto Seed on Startup & Start Server
seedDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCTV Maintenance Docker API server running on http://0.0.0.0:${PORT}`);
  });
});
