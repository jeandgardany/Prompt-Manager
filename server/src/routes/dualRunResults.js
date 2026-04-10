import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/dual-runs - List dual run history
router.get('/', async (req, res) => {
  const { prompt_id, limit = 20, offset = 0 } = req.query;
  try {
    let query = 'SELECT * FROM dual_run_results';
    const params = [];
    if (prompt_id) {
      query += ' WHERE prompt_id = $1';
      params.push(prompt_id);
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dual-runs/:id - Get single dual run
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dual_run_results WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dual run not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dual-runs/:id/winner - Set winner
router.put('/:id/winner', async (req, res) => {
  const { winner, judge_result, judge_model } = req.body;
  if (!winner || !['A', 'B'].includes(winner)) {
    return res.status(400).json({ error: 'winner must be A or B' });
  }
  try {
    const result = await pool.query(
      `UPDATE dual_run_results
       SET winner = $1, judge_result = $2, judge_model = $3
       WHERE id = $4 RETURNING *`,
      [winner, judge_result || null, judge_model || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dual run not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
