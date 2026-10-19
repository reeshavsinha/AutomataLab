import React, { useState, useRef, useMemo } from 'react';
import { useLL1Table, useLR0Table, useSLR1Table, useCLR1Table, useLALR1Table, useParserStore, useActiveSimulationState, getFallbackSimulationInfo } from '@/store/parserStore';
import { useTraceabilityStore } from '@/store/traceabilityStore';
import { useMachineStore } from '@/store/machineStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGrammarStore } from '@/store/grammarStore';
import { LR0Table } from '@/engines/parser/lr0';
import { AutomatonViewerPanel } from './AutomatonViewerPanel';
import { ConflictInspectorPanel } from './ConflictInspectorPanel';
import { EOF_SYMBOL } from '@/engines/grammar/types';
import { CYKTablePanel } from './CYKTablePanel';
import { EarleySetsPanel } from './EarleySetsPanel';

// Sort terminals so $ is always last
function sortTerminals(terminals: string[]): string[] {
  const noEof = terminals.filter(t => t !== EOF_SYMBOL && t !== '$').sort();
  const hasEof = terminals.some(t => t === EOF_SYMBOL || t === '$');
  return hasEof ? [...noEof, '$'] : noEof;
}

const TH_STYLE: React.CSSProperties = {
  padding: '4px 10px',
  background: 'var(--bg-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
  textAlign: 'center'
};

const TD_STYLE: React.CSSProperties = {
  padding: '3px 8px',
  border: '1px solid var(--border-subtle)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.78rem',
  textAlign: 'center',
  height: '28px'
};

