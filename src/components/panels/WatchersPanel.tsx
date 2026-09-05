import { useMemo, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useTMDebugStore } from '@/store/tmDebugStore'
import type { TMWatcher, WatcherComparator, WatcherCondition } from '@/engines/machine/tm/watchers'
import { summarizeWatcherCondition, validateWatcherCondition } from '@/engines/machine/tm/watchers'

type ClauseKind = Exclude<WatcherCondition['kind'], 'group'>

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  padding: '5px 6px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
}

const buttonStyle = {
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  padding: '4px 7px',
}

function defaultClause(kind: ClauseKind, stateId: string): WatcherCondition {
  switch (kind) {
    case 'state': return { kind, stateId }
    case 'headSymbol': return { kind, tapeIndex: 0, symbol: '_' }
    case 'headPosition': return { kind, tapeIndex: 0, comparator: 'eq', position: 0 }
    case 'step': return { kind, comparator: 'eq', step: 0 }
    case 'tapeWindow': return { kind, tapeIndex: 0, start: 0, pattern: ['_'] }
  }
}

function comparatorSelect(
  value: WatcherComparator,
  onChange: (value: WatcherComparator) => void,
) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as WatcherComparator)} style={{ ...inputStyle, width: 58 }} aria-label="Comparison">
      <option value="eq">=</option>
      <option value="neq">≠</option>
      <option value="gt">&gt;</option>
      <option value="gte">≥</option>
      <option value="lt">&lt;</option>
      <option value="lte">≤</option>
    </select>
  )
}

function ClauseEditor({
  clause,
  onChange,
  onRemove,
  allowRemove,
}: {
  clause: WatcherCondition
  onChange: (clause: WatcherCondition) => void
  onRemove: () => void
  allowRemove: boolean
}) {
  const machine = useMachineStore((state) => state.machine)
  const tapeCount = Math.max(1, machine.tapeCount ?? 1)
  const trackCount = machine.type === 'MTM' ? Math.max(2, machine.trackCount ?? 2) : 1
  const tapeSelect = (value: number, onChange: (tapeIndex: number) => void) => (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ ...inputStyle, width: 76 }} aria-label="Tape">
      {Array.from({ length: tapeCount }, (_, index) => <option key={index} value={index}>Tape {index + 1}</option>)}
    </select>
  )
  const trackSelect = (value: number | undefined, onChange: (trackIndex: number) => void) => (
    trackCount > 1 ? (
      <select value={value ?? 0} onChange={(event) => onChange(Number(event.target.value))} style={{ ...inputStyle, width: 70 }} aria-label="Track">
        {Array.from({ length: trackCount }, (_, index) => <option key={index} value={index}>Track {index + 1}</option>)}
      </select>
    ) : null
  )
  const changeKind = (kind: ClauseKind) => onChange(defaultClause(kind, machine.states[0]?.id ?? ''))

  return (
    <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', borderRadius: 4, padding: 7, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={clause.kind} onChange={(event) => changeKind(event.target.value as ClauseKind)} style={{ ...inputStyle, width: 116 }} aria-label="Watcher condition kind">
        <option value="state">State</option>
        <option value="headSymbol">Head symbol</option>
        <option value="headPosition">Head position</option>
        <option value="step">Step number</option>
        <option value="tapeWindow">Tape window</option>
      </select>
      {clause.kind === 'state' && (
        <select value={clause.stateId} onChange={(event) => onChange({ ...clause, stateId: event.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 92 }} aria-label="State">
          {machine.states.filter((state) => !state.isText).map((state) => <option key={state.id} value={state.id}>{state.label || state.id}</option>)}
        </select>
      )}
      {clause.kind === 'headSymbol' && (
        <>
          {tapeSelect(clause.tapeIndex, (tapeIndex) => onChange({ ...clause, tapeIndex }))}
          {trackSelect(clause.trackIndex, (trackIndex) => onChange({ ...clause, trackIndex }))}
          <input value={clause.symbol} onChange={(event) => onChange({ ...clause, symbol: event.target.value })} style={{ ...inputStyle, width: 72 }} aria-label="Head symbol" />
        </>
      )}
      {clause.kind === 'headPosition' && (
        <>
          {tapeSelect(clause.tapeIndex, (tapeIndex) => onChange({ ...clause, tapeIndex }))}
          {comparatorSelect(clause.comparator, (comparator) => onChange({ ...clause, comparator }))}
          <input type="number" value={clause.position} onChange={(event) => onChange({ ...clause, position: Number(event.target.value) })} style={{ ...inputStyle, width: 70 }} aria-label="Absolute head position" />
        </>
      )}
      {clause.kind === 'step' && (
        <>
          {comparatorSelect(clause.comparator, (comparator) => onChange({ ...clause, comparator }))}
          <input type="number" min={0} value={clause.step} onChange={(event) => onChange({ ...clause, step: Number(event.target.value) })} style={{ ...inputStyle, width: 70 }} aria-label="Step number" />
        </>
      )}
      {clause.kind === 'tapeWindow' && (
        <>
          {tapeSelect(clause.tapeIndex, (tapeIndex) => onChange({ ...clause, tapeIndex }))}
          {trackSelect(clause.trackIndex, (trackIndex) => onChange({ ...clause, trackIndex }))}
          <input type="number" value={clause.start} onChange={(event) => onChange({ ...clause, start: Number(event.target.value) })} style={{ ...inputStyle, width: 62 }} aria-label="Window start" />
          <input value={clause.pattern.join(', ')} onChange={(event) => onChange({ ...clause, pattern: event.target.value.split(',').map((symbol) => symbol.trim()).filter(Boolean) })} style={{ ...inputStyle, minWidth: 100, flex: 1 }} aria-label="Window symbols" placeholder="a, b, _" />
        </>
      )}
      {allowRemove && <button onClick={onRemove} style={buttonStyle} title="Remove condition" aria-label="Remove condition">×</button>}
    </div>
  )
}

