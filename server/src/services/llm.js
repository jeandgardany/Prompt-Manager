import OpenAI from 'openai';
import pool from '../db/pool.js';

/**
 * Get active judge criteria from database
 */
async function getJudgeCriteria() {
  try {
    const result = await pool.query(
      'SELECT * FROM judge_criteria WHERE is_active = 1 ORDER BY weight DESC, name ASC'
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching judge criteria:', err.message);
    return null;
  }
}

// LM Studio client (OpenAI-compatible)
function getLMStudioClient() {
  return new OpenAI({
    baseURL: process.env.LM_STUDIO_URL || 'http://192.168.1.20:12345/v1',
    apiKey: 'not-needed',
    timeout: 120000,
  });
}

// GLM (Zhipu AI BigModel) client (OpenAI-compatible)
function getGLMClient() {
  return new OpenAI({
    baseURL: process.env.GLM_API_URL || 'https://api.z.ai/api/coding/paas/v4',
    apiKey: process.env.GLM_API_KEY,
    timeout: 120000,
  });
}

// OpenRouter client (for AI Judge + extra models)
function getOpenRouterClient() {
  return new OpenAI({
    baseURL: process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 120000,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Prompt Manager',
    },
  });
}

// Ollama Local client
function getOllamaClient() {
  return new OpenAI({
    baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
    apiKey: 'ollama', // not required but passed for safety
    timeout: 120000,
  });
}

// Ollama Cloud client
function getOllamaCloudClient() {
  return new OpenAI({
    baseURL: process.env.OLLAMA_CLOUD_URL || 'https://api.ollama.cloud/v1',
    apiKey: process.env.OLLAMA_CLOUD_API_KEY || 'ollama',
    timeout: 120000,
  });
}

// Minimax client
function getMinimaxClient() {
  return new OpenAI({
    baseURL: process.env.MINIMAX_API_URL || 'https://api.minimax.io/v1',
    apiKey: process.env.MINIMAX_API_KEY,
    timeout: 120000,
  });
}

/**
 * Get client for a given provider
 */