export function ParseTablePanel({ onCollapse }: { onCollapse?: () => void }) {
  const { algorithm, setAlgorithm } = useParserStore();
  const machine = useMachineStore(s => s.machine);
  const viewMode = machine?.activeViewMode || 'table';
  const setViewMode = (mode: 'table' | 'automaton') => {
    useMachineStore.setState(s => {
      if (!s.machine) return s;
      const tabs = [...s.tabs];
      const active = tabs[s.activeTabIndex];
      if (active && active.id === s.machine.id) {
        tabs[s.activeTabIndex] = { ...active, activeViewMode: mode };
      }
      return { tabs, machine: tabs[s.activeTabIndex], dirtyTabs: { ...s.dirtyTabs, [s.machine.id]: true } };
    });
  };
  const simulation = useActiveSimulationState();
  const { focusedProductionIndex, setFocusedParseAction, focusedItemSetId, setFocusedItemSet } = useTraceabilityStore();
  const ll1Table = useLL1Table();
  const lr0Table = useLR0Table();
  const slr1Table = useSLR1Table();
  const clr1Table = useCLR1Table();
  const lalr1Table = useLALR1Table();

  const [filterQuery, setFilterQuery] = useState('');
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

  const getActiveTable = (): LR0Table | null => {
    if (algorithm === 'LR0') return lr0Table;
    if (algorithm === 'SLR1') return slr1Table;
    if (algorithm === 'CLR1') return clr1Table;
    if (algorithm === 'LALR1') return lalr1Table;
    return null;
  };
  const activeTable = getActiveTable();

  const fallbackInfo = useMemo(() => getFallbackSimulationInfo(algorithm), [algorithm]);
  const presentation = simulation?.presentation || fallbackInfo?.presentation;
  const metadata = simulation?.metadata || fallbackInfo?.metadata;

  const parentRef = useRef<HTMLDivElement>(null);

  const filteredStates = useMemo(() => {
    if (!activeTable) return [];
    return activeTable.states.filter(s => {
      if (!filterQuery) return true;
      return s.id.toString().includes(filterQuery.toLowerCase());
    });
  }, [activeTable, filterQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filteredStates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  const getHasConflict = () => {
    if (algorithm === 'LL1') return ll1Table?.hasConflict;
    if (algorithm === 'LR0') return lr0Table?.hasConflict;
    if (algorithm === 'SLR1') return slr1Table?.hasConflict;
    if (algorithm === 'CLR1') return clr1Table?.hasConflict;
    if (algorithm === 'LALR1') return lalr1Table?.hasConflict;
    return false;
  };

  const renderLL1Table = () => {
    if (!ll1Table) return (
      <div style={{ color: 'var(--text-muted)', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        No LL(1) table — check grammar validity.
      </div>
    );

    const terminals = sortTerminals(Array.from(ll1Table.terminals));
    const nonterminals = Array.from(ll1Table.nonterminals).sort();

    return (
      <div style={{ overflow: 'auto', height: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.78rem' }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, position: 'sticky', top: 0, left: 0, zIndex: 30 }}>NT</th>
              {terminals.map(t => (
                <th key={t} style={{ ...TH_STYLE, position: 'sticky', top: 0, zIndex: 20 }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonterminals.map((nt, rowIdx) => (
              <tr key={nt} style={{ background: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <td style={{ ...TD_STYLE, position: 'sticky', left: 0, background: 'var(--bg-primary)', color: 'var(--orange-500, #f97316)', fontWeight: 700 }}>{nt}</td>
                {terminals.map(t => {
                  const cell = ll1Table.table.get(nt)?.get(t) || [];
                  const isConflict = cell.length > 1;
                  return (
                    <td key={t} style={{
                      ...TD_STYLE,
                      background: isConflict ? 'rgba(239,68,68,0.12)' : 'transparent',
                      color: isConflict ? 'var(--danger)' : 'var(--text-primary)'
                    }}>
                      {cell.map((prod, idx) => (
                        <div key={idx} style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                          {prod.lhs} → {prod.rhs.join(' ')}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLRTable = (table: LR0Table | null) => {
    if (!table) return (
      <div style={{ color: '#6e7681', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        No {algorithm} table — check grammar validity.
      </div>
    );

    const terminals = sortTerminals(Array.from(table.terminals));
    const nonterminals = Array.from(table.nonterminals).sort();

    const activeStateId = simulation && 'stack' in simulation && simulation.stack.length > 0
      ? simulation.stack[simulation.stack.length - 1]
      : null;

    const actionDividerStyle: React.CSSProperties = {
      borderLeft: '2px solid var(--border-default)'
    };

    const HEADER_ROW1: React.CSSProperties = {
      ...TH_STYLE,
      background: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
      fontSize: '0.68rem',
      letterSpacing: '0.08em',
      padding: '3px 8px'
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Search bar */}
        <div style={{
          padding: '4px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
          flexShrink: 0
        }}>
          <input
            type="text"
            placeholder="Search state..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            style={{
              padding: '3px 8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              outline: 'none',
              width: '160px'
            }}
          />
        </div>

        {/* Table */}
        <div ref={parentRef} style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
          <table style={{
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'center'
          }}>
            <thead>
              {/* Row 1: ACTION | GOTO labels */}
              <tr>
                <th rowSpan={2} style={{
                  ...TH_STYLE,
                  position: 'sticky', top: 0, left: 0, zIndex: 31,
                  background: 'var(--trace-bg, var(--bg-secondary))',
                  width: '52px',
                  minWidth: '52px',
                  fontSize: '0.72rem',
                  borderRight: '2px solid var(--border-default)'
                }}>
                  State
                </th>
                <th
                  colSpan={terminals.length}
                  style={{
                    ...HEADER_ROW1,
                    position: 'sticky', top: 0, zIndex: 25,
                    letterSpacing: '0.12em',
                    borderRight: '2px solid #4b5563'
                  }}
                >
                  ACTION
                </th>
                <th
                  colSpan={nonterminals.length}
                  style={{
                    ...HEADER_ROW1,
                    position: 'sticky', top: 0, zIndex: 25
                  }}
                >
                  GOTO
                </th>
              </tr>
              {/* Row 2: individual terminal and nonterminal columns */}
              <tr>
                {terminals.map((t, i) => (
                  <th
                    key={`act_${t}`}
                    style={{
                      ...TH_STYLE,
                      position: 'sticky',
                      top: '26px',
                      zIndex: 20,
                      color: t === '$' ? 'var(--blue-400)' : 'var(--text-primary)',
                      borderRight: (i === terminals.length - 1) ? '2px solid var(--border-default)' : undefined
                    }}
                  >
                    {t}
                  </th>
                ))}
                {nonterminals.map(nt => (
                  <th
                    key={`goto_${nt}`}
                    style={{
                      ...TH_STYLE,
                      position: 'sticky',
                      top: '26px',
                      zIndex: 20,
                      color: 'var(--orange-500, #f97316)'
                    }}
                  >
                    {nt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
              )}
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const state = filteredStates[virtualRow.index];
                const isActive = activeStateId === state.id;
                const isEven = virtualRow.index % 2 === 0;

                const rowBg = isActive
                  ? 'rgba(59,130,246,0.1)'
                  : (isEven ? 'rgba(255,255,255,0.02)' : 'transparent');

                return (
                  <tr
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ background: rowBg }}
                  >
                    {/* State cell */}
                    <td style={{
                      ...TD_STYLE,
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: isActive ? 'var(--trace-ring)' : 'var(--bg-primary)',
                      color: isActive ? 'var(--blue-500)' : 'var(--text-muted)',
                      fontWeight: 700,
                      borderRight: '2px solid #4b5563'
                    }}>
                      {state.id}
                    </td>

                    {/* ACTION cells */}
                    {terminals.map((t, i) => {
                      const actions = table.actionTable.get(state.id)?.get(t) || [];
                      const isConflict = actions.length > 1;
                      let isTraceHighlighted = false;
                      if (focusedProductionIndex !== null) {
                        isTraceHighlighted = actions.some(act => act.type === 'Reduce' && act.target === focusedProductionIndex);
                      }

                      const isLastAction = i === terminals.length - 1;

                      return (
                        <td
                          key={`act_${t}`}
                          onClick={() => {
                            if (isConflict) setFocusedParseAction({ state: state.id, symbol: t });
                          }}
                          style={{
                            ...TD_STYLE,
                            background: isConflict
                              ? 'rgba(239,68,68,0.1)'
                              : isTraceHighlighted
                                ? 'rgba(59,130,246,0.15)'
                                : 'transparent',
                            cursor: isConflict ? 'pointer' : 'default',
                            borderRight: isLastAction ? '2px solid #4b5563' : TD_STYLE.border
                          }}
                        >
                          {actions.map((act, idx) => {
                            let text = '';
                            let color = '';
                            if (act.type === 'Shift') { text = `s${act.target}`; color = '#60a5fa'; }
                            else if (act.type === 'Reduce') { text = `r${act.target}`; color = '#fb923c'; }
                            else if (act.type === 'Accept') { text = 'acc'; color = '#4ade80'; }
                            return (
                              <div key={idx} style={{
                                color: isConflict ? 'var(--danger)' : color,
                                fontWeight: 700,
                                fontSize: '0.78rem'
                              }}>
                                {text}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}

                    {/* GOTO cells */}
                    {nonterminals.map(nt => {
                      const target = table.gotoTable.get(state.id)?.get(nt);
                      const hasGoto = target !== undefined && target !== -1;
                      return (
                        <td key={`goto_${nt}`} style={{
                          ...TD_STYLE,
                          color: hasGoto ? 'var(--orange-500, #f97316)' : 'transparent',
                          fontWeight: hasGoto ? 700 : 400
                        }}>
                          {hasGoto ? target : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{
                  height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px`
                }} />
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Header toolbar: algorithm selector + view toggle + conflict */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        height: '32px'
      }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)'
        }}>
          PARSER ALGORITHM:
        </span>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          style={{
            padding: '1px 6px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '3px',
            color: 'var(--text-primary)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer'
          }}
        >
          <option value="LL1">LL(1)</option>
          <option value="LR0">LR(0)</option>
          <option value="SLR1">SLR(1)</option>
          <option value="LALR1">LALR(1)</option>
          <option value="CLR1">CLR(1)</option>
          <option value="CYK">CYK Algorithm</option>
          <option value="EARLEY">Earley Parser</option>
          <option value="BACKTRACKING">Recursive Descent</option>
        </select>

        {/* View toggle: Parse Table | Automaton Graph */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '3px',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '2px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'table' ? 'var(--trace-ring)' : 'transparent',
              color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap'
            }}
          >
            Parse Table
          </button>
          {activeTable && (
            <button
              onClick={() => setViewMode('automaton')}
              style={{
                padding: '2px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                borderLeft: '1px solid var(--border-subtle)',
                background: viewMode === 'automaton' ? 'var(--trace-ring)' : 'transparent',
                color: viewMode === 'automaton' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap'
              }}
            >
              Automaton Graph
            </button>
          )}
        </div>

        {(metadata || (['LR0', 'SLR1', 'CLR1', 'LALR1'].includes(algorithm) && getActiveTable())) && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              aria-label="Show parser algorithm details"
              aria-expanded={showAlgorithmInfo}
              onClick={() => setShowAlgorithmInfo((shown) => !shown)}
              onMouseEnter={() => setShowAlgorithmInfo(true)}
              onMouseLeave={() => setShowAlgorithmInfo(false)}
              style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
            >i</button>
            {showAlgorithmInfo && (
              <div onMouseEnter={() => setShowAlgorithmInfo(true)} onMouseLeave={() => setShowAlgorithmInfo(false)} style={{ position: 'absolute', zIndex: 20, top: 25, right: 0, width: 300, padding: '9px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', fontSize: '0.68rem', lineHeight: 1.6, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {metadata && <><div>Complexity: <b style={{ color: 'var(--text-primary)' }}>{metadata.complexity}</b></div><div>Deterministic: <b style={{ color: 'var(--text-primary)' }}>{metadata.deterministic ? 'Yes' : 'No'}</b></div><div>Requires CNF: <b style={{ color: 'var(--text-primary)' }}>{metadata.requiresCNF ? 'Yes' : 'No'}</b></div><div>Supports Ambiguity: <b style={{ color: 'var(--text-primary)' }}>{metadata.supportsAmbiguity ? 'Yes' : 'No'}</b></div></>}
                {['LR0', 'SLR1', 'CLR1', 'LALR1'].includes(algorithm) && getActiveTable() && <div style={{ marginTop: metadata ? 6 : 0 }}>Augmented Root: <b style={{ color: 'var(--text-primary)' }}>[ 0: START → {useGrammarStore.getState().cfg?.startSymbol} ]</b></div>}
              </div>
            )}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {getHasConflict() && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              color: 'var(--danger)', fontSize: '0.68rem', fontWeight: 600,
              padding: '2px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: '4px',
              fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ fontSize: '0.85rem' }}>⚠</span> Conflicts Detected
            </div>
          )}
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Collapse Panel"
              style={{
                marginLeft: '8px', padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-subtle)',
                borderRadius: '3px', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: '14px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ⌃
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {viewMode === 'automaton' && activeTable ? (
          <AutomatonViewerPanel />
        ) : (
          algorithm === 'LL1' ? renderLL1Table() :
          algorithm === 'LR0' ? renderLRTable(lr0Table) :
          algorithm === 'SLR1' ? renderLRTable(slr1Table) :
          algorithm === 'CLR1' ? renderLRTable(clr1Table) :
          algorithm === 'LALR1' ? renderLRTable(lalr1Table) :
          algorithm === 'CYK' ? <CYKTablePanel /> :
          algorithm === 'EARLEY' ? <EarleySetsPanel /> :
          algorithm === 'BACKTRACKING' ? <div style={{ padding: 16 }}>Backtracking Recursive Descent relies purely on the Syntax Tree and Input Buffer tabs. No parse table applies.</div> :
          <div style={{ color: '#6e7681', padding: '16px' }}>Not implemented.</div>
        )}
        {activeTable && <ConflictInspectorPanel table={activeTable} />}
      </div>
    </div>
  );
}
