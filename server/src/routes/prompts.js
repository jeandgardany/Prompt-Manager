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

// GET /api/prompts/search/query - Search prompts by name or content
router.get('/search/query', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  try {
    const term = `%${q.trim()}%`;
    const result = await pool.query(
      `SELECT p.*, a.name as agent_name, a.icon as agent_icon, a.color as agent_color
       FROM prompts p
       JOIN agents a ON a.id = p.agent_id
       WHERE p.name LIKE $1 OR p.system_prompt LIKE $2 OR p.user_prompt_template LIKE $3
       ORDER BY p.updated_at DESC`,
      [term, term, term]
    );
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

// GET /api/prompts/export/all - Export all prompts with versions
router.get('/export/all', async (req, res) => {
  try {
    const agents = await pool.query('SELECT * FROM agents ORDER BY created_at ASC');
    const prompts = await pool.query(
      `SELECT p.*, a.name as agent_name FROM prompts p JOIN agents a ON a.id = p.agent_id ORDER BY p.updated_at DESC`
    );
    const versions = await pool.query('SELECT * FROM prompt_versions ORDER BY prompt_id, version ASC');

    const versionsByPrompt = {};
    for (const v of versions.rows) {
      if (!versionsByPrompt[v.prompt_id]) versionsByPrompt[v.prompt_id] = [];
      versionsByPrompt[v.prompt_id].push(v);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      agents: agents.rows,
      prompts: prompts.rows.map((p) => ({
        ...p,
        versions: versionsByPrompt[p.id] || [],
      })),
    };

    res.setHeader('Content-Disposition', 'attachment; filename=prompts-export.json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prompts/import/all - Import prompts with versions
router.post('/import/all', async (req, res) => {
  const { agents = [], prompts = [] } = req.body;
  if (!prompts.length) {
    return res.status(400).json({ error: 'No prompts to import' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let agentsImported = 0;
    let promptsImported = 0;

    for (const agent of agents) {
      const existing = await client.query('SELECT id FROM agents WHERE name = $1', [agent.name]);
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO agents (name, description, icon, color) VALUES ($1, $2, $3, $4)',
          [agent.name, agent.description || '', agent.icon || '🤖', agent.color || '#6366f1']
        );
        agentsImported++;
      }
    }

    for (const prompt of prompts) {
      const agentResult = await client.query('SELECT id FROM agents WHERE name = $1', [prompt.agent_name]);
      if (agentResult.rows.length === 0) continue;
      const agentId = agentResult.rows[0].id;

      const existingPrompt = await client.query(
        'SELECT id FROM prompts WHERE name = $1 AND agent_id = $2', [prompt.name, agentId]
      );
      if (existingPrompt.rows.length > 0) continue;

      const promptResult = await client.query(
        `INSERT INTO prompts (agent_id, name, system_prompt, user_prompt_template, current_version)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [agentId, prompt.name, prompt.system_prompt, prompt.user_prompt_template || '', prompt.current_version || 1]
      );
      const newPromptId = promptResult.rows[0].id;

      if (prompt.versions) {
        for (const v of prompt.versions) {
          await client.query(
            `INSERT INTO prompt_versions (prompt_id, version, system_prompt, user_prompt_template, change_note)
             VALUES ($1, $2, $3, $4, $5)`,
            [newPromptId, v.version, v.system_prompt, v.user_prompt_template || '', v.change_note || '']
          );
        }
      }
      promptsImported++;
    }

    await client.query('COMMIT');
    res.json({ imported: { agents: agentsImported, prompts: promptsImported } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
