import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import AgentPage from './pages/AgentPage';
import PromptPage from './pages/PromptPage';

export default function App() {
  const [agentName, setAgentName] = useState('');
  const [promptName, setPromptName] = useState('');

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header agentName={agentName} promptName={promptName} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agent/:id" element={<AgentPage setAgentName={setAgentName} />} />
            <Route
              path="/prompt/:id"
              element={<PromptPage setAgentName={setAgentName} setPromptName={setPromptName} />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}
