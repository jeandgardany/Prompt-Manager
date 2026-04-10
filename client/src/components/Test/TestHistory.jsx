import { useState, useEffect } from 'react';
import { getTestRuns, getDualRuns } from '../../api/client';

export default function TestHistory({ promptId }) {
  const [activeTab, setActiveTab] = useState('tests');
  const [testRuns, setTestRuns] = useState([]);
  const [dualRuns, setDualRuns] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingDuals, setLoadingDuals] = useState(false);
  const [testCursor, setTestCursor] = useState(null);
  const [testHasMore, setTestHasMore] = useState(false);
  const [dualOffset, setDualOffset] = useState(0);
  const [dualHasMore, setDualHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadTests = async (cursor = null) => {
    setLoadingTests(true);
    try {
      const data = await getTestRuns(promptId, { limit: 10, cursor });
      if (cursor) {
        setTestRuns((prev) => [...prev, ...data.runs]);
      } else {
        setTestRuns(data.runs);
      }
      setTestHasMore(data.pagination.hasMore);
      setTestCursor(data.pagination.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTests(false);
    }
  };

  const loadDuals = async (offset = 0) => {
    setLoadingDuals(true);
    try {
      const data = await getDualRuns(promptId, 10, offset);
      const runs = data.runs || data;
      const hasMore = data.pagination?.hasMore || false;
      if (offset > 0) {
        setDualRuns((prev) => [...prev, ...runs]);
      } else {
        setDualRuns(runs);
      }
      setDualHasMore(hasMore);
      setDualOffset(offset + runs.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDuals(false);
    }
  };

  useEffect(() => {
    loadTests();
    loadDuals();
  }, [promptId]);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d + (d.includes('Z') ? '' : 'Z'));
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>
          Testes ({testRuns.length}{testHasMore ? '+' : ''})
        </button>
        <button className={`tab ${activeTab === 'duals' ? 'active' : ''}`} onClick={() => setActiveTab('duals')}>
          Duelos ({dualRuns.length}{dualHasMore ? '+' : ''})
        </button>
      </div>

      {activeTab === 'tests' && (
        <div>
          {testRuns.length === 0 && !loadingTests ? (
            <div className="card empty-state" style={{ padding: 32 }}>
              <div className="empty-state-title">Nenhum teste realizado</div>
              <div className="empty-state-text">Executa um teste na aba "Testar" para ver o historico aqui.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testRuns.map((run) => (
                <div key={run.id} className="card" style={{ padding: 0, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}>
                  <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="badge badge-accent">v{run.version_number}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{run.provider}/{run.model}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{run.tokens_used} tokens</span>
                      <span>{run.latency_ms}ms</span>
                      <span>{formatDate(run.created_at)}</span>
                      <span>{expandedId === run.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedId === run.id && (
                    <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Output:</div>
                      <div className="output-display" style={{ maxHeight: 300, fontSize: 13 }}>
                        {run.output}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {testHasMore && (
                <button className="btn btn-secondary" onClick={() => loadTests(testCursor)} disabled={loadingTests} style={{ alignSelf: 'center' }}>
                  {loadingTests ? 'A carregar...' : 'Carregar mais'}
                </button>
              )}
            </div>
          )}
          {loadingTests && testRuns.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>
          )}
        </div>
      )}

      {activeTab === 'duals' && (
        <div>
          {dualRuns.length === 0 && !loadingDuals ? (
            <div className="card empty-state" style={{ padding: 32 }}>
              <div className="empty-state-title">Nenhum duelo realizado</div>
              <div className="empty-state-text">Executa um duelo na aba "Duelo de Modelos" para ver o historico aqui.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dualRuns.map((run) => (
                <div key={run.id} className="card" style={{ padding: 0, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}>
                  <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="badge badge-accent">v{run.version_number}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{run.model_a}</span>
                      <span style={{ color: 'var(--text-muted)' }}>vs</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{run.model_b}</span>
                      {run.winner && <span className="badge badge-primary">Vencedor: {run.winner}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{run.sequential ? 'Seq' : 'Par'}</span>
                      <span>{formatDate(run.created_at)}</span>
                      <span>{expandedId === run.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedId === run.id && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="ab-container" style={{ padding: 16 }}>
                        <div className="ab-side">
                          <div className="ab-header ab-header-a" style={{ padding: '8px 12px', fontSize: 12 }}>
                            {run.provider_a}/{run.model_a}
                          </div>
                          <div style={{ padding: 12 }}>
                            {run.error_a ? (
                              <div style={{ color: 'var(--error)', fontSize: 13 }}>{run.error_a}</div>
                            ) : (
                              <>
                                <div className="output-display" style={{ maxHeight: 250, fontSize: 13 }}>{run.output_a}</div>
                                <div className="metrics-bar" style={{ marginTop: 8 }}>
                                  <div className="metric">{run.latency_a_ms}ms</div>
                                  <div className="metric">{run.tokens_a} tokens</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ab-side">
                          <div className="ab-header ab-header-b" style={{ padding: '8px 12px', fontSize: 12 }}>
                            {run.provider_b}/{run.model_b}
                          </div>
                          <div style={{ padding: 12 }}>
                            {run.error_b ? (
                              <div style={{ color: 'var(--error)', fontSize: 13 }}>{run.error_b}</div>
                            ) : (
                              <>
                                <div className="output-display" style={{ maxHeight: 250, fontSize: 13 }}>{run.output_b}</div>
                                <div className="metrics-bar" style={{ marginTop: 8 }}>
                                  <div className="metric">{run.latency_b_ms}ms</div>
                                  <div className="metric">{run.tokens_b} tokens</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {run.judge_result && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 6 }}>Avaliacao do Juiz:</div>
                          <div className="output-display" style={{ maxHeight: 200, fontSize: 12 }}>{run.judge_result}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {dualHasMore && (
                <button className="btn btn-secondary" onClick={() => loadDuals(dualOffset)} disabled={loadingDuals} style={{ alignSelf: 'center' }}>
                  {loadingDuals ? 'A carregar...' : 'Carregar mais'}
                </button>
              )}
            </div>
          )}
          {loadingDuals && dualRuns.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>
          )}
        </div>
      )}
    </div>
  );
}
