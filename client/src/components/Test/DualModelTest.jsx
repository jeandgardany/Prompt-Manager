import { useState } from 'react';
import ModelSelector from '../Test/ModelSelector';
import VariablePanel from '../Editor/VariablePanel';
import { dualRun, runJudge } from '../../api/client';

/**
 * Dual Model Test — test same prompt on 2 different models side by side
 * with optional AI Judge via OpenRouter
 */
export default function DualModelTest({ promptId, version, variables = [] }) {
  // Model A
  const [providerA, setProviderA] = useState('');
  const [modelA, setModelA] = useState('');
  // Model B
  const [providerB, setProviderB] = useState('');
  const [modelB, setModelB] = useState('');

  // Variables
  const [varValues, setVarValues] = useState({});
  const [maxTokens, setMaxTokens] = useState(4096);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);

  // Results
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Images
  const [images, setImages] = useState([]);

  // Judge
  const [judgeProvider, setJudgeProvider] = useState('openrouter');
  const [judgeModel, setJudgeModel] = useState('');
  const [judgeResult, setJudgeResult] = useState(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState('');
  const [showJudge, setShowJudge] = useState(false);
  const [runningStep, setRunningStep] = useState(''); // 'A', 'B', 'both'

  // Auto-detect if sequential execution is needed
  const isSequential = providerA && providerB && providerA === providerB;

  const handleDualRun = async () => {
    if (!providerA || !modelA || !providerB || !modelB) {
      setError('Seleciona provider e modelo para ambos os lados.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setJudgeResult(null);
    setRunningStep(isSequential ? 'A' : 'both');

    try {
      const data = await dualRun({
        prompt_id: promptId,
        version,
        variables: varValues,
        images,
        providerA,
        modelA,
        providerB,
        modelB,
        maxTokens,
        thinkingEnabled,
        sequential: isSequential,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRunningStep('');
    }
  };

  const handleJudge = async () => {
    if (!result?.a?.output || !result?.b?.output) {
      setJudgeError('Executa os dois modelos primeiro.');
      return;
    }
    if (!judgeModel) {
      setJudgeError('Seleciona um modelo para o juiz.');
      return;
    }

    setJudgeLoading(true);
    setJudgeError('');
    setJudgeResult(null);

    try {
      const data = await runJudge({
        promptText: result.promptText,
        outputA: result.a.output,
        outputB: result.b.output,
        modelAName: `${result.a.provider}/${result.a.model}`,
        modelBName: `${result.b.provider}/${result.b.model}`,
        judgeProvider,
        judgeModel,
      });
      setJudgeResult(data);
    } catch (err) {
      setJudgeError(err.message);
    } finally {
      setJudgeLoading(false);
    }
  };

  const getProviderLabel = (provider) => {
    switch (provider) {
      case 'lmstudio': return '🖥️ LM Studio';
      case 'ollama': return '🦙 Ollama Local';
      case 'ollamacloud': return '☁️ Ollama Cloud';
      case 'minimax': return 'Ⓜ️ MiniMax';
      case 'glm': return '🇨🇳 GLM';
      case 'openrouter': return '🌐 OpenRouter';
      default: return provider;
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Configuration card */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚔️</span> Duelo de Modelos
            {version && <span className="badge badge-primary">v{version}</span>}
            {providerA && providerB && (
              <span className="badge" style={{
                background: isSequential ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isSequential ? 'var(--warning)' : 'var(--success)',
                fontSize: 10,
              }}>
                {isSequential ? '🔄 Sequencial' : '⚡ Paralelo'}
              </span>
            )}
          </div>
          <button
            className="btn btn-accent btn-lg"
            onClick={handleDualRun}
            disabled={loading || !providerA || !modelA || !providerB || !modelB}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                {runningStep === 'A' ? 'A executar Modelo A...' : runningStep === 'B' ? 'A executar Modelo B...' : 'A executar...'}
              </>
            ) : (
              <>⚡ Executar Duelo</>
            )}
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Two model selectors side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Model A */}
            <div style={{
              padding: 20,
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-400)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--primary-500)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                }}>A</span>
                Modelo A
              </div>
              <ModelSelector
                provider={providerA}
                model={modelA}
                onProviderChange={setProviderA}
                onModelChange={setModelA}
              />
            </div>

            {/* Model B */}
            <div style={{
              padding: 20,
              background: 'rgba(168, 85, 247, 0.05)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--purple-400)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--purple-500)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                }}>B</span>
                Modelo B
              </div>
              <ModelSelector
                provider={providerB}
                model={modelB}
                onProviderChange={setProviderB}
                onModelChange={setModelB}
              />
            </div>
          </div>

          {/* Execution mode info */}
          {providerA && providerB && isSequential && (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⚠️</span>
              <span>Mesmo provider detectado — execução <strong>sequencial</strong> (um de cada vez) para evitar conflitos de memória. Modelos locais farão "warm-up" automático para métricas de tempo justas.</span>
            </div>
          )}

          {/* Images */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              📷 Imagens (Usadas por ambos os modelos caso sejam Vision)
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={img} alt={`upload-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removeImage(idx)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'var(--error)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
              <label style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', fontSize: 24, color: 'var(--text-muted)' }}>
                +
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Max Tokens + Thinking Toggle */}
          <div style={{ display: 'flex', gap: 16, marginTop: 20, alignItems: 'flex-start' }}>
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

          {/* Variables */}
          {variables.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <VariablePanel variables={variables} values={varValues} onChange={setVarValues} />
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, color: 'var(--error)', fontSize: 13 }}>❌ {error}</div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 15 }}>
            {isSequential ? (
              <>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Execução Sequencial</div>
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: 32,
                  fontSize: 13, marginBottom: 12,
                }}>
                  <div style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    opacity: 1,
                  }}>
                    <span style={{ marginRight: 6 }}>🅰️</span>
                    {modelA || 'Modelo A'}
                    <span style={{ marginLeft: 8, color: 'var(--primary-400)' }}>✓ A executar</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: 16 }}>→</div>
                  <div style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: 'rgba(168, 85, 247, 0.05)',
                    border: '1px solid rgba(168, 85, 247, 0.15)',
                    opacity: 0.5,
                  }}>
                    <span style={{ marginRight: 6 }}>🅱️</span>
                    {modelB || 'Modelo B'}
                    <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>⏳ Em fila</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  ⏳ Inclui ~10s de espera entre modelos para libertar memória
                </div>
              </>
            ) : (
              'A executar ambos os modelos em paralelo...'
            )}
          </div>
        </div>
      )}

      {/* Results side by side */}
      {result && !loading && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div className="panel-title">📊 Resultados</div>
          </div>

          <div className="ab-container" style={{ padding: 24 }}>
            {/* Output A */}
            <div className="ab-side">
              <div className="ab-header ab-header-a">
                <div>Modelo A</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginTop: 4 }}>
                  {getProviderLabel(result.a.provider)} — {result.a.model}
                </div>
              </div>
              <div className="ab-content">
                {result.a.error ? (
                  <div style={{ color: 'var(--error)', padding: 16 }}>❌ {result.a.error}</div>
                ) : (
                  <>
                    <div className="output-display" style={{ minHeight: 250, maxHeight: 500 }}>
                      {result.a.output}
                    </div>
                    <div className="metrics-bar">
                      <div className="metric">⏱️ <span className="metric-value">{result.a.latencyMs}ms</span></div>
                      <div className="metric">🔤 <span className="metric-value">{result.a.tokensUsed}</span> tokens</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Output B */}
            <div className="ab-side">
              <div className="ab-header ab-header-b">
                <div>Modelo B</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginTop: 4 }}>
                  {getProviderLabel(result.b.provider)} — {result.b.model}
                </div>
              </div>
              <div className="ab-content">
                {result.b.error ? (
                  <div style={{ color: 'var(--error)', padding: 16 }}>❌ {result.b.error}</div>
                ) : (
                  <>
                    <div className="output-display" style={{ minHeight: 250, maxHeight: 500 }}>
                      {result.b.output}
                    </div>
                    <div className="metrics-bar">
                      <div className="metric">⏱️ <span className="metric-value">{result.b.latencyMs}ms</span></div>
                      <div className="metric">🔤 <span className="metric-value">{result.b.tokensUsed}</span> tokens</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Speed comparison bar */}
          {result.a.latencyMs > 0 && result.b.latencyMs > 0 && (
            <div style={{ padding: '0 24px 24px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
                Comparação de velocidade
              </div>
              <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  flex: result.b.latencyMs,
                  background: 'var(--primary-500)',
                  borderRadius: '4px 0 0 4px',
                  transition: 'flex 0.5s ease',
                }} />
                <div style={{
                  flex: result.a.latencyMs,
                  background: 'var(--purple-500)',
                  borderRadius: '0 4px 4px 0',
                  transition: 'flex 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>A: {result.a.latencyMs}ms {result.a.latencyMs < result.b.latencyMs ? '🏆' : ''}</span>
                <span>{result.b.latencyMs < result.a.latencyMs ? '🏆' : ''} B: {result.b.latencyMs}ms</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Judge section */}
      {result && !loading && result.a.output && result.b.output && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🧑‍⚖️</span> Juiz IA
              <span className="badge badge-warning">OpenRouter</span>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => setShowJudge(!showJudge)}
            >
              {showJudge ? '▲ Esconder' : '▼ Expandir'}
            </button>
          </div>

          {showJudge && (
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Usa um modelo externo (Gemini, GPT, Claude, etc.) via OpenRouter para avaliar automaticamente
                qual dos dois modelos produziu a melhor resposta, com pontos positivos e negativos de cada um.
              </p>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <ModelSelector
                    provider={judgeProvider}
                    model={judgeModel}
                    onProviderChange={setJudgeProvider}
                    onModelChange={setJudgeModel}
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleJudge}
                  disabled={judgeLoading || !judgeModel}
                  style={{ minWidth: 180 }}
                >
                  {judgeLoading ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      A avaliar...
                    </>
                  ) : (
                    <>🧑‍⚖️ Avaliar com IA</>
                  )}
                </button>
              </div>

              {judgeError && (
                <div style={{ marginTop: 16, color: 'var(--error)', fontSize: 13 }}>❌ {judgeError}</div>
              )}

              {judgeLoading && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
                  <div style={{ color: 'var(--text-muted)' }}>O juiz IA está a analisar as respostas...</div>
                </div>
              )}

              {judgeResult && (
                <div style={{
                  marginTop: 20,
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(99, 102, 241, 0.05))',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>🏆</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--warning)' }}>
                      Avaliação do Juiz IA
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      via {judgeModel} • {judgeResult.latencyMs}ms
                    </span>
                  </div>
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.8,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    {judgeResult.output}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
