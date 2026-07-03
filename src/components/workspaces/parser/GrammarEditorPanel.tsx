import React, { useRef, useEffect, useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { useTraceabilityStore } from '@/store/traceabilityStore';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface EditorContentProps {
  mode: 'grouped' | 'flat';
  value: string;
  ghostText?: string;
  lastEdited: 'grouped' | 'flat';
  setRawText: (val: string) => void;
  setLastEdited: (val: 'grouped' | 'flat') => void;
  setFocusedProduction: (val: number | null) => void;
  setFlatError: (err: string | null) => void;
}

const EditorContent = ({ 
  mode, 
  value, 
  ghostText,
  lastEdited,
  setRawText,
  setLastEdited,
  setFocusedProduction,
  setFlatError
}: EditorContentProps) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const lines = value.split('\n');
  const currentLineIndex = value.slice(0, cursorPos).split('\n').length - 1;

  useEffect(() => {
    const ta = taRef.current;
    const ln = lineNumRef.current;
    const ov = overlayRef.current;
    if (!ta || !ln || !ov) return;
    const sync = () => { 
      ln.scrollTop = ta.scrollTop; 
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    };
    ta.addEventListener('scroll', sync);
    return () => ta.removeEventListener('scroll', sync);
  }, []);

  const handleSelectionChange = () => {
    if (taRef.current) {
      setCursorPos(taRef.current.selectionStart);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    
    if (e.key === 'Enter' && mode === 'flat') {
      e.preventDefault();
      const start = ta.selectionStart;
      const allMatches = [...value.matchAll(/^(\d+):/gm)];
      let nextNum = 0;
      if (allMatches.length > 0) {
         nextNum = Math.max(...allMatches.map(m => parseInt(m[1]))) + 1;
      } else {
         nextNum = value.slice(0, start).split('\n').length;
      }
      
      const insertStr = `\n${nextNum}: `;
      const newVal = value.slice(0, start) + insertStr + value.slice(ta.selectionEnd);
      setRawText(newVal);
      setLastEdited(mode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insertStr.length; setCursorPos(ta.selectionStart); }, 0);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end && ghostText && currentLineIndex === (value.slice(0, start).split('\n').length - 1)) {
        const newVal = value.slice(0, start) + ghostText + value.slice(end);
        setRawText(newVal);
        setLastEdited(mode);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + ghostText.length; setCursorPos(ta.selectionStart); }, 0);
        return;
      }
      const newVal = value.slice(0, start) + '  ' + value.slice(end);
      setRawText(newVal);
      setLastEdited(mode);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; setCursorPos(ta.selectionStart); }, 0);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div ref={lineNumRef} style={{
          width: '32px', flexShrink: 0, background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-subtle)', padding: '8px 0',
          overflowY: 'hidden', userSelect: 'none', pointerEvents: 'none'
      }}>
        {lines.map((_, i) => (
          <div key={i} style={{ height: '21px', lineHeight: '21px', textAlign: 'right', paddingRight: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {i + 1}
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div ref={overlayRef} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            padding: '8px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: '21px',
            color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            overflow: 'hidden', pointerEvents: 'none'
        }}>
          {lines.map((lineText, i) => {
            let elements = [<span key="text">{lineText}</span>];
            if (i === currentLineIndex && ghostText && lastEdited === mode) {
              elements.push(<span key="ghost" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{ghostText}</span>);
            }
            // Add a zero-width space for empty lines to ensure the div maintains correct height (minHeight also helps)
            if (elements.length === 1 && !lineText) {
              elements = [<span key="text">&#8203;</span>];
            }
            return <div key={i} style={{ minHeight: '21px' }}>{elements}</div>;
          })}
        </div>

        <textarea
          ref={taRef}
          value={value}
          onChange={e => {
            let val = e.target.value;
            
            if (mode === 'flat' && val.includes('|')) {
              setFlatError("Illegal symbol '|' in Numbered Productions. Use a new line instead.");
              val = val.replace(/\|/g, '');
            } else if (mode === 'flat') {
              setFlatError(null);
            }

            val = val.replace(/\b(eps|epsilon)\b/gi, 'ε');
            // Capitalize starting non-terminals. Accounts for Flat mode prefix (e.g. "0: e" -> "0: E")
            val = val.replace(/(^|\n)(?:\d+:\s*)?([a-z])/g, (match, p1, p2) => match.slice(0, -1) + p2.toUpperCase());
            
            setRawText(val);
            setLastEdited(mode);
            handleSelectionChange();
          }}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          onFocus={() => {
            setFocusedProduction(null);
            if (lastEdited !== mode) {
              const { cfg } = useGrammarStore.getState();
              if (cfg) {
                if (mode === 'flat') {
                  // Format lines for flat
                  const fmtLines = cfg.productions.map((p, i) => `${i}: ${p.lhs} -> ${p.rhs.join(' ') || 'ε'}`);
                  setRawText(fmtLines.join('\n'));
                } else {
                  // Format lines for grouped
                  const map = new Map<string, string[][]>();
                  for (const p of cfg.productions) {
                    if (!map.has(p.lhs)) map.set(p.lhs, []);
                    map.get(p.lhs)!.push(p.rhs);
                  }
                  const fmtLines = Array.from(map.entries()).map(([lhs, alts]) => {
                    return `${lhs} -> ${alts.map(alt => alt.join(' ') || 'ε').join(' | ')}`;
                  });
                  setRawText(fmtLines.join('\n'));
                }
              } else {
                return; // Block switching view if there's a syntax error
              }
              setLastEdited(mode);
            }
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={lastEdited !== mode}
          placeholder={lastEdited !== mode ? 'Read only (switch view to edit)' : 'Enter grammar rules here...'}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            padding: '8px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
            lineHeight: '21px', color: 'transparent', background: 'transparent',
            border: 'none', resize: 'none', outline: 'none', overflowY: 'auto',
            overflowX: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            caretColor: 'var(--text-primary)'
          }}
        />
      </div>
    </div>
  );
};

const AccordionHeader = ({ isOpen, onToggle, label }: { isOpen: boolean, onToggle: () => void, label: string }) => {
  return (
    <div 
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', padding: '4px 8px',
        cursor: 'pointer', userSelect: 'none',
        background: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em',
        transition: 'background 0.15s, color 0.15s'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', marginRight: '6px', color: 'var(--text-muted)' }}>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </span>
      {label}
    </div>
  );
};

export function GrammarEditorPanel() {
  const { rawText, setRawText, cfg } = useGrammarStore();
  const { setFocusedProduction } = useTraceabilityStore();
  
  const [openGrouped, setOpenGrouped] = useState(true);
  const [openFlat, setOpenFlat] = useState(false);
  
  const [lastEdited, setLastEdited] = useState<'grouped' | 'flat'>('grouped');
  const [flatError, setFlatError] = useState<string | null>(null);

  const getGroupedFormat = () => {
    if (!cfg) return rawText;
    const map = new Map<string, string[][]>();
    for (const p of cfg.productions) {
      if (!map.has(p.lhs)) map.set(p.lhs, []);
      map.get(p.lhs)!.push(p.rhs);
    }
    const fmtLines = Array.from(map.entries()).map(([lhs, alts]) => {
      return `${lhs} -> ${alts.map(alt => alt.join(' ') || 'ε').join(' | ')}`;
    });
    return fmtLines.join('\n');
  };

  const getFlatFormat = () => {
    if (!cfg) return rawText;
    const fmtLines = cfg.productions.map((p, i) => `${i}: ${p.lhs} -> ${p.rhs.join(' ') || 'ε'}`);
    return fmtLines.join('\n');
  };

  const [syncedGrouped, setSyncedGrouped] = useState(getGroupedFormat());
  const [syncedFlat, setSyncedFlat] = useState(getFlatFormat());

  useEffect(() => {
    if (cfg) {
      setSyncedGrouped(getGroupedFormat());
      setSyncedFlat(getFlatFormat());
    }
  }, [cfg]);

  const groupedValue = lastEdited === 'grouped' ? rawText : syncedGrouped;
  const flatValue = lastEdited === 'flat' ? rawText : syncedFlat;

  const getGhostText = (val: string, mode: 'grouped' | 'flat') => {
    if (mode === 'flat') {
      const lines = val.split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine.match(/^\d+:\s*[A-Z]$/)) return ' -> ';
      return '';
    }
    if (val.length === 0) return 'S -> ';
    const lines = val.split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.length > 0 && !lastLine.includes('->') && !lastLine.endsWith('|')) {
      return ' -> ';
    } else if (lastLine.includes('->') && !lastLine.trim().endsWith('|')) {
      return ' | ';
    }
    return '';
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-primary)', borderRight: '1px solid var(--border-subtle)',
      overflow: 'hidden', fontFamily: 'var(--font-mono)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', height: '28px', background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
      }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>
          Set Grammar:
        </span>
        <button
          onClick={() => setRawText(rawText + 'ε')}
          style={{
            padding: '1px 6px', background: 'transparent', border: '1px solid var(--border-subtle)',
            borderRadius: '3px', cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: '0.68rem', fontFamily: 'var(--font-mono)'
          }}
        >
          Insert ε
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AccordionHeader isOpen={openGrouped} onToggle={() => setOpenGrouped(!openGrouped)} label="Grouped Productions" />
        {openGrouped && (
          <EditorContent 
            mode="grouped" 
            value={groupedValue} 
            ghostText={getGhostText(groupedValue, 'grouped')}
            lastEdited={lastEdited}
            setRawText={setRawText}
            setLastEdited={setLastEdited}
            setFocusedProduction={setFocusedProduction}
            setFlatError={setFlatError}
          />
        )}

        <AccordionHeader isOpen={openFlat} onToggle={() => {
          setOpenFlat(!openFlat);
          if (openFlat) setFlatError(null); // Clear error when collapsing
        }} label="Numbered Productions" />
        {openFlat && (
          <EditorContent 
            mode="flat" 
            value={flatValue} 
            ghostText={getGhostText(flatValue, 'flat')}
            lastEdited={lastEdited}
            setRawText={setRawText}
            setLastEdited={setLastEdited}
            setFocusedProduction={setFocusedProduction}
            setFlatError={setFlatError}
          />
        )}
      </div>

      <div style={{
        padding: '3px 8px',
        background: flatError ? 'var(--status-reject-soft)' : (cfg ? 'var(--status-accept-soft)' : (rawText.trim() ? 'var(--status-reject-soft)' : 'transparent')),
        color: flatError ? 'var(--status-reject)' : (cfg ? 'var(--status-accept)' : (rawText.trim() ? 'var(--status-reject)' : 'var(--text-muted)')),
        fontSize: '0.68rem', fontWeight: 600, borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0, fontFamily: 'var(--font-mono)'
      }}>
        {flatError 
          ? `✗ ${flatError}` 
          : (cfg ? (
            <>✓ Valid | <span title="Production(s)">{cfg.productions.length} Prod</span> | <span title="Non-Terminal(s)">{cfg.nonterminals.size} NT</span> | <span title="Terminal(s)">{cfg.terminals.size} T</span></>
          ) : (rawText.trim() ? '✗ Invalid CFG' : ''))}
      </div>
    </div>
  );
}
