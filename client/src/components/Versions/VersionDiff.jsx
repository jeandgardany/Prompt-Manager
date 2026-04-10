/**
 * Simple diff viewer comparing two text versions
 */
export default function VersionDiff({ versionA, versionB }) {
  if (!versionA || !versionB) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-text">
          Seleciona duas versões para comparar
        </div>
      </div>
    );
  }

  const computeDiff = (textA, textB) => {
    const linesA = (textA || '').split('\n');
    const linesB = (textB || '').split('\n');
    const diff = [];
    const maxLen = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === lineB) {
        diff.push({ type: 'unchanged', text: lineA || '' });
      } else {
        if (lineA !== undefined) {
          diff.push({ type: 'removed', text: lineA });
        }
        if (lineB !== undefined) {
          diff.push({ type: 'added', text: lineB });
        }
      }
    }

    return diff;
  };

  const systemDiff = computeDiff(versionA.system_prompt, versionB.system_prompt);
  const userDiff = computeDiff(versionA.user_prompt_template, versionB.user_prompt_template);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="panel-title" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>System Prompt Diff</span>
          <span style={{ fontWeight: 400 }}>
            v{versionA.version} → v{versionB.version}
          </span>
        </div>
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          maxHeight: 350,
          overflowY: 'auto',
        }}>
          {systemDiff.map((line, i) => (
            <div key={i} className={`diff-line ${line.type}`}>
              <span style={{ opacity: 0.5, marginRight: 8, userSelect: 'none' }}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              {line.text || ' '}
            </div>
          ))}
        </div>
      </div>

      {(versionA.user_prompt_template || versionB.user_prompt_template) && (
        <div>
          <div className="panel-title" style={{ marginBottom: 12 }}>User Template Diff</div>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            maxHeight: 250,
            overflowY: 'auto',
          }}>
            {userDiff.map((line, i) => (
              <div key={i} className={`diff-line ${line.type}`}>
                <span style={{ opacity: 0.5, marginRight: 8, userSelect: 'none' }}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.text || ' '}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
