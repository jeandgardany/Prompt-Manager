import { Router } from 'express';
import { listModels } from '../services/llm.js';

const router = Router();

// GET /api/models/:provider - List models for given provider
router.get('/:provider', async (req, res) => {
  const { provider } = req.params;
  if (!['lmstudio', 'glm', 'openrouter', 'ollama', 'ollamacloud', 'minimax'].includes(provider)) {
    return res.status(400).json({ error: 'Provider must be lmstudio, glm, openrouter, ollama, ollamacloud, or minimax' });
  }
  try {
    const models = await listModels(provider);
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: err.message, models: [] });
  }
});

// GET /api/models - List all providers
router.get('/', async (req, res) => {
  try {
    const [lmstudio, glm, openrouter, ollama, ollamacloud, minimax] = await Promise.all([
      listModels('lmstudio').catch(() => []),
      listModels('glm').catch(() => []),
      listModels('openrouter').catch(() => []),
      listModels('ollama').catch(() => []),
      listModels('ollamacloud').catch(() => []),
      listModels('minimax').catch(() => []),
    ]);
    res.json({ lmstudio, glm, openrouter, ollama, ollamacloud, minimax });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
