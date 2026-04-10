import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent, getPrompts, createPrompt, deletePrompt } from '../api/client';

export default function AgentPage({ setAgentName, setAgentId }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', system_prompt: '', user_prompt_template: '' });
  const [creating, setCreating] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([getAgent(id), getPrompts(id)])
      .then(([a, p]) => {
        setAgent(a);
        setPrompts(p);
        setAgentName?.(a.name);
        setAgentId?.(a.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    return () => { setAgentName?.(''); setAgentId?.(''); };
  }, [id]);

  const handleCreate = async () => {
    if (!newPrompt.name || !newPrompt.system_prompt) return;
    setCreating(true);
    try {
      await createPrompt({ ...newPrompt, agent_id: id });
      setShowCreate(false);
      setNewPrompt({ name: '', system_prompt: '', user_prompt_template: '' });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (promptId, e) => {
    e.stopPropagation();
    if (!confirm('Tens a certeza que queres apagar este prompt?')) return;
    try {
      await deletePrompt(promptId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🤷</div>
        <div className="empty-state-title">Agente não encontrado</div>
      </div>
    );
  }

  return (
    <div>
      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: `${agent.color}20`,
          border: `2px solid ${agent.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}>
          {agent.icon}
        </div>
        <div>
          <h1 className="page-title">{agent.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{agent.description}</p>
        </div>
      </div>

      {/* Actions bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ➕ Novo Prompt
        </button>
      </div>

      {/* Create prompt modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Criar Novo Prompt</h3>

            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">Nome</label>
              <input
                className="input"
                value={newPrompt.name}
                onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                placeholder="ex: Prompt de Atendimento"
              />
            </div>

            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">System Prompt</label>
              <textarea
                className="input textarea-mono"
                rows={8}
                value={newPrompt.system_prompt}
                onChange={(e) => setNewPrompt({ ...newPrompt, system_prompt: e.target.value })}
                placeholder="Tu és um assistente que...&#10;Usa {{variavel}} para variáveis dinâmicas."
              />
            </div>

            <div className="input-group">
              <label className="input-label">User Prompt Template (opcional)</label>
              <textarea
                className="input textarea-mono"
                rows={4}
                value={newPrompt.user_prompt_template}
                onChange={(e) => setNewPrompt({ ...newPrompt, user_prompt_template: e.target.value })}
                placeholder="ex: Cria um blog post sobre {{titulo}}"
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating || !newPrompt.name || !newPrompt.system_prompt}
              >
                {creating ? 'A criar...' : 'Criar Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt list */}
      {prompts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">✏️</div>
          <div className="empty-state-title">Nenhum prompt criado</div>
          <div className="empty-state-text">
            Cria o teu primeiro prompt para o agente {agent.name}.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setShowCreate(true)}
          >
            ➕ Criar Prompt
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="card prompt-card"
              onClick={() => navigate(`/prompt/${prompt.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="prompt-card-name">{prompt.name}</div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => handleDelete(prompt.id, e)}
                  title="Apagar prompt"
                  style={{ color: 'var(--text-muted)' }}
                >
                  🗑️
                </button>
              </div>
              <div className="prompt-card-preview">{prompt.system_prompt}</div>
              <div className="prompt-card-meta">
                <span className="badge badge-accent">v{prompt.current_version}</span>
                {prompt.variables?.slice(0, 3).map((v) => (
                  <span key={v} className="variable-tag">{`{{${v}}}`}</span>
                ))}
                {prompt.variables?.length > 3 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    +{prompt.variables.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
