import { useState, useEffect, useRef } from 'react';
import { getModels } from '../../api/client';

// Cache models per provider to avoid re-fetching on every mount
const modelsCache = {};

export default function ModelSelector({ provider, model, onProviderChange, onModelChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastProvider = useRef('');

  useEffect(() => {
    if (!provider) {
      setModels([]);
      return;
    }
    // Skip if provider hasn't changed
    if (provider === lastProvider.current) return;
    lastProvider.current = provider;

    // Use cache if available
    if (modelsCache[provider]) {
      setModels(modelsCache[provider]);
      if (modelsCache[provider].length > 0 && !model) {
        onModelChange(modelsCache[provider][0].id);
      }
      return;
    }

    setLoading(true);
    setError('');
    getModels(provider)
      .then((data) => {
        modelsCache[provider] = data;
        setModels(data);
        if (data.length > 0 && !model) {
          onModelChange(data[0].id);
        }
      })
      .catch((err) => {
        setError(err.message);
        setModels([]);
      })
      .finally(() => setLoading(false));
  }, [provider]);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
      <div className="input-group" style={{ flex: 1 }}>
        <label className="input-label">Provider</label>
        <select
          className="input"
          value={provider}
          onChange={(e) => {
            lastProvider.current = '';
            onProviderChange(e.target.value);
            onModelChange('');
          }}
        >
          <option value="">Selecionar...</option>
          <option value="lmstudio">LM Studio (Local)</option>
          <option value="ollama">Ollama (Local)</option>
          <option value="ollamacloud">Ollama Cloud</option>
          <option value="minimax">MiniMax</option>
          <option value="glm">GLM (Zhipu AI)</option>
          <option value="openrouter">OpenRouter (Gemini, GPT, Claude...)</option>
        </select>
      </div>

      <div className="input-group" style={{ flex: 1 }}>
        <label className="input-label">
          Modelo
          {loading && <span className="spinner" style={{ width: 12, height: 12, marginLeft: 8, display: 'inline-block', borderWidth: 1.5 }} />}
        </label>
        <select
          className="input"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!provider || loading}
        >
          <option value="">
            {loading ? 'A carregar...' : error ? 'Erro ao carregar' : 'Selecionar modelo...'}
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {error && (
          <span style={{ fontSize: 11, color: 'var(--error)' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
