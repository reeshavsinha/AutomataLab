import React, { useRef, useEffect, useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { useMachineStore } from '@/store/machineStore';
import { useTraceabilityStore } from '@/store/traceabilityStore';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { ChevronRight, ChevronDown, HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import type { GrammarFormat } from '@/engines/machine/core/types';

const FORMAT_OPTIONS: Array<{ value: GrammarFormat; label: string; placeholder: string }> = [
  { value: 'REGEX', label: 'Regex', placeholder: '(a|b)*abb' },
  { value: 'TYPE_0', label: 'Type 0 — Unrestricted', placeholder: 'A B -> B A\nS -> a S | ε' },
  { value: 'TYPE_1', label: 'Type 1 — Context-sensitive', placeholder: 'A B -> B A\nS -> a S B | a B' },
  { value: 'TYPE_2', label: 'Type 2 — Context-free', placeholder: 'S -> a S b | ε' },
  { value: 'TYPE_3', label: 'Type 3 — Regular', placeholder: 'S -> a S | b A | ε\nA -> a S | b' },
];

interface EditorContentProps {
  mode: 'grouped' | 'flat';
  value: string;
  lastEdited: 'grouped' | 'flat';
  setRawText: (val: string) => void;
  setLastEdited: (val: 'grouped' | 'flat') => void;
  setFocusedProduction: (val: number | null) => void;
  setFlatError: (err: string | null) => void;
  grammarFormat: GrammarFormat;
}

const EditorContent = ({ 
  mode, 
  value, 
  lastEdited,
  setRawText,
  setLastEdited,
  setFocusedProduction,
  setFlatError,
  grammarFormat,
}: EditorContentProps) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const lines = value.split('\n');
  const currentLineIndex = value.slice(0, cursorPos).split('\n').length - 1;
  const currentLineText = lines[currentLineIndex] || '';

  const getGhostText = (lineText: string, mode: 'grouped' | 'flat', isFirstLine: boolean) => {
    if (lineText.length === 0) {
      if (isFirstLine) return 'S -> ';
      return '';
    }
    if (mode === 'flat') {
      if (lineText.match(/^[A-Z][A-Za-z0-9_']*$/)) return ' -> ';
      return '';
    }
    // Grouped mode
    if (lineText.match(/^\s+/)) {
      if (!lineText.trim().endsWith('|') && lineText.trim().length > 0) {
        return ' | ';
      }
      return '';
    }
    if (!/(->|::=|→|:)/.test(lineText) && !lineText.endsWith('|')) {
      if (lineText.match(/^[A-Z][A-Za-z0-9_']*$/)) return ' -> ';
      return '';
    } else if (/(->|::=|→|:)/.test(lineText) && !lineText.trim().endsWith('|')) {
      return ' | ';
    }
    return '';
  };

  const ghostText = getGhostText(currentLineText, mode, lines.length === 1 && currentLineIndex === 0);

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
    
    if (e.key === 'Enter') {
      if (mode === 'flat') {
        return;
      }
      
      const start = ta.selectionStart;
      const currentLine = lines[currentLineIndex];
      
      if (currentLine.trim().endsWith('|')) {
        e.preventDefault();
        
        let indentLen = 4;
        for (let i = currentLineIndex; i >= 0; i--) {
          const match = lines[i].match(/^(.*?(?:->|::=|→|:)\s*)/);
          if (match) {
            indentLen = match[1].length;
            break;
          }
        }
        
        const indentStr = '\n' + ' '.repeat(indentLen);
        const newVal = value.slice(0, start) + indentStr + value.slice(ta.selectionEnd);
        setRawText(newVal);
        setLastEdited(mode);
        setTimeout(() => { 
          if (taRef.current) {
            taRef.current.selectionStart = taRef.current.selectionEnd = start + indentStr.length; 
            setCursorPos(taRef.current.selectionStart); 
          }
        }, 0);
        return;
      }
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
            {mode === 'flat' ? `${i + 1}:` : i + 1}
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
            const start = e.target.selectionStart;
            let newStart = start;

            // Normalize the Unicode DIVIDES separator '∣' (U+2223) to the
            // canonical ASCII pipe. Length-preserving, so the caret is unaffected.
            val = val.replace(/∣/g, '|');
            
            if (mode === 'flat' && grammarFormat !== 'TYPE_0' && grammarFormat !== 'TYPE_1' && val.includes('|')) {
              setFlatError("Illegal symbol '|' in Numbered Productions. Use a new line instead.");
              val = val.replace(/\|/g, (match, offset) => {
                if (offset < start) newStart -= 1;
                return '';
              });
            } else if (mode === 'flat') {
              setFlatError(null);
            }

            val = val.replace(/\b(eps|epsilon)\b/gi, (match, p1, offset) => {
              if (offset < start) newStart -= (match.length - 1);
              return 'ε';
            });
            if (grammarFormat === 'TYPE_2' || grammarFormat === 'TYPE_3') {
              // Capitalize starting non-terminals for the CFG-oriented formats.
              val = val.replace(/(^|\n)([a-z])/g, (match, _p1, p2) => match.slice(0, -1) + p2.toUpperCase());
            }
            
            setRawText(val);
            setLastEdited(mode);
            
            if (val !== e.target.value) {
              setTimeout(() => {
                if (taRef.current) {
                  taRef.current.selectionStart = taRef.current.selectionEnd = newStart;
                  setCursorPos(newStart);
                }
              }, 0);
            } else {
              setCursorPos(start);
            }
          }}
          onKeyUp={handleSelectionChange}
          onClick={handleSelectionChange}
          onFocus={() => {
            setFocusedProduction(null);
            if (lastEdited !== mode) {
              const { cfg, rawText } = useGrammarStore.getState();
              if (cfg) {
                if (mode === 'flat') {
                  // Format lines for flat
                  const fmtLines = cfg.productions.map((p, i) => `${p.lhs} -> ${p.rhs.join(' ') || 'ε'}`);
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
              } else if (rawText.trim() === '') {
                setRawText('');
              } else {
                return; // Block switching view if there's a syntax error
              }
              setLastEdited(mode);
            }
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          readOnly={lastEdited !== mode}
          placeholder={lastEdited !== mode ? (value.trim() === '' ? 'Click to edit...' : 'Read only (fix syntax error to switch view)') : FORMAT_OPTIONS.find((option) => option.value === grammarFormat)?.placeholder}
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

function GrammarFormatSelect({
  value,
  onChange,
  parserOnly = false,
}: {
  value: GrammarFormat
  onChange: (format: GrammarFormat) => void
  parserOnly?: boolean
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>
      FORMAT
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as GrammarFormat)}
        title="Grammar format"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: '3px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '2px 4px' }}
      >
        {FORMAT_OPTIONS
          .filter((option) => !parserOnly || option.value === 'TYPE_2' || option.value === 'TYPE_3')
          .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function RegexEditor({
  value,
  setValue,
  format,
  setFormat,
  parserOnly,
}: {
  value: string
  setValue: (value: string) => void
  format: GrammarFormat
  setFormat: (format: GrammarFormat) => void
  parserOnly: boolean
}) {
  const diagnostics = useGrammarStore((state) => state.diagnostics)
  const error = diagnostics[0]?.message
  const [showHelp, setShowHelp] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-subtle)', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', height: '28px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <GrammarFormatSelect value={format} onChange={setFormat} parserOnly={parserOnly} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            title="Toggle regular-expression syntax guide"
            style={{ padding: '1px 6px', background: showHelp ? 'var(--chrome-active-bg, rgba(59,130,246,0.2))' : 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', cursor: 'pointer', color: showHelp ? 'var(--chrome-active-border, #3b82f6)' : 'var(--text-secondary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: showHelp ? 600 : 400 }}
          >
            <HelpCircle size={11} />
            Syntax
          </button>
          <button
            onClick={() => setValue(`${value}ε`)}
            title="Insert epsilon (empty string)"
            style={{ padding: '1px 6px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}
          >
            Insert ε
          </button>
        </div>
      </div>
      {showHelp && (
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-default)', padding: '10px 12px', fontSize: '0.72rem', lineHeight: '1.5', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Regular-expression syntax</strong>
          <div style={{ marginTop: '5px' }}>• Literal symbols are written directly. Whitespace is ignored.</div>
          <div>• Concatenation is implicit: <code>ab</code> means “a followed by b”.</div>
          <div>• Alternation: use <code>|</code> or classroom-style binary <code>+</code>: <code>a|b</code> or <code>a+b</code>.</div>
          <div>• Repetition: <code>*</code> means zero or more; <code>?</code> means optional; postfix <code>+</code> means one or more when it closes an atom.</div>
          <div>• Because <code>+</code> is ambiguous, write grouped one-or-more explicitly: <code>(a+)b</code>. Thus <code>a+b</code> is alternation.</div>
          <div>• Use parentheses for grouping, and <code>ε</code>, <code>λ</code>, <code>eps</code>, or <code>epsilon</code> for the empty string.</div>
          <div style={{ marginTop: '5px', color: 'var(--text-muted)' }}>Examples: <code>(a+b)*ab</code>, <code>(a|b)*abb</code>, <code>(a+)</code>.</div>
        </div>
      )}
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
        placeholder={FORMAT_OPTIONS[0].placeholder}
        aria-label="Regular expression"
        style={{ flex: 1, minHeight: 0, resize: 'none', border: 'none', outline: 'none', padding: '12px', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.5 }}
      />
      <div style={{ padding: '3px 8px', borderTop: '1px solid var(--border-subtle)', color: error ? 'var(--status-reject)' : 'var(--status-accept)', background: error ? 'var(--status-reject-soft)' : 'var(--status-accept-soft)', fontSize: '0.68rem' }}>
        {error ? `✗ ${error}` : '✓ Valid regular expression'}
      </div>
    </div>
  )
}

export function GrammarEditorPanel({ onCollapse }: { onCollapse?: () => void }) {
  const { rawText, setRawText, cfg, grammar, classification, grammarFormat, setGrammarFormat } = useGrammarStore();
  const parserOnly = useMachineStore((state) => state.machine?.type === 'CFG_PARSER');
  const { setFocusedProduction } = useTraceabilityStore();
  
  const [openGrouped, setOpenGrouped] = useState(true);
  const [openFlat, setOpenFlat] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
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
    const fmtLines = cfg.productions.map((p, i) => `${p.lhs} -> ${p.rhs.join(' ') || 'ε'}`);
    return fmtLines.join('\n');
  };

  const [syncedGrouped, setSyncedGrouped] = useState(getGroupedFormat());
  const [syncedFlat, setSyncedFlat] = useState(getFlatFormat());

  useEffect(() => {
    if (cfg) {
      setSyncedGrouped(getGroupedFormat());
      setSyncedFlat(getFlatFormat());
    } else if (rawText.trim() === '') {
      setSyncedGrouped('');
      setSyncedFlat('');
    }
  }, [cfg, rawText]);

  const groupedValue = lastEdited === 'grouped' ? rawText : syncedGrouped;
  const flatValue = lastEdited === 'flat' ? rawText : syncedFlat;

  if (grammarFormat === 'REGEX') {
    return <RegexEditor value={rawText} setValue={setRawText} format={grammarFormat} setFormat={setGrammarFormat} parserOnly={parserOnly} />
  }

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
        <GrammarFormatSelect value={grammarFormat} onChange={setGrammarFormat} parserOnly={parserOnly} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            title="Toggle Grammar Syntax & Token Format Guide"
            style={{
              padding: '1px 6px',
              background: showHelp ? 'var(--chrome-active-bg, rgba(59,130,246,0.2))' : 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '3px',
              cursor: 'pointer',
              color: showHelp ? 'var(--chrome-active-border, #3b82f6)' : 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontWeight: showHelp ? 600 : 400
            }}
          >
            <HelpCircle size={11} />
            Syntax
          </button>
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
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Collapse Panel"
              style={{
                padding: '1px 6px', background: 'transparent', border: '1px solid var(--border-subtle)',
                borderRadius: '3px', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: '14px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ‹
            </button>
          )}
        </div>
      </div>

      {showHelp && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '2px solid var(--border-default)',
          padding: '10px 12px',
          fontSize: '0.72rem',
          lineHeight: '1.5',
          color: 'var(--text-secondary)',
          overflowY: 'auto',
          maxHeight: '230px',
          fontFamily: 'var(--font-sans)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={12} style={{ color: 'var(--chrome-active-border, #3b82f6)' }} />
              Grammar Syntax &amp; Tokenization Guide
            </span>
            <button
              onClick={() => setShowHelp(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '12px' }}
              title="Close guide"
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Nonterminals:</strong> Must start with an <strong style={{ color: 'var(--chrome-active-border, #3b82f6)' }}>uppercase letter</strong> (<code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>S</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>Expr</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>Term_1</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>T'</code>).
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Formats:</strong> Select Regex or a Chomsky grammar format (Type 0 unrestricted, Type 1 context-sensitive, Type 2 context-free, or Type 3 regular). The status bar reports validity, inferred type, productions, nonterminals, and terminals.
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Production layout:</strong> In Grouped Productions, alternatives may share one rule using <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>|</code> or <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>∣</code>. Press Enter after <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>|</code> to continue an indented alternative. Numbered Productions uses one alternative per line; pipes are automatically removed there for Type 2 and Type 3.
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '6px 8px' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: '4px', color: '#eab308' }} />
                Distinguishing Tokens &amp; Terminals (Crucial):
              </strong>
              <div style={{ paddingLeft: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div>
                  • <strong style={{ color: 'var(--text-primary)' }}>Single Multi-Char Terminal:</strong> Write contiguous letters without spaces like <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>num</code> or <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>id</code>. It stays as <strong>ONE single terminal token</strong> (<code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>num</code>), NOT separate 'n', 'u', 'm'.
                </div>
                <div>
                  • <strong style={{ color: 'var(--text-primary)' }}>Separate Single-Char Terminals:</strong> Separate individual characters with <strong>whitespace</strong> like <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>n u m</code>. This creates <strong>THREE separate terminal symbols</strong> (<code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>n</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>u</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>m</code>).
                </div>
                <div>
                  • <strong style={{ color: 'var(--text-primary)' }}>Quoted Terminals:</strong> Enclose in quotes <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>"num"</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>'if'</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>"=="</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>";"</code> to explicitly force treating the contents as 1 terminal.
                </div>
              </div>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Arrows &amp; Epsilon:</strong> Arrows may be <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>-&gt;</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>::=</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>=&gt;</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>→</code>, or <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>:</code>. For the empty string use <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>ε</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>λ</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>eps</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>epsilon</code>, <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>\epsilon</code>, or empty quotes <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>""</code>.
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Symbols and whitespace:</strong> Whitespace separates symbols. Write <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>id</code> as one terminal, but <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>i d</code> as two terminals. Quotes force punctuation or multiple characters to remain one terminal, such as <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>"=="</code> or <code style={{ background: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>'if'</code>. Known operators such as <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code>, <code>!=</code>, <code>&amp;&amp;</code>, and <code>||</code> remain single symbols.
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)' }}>• Editing assistance:</strong> The editor normalizes <code>∣</code> to <code>|</code>, converts <code>eps</code>/<code>epsilon</code> to <code>ε</code>, capitalizes a lowercase first nonterminal for Type 2/3, offers ghost completions for arrows and alternatives, and provides an <strong>Insert ε</strong> button.
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.69rem' }}>
              <span style={{ color: 'var(--text-muted)' }}># Expression Grammar Example:</span><br />
              E -&gt; E + T | T<br />
              T -&gt; num | ( E )
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AccordionHeader isOpen={openGrouped} onToggle={() => setOpenGrouped(!openGrouped)} label="Grouped Productions" />
        {openGrouped && (
          <EditorContent 
            mode="grouped" 
            value={groupedValue} 
            lastEdited={lastEdited}
            setRawText={setRawText}
            setLastEdited={setLastEdited}
            setFocusedProduction={setFocusedProduction}
            setFlatError={setFlatError}
            grammarFormat={grammarFormat}
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
            lastEdited={lastEdited}
            setRawText={setRawText}
            setLastEdited={setLastEdited}
            setFocusedProduction={setFocusedProduction}
            setFlatError={setFlatError}
            grammarFormat={grammarFormat}
          />
        )}
      </div>

      <div style={{
        padding: '3px 8px',
        background: flatError ? 'var(--status-reject-soft)' : (grammar ? 'var(--status-accept-soft)' : (rawText.trim() ? 'var(--status-reject-soft)' : 'transparent')),
        color: flatError ? 'var(--status-reject)' : (grammar ? 'var(--status-accept)' : (rawText.trim() ? 'var(--status-reject)' : 'var(--text-muted)')),
        fontSize: '0.68rem', fontWeight: 600, borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0, fontFamily: 'var(--font-mono)'
      }}>
        {flatError 
          ? `✗ ${flatError}` 
          : (grammar ? (
            <>✓ Valid {classification ? `(${classification.inferredType.replace('_', ' ')})` : ''} | <span title="Production(s)">{grammar.productions.length} Prod</span> | <span title="Non-Terminal(s)">{grammar.nonterminals.size} NT</span> | <span title="Terminal(s)">{grammar.terminals.size} T</span></>
          ) : (rawText.trim() ? `✗ Invalid ${FORMAT_OPTIONS.find((option) => option.value === grammarFormat)?.label}: ${useGrammarStore.getState().diagnostics[0]?.message || ''}` : ''))}
      </div>
    </div>
  );
}
