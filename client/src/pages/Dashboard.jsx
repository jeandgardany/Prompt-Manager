import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgents, getPrompts, createAgent, deleteAgent } from '../api/client';

export default function Dashboard({ onAgentsChange }) {
  const [agents, setAgents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', icon: '', color: '#6366f1' });
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    Promise.all([getAgents(), getPrompts()])
      .then(([a, p]) => {
        setAgents(a);
        setPrompts(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAgent = async () => {
    if (!newAgent.name) return;
    setCreating(true);
    try {
      await createAgent(newAgent);
      setShowCreate(false);
      setNewAgent({ name: '', description: '', icon: '', color: '#6366f1' });
      loadData();
      onAgentsChange?.();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAgent = async (agent) => {
    setDeleting(true);
    try {
      await deleteAgent(agent.id);
      setDeleteConfirm(null);
      loadData();
      onAgentsChange?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="stat-value">6</div>
          <div className="stat-label">Providers</div>
        </div>
      </div>

      {/* Agents */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Agentes</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Novo Agente
        </button>
      </div>
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
              <div style={{ flex: 1 }}>
                <div className="prompt-card-name">{agent.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{agent.description}</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(agent); }}
                title="Excluir agente"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              >
                🗑️
              </button>
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

      {/* Create Agent Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Criar Novo Agente</h3>

            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">Nome *</label>
              <input
                className="input"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                placeholder="ex: Suporte, Vendas, Marketing..."
              />
            </div>

            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">Descricao</label>
              <input
                className="input"
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                placeholder="ex: Assistente de suporte ao cliente"
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Icone (emoji)</label>
                <input
                  className="input"
                  value={newAgent.icon}
                  onChange={(e) => setNewAgent({ ...newAgent, icon: e.target.value })}
                  placeholder="ex: 🤖 🧠 ⚡"
                  maxLength={4}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Cor</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={newAgent.color}
                    onChange={(e) => setNewAgent({ ...newAgent, color: e.target.value })}
                    style={{ width: 40, height: 36, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input
                    className="input"
                    value={newAgent.color}
                    onChange={(e) => setNewAgent({ ...newAgent, color: e.target.value })}
                    placeholder="#6366f1"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateAgent}
                disabled={creating || !newAgent.name}
              >
                {creating ? 'A criar...' : 'Criar Agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--error, #ef4444)' }}>Excluir Agente</h3>
            <p style={{ margin: '16px 0', lineHeight: 1.6 }}>
              Deseja mesmo excluir o agente <strong>"{deleteConfirm.name}"</strong>?
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Esta acao e irreversivel. Todos os prompts, versoes e historico de testes associados a este agente serao permanentemente removidos.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                Cancelar
              </button>
              <button
                className="btn"
                style={{ background: 'var(--error, #ef4444)', color: '#fff' }}
                onClick={() => handleDeleteAgent(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? 'A excluir...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

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
