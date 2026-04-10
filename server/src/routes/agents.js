import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM prompts p WHERE p.agent_id = a.id) as prompt_count
       FROM agents a ORDER BY a.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM prompts p WHERE p.agent_id = a.id) as prompt_count
       FROM agents a WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents - Create agent
router.post('/', async (req, res) => {
  const { name, description, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO agents (name, description, icon, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || '', icon || '🤖', color || '#6366f1']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Agent name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res) => {
  const { name, description, icon, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agents SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        color = COALESCE($4, color),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, icon, color, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
