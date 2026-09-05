// ============================================================
// StateNode — Custom React Flow node for automata states
// Handles are centered so edges can calculate accurate boundaries.
// Plain black & white. No animations.
// ============================================================

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

export interface StateNodeData {
  label: string
  isStart: boolean
  isAccept: boolean
  isReject?: boolean
  /** Moore-only state output, shown and edited beneath the state label. */
  output?: string
  /** Provenance shown on hover (e.g. the subset a converted DFA state stands for). */
  description?: string
  isTransitionTarget?: boolean   // highlight when in "start transition" mode
  [key: string]: unknown
}

const StateNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as StateNodeData
  const { updateState } = useMachineStore()
  const machineType = useMachineStore((s) => s.machine.type)
  const { activeStateIds, status, pathStateIds } = useSimulationStore()
  const renamingStateId = useUIStore((s) => s.renamingStateId)
  const stopRenaming = useUIStore((s) => s.stopRenaming)
  const analysisState = useUIStore((s) => s.analysisHighlights[id])

  const [isEditing, setIsEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(nodeData.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const isActive = activeStateIds.includes(id)
  // A run has halted (any terminal status) — used to paint the trace path and
  // the per-status final-state treatment (UX audit THY-1 / FBK-1).
  const halted = status === 'accepted' || status === 'rejected' || status === 'stuck'
  const isOnPath = halted && pathStateIds.includes(id)
  // Editing is allowed unless a run is actively in progress; a finished run is
  // editable too (any edit auto-resets the sim — see useSimulation).
  const canEditStructure = status !== 'running'

  useEffect(() => {
    setLabelDraft(nodeData.label)
  }, [nodeData.label])

  // React to the context menu trigger for renaming
  useEffect(() => {
    if (renamingStateId === id) {
      setIsEditing(true)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [renamingStateId, id])

  const toggleAccept = useCallback(() => {
    updateState(id, { isAccept: !nodeData.isAccept });
  }, [id, nodeData.isAccept, updateState]);

  const startEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!canEditStructure) return
      setIsEditing(true)
      setTimeout(() => inputRef.current?.select(), 0)
    },
    [canEditStructure]
  )

  const commitEdit = useCallback(() => {
    const trimmed = labelDraft.trim()
    if (trimmed && trimmed !== nodeData.label) {
      updateState(id, { label: trimmed })
    } else {
      setLabelDraft(nodeData.label)
    }
    setIsEditing(false)
    if (renamingStateId === id) {
      stopRenaming()
    }
  }, [id, labelDraft, nodeData.label, updateState, renamingStateId, stopRenaming])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit()
      if (e.key === 'Escape') {
        setLabelDraft(nodeData.label)
        setIsEditing(false)
        if (renamingStateId === id) stopRenaming()
      }
    },
    [commitEdit, nodeData.label, renamingStateId, id, stopRenaming]
  )

  const isTransducer = machineType === 'MEALY' || machineType === 'MOORE'

  // Build class names — no animation classes.
  // Only states that are *actually accepting* glow green at accept-time — other
  // live states (e.g. the start state in an NFA run) stay neutral-active so they
  // don't look "accepted" (UX audit #8).
  const classes = [
    'state-node',
    selected ? 'selected' : '',
    nodeData.isStart ? 'start' : '',
    !isTransducer && nodeData.isAccept ? 'accept' : '',
    !isTransducer && nodeData.isReject ? 'reject' : '',
    isActive ? 'active' : '',
    halted && isActive && status === 'accepted' && nodeData.isAccept ? 'accepted-final' : '',
    halted && isActive && status === 'rejected' ? 'rejected-final' : '',
    halted && isActive && status === 'stuck' ? 'stuck-final' : '',
    nodeData.isTransitionTarget ? 'transition-target-mode' : '',
    analysisState === 'unreachable' ? 'analysis-unreachable' : '',
    analysisState === 'dead' ? 'analysis-dead' : '',
    analysisState === 'sink' ? 'analysis-sink' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const hasRole = nodeData.isStart || (!isTransducer && (nodeData.isAccept || nodeData.isReject)) || analysisState === 'sink'
  const isMoore = machineType === 'MOORE'

  return (
    <div className="state-node-wrap" style={{ position: 'relative', width: 52, height: 52 }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, border: 'none', width: 1, height: 1 }}
      />

      <div
        className={classes}
        onDoubleClick={isTransducer ? undefined : toggleAccept}
        title={`${nodeData.label}${nodeData.isStart ? ' (start)' : ''}${!isTransducer && nodeData.isAccept ? ' (accept)' : ''}${!isTransducer && nodeData.isReject ? ' (reject)' : ''}${nodeData.description ? `\n${nodeData.description}` : ''}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag while typing
            style={{
              // Grow with the text so long labels aren't clipped while editing.
              width: `${Math.max(40, labelDraft.length * 8 + 8)}px`,
              maxWidth: '160px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          />
        ) : (
          <span style={{ pointerEvents: 'none' }}>{nodeData.label}</span>
        )}
      </div>
      {isMoore && (
        <input
          aria-label={`Output for ${nodeData.label}`}
          value={nodeData.output ?? ''}
          placeholder="output"
          onChange={(e) => updateState(id, { output: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '56px',
            left: '-18px',
            width: '88px',
            height: '18px',
            padding: '1px 4px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
      )}

      {/* Persistent role badges — a redundant, projector-readable cue beyond the
          (subtle) border/ring differences (UX audit #9). */}
      {hasRole && (
        <div
          style={{
            position: 'absolute',
            top: -7,
            right: -7,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          {nodeData.isStart && <RoleBadge glyph="▶" title="Start state" />}
          {!isTransducer && nodeData.isAccept && <RoleBadge glyph="◎" title="Accept (final) state" />}
          {!isTransducer && nodeData.isReject && <RoleBadge glyph="⊘" title="Reject (halt) state" reject />}
          {analysisState === 'sink' && <RoleBadge glyph="⭲" title="Sink state (analysis)" />}
        </div>
      )}

      {/* Drag-to-connect source handle. Hidden 1×1 while a sim is actively
          running (connections disabled); a visible nub on hover otherwise — incl.
          on a finished run, which auto-resets when you draw (UX audit #1). Edge
          geometry is derived from node centres in TransitionEdge, so the nub can
          sit on the rim without distorting the curves. */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={canEditStructure}
        className={canEditStructure ? 'state-node-connect-handle' : undefined}
        style={
          canEditStructure
            ? { top: '50%', left: '100%', right: 'auto', transform: 'translate(-50%, -50%)' }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, border: 'none', width: 1, height: 1 }
        }
      />
    </div>
  )
})

function RoleBadge({ glyph, title, reject }: { glyph: string; title: string; reject?: boolean }) {
  return (
    <span
      title={title}
      style={{
        width: 15,
        height: 15,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        lineHeight: 1,
        fontFamily: 'var(--font-mono)',
        background: 'var(--bg-card)',
        color: reject ? 'var(--status-reject)' : 'var(--text-primary)',
        border: `1px solid ${reject ? 'var(--status-reject)' : 'var(--text-primary)'}`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {glyph}
    </span>
  )
}

StateNode.displayName = 'StateNode'

export default StateNode
