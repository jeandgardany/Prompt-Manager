import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import AgentPage from './pages/AgentPage';
import PromptPage from './pages/PromptPage';

export default function App() {
  const [agentName, setAgentName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [promptName, setPromptName] = useState('');
  const [sidebarKey, setSidebarKey] = useState(0);

  const refreshSidebar = useCallback(() => setSidebarKey((k) => k + 1), []);

  return (
    <div className="app-layout">
      <Sidebar key={sidebarKey} />
      <div className="main-content">
        <Header agentName={agentName} agentId={agentId} promptName={promptName} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard onAgentsChange={refreshSidebar} />} />
            <Route path="/agent/:id" element={<AgentPage setAgentName={setAgentName} setAgentId={setAgentId} />} />
            <Route
              path="/prompt/:id"
              element={<PromptPage setAgentName={setAgentName} setAgentId={setAgentId} setPromptName={setPromptName} />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}