export default function WatchersPanel() {
  const machine = useMachineStore((state) => state.machine)
  const session = useTMDebugStore((state) => state.getSession(machine.id))
  const addWatcher = useTMDebugStore((state) => state.addWatcher)
  const updateWatcher = useTMDebugStore((state) => state.updateWatcher)
  const removeWatcher = useTMDebugStore((state) => state.removeWatcher)
  const toggleWatcher = useTMDebugStore((state) => state.toggleWatcher)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND')
  const [clauses, setClauses] = useState<WatcherCondition[]>(() => [defaultClause('state', machine.states[0]?.id ?? '')])
  const [nextKind, setNextKind] = useState<ClauseKind>('headSymbol')

  const predicate: WatcherCondition = clauses.length === 1
    ? clauses[0]
    : { kind: 'group', operator, children: clauses }
  const errors = useMemo(() => validateWatcherCondition(predicate, machine), [machine, predicate])

  const resetForm = () => {
    setEditingId(null)
    setLabel('')
    setOperator('AND')
    setClauses([defaultClause('state', machine.states[0]?.id ?? '')])
  }
  const save = () => {
    if (errors.length > 0) return
    const watcher: TMWatcher = {
      id: editingId ?? `watcher-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim() || summarizeWatcherCondition(predicate),
      enabled: editingId ? session.watchers.find((current) => current.id === editingId)?.enabled ?? true : true,
      predicate,
    }
    if (editingId) updateWatcher(machine.id, watcher)
    else addWatcher(machine.id, watcher)
    resetForm()
  }
  const edit = (watcher: TMWatcher) => {
    setEditingId(watcher.id)
    setLabel(watcher.label)
    if (watcher.predicate.kind === 'group') {
      setOperator(watcher.predicate.operator)
      setClauses(watcher.predicate.children)
    } else {
      setOperator('AND')
      setClauses([watcher.predicate])
    }
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
        Watchers pause continuous Run before its next step. Manual Step always advances once. Tape windows match the visible snapshot at absolute positions.
      </div>
      {session.lastHit && (
        <div role="status" style={{ border: '1px solid var(--status-running)', borderRadius: 4, padding: 8, background: 'var(--status-running-soft)', fontSize: 12, color: 'var(--text-primary)' }}>
          Paused by “{session.lastHit.watcherLabel}” before step {session.lastHit.stepCount} at {session.lastHit.stateId}.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {session.watchers.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No watchers configured for this tab.</div>
        ) : session.watchers.map((watcher) => (
          <div key={watcher.id} style={{ border: '1px solid var(--border-default)', borderRadius: 4, padding: 8, background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={watcher.enabled} onChange={() => toggleWatcher(machine.id, watcher.id)} aria-label={`Enable ${watcher.label}`} />
              <strong style={{ fontSize: 12, flex: 1, color: 'var(--text-primary)' }}>{watcher.label}</strong>
              <button onClick={() => edit(watcher)} style={buttonStyle}>Edit</button>
              <button onClick={() => removeWatcher(machine.id, watcher.id)} style={buttonStyle}>Delete</button>
            </div>
            <div style={{ marginTop: 5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{summarizeWatcherCondition(watcher.predicate)}</div>
          </div>
        ))}
      </div>
      <fieldset style={{ border: '1px solid var(--border-default)', borderRadius: 4, margin: 0, padding: 9 }}>
        <legend style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{editingId ? 'Edit watcher' : 'New watcher'}</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Name (optional)" style={inputStyle} aria-label="Watcher name" />
          {clauses.length > 1 && (
            <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Match
              <select value={operator} onChange={(event) => setOperator(event.target.value as 'AND' | 'OR')} style={{ ...inputStyle, width: 70, marginLeft: 6 }} aria-label="Condition group operator">
                <option value="AND">all</option>
                <option value="OR">any</option>
              </select>
              {' '}conditions
            </label>
          )}
          {clauses.map((clause, index) => (
            <ClauseEditor
              key={index}
              clause={clause}
              onChange={(next) => setClauses((current) => current.map((item, currentIndex) => currentIndex === index ? next : item))}
              onRemove={() => setClauses((current) => current.filter((_, currentIndex) => currentIndex !== index))}
              allowRemove={clauses.length > 1}
            />
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={nextKind} onChange={(event) => setNextKind(event.target.value as ClauseKind)} style={{ ...inputStyle, flex: 1 }} aria-label="Additional condition type">
              <option value="state">State</option>
              <option value="headSymbol">Head symbol</option>
              <option value="headPosition">Head position</option>
              <option value="step">Step number</option>
              <option value="tapeWindow">Tape window</option>
            </select>
            <button onClick={() => setClauses((current) => [...current, defaultClause(nextKind, machine.states[0]?.id ?? '')])} style={buttonStyle}>Add condition</button>
          </div>
          {errors.map((error) => <div key={error} style={{ color: 'var(--status-reject)', fontSize: 11 }}>{error}</div>)}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={save} disabled={errors.length > 0} style={{ ...buttonStyle, opacity: errors.length ? 0.45 : 1, cursor: errors.length ? 'not-allowed' : 'pointer' }}>{editingId ? 'Save' : 'Add watcher'}</button>
            {editingId && <button onClick={resetForm} style={buttonStyle}>Cancel</button>}
          </div>
        </div>
      </fieldset>
    </div>
  )
}
