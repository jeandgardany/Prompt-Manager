import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Prompt Editor with variable highlighting
 * Highlights {{variable}} patterns in real time
 */
export default function PromptEditor({ value, onChange, placeholder, label, rows = 10 }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const [variables, setVariables] = useState([]);

  // Extract variables
  useEffect(() => {
    const matches = (value || '').match(/\{\{(\w+)\}\}/g) || [];
    const unique = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
    setVariables(unique);
  }, [value]);

  const syncScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Create highlighted HTML
  const getHighlightedHTML = () => {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\{\{(\w+)\}\}/g, '<mark class="variable-highlight">{{$1}}</mark>')
      + '\n'; // Extra newline to match textarea sizing
  };

  return (
    <div className="prompt-editor-container">
      {label && <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>{label}</label>}

      <div style={{ position: 'relative' }}>
        {/* Highlight overlay */}
        <div
          ref={highlightRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
            color: 'transparent',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid transparent',
          }}
          dangerouslySetInnerHTML={{ __html: getHighlightedHTML() }}
        />

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          className="prompt-editor"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          placeholder={placeholder || 'Escreve o teu prompt aqui...\nUsa {{variavel}} para inserir variáveis dinâmicas.'}
          rows={rows}
          spellCheck={false}
          style={{
            background: 'var(--bg-input)',
            caretColor: 'var(--primary-400)',
          }}
        />
      </div>

      {/* Variables found */}
      {variables.length > 0 && (
        <div className="prompt-variables-list" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Variáveis:</span>
          {variables.map((v) => (
            <span key={v} className="variable-tag">{`{{${v}}}`}</span>
          ))}
        </div>
      )}

      <style>{`
        .variable-highlight {
          background: rgba(99, 102, 241, 0.2);
          color: var(--primary-300);
          border-radius: 4px;
          padding: 1px 2px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
