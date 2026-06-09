import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'

const PLACEHOLDER = 'Double-click to edit text'

const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const { label } = data as { label: string }
  const { updateState } = useMachineStore()
  const { renamingStateId, stopRenaming } = useUIStore()

  const [isEditing, setIsEditing] = useState(false)
  const [textDraft, setTextDraft] = useState(label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTextDraft(label)
  }, [label])

  const beginEdit = useCallback(() => {
    setIsEditing(true)
    // The placeholder is a hint, not real content — start blank so the very
    // first character typed replaces it (no manual select-and-delete).
    setTextDraft(label === PLACEHOLDER ? '' : label)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [label])

  // Freshly created via "Add Text" → drop straight into edit mode.
  useEffect(() => {
    if (renamingStateId === id) beginEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renamingStateId, id])

  const startEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      beginEdit()
    },
    [beginEdit]
  )

  const finishEditing = useCallback(() => {
    setIsEditing(false)
    if (renamingStateId === id) stopRenaming()
  }, [renamingStateId, id, stopRenaming])

  const commitEdit = useCallback(() => {
    const trimmed = textDraft.trim()
    updateState(id, { label: trimmed || PLACEHOLDER })
    finishEditing()
  }, [id, textDraft, updateState, finishEditing])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Enter saves, Shift+Enter inserts a newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commitEdit()
      }
      if (e.key === 'Escape') {
        setTextDraft(label)
        finishEditing()
      }
    },
    [commitEdit, label, finishEditing]
  )

  const isPlaceholder = label === PLACEHOLDER

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={120}
        minHeight={44}
        onResizeEnd={(_, params) =>
          updateState(id, { width: Math.round(params.width), height: Math.round(params.height) })
        }
      />
      <div
        onDoubleClick={startEdit}
        // nowheel → scroll inside the box instead of zooming the canvas.
        className={`nowheel${isEditing ? ' nodrag' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          border: selected ? '1.5px solid var(--border-strong)' : '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontFamily: 'var(--font-sans)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          cursor: isEditing ? 'text' : 'move',
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Type here…"
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)',
              resize: 'none',
            }}
          />
        ) : (
          <span style={{ color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)' }}>{label}</span>
        )}
      </div>
    </>
  )
})

TextNode.displayName = 'TextNode'
export default TextNode
