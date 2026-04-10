import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/judge-criteria - List active criteria
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM judge_criteria WHERE is_active = 1 ORDER BY weight DESC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/judge-criteria - Create criteria
router.post('/', async (req, res) => {
  const { name, description, weight = 1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO judge_criteria (name, description, weight) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', weight]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/judge-criteria/:id - Update criteria
router.put('/:id', async (req, res) => {
  const { name, description, weight, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE judge_criteria SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        weight = COALESCE($3, weight),
        is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [name, description, weight, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Criteria not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/judge-criteria/:id - Soft delete criteria
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE judge_criteria SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Criteria not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
