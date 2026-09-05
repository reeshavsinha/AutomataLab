import { useMemo, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { generateId } from '@/engines/machine/core/utils'

function cloneDefinition<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Advanced TM-only manager for owned, embedded submachine snapshots. */
export default function SubmachinesPanel() {
  const { machine, tabs, upsertSubmachine, removeSubmachine, setSubmachineDepthLimit, updateTransition } = useMachineStore()
  const candidates = useMemo(() => tabs.filter((tab) =>
    tab.id !== machine.id &&
    tab.type === 'TM' &&
    Math.max(1, tab.tapeCount ?? 1) === Math.max(1, machine.tapeCount ?? 1) &&
    (tab.blankSymbol || '_') === (machine.blankSymbol || '_'),
  ), [tabs, machine.id, machine.tapeCount, machine.blankSymbol])
  const [selectedId, setSelectedId] = useState('')
  const childEntries = Object.entries(machine.submachines ?? {})
  const unresolved = machine.transitions.filter((transition) =>
    transition.submachineId && !machine.submachines?.[transition.submachineId],
  )

  const embed = () => {
    const source = candidates.find((candidate) => candidate.id === selectedId)
    if (!source) return
    const id = generateId('submachine')
    const child = cloneDefinition(source)
    child.id = generateId('machine')
    upsertSubmachine(id, child)
    setSelectedId('')
  }

  if (machine.type !== 'TM') {
    return <div style={noteStyle}>Submachines are available only for deterministic TMs.</div>
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '12px' }}>
      <div style={titleStyle}>EMBEDDED SUBMACHINES</div>
      <p style={noteStyle}>
        Advanced mode. A call uses the caller’s live tape and heads. Child acceptance returns to the call transition’s destination; reject or stuck halts the root run.
      </p>
      <div style={{ ...rowStyle, alignItems: 'center', marginBottom: '12px' }}>
        <span style={hintStyle}>MAX CALL DEPTH</span>
        <input
          type="number"
          min={1}
          max={16}
          defaultValue={machine.submachineDepthLimit ?? 16}
          onBlur={(event) => setSubmachineDepthLimit(event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))}
          style={{ ...inputStyle, flex: '0 0 54px' }}
          aria-label="Maximum nested submachine call depth"
        />
      </div>

      <div style={rowStyle}>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} style={inputStyle} aria-label="TM tab to embed">
          <option value="">Choose a compatible TM tab…</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
        <button disabled={!selectedId} onClick={embed} style={buttonStyle}>Embed copy</button>
      </div>
      {candidates.length === 0 && (
        <div style={hintStyle}>Create another TM tab with the same tape count and blank symbol, then return here to embed a snapshot.</div>
      )}

      <div style={{ ...titleStyle, marginTop: '18px' }}>OWNED SNAPSHOTS</div>
      {childEntries.length === 0 ? (
        <div style={hintStyle}>No child snapshots yet. Attach one to a transition in the transition editor.</div>
      ) : childEntries.map(([id, child]) => (
        <div key={id} style={cardStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.name}</div>
            <div style={hintStyle}>{id} · {child.states.filter((state) => !state.isText).length} states · {child.transitions.length} moves</div>
          </div>
          <button onClick={() => removeSubmachine(id)} style={removeStyle} title="Remove embedded child; attached calls remain repairable">Remove</button>
        </div>
      ))}

      {unresolved.length > 0 && (
        <>
          <div style={{ ...titleStyle, marginTop: '18px' }}>REPAIR UNRESOLVED CALLS</div>
          {unresolved.map((transition) => (
            <div key={transition.id} style={cardStyle}>
              <span style={hintStyle}>{transition.submachineId} on {transition.from} → {transition.to}</span>
              <select
                value=""
                onChange={(event) => updateTransition(transition.id, { submachineId: event.target.value || undefined })}
                style={inputStyle}
                aria-label="Repair submachine call"
              >
                <option value="">Remove call</option>
                {childEntries.map(([id, child]) => <option key={id} value={id}>Use {child.name}</option>)}
              </select>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const titleStyle: React.CSSProperties = {
  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em',
}
const noteStyle: React.CSSProperties = {
  color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, margin: '8px 0 12px',
}
const hintStyle: React.CSSProperties = {
  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: 1.45,
}
const rowStyle: React.CSSProperties = { display: 'flex', gap: '6px' }
const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 7px', fontSize: '12px',
}
const buttonStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)', padding: '5px 8px', cursor: 'pointer', fontSize: '11px',
}
const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px', marginTop: '6px',
}
const removeStyle: React.CSSProperties = { ...buttonStyle, color: 'var(--text-muted)', flexShrink: 0 }
