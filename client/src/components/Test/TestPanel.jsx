import { useState } from 'react';
import ModelSelector from './ModelSelector';
import VariablePanel from '../Editor/VariablePanel';
import { runTest } from '../../api/client';

/**
 * Test Panel — split view with inputs on left, output on right
 */
export default function TestPanel({ promptId, version, variables = [] }) {
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [varValues, setVarValues] = useState({});
  const [maxTokens, setMaxTokens] = useState(4096);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  const handleRun = async () => {
    if (!provider || !model) {
      setError('Seleciona um provider e modelo.');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');
    setMetrics(null);

    try {
      const result = await runTest({
        prompt_id: promptId,
        version,
        provider,
        model,
        variables: varValues,
        maxTokens,
        thinkingEnabled,
      });

      setOutput(result.output);
      setMetrics({
        tokens: result.tokens_used || result.tokensUsed || 0,
        latency: result.latency_ms || result.latencyMs || 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🧪</span> Testar Prompt
          {version && <span className="badge badge-primary">v{version}</span>}
        </div>
        <button
          className="btn btn-accent"
          onClick={handleRun}
          disabled={loading || !provider || !model}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              A processar...
            </>
          ) : (
            <>▶ Testar agora</>
          )}
        </button>
      </div>

      <div className="split-panel" style={{ padding: 24 }}>
        {/* Left — Inputs */}
        <div className="panel">
          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />

          <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-start' }}>
            <div className="input-group">
              <label className="input-label">Max Tokens</label>
              <input
                className="input"
                type="number"
                min={256}
                max={32768}
                step={256}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                style={{ width: 140 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                1 palavra ~ 1.3 tokens
              </span>
            </div>
            <div className="input-group">
              <label className="input-label">Thinking (CoT)</label>
              <button
                type="button"
                className={`btn btn-sm ${thinkingEnabled ? 'btn-accent' : 'btn-secondary'}`}
                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                style={{ marginTop: 2, minWidth: 80 }}
              >
                {thinkingEnabled ? '🧠 ON' : '🚫 OFF'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {thinkingEnabled ? 'Mostra raciocinio' : 'Sem raciocinio'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <VariablePanel
              variables={variables}
              values={varValues}
              onChange={setVarValues}
            />
          </div>
        </div>

        {/* Right — Output */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Output</div>
            {metrics && (
              <div className="metrics-bar" style={{ padding: 0 }}>
                <div className="metric">
                  ⏱️ <span className="metric-value">{metrics.latency}ms</span>
                </div>
                <div className="metric">
                  🔤 <span className="metric-value">{metrics.tokens}</span> tokens
                </div>
              </div>
            )}
          </div>

          <div className={`output-display ${!output && !loading && !error ? 'empty' : ''}`}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                <div className="spinner spinner-lg" />
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>A gerar resposta...</span>
              </div>
            ) : error ? (
              <div style={{ color: 'var(--error)' }}>
                ❌ {error}
              </div>
            ) : output ? (
              <span>{output}</span>
            ) : (
              'Clica "Testar agora" para ver o output do modelo'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
