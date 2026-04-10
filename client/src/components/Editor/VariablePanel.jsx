/**
 * Panel for filling in prompt variable values
 */
export default function VariablePanel({ variables = [], values = {}, onChange }) {
  if (variables.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
        Nenhuma variável detectada. Usa {'{{nome}}'} no prompt para criar variáveis.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔧</span> Variáveis ({variables.length})
      </div>
      {variables.map((variable) => (
        <div key={variable} className="input-group">
          <label className="input-label">
            <span className="variable-tag" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {`{{${variable}}}`}
            </span>
          </label>
          <input
            className="input"
            type="text"
            value={values[variable] || ''}
            onChange={(e) => onChange({ ...values, [variable]: e.target.value })}
            placeholder={`Valor para ${variable}...`}
          />
        </div>
      ))}
    </div>
  );
}
