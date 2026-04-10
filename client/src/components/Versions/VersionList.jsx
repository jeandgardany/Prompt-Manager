/**
 * Version list with timeline visual
 */
export default function VersionList({ versions = [], activeVersion, onSelect }) {
  if (versions.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">Nenhuma versão registrada</div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="version-timeline">
      {versions.map((v) => (
        <div
          key={v.version}
          className={`version-item ${activeVersion === v.version ? 'active' : ''}`}
          onClick={() => onSelect(v)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="version-number">v{v.version}</span>
            <span className="version-date">{formatDate(v.created_at)}</span>
          </div>
          <div className="version-note">{v.change_note}</div>
        </div>
      ))}
    </div>
  );
}
