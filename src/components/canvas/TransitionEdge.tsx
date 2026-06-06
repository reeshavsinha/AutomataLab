// ============================================================
// TransitionEdge — Custom React Flow edge for automata transitions
// Renders draggable curved paths with inline editable labels.
// ============================================================

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

export interface TransitionEdgeData {
  symbols: string[]
  isSelfLoop?: boolean
  hasReverse?: boolean
  controlPointOffset?: { x: number; y: number }
  [key: string]: unknown
}

// Math helper for circle intersection
function getIntersection(
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
  radius: number
) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return { x: sourceX, y: sourceY }
  return {
    x: sourceX + (dx / dist) * radius,
    y: sourceY + (dy / dist) * radius,
  }
}

const TransitionEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    selected,
    source,
    target,
    markerEnd,
  }: EdgeProps) => {
    const edgeData = data as TransitionEdgeData
    const { machine, updateTransition } = useMachineStore()
    const { activeTransitionIds } = useSimulationStore()
    const { isEditingTransition, setEditingTransition } = useUIStore()
    const isENFA = machine.type === 'ENFA'
    const { screenToFlowPosition } = useReactFlow()

        const [isEditing, setIsEditing] = useState(false)
    const [labelDraft, setLabelDraft] = useState(edgeData?.symbols?.join(', ') ?? '')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (!isEditing) {
        setDropdownOpen(false)
      }
    }, [isEditing])

    const isSelfLoop = source === target
    const isActive = activeTransitionIds.includes(id)
    const NODE_RADIUS = 26

    useEffect(() => {
      if (isEditingTransition === id) {
        setIsEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
      }
    }, [isEditingTransition, id])

    useEffect(() => {
      setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
    }, [edgeData?.symbols])

    // Compute edge path and label position
    let edgePath = ''
    let labelX = 0
    let labelY = 0

    if (isSelfLoop) {
      // Self loop geometry
      const cx = sourceX
      const cy = sourceY - NODE_RADIUS

      const defaultOffsetX = 0
      const defaultOffsetY = -60

      const offset = edgeData.controlPointOffset || { x: defaultOffsetX, y: defaultOffsetY }

      const cp1x = cx - 40 + offset.x
      const cp1y = cy - 40 + offset.y
      const cp2x = cx + 40 + offset.x
      const cp2y = cy - 40 + offset.y

      // Intersection points on top-ish of the circle
      const sx = sourceX - 10
      const sy = sourceY - Math.sqrt(NODE_RADIUS * NODE_RADIUS - 10 * 10)
      const tx = sourceX + 10
      const ty = sourceY - Math.sqrt(NODE_RADIUS * NODE_RADIUS - 10 * 10)

      edgePath = `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${tx} ${ty}`

      // Position label at t=0.5 of cubic bezier
      labelX = 0.125 * sx + 0.375 * cp1x + 0.375 * cp2x + 0.125 * tx
      labelY = 0.125 * sy + 0.375 * cp1y + 0.375 * cp2y + 0.125 * ty

    } else {
      // Connect between two different nodes
      const dx_centers = targetX - sourceX
      const dy_centers = targetY - sourceY
      const dist_centers = Math.sqrt(dx_centers * dx_centers + dy_centers * dy_centers)

      const mx = (sourceX + targetX) / 2
      const my = (sourceY + targetY) / 2

      // If there's a reverse edge, bow outward slightly by default
      let defaultOffsetX = 0
      let defaultOffsetY = 0
      if (edgeData.hasReverse && dist_centers > 0) {
        defaultOffsetX = (-dy_centers / dist_centers) * 35
        defaultOffsetY = (dx_centers / dist_centers) * 35
      }

      const offset = edgeData.controlPointOffset || { x: defaultOffsetX, y: defaultOffsetY }
      const cx = mx + offset.x
      const cy = my + offset.y

      const start = getIntersection(sourceX, sourceY, cx, cy, NODE_RADIUS)
      const end = getIntersection(targetX, targetY, cx, cy, NODE_RADIUS)

      const sx = start.x
      const sy = start.y
      const tx = end.x
      const ty = end.y

      edgePath = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`

      // Position label at t=0.5 of quadratic bezier
      labelX = 0.25 * sx + 0.5 * cx + 0.25 * tx
      labelY = 0.25 * sy + 0.5 * cy + 0.25 * ty
    }

    const commitEdit = useCallback(() => {
      const trimmed = labelDraft.trim()
      if (trimmed) {
        const symbols = trimmed
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        updateTransition(id, { symbols })
      } else {
        setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
      }
      setIsEditing(false)
      if (isEditingTransition === id) {
        setEditingTransition(null)
      }
    }, [id, labelDraft, updateTransition, edgeData?.symbols, isEditingTransition, setEditingTransition])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        e.stopPropagation()
        if (e.key === 'Enter') commitEdit()
        if (e.key === 'Escape') {
          setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
          setIsEditing(false)
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.stopPropagation()
        }
      },
      [commitEdit, edgeData?.symbols]
    )

    // ─── Drag functionality for curve adjustment ───────────────
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      // Only allow drag with primary button, and if not editing
      if (e.button !== 0 || isEditing) return
      e.stopPropagation()
      
      const startClient = { x: e.clientX, y: e.clientY }
      
      // Compute default offset if none exists (same as render logic)
      let defaultX = 0, defaultY = 0
      if (isSelfLoop) {
        defaultY = -60
      } else if (edgeData.hasReverse) {
        const dx = targetX - sourceX
        const dy = targetY - sourceY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
          defaultX = (-dy / dist) * 35
          defaultY = (dx / dist) * 35
        }
      }
      
      const startOffset = edgeData.controlPointOffset || { x: defaultX, y: defaultY }
      
      const onPointerMove = (e2: PointerEvent) => {
        const startFlow = screenToFlowPosition(startClient)
        const currFlow = screenToFlowPosition({ x: e2.clientX, y: e2.clientY })
        const deltaX = currFlow.x - startFlow.x
        const deltaY = currFlow.y - startFlow.y
        
        updateTransition(id, {
          controlPointOffset: {
            x: startOffset.x + deltaX,
            y: startOffset.y + deltaY
          }
        })
      }
      
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }
      
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }, [isEditing, isSelfLoop, edgeData.controlPointOffset, edgeData.hasReverse, screenToFlowPosition, sourceX, sourceY, targetX, targetY, id, updateTransition])

    const edgeColor = isActive
      ? 'var(--state-active)'
      : selected
      ? 'var(--border-strong)'
      : 'var(--text-primary)'

    const strokeWidth = isActive ? 2 : selected ? 1.5 : 1

    return (
      <>
        {/* Visible stroke */}
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: edgeColor,
            strokeWidth,
            transition: 'stroke 200ms ease, stroke-width 200ms ease',
          }}
        />
        
        {/* Invisible wider hit-area for dragging */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="react-flow__edge-interaction"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onPointerDown={handlePointerDown}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: selected || isActive ? 10 : 1,
            }}
            className="nodrag nopan"
          >
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                <input
                  ref={inputRef}
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  onPointerDown={(e) => e.stopPropagation()}
                  autoFocus
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-strong)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    minWidth: '32px',
                    width: `${Math.max(32, labelDraft.length * 9)}px`,
                    textAlign: 'center',
                  }}
                />
                {isENFA && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDropdownOpen(!dropdownOpen)
                      }}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                      }}
                    >
                      ε/λ
                    </button>
                    {dropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '4px',
                        minWidth: '90px',
                      }}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const input = inputRef.current
                            if (input) {
                              const start = input.selectionStart ?? 0
                              const end = input.selectionEnd ?? 0
                              const val = input.value
                              const newVal = val.substring(0, start) + 'ε' + val.substring(end)
                              setLabelDraft(newVal)
                              setDropdownOpen(false)
                              setTimeout(() => {
                                input.focus()
                                const pos = start + 1
                                input.setSelectionRange(pos, pos)
                              }, 0)
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          ε (epsilon)
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const input = inputRef.current
                            if (input) {
                              const start = input.selectionStart ?? 0
                              const end = input.selectionEnd ?? 0
                              const val = input.value
                              const newVal = val.substring(0, start) + 'λ' + val.substring(end)
                              setLabelDraft(newVal)
                              setDropdownOpen(false)
                              setTimeout(() => {
                                input.focus()
                                const pos = start + 1
                                input.setSelectionRange(pos, pos)
                              }, 0)
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          λ (lambda)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                  setTimeout(() => inputRef.current?.select(), 0)
                }}
                onPointerDown={(e) => {
                  // Let user drag edge from label as well
                  handlePointerDown(e)
                }}
                style={{
                  background: 'var(--bg-primary)',
                  border: `1px solid ${edgeColor}`,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--state-active)' : 'var(--text-secondary)',
                  cursor: 'grab',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: isActive ? 600 : 400,
                }}
                title="Double-click to edit. Drag to curve edge."
              >
                {edgeData?.symbols?.join(', ') || '?'}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }
)

TransitionEdge.displayName = 'TransitionEdge'

export default TransitionEdge
