import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { type NodeProps } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'

const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const { label } = data as { label: string }
  const { updateState } = useMachineStore()

  const [isEditing, setIsEditing] = useState(false)
  const [textDraft, setTextDraft] = useState(label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTextDraft(label)
  }, [label])

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const commitEdit = useCallback(() => {
    const trimmed = textDraft.trim()
    if (trimmed) {
      updateState(id, { label: trimmed })
    } else {
      updateState(id, { label: 'Double-click to edit text' })
    }
    setIsEditing(false)
  }, [id, textDraft, updateState])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Allow enter to save, shift+enter for newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commitEdit()
      }
      if (e.key === 'Escape') {
        setTextDraft(label)
        setIsEditing(false)
      }
    },
    [commitEdit, label]
  )

  return (
    <div
      onDoubleClick={startEdit}
      style={{
        padding: '8px 12px',
        border: selected ? '1.5px solid var(--border-strong)' : '1px dashed var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontFamily: 'var(--font-sans)',
        minWidth: '120px',
        maxWidth: '300px',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: 'text',
      }}
      className="nodrag"
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-primary)',
            resize: 'none',
            minHeight: '40px',
          }}
        />
      ) : (
        <span>{label}</span>
      )}
    </div>
  )
})

TextNode.displayName = 'TextNode'
export default TextNode
