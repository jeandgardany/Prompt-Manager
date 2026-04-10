import { Router } from 'express';
import { listModels } from '../services/llm.js';

const router = Router();

// Simple in-memory cache: { provider: { data, timestamp } }
const cache = {};
const CACHE_TTL = 60_000; // 60 seconds

async function getCachedModels(provider) {
  const entry = cache[provider];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  const data = await listModels(provider);
  cache[provider] = { data, timestamp: Date.now() };
  return data;
}

const VALID_PROVIDERS = ['lmstudio', 'glm', 'openrouter', 'ollama', 'ollamacloud', 'minimax'];

// GET /api/models/:provider - List models for given provider
router.get('/:provider', async (req, res) => {
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Provider must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }
  try {
    const models = await getCachedModels(provider);
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message, models: [] });
  }
});

// GET /api/models - List all providers
router.get('/', async (req, res) => {
  try {
    const results = await Promise.all(
      VALID_PROVIDERS.map((p) => getCachedModels(p).catch(() => []))
    );
    const response = {};
    VALID_PROVIDERS.forEach((p, i) => { response[p] = results[i]; });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
