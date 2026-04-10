import { Router } from 'express';
import pool from '../db/pool.js';
import { runCompletion, interpolateVariables, runJudge } from '../services/llm.js';

const router = Router();

// POST /api/test/run - Execute a test run
router.post('/run', async (req, res) => {
  const { prompt_id, version, provider, model, variables, temperature, maxTokens } = req.body;

  if (!prompt_id || !provider || !model) {
    return res.status(400).json({ error: 'prompt_id, provider, and model are required' });
  }

  try {
    // Get the prompt version
    let promptData;
    if (version) {
      const result = await pool.query(
        'SELECT * FROM prompt_versions WHERE prompt_id = $1 AND version = $2',
        [prompt_id, version]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Version not found' });
      promptData = result.rows[0];
    } else {
      const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [prompt_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Prompt not found' });
      promptData = result.rows[0];
    }

    // Interpolate variables
    const systemPrompt = interpolateVariables(promptData.system_prompt, variables || {});
    const userPrompt = interpolateVariables(promptData.user_prompt_template, variables || {});

    // Build messages
    const messages = [{ role: 'system', content: systemPrompt }];
    if (userPrompt) {
      messages.push({ role: 'user', content: userPrompt });
    }

    // Run completion
    const result = await runCompletion({
      provider,
      model,
      messages,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2048,
    });

    // Get version ID for storage
    let versionId = null;
    let versionNumber = version || promptData.current_version;
    if (version) {
      versionId = promptData.id;
    } else {
      const versionResult = await pool.query(
        'SELECT id FROM prompt_versions WHERE prompt_id = $1 AND version = $2',
        [prompt_id, promptData.current_version]
      );
      if (versionResult.rows.length > 0) versionId = versionResult.rows[0].id;
    }

    // Save test run
    const saveResult = await pool.query(
      `INSERT INTO test_runs (prompt_id, prompt_version_id, version_number, provider, model, variables, input_messages, output, tokens_used, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        prompt_id,
        versionId,
        versionNumber,
        provider,
        model,
        JSON.stringify(variables || {}),
        JSON.stringify(messages),
        result.output,
        result.tokensUsed,
        result.latencyMs,
      ]
    );

    res.json({
      ...saveResult.rows[0],
      ...result,
    });
  } catch (err) {
    console.error('Test run error:', err);
    res.status(500).json({
      error: err.message || 'Test run failed',
      latencyMs: err.latencyMs,
    });
  }
});

// GET /api/test/runs - List test runs with cursor-based pagination
router.get('/runs', async (req, res) => {
  const { prompt_id, limit = 20, cursor } = req.query;
  try {
    let query = 'SELECT * FROM test_runs';
    const params = [];
    const conditions = [];

    if (prompt_id) {
      conditions.push(`prompt_id = $${params.length + 1}`);
      params.push(prompt_id);
    }

    if (cursor) {
      conditions.push(`created_at < (SELECT created_at FROM test_runs WHERE id = $${params.length + 1})`);
      params.push(cursor);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit) + 1); // Fetch one extra to determine if there's a next page

    const result = await pool.query(query, params);

    const hasMore = result.rows.length > parseInt(limit);
    const runs = hasMore ? result.rows.slice(0, -1) : result.rows;
    const nextCursor = hasMore && runs.length > 0 ? runs[runs.length - 1].id : null;

    res.json({
      runs,
      pagination: {
        limit: parseInt(limit),
        hasMore,
        nextCursor,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test/compare - A/B comparison
router.post('/compare', async (req, res) => {
  const { prompt_id, version_a, version_b, provider, model, variables, temperature, maxTokens } = req.body;

  if (!prompt_id || !version_a || !version_b || !provider || !model) {
    return res.status(400).json({ error: 'prompt_id, version_a, version_b, provider, and model are required' });
  }

  try {
    // Get both versions
    const [vA, vB] = await Promise.all([
      pool.query('SELECT * FROM prompt_versions WHERE prompt_id = $1 AND version = $2', [prompt_id, version_a]),
      pool.query('SELECT * FROM prompt_versions WHERE prompt_id = $1 AND version = $2', [prompt_id, version_b]),
    ]);

    if (vA.rows.length === 0 || vB.rows.length === 0) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    // Run both versions
    const buildMessages = (data) => {
      const sys = interpolateVariables(data.system_prompt, variables || {});
      const usr = interpolateVariables(data.user_prompt_template, variables || {});
      const msgs = [{ role: 'system', content: sys }];
      if (usr) msgs.push({ role: 'user', content: usr });
      return msgs;
    };

    const messagesA = buildMessages(vA.rows[0]);
    const messagesB = buildMessages(vB.rows[0]);

    const [resultA, resultB] = await Promise.all([
      runCompletion({ provider, model, messages: messagesA, temperature, maxTokens }),
      runCompletion({ provider, model, messages: messagesB, temperature, maxTokens }),
    ]);

    // Save test runs
    const [savedA, savedB] = await Promise.all([
      pool.query(
        `INSERT INTO test_runs (prompt_id, prompt_version_id, version_number, provider, model, variables, input_messages, output, tokens_used, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [prompt_id, vA.rows[0].id, version_a, provider, model, JSON.stringify(variables || {}), JSON.stringify(messagesA), resultA.output, resultA.tokensUsed, resultA.latencyMs]
      ),
      pool.query(
        `INSERT INTO test_runs (prompt_id, prompt_version_id, version_number, provider, model, variables, input_messages, output, tokens_used, latency_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [prompt_id, vB.rows[0].id, version_b, provider, model, JSON.stringify(variables || {}), JSON.stringify(messagesB), resultB.output, resultB.tokensUsed, resultB.latencyMs]
      ),
    ]);

    // Save comparison
    const comparison = await pool.query(
      `INSERT INTO ab_comparisons (prompt_id, version_a, version_b, test_run_a, test_run_b)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [prompt_id, version_a, version_b, savedA.rows[0].id, savedB.rows[0].id]
    );

    res.json({
      comparison: comparison.rows[0],
      a: { ...savedA.rows[0], ...resultA },
      b: { ...savedB.rows[0], ...resultB },
    });
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

// PUT /api/test/compare/:id/winner - Set winner
router.put('/compare/:id/winner', async (req, res) => {
  const { winner, notes } = req.body;
  if (!winner || !['A', 'B'].includes(winner)) {
    return res.status(400).json({ error: 'winner must be A or B' });
  }
  try {
    const result = await pool.query(
      'UPDATE ab_comparisons SET winner = $1, notes = $2 WHERE id = $3 RETURNING *',
      [winner, notes || '', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comparison not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test/dual-run - Run same prompt on 2 different models
router.post('/dual-run', async (req, res) => {
  const {
    prompt_id, version, variables,
    providerA, modelA,
    providerB, modelB,
    temperature, maxTokens,
    sequential, // if true, run one at a time (needed for same-provider like LM Studio)
  } = req.body;

  if (!prompt_id || !providerA || !modelA || !providerB || !modelB) {
    return res.status(400).json({ error: 'prompt_id, providerA, modelA, providerB, modelB are required' });
  }

  try {
    // Get prompt data
    let promptData;
    if (version) {
      const result = await pool.query(
        'SELECT * FROM prompt_versions WHERE prompt_id = $1 AND version = $2',
        [prompt_id, version]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Version not found' });
      promptData = result.rows[0];
    } else {
      const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [prompt_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Prompt not found' });
      promptData = result.rows[0];
    }

    // Build messages
    const systemPrompt = interpolateVariables(promptData.system_prompt, variables || {});
    const userPrompt = interpolateVariables(promptData.user_prompt_template, variables || {});
    const images = req.body.images || [];

    const messages = [{ role: 'system', content: systemPrompt }];
    let userContent = [];
    if (userPrompt) userContent.push({ type: 'text', text: userPrompt });
    if (images && images.length > 0) {
      images.forEach(img => userContent.push({ type: 'image_url', image_url: { url: img } }));
    }
    
    if (userContent.length > 0) {
      if (userContent.length === 1 && userContent[0].type === 'text') {
        messages.push({ role: 'user', content: userPrompt });
      } else {
        messages.push({ role: 'user', content: userContent });
      }
    }

    const runOpts = { temperature, maxTokens };
    const catchErr = (err) => ({ output: '', error: err.message, tokensUsed: 0, latencyMs: err.latencyMs || 0 });

    // Helper: wait for N ms
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper: run with retry (for sequential mode when model needs time to load)
    const runWithRetry = async (opts, retries = 3, delayMs = 8000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await runCompletion(opts);
        } catch (err) {
          const isLoadError = (err.message || '').toLowerCase().includes('failed to load model');
          if (isLoadError && attempt < retries) {
            console.log(`⏳ Model load failed (attempt ${attempt}/${retries}), waiting ${delayMs / 1000}s for memory to free...`);
            await delay(delayMs);
            delayMs += 5000; // increase wait each retry
          } else {
            throw err;
          }
        }
      }
    };

    let resultA, resultB;

    const warmupModel = async (provider, model) => {
      if (provider !== 'lmstudio') return;
      console.log(`🔄 Fazendo warm-up do modelo ${model} para carregar na memória...`);
      await runWithRetry({ provider, model, messages: [{ role: 'user', content: 'hi' }], maxTokens: 1 }, 1, 1000).catch(() => {});
    };

    if (sequential) {
      // Sequential: run A first, wait for memory to free, then B
      await warmupModel(providerA, modelA);

      console.log(`🔄 Sequential mode: running ${modelA} first...`);
      resultA = await runCompletion({ provider: providerA, model: modelA, messages, ...runOpts }).catch(catchErr);

      // Wait for model A to unload from memory (especially important for LM Studio)
      const unloadDelay = (providerA === 'lmstudio' || providerB === 'lmstudio') ? 10000 : 3000;
      console.log(`⏳ Waiting ${unloadDelay / 1000}s for model unload...`);
      await delay(unloadDelay);

      await warmupModel(providerB, modelB);

      console.log(`🔄 Now running ${modelB}...`);
      resultB = await runWithRetry({ provider: providerB, model: modelB, messages, ...runOpts }).catch(catchErr);
    } else {
      // Parallel: run both at the same time (different providers)
      [resultA, resultB] = await Promise.all([
        runCompletion({ provider: providerA, model: modelA, messages, ...runOpts }).catch(catchErr),
        runCompletion({ provider: providerB, model: modelB, messages, ...runOpts }).catch(catchErr),
      ]);
    }

    // Get version info for storage
    let versionId = null;
    let versionNumber = version || promptData.current_version;
    if (version) {
      versionId = promptData.id;
    } else {
      const versionResult = await pool.query(
        'SELECT id FROM prompt_versions WHERE prompt_id = $1 AND version = $2',
        [prompt_id, promptData.current_version]
      );
      if (versionResult.rows.length > 0) versionId = versionResult.rows[0].id;
    }

    // Persist dual run results
    const dualRunResult = await pool.query(
      `INSERT INTO dual_run_results (
        prompt_id, prompt_version_id, version_number,
        provider_a, model_a, provider_b, model_b,
        variables, input_images,
        output_a, output_b,
        tokens_a, tokens_b,
        latency_a_ms, latency_b_ms,
        error_a, error_b,
        sequential
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        prompt_id,
        versionId,
        versionNumber,
        providerA,
        modelA,
        providerB,
        modelB,
        JSON.stringify(variables || {}),
        JSON.stringify(images || []),
        resultA.output || '',
        resultB.output || '',
        resultA.tokensUsed || 0,
        resultB.tokensUsed || 0,
        resultA.latencyMs || 0,
        resultB.latencyMs || 0,
        resultA.error || null,
        resultB.error || null,
        !!sequential,
      ]
    );

    res.json({
      id: dualRunResult.rows[0].id,
      sequential: !!sequential,
      promptText: systemPrompt + (userPrompt ? '\n\n' + userPrompt : ''),
      a: { provider: providerA, model: modelA, ...resultA },
      b: { provider: providerB, model: modelB, ...resultB },
    });
  } catch (err) {
    console.error('Dual run error:', err);
    res.status(500).json({ error: err.message || 'Dual run failed' });
  }
});

// POST /api/test/judge - AI Judge evaluates two outputs
router.post('/judge', async (req, res) => {
  const { promptText, outputA, outputB, modelAName, modelBName, judgeProvider, judgeModel } = req.body;

  if (!outputA || !outputB || !judgeProvider || !judgeModel) {
    return res.status(400).json({ error: 'outputA, outputB, judgeProvider, judgeModel are required' });
  }

  try {
    const result = await runJudge({
      judgeProvider,
      judgeModel,
      promptText: promptText || '(não disponível)',
      outputA,
      outputB,
      modelAName: modelAName || 'Modelo A',
      modelBName: modelBName || 'Modelo B',
    });

    res.json(result);
  } catch (err) {
    console.error('Judge error:', err);
    res.status(500).json({ error: err.message || 'Judge evaluation failed' });
  }
});

export default router;