function getClient(provider) {
  switch (provider) {
    case 'lmstudio': return getLMStudioClient();
    case 'glm': return getGLMClient();
    case 'openrouter': return getOpenRouterClient();
    case 'ollama': return getOllamaClient();
    case 'ollamacloud': return getOllamaCloudClient();
    case 'minimax': return getMinimaxClient();
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Run a chat completion against the chosen provider
 */
export async function runCompletion({ provider, model, messages, temperature = 0.7, maxTokens = 4096, thinkingEnabled = true }) {
  const start = Date.now();
  const client = getClient(provider);
  const modelLower = (model || '').toLowerCase();

  // Detect reasoning models
  const isReasoningModel = /qwen3|qwen2\.5|deepseek|qwq|gemma-3|gemma-4|gemma3|gemma4/i.test(model);

  // When thinking is disabled, modify messages to suppress CoT
  let finalMessages = messages;
  if (!thinkingEnabled && isReasoningModel) {
    finalMessages = messages.map((msg, i) => {
      if (msg.role === 'user') {
        // Qwen3/3.5 supports /no_think directive
        if (/qwen3|qwen2\.5|qwq/i.test(model)) {
          const content = typeof msg.content === 'string'
            ? `/no_think\n${msg.content}`
            : msg.content;
          return { ...msg, content };
        }
      }
      return msg;
    });
  }

  // Build request options
  const requestOpts = {
    model,
    messages: finalMessages,
    temperature,
    max_tokens: maxTokens,
  };

  // Some providers support chat_template_kwargs or extra params to disable thinking
  if (!thinkingEnabled && isReasoningModel) {
    // OpenRouter and some providers support this
    if (/deepseek/i.test(model)) {
      requestOpts.reasoning_effort = 'none';
    }
  }

  try {
    const response = await client.chat.completions.create(requestOpts);

    const latency = Date.now() - start;
    const choice = response.choices?.[0];

    let finalOutput = choice?.message?.content || '';

    // Some reasoning models (like DeepSeek) return the CoT in reasoning_content
    if (choice?.message?.reasoning_content) {
      if (thinkingEnabled) {
        finalOutput = `<think>\n${choice.message.reasoning_content}\n</think>\n\n${finalOutput}`;
      }
      // When thinking is disabled, we just ignore reasoning_content
    }

    // Strip <think> blocks from output when thinking is disabled
    if (!thinkingEnabled) {
      finalOutput = finalOutput.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    }

    // Se estiver vazio, vamos despejar o próprio objeto de resposta para fins de depuração
    if (!finalOutput) {
      finalOutput = `[DEBUG RAW RESPONSE]\n\n${JSON.stringify(response, null, 2)}`;
    }

    return {
      output: finalOutput,
      tokensUsed: response.usage?.total_tokens || response.eval_count || 0,
      latencyMs: latency,
      finishReason: choice?.finish_reason || 'unknown',
      rawResponse: JSON.stringify(choice?.message || {}),
    };
  } catch (err) {
    const latency = Date.now() - start;
    throw {
      message: err.message || 'LLM request failed',
      latencyMs: latency,
      provider,
      model,
    };
  }
}

/**
 * Run the AI Judge: sends both outputs to a judge model for analysis
 */
export async function runJudge({ judgeProvider, judgeModel, promptText, outputA, outputB, modelAName, modelBName, criteria = null }) {
  // Get criteria from DB if not provided
  if (!criteria) {
    criteria = await getJudgeCriteria();
  }

  // Default criteria if DB returns nothing
  if (!criteria || criteria.length === 0) {
    criteria = [
      { name: 'Relevância', description: 'Quão bem responde ao pedido', weight: 2 },
      { name: 'Qualidade', description: 'Clareza, profundidade e utilidade', weight: 2 },
      { name: 'Criatividade', description: 'Originalidade e abordagem', weight: 1 },
      { name: 'Precisão', description: 'Exatidão factual e técnica', weight: 2 },
      { name: 'Tom/Estilo', description: 'Adequação ao contexto', weight: 1 },
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
${outputB}

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

/**
 * List available models from a provider
 */
export async function listModels(provider) {
  try {
    if (provider === 'lmstudio') {
      const client = getLMStudioClient();
      const response = await client.models.list();
      return response.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'lmstudio',
      }));
    } else if (provider === 'ollama') {
      const client = getOllamaClient();
      const response = await client.models.list();
      return response.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'ollama',
      }));
    } else if (provider === 'ollamacloud') {
      const client = getOllamaCloudClient();
      const response = await client.models.list();
      return response.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'ollamacloud',
      }));
    } else if (provider === 'minimax') {
      return [
        { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7', provider: 'minimax' },
        { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', provider: 'minimax' },
        { id: 'MiniMax-M2.5-Code', name: 'MiniMax-M2.5-Code', provider: 'minimax' },
        { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', provider: 'minimax' },
      ];
    } else if (provider === 'glm') {
      return [
        { id: 'glm-4.6', name: 'GLM-4.6', provider: 'glm' },
        { id: 'glm-4.7', name: 'GLM-4.7', provider: 'glm' },
        { id: 'glm-5', name: 'GLM-5', provider: 'glm' },
        { id: 'glm-5-Turbo', name: 'GLM-5-Turbo', provider: 'glm' },
        { id: 'glm-5.1', name: 'GLM-5.1', provider: 'glm' },
      ];
    } else if (provider === 'openrouter') {
      return [
        { id: 'qwen/qwen3.6-plus', name: 'Qwen 3.6 Plus', provider: 'openrouter' },
        { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B IT (Pago)', provider: 'openrouter' },
        { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'openrouter' },
        { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', provider: 'openrouter' },
        { id: 'qwen/qwen3.5-flash-02-23', name: 'Qwen 3.5 Flash 02-23', provider: 'openrouter' },
        { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5 (Free)', provider: 'openrouter' },
        { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B IT (Free)', provider: 'openrouter' },
        { id: 'google/gemma-3n-e4b-it:free', name: 'Gemma 3N E4B IT (Free)', provider: 'openrouter' },
        { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1-Fast', provider: 'openrouter' },
        { id: 'openai/gpt-5-nano', name: 'Gpt 5 Nano', provider: 'openrouter' },
      ];
    }
    return [];
  } catch (err) {
    console.error(`Error listing models for ${provider}:`, err.message);
    return [];
  }
}

/**
 * Interpolate variables into a prompt template
 */
export function interpolateVariables(template, variables = {}) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Extract variable names from a template
 */
export function extractVariables(template) {
  if (!template) return [];
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}
