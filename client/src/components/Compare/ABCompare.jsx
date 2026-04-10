import { useState } from 'react';
import ModelSelector from '../Test/ModelSelector';
import VariablePanel from '../Editor/VariablePanel';
import { runCompare, setWinner as apiSetWinner } from '../../api/client';

/**
 * A/B Comparison view
 */
export default function ABCompare({ promptId, versions = [], variables = [] }) {
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [varValues, setVarValues] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [winner, setWinner] = useState('');
  const [notes, setNotes] = useState('');

  const handleCompare = async () => {
    if (!versionA || !versionB || !provider || !model) {
      setError('Preenche todos os campos: versões, provider e modelo.');
      return;
    }
    if (versionA === versionB) {
      setError('Seleciona versões diferentes para comparar.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setWinner('');

    try {
      const data = await runCompare({
        prompt_id: promptId,
        version_a: parseInt(versionA),
        version_b: parseInt(versionB),
        provider,
        model,
        variables: varValues,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetWinner = async (w) => {
    if (!result?.comparison?.id) return;
    setWinner(w);
    try {
      await apiSetWinner(result.comparison.id, { winner: w, notes });
    } catch (err) {
      console.error('Error setting winner:', err);
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
          <span>⚖️</span> Comparação A/B
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={loading || !versionA || !versionB || !provider || !model}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              A comparar...
            </>
          ) : (
            <>🔄 Comparar</>
          )}
        </button>
      </div>

      {/* Configuration */}
      <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16, alignItems: 'flex-end' }}>
          <div className="input-group">
            <label className="input-label">Versão A</label>
            <select className="input" value={versionA} onChange={(e) => setVersionA(e.target.value)}>
              <option value="">Selecionar...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>v{v.version} — {v.change_note}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Versão B</label>
            <select className="input" value={versionB} onChange={(e) => setVersionB(e.target.value)}>
              <option value="">Selecionar...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>v{v.version} — {v.change_note}</option>
              ))}
            </select>
          </div>

          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />
        </div>

        {variables.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <VariablePanel variables={variables} values={varValues} onChange={setVarValues} />
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, color: 'var(--error)', fontSize: 13 }}>❌ {error}</div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="ab-container" style={{ padding: 24 }}>
            {/* Version A */}
            <div className="ab-side">
              <div className="ab-header ab-header-a">
                Versão A — v{result.comparison.version_a}
              </div>
              <div className="ab-content">
                <div className="output-display" style={{ minHeight: 200 }}>
                  {result.a.output}
                </div>
                <div className="metrics-bar">
                  <div className="metric">⏱️ <span className="metric-value">{result.a.latency_ms || result.a.latencyMs}ms</span></div>
                  <div className="metric">🔤 <span className="metric-value">{result.a.tokens_used || result.a.tokensUsed}</span> tokens</div>
                </div>
              </div>
            </div>

            {/* Version B */}
            <div className="ab-side">
              <div className="ab-header ab-header-b">
                Versão B — v{result.comparison.version_b}
              </div>
              <div className="ab-content">
                <div className="output-display" style={{ minHeight: 200 }}>
                  {result.b.output}
                </div>
                <div className="metrics-bar">
                  <div className="metric">⏱️ <span className="metric-value">{result.b.latency_ms || result.b.latencyMs}ms</span></div>
                  <div className="metric">🔤 <span className="metric-value">{result.b.tokens_used || result.b.tokensUsed}</span> tokens</div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner selection */}
          <div style={{ padding: 24, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Qual versão é melhor?
              </span>
            </div>
            <div className="ab-winner">
              <button
                className={`winner-btn winner-btn-a ${winner === 'A' ? 'selected' : ''}`}
                onClick={() => handleSetWinner('A')}
              >
                🏆 Versão A
              </button>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>vs</span>
              <button
                className={`winner-btn winner-btn-b ${winner === 'B' ? 'selected' : ''}`}
                onClick={() => handleSetWinner('B')}
              >
                🏆 Versão B
              </button>
            </div>
            <div className="input-group" style={{ maxWidth: 500, margin: '16px auto 0' }}>
              <input
                className="input"
                placeholder="Notas sobre a comparação (opcional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-muted)' }}>A executar ambas as versões...</div>
        </div>
      )}
    </div>
  );
}
