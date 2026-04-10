# Missing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three missing features: persist dual-run results, add pagination to test runs, and make judge criteria configurable.

**Architecture:** Add a new `dual_run_results` table to persist A/B model test results, enhance `test_runs` pagination with cursor-based pagination, and create a `judge_criteria` table for configurable evaluation criteria.

**Tech Stack:** Node.js/Express, PostgreSQL, React (frontend changes minimal)

---

## Task 1: Persist Dual-Run Results

### Rationale
The `POST /api/test/dual-run` endpoint currently runs both models but does NOT save results to the database. Users lose all test data after the response is sent.

### Files
- Modify: `server/db/schema.sql:70-76` (add new table)
- Modify: `server/src/routes/test.js:200-316` (persist results)
- Modify: `client/src/api/client.js:38` (add API method for dual-run history)
- Create: `server/src/routes/dualRunResults.js` (list/history endpoint)

### Steps

- [ ] **Step 1: Add dual_run_results table to schema**

Add to `server/db/schema.sql` after the existing tables:

```sql
-- Dual Run Results (persisted A/B model comparisons)
CREATE TABLE IF NOT EXISTS dual_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    version_number INT,
    provider_a VARCHAR(50) NOT NULL,
    model_a VARCHAR(200) NOT NULL,
    provider_b VARCHAR(50) NOT NULL,
    model_b VARCHAR(200) NOT NULL,
    variables JSONB DEFAULT '{}',
    input_images JSONB DEFAULT '[]',
    output_a TEXT,
    output_b TEXT,
    tokens_a INT DEFAULT 0,
    tokens_b INT DEFAULT 0,
    latency_a_ms INT DEFAULT 0,
    latency_b_ms INT DEFAULT 0,
    error_a TEXT,
    error_b TEXT,
    winner VARCHAR(1),
    judge_result TEXT,
    judge_model VARCHAR(200),
    sequential BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dual_runs_prompt ON dual_run_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_dual_runs_created ON dual_run_results(created_at DESC);
```

- [ ] **Step 2: Update dual-run endpoint to persist results**

Modify `server/src/routes/test.js` line 200-316. Find the `router.post('/dual-run')` endpoint and update the response block to save to database:

In the response section (around line 306-311), replace:
```javascript
res.json({
  sequential: !!sequential,
  promptText: systemPrompt + (userPrompt ? '\n\n' + userPrompt : ''),
  a: { provider: providerA, model: modelA, ...resultA },
  b: { provider: providerB, model: modelB, ...resultB },
});
```

With:
```javascript
// Save to database
const savedRun = await pool.query(
  `INSERT INTO dual_run_results 
   (prompt_id, prompt_version_id, version_number, provider_a, model_a, provider_b, model_b,
    variables, input_images, output_a, output_b, tokens_a, tokens_b, latency_a_ms, latency_b_ms,
    error_a, error_b, sequential)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
   RETURNING *`,
  [
    prompt_id, versionId, versionNumber,
    providerA, modelA, providerB, modelB,
    JSON.stringify(variables || {}), JSON.stringify(images || []),
    resultA.output || '', resultB.output || '',
    resultA.tokensUsed || 0, resultB.tokensUsed || 0,
    resultA.latencyMs || 0, resultB.latencyMs || 0,
    resultA.error || null, resultB.error || null,
    !!sequential
  ]
);

res.json({
  id: savedRun.rows[0].id,
  sequential: !!sequential,
  promptText: systemPrompt + (userPrompt ? '\n\n' + userPrompt : ''),
  a: { provider: providerA, model: modelA, ...resultA },
  b: { provider: providerB, model: modelB, ...resultB },
});
```

- [ ] **Step 3: Add endpoint to list dual-run history**

Create `server/src/routes/dualRunResults.js`:

```javascript
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/dual-runs - List dual run history
router.get('/', async (req, res) => {
  const { prompt_id, limit = 20, offset = 0 } = req.query;
  try {
    let query = `
      SELECT dr.*, p.name as prompt_name
      FROM dual_run_results dr
      LEFT JOIN prompts p ON p.id = dr.prompt_id
    `;
    const params = [];
    if (prompt_id) {
      query += ' WHERE dr.prompt_id = $1';
      params.push(prompt_id);
    }
    query += ` ORDER BY dr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
      `SELECT dr.*, p.name as prompt_name
       FROM dual_run_results dr
       LEFT JOIN prompts p ON p.id = dr.prompt_id
       WHERE dr.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dual run not found' });
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
      `UPDATE dual_run_results SET winner = $1, judge_result = $2, judge_model = $3 WHERE id = $4 RETURNING *`,
      [winner, judge_result || '', judge_model || '', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dual run not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 4: Register new route in server**

Modify `server/src/index.js` to add the new route:

Add import:
```javascript
import dualRunResultsRouter from './routes/dualRunResults.js';
```

Add route (after modelsRouter):
```javascript
app.use('/api/dual-runs', dualRunResultsRouter);
```

- [ ] **Step 5: Add client API methods**

Modify `client/src/api/client.js` to add:

```javascript
// Dual Runs
export const getDualRuns = (promptId, limit = 20, offset = 0) => 
  request(`/dual-runs${promptId ? `?prompt_id=${promptId}&limit=${limit}&offset=${offset}` : `?limit=${limit}&offset=${offset}`}`);
