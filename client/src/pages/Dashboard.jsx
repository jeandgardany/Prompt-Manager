import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgents, getPrompts } from '../api/client';

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getAgents(), getPrompts()])
      .then(([a, p]) => {
        setAgents(a);
        setPrompts(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalVersions = prompts.reduce((sum, p) => sum + (p.current_version || 1), 0);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Visão geral dos teus agentes e prompts</p>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 32 }}>
        <div className="card stat-card">
          <div className="stat-value">{agents.length}</div>
          <div className="stat-label">Agentes</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{prompts.length}</div>
          <div className="stat-label">Prompts</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalVersions}</div>
          <div className="stat-label">Versões</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Providers</div>
        </div>
      </div>

      {/* Agents */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Agentes</h2>
      <div className="grid grid-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="card prompt-card"
            onClick={() => navigate(`/agent/${agent.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: `${agent.color}20`,
                border: `1px solid ${agent.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                {agent.icon}
              </div>
              <div>
                <div className="prompt-card-name">{agent.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{agent.description}</div>
              </div>
            </div>
            <div className="prompt-card-meta">
              <span className="badge badge-primary">
                {agent.prompt_count || 0} prompts
              </span>
              <span className="agent-dot" style={{ background: agent.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent prompts */}
      {prompts.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 16 }}>Prompts Recentes</h2>
          <div className="grid grid-2">
            {prompts.slice(0, 6).map((prompt) => (
              <div
                key={prompt.id}
                className="card prompt-card"
                onClick={() => navigate(`/prompt/${prompt.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{prompt.agent_icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{prompt.agent_name}</span>
                </div>
                <div className="prompt-card-name">{prompt.name}</div>
                <div className="prompt-card-preview">{prompt.system_prompt}</div>
                <div className="prompt-card-meta">
                  <span className="badge badge-accent">v{prompt.current_version}</span>
                  {prompt.variables?.map((v) => (
                    <span key={v} className="variable-tag">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
