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
import EpsilonInserter from './EpsilonInserter'

export interface TransitionEdgeData {
  symbols: string[]
  isSelfLoop?: boolean
  hasReverse?: boolean
  controlPointOffset?: { x: number; y: number }
  /** PDA: pre-formatted `read, pop → push` labels, one per member transition. */
  pdaLabels?: string[]
  /** PDA flag — switches label rendering and routes editing to the modal. */
  isPDA?: boolean
  /** All transition ids represented by this visual edge (for active highlighting). */
  memberTransitionIds?: string[]
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
    const { machine, updateTransition, deleteTransition } = useMachineStore()
    const { activeTransitionIds } = useSimulationStore()
    const { isEditingTransition, setEditingTransition, openTransitionEditor } = useUIStore()
    const isENFA = machine.type === 'ENFA'
    const isPDA = !!edgeData?.isPDA
    const { screenToFlowPosition } = useReactFlow()

        const [isEditing, setIsEditing] = useState(false)
    const [labelDraft, setLabelDraft] = useState(edgeData?.symbols?.join(', ') ?? '')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    // Bring an overlapping label to the front on hover (dense-graph readability).
    const [hovered, setHovered] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    // Default curve offset (incl. auto-routing around states); shared with drag start.
    const defaultOffsetRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
      if (!isEditing) {
        setDropdownOpen(false)
      }
    }, [isEditing])

    const isSelfLoop = source === target
    const memberIds = edgeData?.memberTransitionIds ?? [id]
    const isActive = memberIds.some((mid) => activeTransitionIds.includes(mid))
    const NODE_RADIUS = 26

    useEffect(() => {
      // PDA labels are edited through the modal, never inline.
      if (isEditingTransition === id && !isPDA) {
        setIsEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
      }
    }, [isEditingTransition, id, isPDA])

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
      defaultOffsetRef.current = { x: defaultOffsetX, y: defaultOffsetY }

      const offset = edgeData.controlPointOffset || { x: defaultOffsetX, y: defaultOffsetY }

      const cp1x = cx - 40 + offset.x
      const cp1y = cy - 40 + offset.y
      const cp2x = cx + 40 + offset.x
      const cp2y = cy - 40 + offset.y

      // Compute dynamic intersections with the node circle
      const start = getIntersection(sourceX, sourceY, cp1x, cp1y, NODE_RADIUS)
      const end = getIntersection(targetX, targetY, cp2x, cp2y, NODE_RADIUS)

      const sx = start.x
      const sy = start.y
      const tx = end.x
      const ty = end.y

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

      // Default curve: bow apart from a reverse edge, and bow around any state
      // node the straight path would otherwise run over (and dump its label on).
      let defaultOffsetX = 0
      let defaultOffsetY = 0
      if (dist_centers > 0) {
        const perpX = -dy_centers / dist_centers
        const perpY = dx_centers / dist_centers

        if (edgeData.hasReverse) {
          defaultOffsetX = perpX * 35
          defaultOffsetY = perpY * 35
        }

        // Only auto-route when the user hasn't manually curved this edge.
        if (!edgeData.controlPointOffset) {
          const ux = dx_centers / dist_centers
          const uy = dy_centers / dist_centers
          // Calibrate stored top-left → center using the known source mapping.
          const srcState = machine.states.find((s) => s.id === source)
          const offX = srcState ? sourceX - srcState.x : NODE_RADIUS
          const offY = srcState ? sourceY - srcState.y : NODE_RADIUS
          const clearance = NODE_RADIUS + 22

          let bow = edgeData.hasReverse ? 35 : 0
          for (const st of machine.states) {
            if (st.isText || st.id === source || st.id === target) continue
            const relX = st.x + offX - sourceX
            const relY = st.y + offY - sourceY
            const t = (relX * ux + relY * uy) / dist_centers
            if (t < 0.12 || t > 0.88) continue // not between the endpoints
            const perpDist = relX * perpX + relY * perpY
            if (Math.abs(perpDist) > clearance) continue // not on the path
            // Bow to the side away from the node, far enough to clear it.
            const side = perpDist === 0 ? -1 : -Math.sign(perpDist)
            const factor = 2 * t * (1 - t)
            if (factor < 0.001) continue
            let candidate = (perpDist + side * clearance) / factor
            candidate = Math.sign(candidate) * Math.min(Math.abs(candidate), 180)
            if (Math.abs(candidate) > Math.abs(bow)) bow = candidate
          }
          if (bow !== 0) {
            defaultOffsetX = perpX * bow
            defaultOffsetY = perpY * bow
          }
        }
      }
      defaultOffsetRef.current = { x: defaultOffsetX, y: defaultOffsetY }

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
        // The inline editor represents the WHOLE visual edge (which can bundle
        // several FA transitions on the same pair). Collapse the siblings into
        // this one so the rendered label and the stored transitions stay in sync.
        for (const mid of memberIds) {
          if (mid !== id) deleteTransition(mid)
        }
      } else {
        setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
      }
      setIsEditing(false)
      if (isEditingTransition === id) {
        setEditingTransition(null)
      }
    }, [id, memberIds, labelDraft, updateTransition, deleteTransition, edgeData?.symbols, isEditingTransition, setEditingTransition])

    const cancelEdit = useCallback(() => {
      setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
      setIsEditing(false)
      // Clear the global "editing" flag too, otherwise it stays pinned to this
      // edge id and the auto-open-on-create effect can't retrigger later.
      if (isEditingTransition === id) {
        setEditingTransition(null)
      }
    }, [edgeData?.symbols, isEditingTransition, id, setEditingTransition])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        e.stopPropagation()
        if (e.key === 'Enter') commitEdit()
        if (e.key === 'Escape') cancelEdit()
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.stopPropagation()
        }
      },
      [commitEdit, cancelEdit]
    )

    // ─── Drag functionality for curve adjustment ───────────────
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      // Only allow drag with primary button, and if not editing
      if (e.button !== 0 || isEditing) return
      e.stopPropagation()
      
      const startClient = { x: e.clientX, y: e.clientY }

      // Start dragging from the same default the edge is currently drawn with
      // (kept in sync via defaultOffsetRef so the curve doesn't jump).
      const startOffset = edgeData.controlPointOffset || defaultOffsetRef.current
      
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
        window.removeEventListener('pointercancel', onPointerUp)
      }
      
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      // pointercancel fires when the gesture is interrupted (e.g. the pointer
      // leaves the window or the OS steals it) — without it the move listener leaks.
      window.addEventListener('pointercancel', onPointerUp)
    }, [isEditing, edgeData.controlPointOffset, screenToFlowPosition, id, updateTransition])

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
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: hovered ? 50 : selected || isActive ? 10 : 1,
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
                  <EpsilonInserter
                    targetRef={inputRef}
                    open={dropdownOpen}
                    setOpen={setDropdownOpen}
                    onInsert={(val) => setLabelDraft(val)}
                    size="sm"
                  />
                )}
              </div>
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (isPDA) {
                    openTransitionEditor(source)
                  } else {
                    setIsEditing(true)
                    setTimeout(() => inputRef.current?.select(), 0)
                  }
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
                  whiteSpace: isPDA ? 'pre-line' : 'nowrap',
                  textAlign: 'center',
                  lineHeight: 1.35,
                  fontWeight: isActive ? 600 : 400,
                }}
                title={isPDA ? 'Double-click to edit PDA transitions.' : 'Double-click to edit. Drag to curve edge.'}
              >
                {isPDA
                  ? (edgeData?.pdaLabels?.length ? edgeData.pdaLabels.join('\n') : '?')
                  : (edgeData?.symbols?.join(', ') || '?')}
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