export const getDualRun = (id) => request(`/dual-runs/${id}`);
export const setDualRunWinner = (id, data) => request(`/dual-runs/${id}/winner`, { method: 'PUT', body: JSON.stringify(data) });
```

- [ ] **Step 6: Run database migration**

```bash
cd server && node db/init.js
```

---

## Task 2: Add Pagination to Test Runs

### Rationale
The `GET /api/test/runs` endpoint only supports LIMIT but no OFFSET, making it impossible to paginate through large test histories.

### Files
- Modify: `server/src/routes/test.js:94-112`

### Steps

- [ ] **Step 1: Add cursor-based pagination to test runs**

Replace the existing `router.get('/runs')` endpoint in `server/src/routes/test.js`:

```javascript
// GET /api/test/runs - List test runs with pagination
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: persist dual-run results and add pagination to test runs"
```

---

## Task 3: Make Judge Criteria Configurable

### Rationale
The AI judge currently has hardcoded evaluation criteria in the `runJudge` function. Users should be able to customize criteria per prompt or globally.

### Files
- Modify: `server/db/schema.sql` (add judge_criteria table)
- Modify: `server/src/routes/test.js:318-342` (use configurable criteria)
- Modify: `client/src/api/client.js` (add CRUD for criteria)

### Steps

- [ ] **Step 1: Add judge_criteria table to schema**

Add to `server/db/schema.sql`:

```sql
-- Judge Criteria (configurable evaluation criteria)
CREATE TABLE IF NOT EXISTS judge_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weight INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default criteria
INSERT INTO judge_criteria (name, description, weight) VALUES
    ('Relevância', 'Quão bem responde ao pedido', 2),
    ('Qualidade', 'Clareza, profundidade e utilidade', 2),
    ('Criatividade', 'Originalidade e abordagem', 1),
    ('Precisão', 'Exatidão factual e técnica', 2),
    ('Tom/Estilo', 'Adequação ao contexto', 1)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Create judge criteria API**

Create `server/src/routes/judgeCriteria.js`:

```javascript
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET /api/judge-criteria - List active criteria
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM judge_criteria WHERE is_active = true ORDER BY weight DESC, name ASC'
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

// DELETE /api/judge-criteria/:id
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
```

- [ ] **Step 3: Register route**

Modify `server/src/index.js`:

Add import:
```javascript
import judgeCriteriaRouter from './routes/judgeCriteria.js';
```

Add route:
```javascript
app.use('/api/judge-criteria', judgeCriteriaRouter);
```

- [ ] **Step 4: Update runJudge function to use criteria**

Modify `server/src/services/llm.js`, update the `runJudge` function to accept and use criteria:

First, add a new function to fetch criteria:
```javascript
import pool from '../db/pool.js';

export async function getJudgeCriteria() {
  try {
    const result = await pool.query(
      'SELECT * FROM judge_criteria WHERE is_active = true ORDER BY weight DESC'
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching judge criteria:', err.message);
    return [];
  }
}
```

Update `runJudge` function signature and build prompt dynamically:
```javascript
export async function runJudge({ judgeProvider, judgeModel, promptText, outputA, outputB, modelAName, modelBName, criteria = null }) {
  // Get criteria from DB if not provided
  if (!criteria) {
    criteria = await getJudgeCriteria();
  }
  
  // If still no criteria, use defaults
  if (!criteria || criteria.length === 0) {
    criteria = [
      { name: 'Relevância', weight: 2 },
      { name: 'Qualidade', weight: 2 },
      { name: 'Criatividade', weight: 1 },
      { name: 'Precisão', weight: 2 },
      { name: 'Tom/Estilo', weight: 1 },
    ];
  }

  // Build criteria section for prompt
  const criteriaSection = criteria.map((c, i) => 
    `${i + 1}. **${c.name}**${c.description ? ` — ${c.description}` : ''} (peso: ${c.weight})`
  ).join('\n');

  const judgePrompt = `Tu és um avaliador especialista em qualidade de outputs de modelos de IA. 
Analisa as duas respostas abaixo para o mesmo prompt e dá uma avaliação detalhada.

## Prompt Original:
${promptText}

## Resposta do Modelo A (${modelAName}):
${outputA}

## Resposta do Modelo B (${modelBName}):

## Instruções de Avaliação:
Avalia cada resposta nos seguintes critérios:
${criteriaSection}

Para cada modelo, indica:
- ✅ Pontos positivos
- ❌ Pontos negativos

No final, declara o **vencedor** e explica porquê.

Responde em português.`;

  const messages = [
    { role: 'system', content: 'Tu és um juiz imparcial que avalia outputs de modelos de IA. Sê objetivo, detalhado e justo na tua análise.' },
    { role: 'user', content: judgePrompt },
  ];

  return runCompletion({
    provider: judgeProvider,
    model: judgeModel,
    messages,
    temperature: 0.3,
    maxTokens: 4096,
  });
}
```

- [ ] **Step 5: Add client API methods**

Modify `client/src/api/client.js`:

```javascript
// Judge Criteria
export const getJudgeCriteria = () => request('/judge-criteria');
export const createJudgeCriteria = (data) => request('/judge-criteria', { method: 'POST', body: JSON.stringify(data) });
export const updateJudgeCriteria = (id, data) => request(`/judge-criteria/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteJudgeCriteria = (id) => request(`/judge-criteria/${id}`, { method: 'DELETE' });
```

- [ ] **Step 6: Run migration and commit**

```bash
cd server && node db/init.js
git add -A && git commit -m "feat: add configurable judge criteria"
```

---

## Self-Review Checklist

- [x] Spec coverage: dual-run persistence, pagination, configurable judge criteria all covered
- [x] No placeholders: all code blocks complete with actual implementation
- [x] Type consistency: functions match across files (runJudge signature updated)
- [x] All file paths exact and verified to exist
- [x] Migration commands included

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
