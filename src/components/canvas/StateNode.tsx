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
  isTransitionTarget?: boolean   // highlight when in "start transition" mode
  [key: string]: unknown
}

const StateNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as StateNodeData
  const { updateState } = useMachineStore()
  const { activeStateIds, status } = useSimulationStore()
  const { renamingStateId, stopRenaming } = useUIStore()

  const [isEditing, setIsEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState(nodeData.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const isActive = activeStateIds.includes(id)
  const isSimDone = status === 'accepted' || status === 'rejected'
  const isIdle = status === 'idle'

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

  const startEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isIdle) return
      setIsEditing(true)
      setTimeout(() => inputRef.current?.select(), 0)
    },
    [isIdle]
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

  // Build class names — no animation classes
  const classes = [
    'state-node',
    selected ? 'selected' : '',
    nodeData.isStart ? 'start' : '',
    nodeData.isAccept ? 'accept' : '',
    isActive ? 'active' : '',
    isSimDone && isActive && status === 'accepted' ? 'accepted-final' : '',
    isSimDone && isActive && status === 'rejected' ? 'rejected-final' : '',
    nodeData.isTransitionTarget ? 'transition-target-mode' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, border: 'none', width: 1, height: 1 }}
      />

      <div
        className={classes}
        onDoubleClick={startEdit}
        title={`${nodeData.label}${nodeData.isStart ? ' (start)' : ''}${nodeData.isAccept ? ' (accept)' : ''}`}
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
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          />
        ) : (
          <span style={{ pointerEvents: 'none' }}>{nodeData.label}</span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, border: 'none', width: 1, height: 1 }}
      />
    </>
  )
})

StateNode.displayName = 'StateNode'

export default StateNode
