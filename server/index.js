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

// Auto Seed on Startup & Start Server
seedDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCTV Maintenance Docker API server running on http://0.0.0.0:${PORT}`);
  });
});
