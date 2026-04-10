import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPrompt, updatePrompt, getVersions, getVersion } from '../api/client';
import PromptEditor from '../components/Editor/PromptEditor';
import VersionList from '../components/Versions/VersionList';
import VersionDiff from '../components/Versions/VersionDiff';
import TestPanel from '../components/Test/TestPanel';
import ABCompare from '../components/Compare/ABCompare';
import DualModelTest from '../components/Test/DualModelTest';

export default function PromptPage({ setAgentName, setPromptName }) {
  const { id } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userTemplate, setUserTemplate] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('editor');

  // Version diff state
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [diffVersionA, setDiffVersionA] = useState(null);
  const [diffVersionB, setDiffVersionB] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([getPrompt(id), getVersions(id)]);
      setPrompt(p);
      setVersions(v);
      setSystemPrompt(p.system_prompt);
      setUserTemplate(p.user_prompt_template || '');
      setAgentName?.(p.agent_name);
      setPromptName?.(p.name);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      setAgentName?.('');
      setPromptName?.('');
    };
  }, [id]);

  // Track changes
  useEffect(() => {
    if (!prompt) return;
    const changed = systemPrompt !== prompt.system_prompt || userTemplate !== (prompt.user_prompt_template || '');
    setHasChanges(changed);
  }, [systemPrompt, userTemplate, prompt]);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setSaved(false);
    try {
      await updatePrompt(id, {
        system_prompt: systemPrompt,
        user_prompt_template: userTemplate,
        change_note: changeNote || `Versão ${(prompt?.current_version || 0) + 1}`,
      });
      setChangeNote('');
      await loadData();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleVersionSelect = async (version) => {
    setSelectedVersion(version);
    // For diff: store the version data
    if (!diffVersionA) {
      setDiffVersionA(version);
    } else if (!diffVersionB) {
      setDiffVersionB(version);
    } else {
      setDiffVersionA(version);
      setDiffVersionB(null);
    }
  };

  const handleRestoreVersion = (version) => {
    setSystemPrompt(version.system_prompt);
    setUserTemplate(version.user_prompt_template || '');
    setActiveTab('editor');
  };

  // Extract variables from current editor content
  const extractVars = (text) => {
    const matches = (text || '').match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  };

  const currentVariables = [
    ...extractVars(systemPrompt),
    ...extractVars(userTemplate),
  ].filter((v, i, a) => a.indexOf(v) === i);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🤷</div>
        <div className="empty-state-title">Prompt não encontrado</div>
      </div>
    );
  }

  return (
    <div>
      {/* Prompt header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{prompt.agent_icon}</span>
          <div>
            <h1 className="page-title">{prompt.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge-accent">v{prompt.current_version}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{prompt.agent_name}</span>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              className="input"
              placeholder="Nota da versão..."
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              style={{ width: 260 }}
            />
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'A guardar...' : '💾 Guardar Nova Versão'}
            </button>
          </div>
        )}
      </div>

      {/* Save toast */}
      {saved && (
        <div className="toast toast-success">
          ✅ Versão guardada com sucesso!
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24, marginTop: 20 }}>
        <button className={`tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
          ✏️ Editor
        </button>
        <button className={`tab ${activeTab === 'test' ? 'active' : ''}`} onClick={() => setActiveTab('test')}>
          🧪 Testar
        </button>
        <button className={`tab ${activeTab === 'versions' ? 'active' : ''}`} onClick={() => setActiveTab('versions')}>
          📋 Versões ({versions.length})
        </button>
        <button className={`tab ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
          ⚖️ Comparar A/B
        </button>
        <button className={`tab ${activeTab === 'duel' ? 'active' : ''}`} onClick={() => setActiveTab('duel')}>
          ⚔️ Duelo de Modelos
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'editor' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div className="card">
            <PromptEditor
              label="System Prompt"
              value={systemPrompt}
              onChange={setSystemPrompt}
              rows={12}
              placeholder="Define o comportamento do agente...&#10;Usa {{variavel}} para partes dinâmicas."
            />
          </div>

          <div className="card">
            <PromptEditor
              label="User Prompt Template (opcional)"
              value={userTemplate}
              onChange={setUserTemplate}
              rows={6}
              placeholder="Template para a mensagem do utilizador...&#10;ex: Escreve um artigo sobre {{titulo}} com foco em {{tema}}"
            />
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <TestPanel
          promptId={id}
          version={prompt.current_version}
          variables={currentVariables}
        />
      )}

      {activeTab === 'versions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Histórico</div>
            </div>
            <VersionList
              versions={versions}
              activeVersion={selectedVersion?.version}
              onSelect={handleVersionSelect}
            />
          </div>

          <div className="card">
            {selectedVersion ? (
              <div>
                <div className="card-header">
                  <div>
                    <div className="card-title">Versão {selectedVersion.version}</div>
                    <div className="card-subtitle">{selectedVersion.change_note}</div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestoreVersion(selectedVersion)}
                  >
                    ↩ Restaurar
                  </button>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div className="panel-title" style={{ marginBottom: 8 }}>System Prompt</div>
                  <div className="output-display" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {selectedVersion.system_prompt}
                  </div>
                </div>

                {selectedVersion.user_prompt_template && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="panel-title" style={{ marginBottom: 8 }}>User Template</div>
                    <div className="output-display" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {selectedVersion.user_prompt_template}
                    </div>
                  </div>
                )}

                {/* Diff section */}
                {diffVersionA && diffVersionB && (
                  <div style={{ marginTop: 24 }}>
                    <VersionDiff versionA={diffVersionA} versionB={diffVersionB} />
                  </div>
                )}

                {diffVersionA && !diffVersionB && (
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                  }}>
                    💡 Seleciona outra versão para ver o diff
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👈</div>
                <div className="empty-state-title">Seleciona uma versão</div>
                <div className="empty-state-text">
                  Clica numa versão para ver os detalhes ou seleciona duas para comparar.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <ABCompare
          promptId={id}
          versions={versions}
          variables={currentVariables}
        />
      )}

      {activeTab === 'duel' && (
        <DualModelTest
          promptId={id}
          version={prompt.current_version}
          variables={currentVariables}
        />
      )}
    </div>
  );
}
