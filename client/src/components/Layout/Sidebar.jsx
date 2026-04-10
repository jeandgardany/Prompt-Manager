import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAgents, createAgent } from '../../api/client';

export default function Sidebar() {
  const [agents, setAgents] = useState([]);
  const location = useLocation();

  useEffect(() => {
    getAgents().then(setAgents).catch(console.error);
  }, []);

  // Refresh agents when navigating back to dashboard
  useEffect(() => {
    if (location.pathname === '/') {
      getAgents().then(setAgents).catch(console.error);
    }
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <div className="sidebar-logo-icon">⚡</div>
          <div>
            <h1>Prompt Manager</h1>
            <span>Gestão de Prompts</span>
          </div>
        </NavLink>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Navegação</div>
        <ul className="sidebar-nav">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon">📊</span>
              Dashboard
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Agentes
          <NavLink
            to="/"
            style={{ fontSize: 16, textDecoration: 'none', color: 'var(--text-muted)', lineHeight: 1 }}
            title="Novo Agente"
          >
            +
          </NavLink>
        </div>
        <ul className="sidebar-nav">
          {agents.map((agent) => (
            <li key={agent.id}>
              <NavLink
                to={`/agent/${agent.id}`}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{agent.icon}</span>
                <span style={{ flex: 1 }}>{agent.name}</span>
                <span className="agent-dot" style={{ background: agent.color }} />
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            LM Studio
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            Ollama (Local)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
            Ollama Cloud
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa' }} />
            MiniMax
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-400)' }} />
            GLM (Zhipu AI)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
            OpenRouter
          </div>
        </div>
      </div>
    </aside>
  );
}
