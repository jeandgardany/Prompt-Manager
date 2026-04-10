const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// Agents
export const getAgents = () => request('/agents');
export const getAgent = (id) => request(`/agents/${id}`);
export const createAgent = (data) => request('/agents', { method: 'POST', body: JSON.stringify(data) });
export const updateAgent = (id, data) => request(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAgent = (id) => request(`/agents/${id}`, { method: 'DELETE' });

// Prompts
export const getPrompts = (agentId) => request(`/prompts${agentId ? `?agent_id=${agentId}` : ''}`);
export const getPrompt = (id) => request(`/prompts/${id}`);
export const createPrompt = (data) => request('/prompts', { method: 'POST', body: JSON.stringify(data) });
export const updatePrompt = (id, data) => request(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePrompt = (id) => request(`/prompts/${id}`, { method: 'DELETE' });

// Versions
export const getVersions = (promptId) => request(`/prompts/${promptId}/versions`);
export const getVersion = (promptId, version) => request(`/prompts/${promptId}/versions/${version}`);

// Test
export const runTest = (data) => request('/test/run', { method: 'POST', body: JSON.stringify(data) });
export const getTestRuns = (promptId) => request(`/test/runs?prompt_id=${promptId}`);
export const runCompare = (data) => request('/test/compare', { method: 'POST', body: JSON.stringify(data) });
export const setWinner = (id, data) => request(`/test/compare/${id}/winner`, { method: 'PUT', body: JSON.stringify(data) });
export const dualRun = (data) => request('/test/dual-run', { method: 'POST', body: JSON.stringify(data) });
export const runJudge = (data) => request('/test/judge', { method: 'POST', body: JSON.stringify(data) });

// Models
export const getModels = (provider) => request(`/models/${provider}`);
export const getAllModels = () => request('/models');
