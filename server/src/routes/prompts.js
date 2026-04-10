import { Router } from 'express';
import pool from '../db/pool.js';
import { extractVariables } from '../services/llm.js';

const router = Router();

// GET /api/prompts - List prompts (optional ?agent_id=)
router.get('/', async (req, res) => {
  try {
    const { agent_id } = req.query;
    let query = `
      SELECT p.*, a.name as agent_name, a.icon as agent_icon, a.color as agent_color
      FROM prompts p
      JOIN agents a ON a.id = p.agent_id
    `;
    const params = [];
    if (agent_id) {
      query += ' WHERE p.agent_id = $1';
      params.push(agent_id);
    }
    query += ' ORDER BY p.updated_at DESC';
    const result = await pool.query(query, params);

    // Add extracted variables to each prompt
    const prompts = result.rows.map((p) => ({
      ...p,
      variables: [
        ...extractVariables(p.system_prompt),
        ...extractVariables(p.user_prompt_template),
      ].filter((v, i, a) => a.indexOf(v) === i),
    }));

    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/:id - Get single prompt with variables
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, a.name as agent_name, a.icon as agent_icon, a.color as agent_color
       FROM prompts p
       JOIN agents a ON a.id = p.agent_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prompt not found' });

    const prompt = result.rows[0];
    prompt.variables = [
      ...extractVariables(prompt.system_prompt),
      ...extractVariables(prompt.user_prompt_template),
    ].filter((v, i, a) => a.indexOf(v) === i);

    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prompts - Create prompt (auto-creates version 1)
router.post('/', async (req, res) => {
  const { agent_id, name, system_prompt, user_prompt_template } = req.body;
  if (!agent_id || !name || !system_prompt) {
    return res.status(400).json({ error: 'agent_id, name, and system_prompt are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const promptResult = await client.query(
      `INSERT INTO prompts (agent_id, name, system_prompt, user_prompt_template, current_version)
       VALUES ($1, $2, $3, $4, 1) RETURNING *`,
      [agent_id, name, system_prompt, user_prompt_template || '']
    );
    const prompt = promptResult.rows[0];

    await client.query(
      `INSERT INTO prompt_versions (prompt_id, version, system_prompt, user_prompt_template, change_note)
       VALUES ($1, 1, $2, $3, 'Versão inicial')`,
      [prompt.id, system_prompt, user_prompt_template || '']
    );

    await client.query('COMMIT');

    prompt.variables = [
      ...extractVariables(prompt.system_prompt),
      ...extractVariables(prompt.user_prompt_template),
    ].filter((v, i, a) => a.indexOf(v) === i);

    res.status(201).json(prompt);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/prompts/:id - Update prompt (creates new version)
router.put('/:id', async (req, res) => {
  const { system_prompt, user_prompt_template, change_note, name } = req.body;
  if (!system_prompt) return res.status(400).json({ error: 'system_prompt is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current version
    const current = await client.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const newVersion = current.rows[0].current_version + 1;

    // Update prompt
    const updateResult = await client.query(
      `UPDATE prompts SET
        system_prompt = $1,
        user_prompt_template = $2,
        name = COALESCE($3, name),
        current_version = $4,
        updated_at = datetime('now')
       WHERE id = $5 RETURNING *`,
      [system_prompt, user_prompt_template || '', name, newVersion, req.params.id]
    );

    // Create version snapshot
    await client.query(
      `INSERT INTO prompt_versions (prompt_id, version, system_prompt, user_prompt_template, change_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, newVersion, system_prompt, user_prompt_template || '', change_note || `Versão ${newVersion}`]
    );

    await client.query('COMMIT');

    const prompt = updateResult.rows[0];
    prompt.variables = [
      ...extractVariables(prompt.system_prompt),
      ...extractVariables(prompt.user_prompt_template),
    ].filter((v, i, a) => a.indexOf(v) === i);

    res.json(prompt);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/prompts/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/:id/versions - List versions
router.get('/:id/versions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prompt_versions WHERE prompt_id = $1 ORDER BY version DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/:id/versions/:version - Get specific version
router.get('/:id/versions/:version', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prompt_versions WHERE prompt_id = $1 AND version = $2',
      [req.params.id, parseInt(req.params.version)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Version not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
