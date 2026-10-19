// ============================================================
// TransitionEdge — Custom React Flow edge for automata transitions
// Renders draggable curved paths with inline editable labels.
// ============================================================

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import EpsilonInserter from './EpsilonInserter'
import { EPSILON, isEpsilon, parseMealyLabel } from '@/engines/machine/core/utils'

export interface TransitionEdgeData {
  symbols: string[]
  isSelfLoop?: boolean
  hasReverse?: boolean
  controlPointOffset?: { x: number; y: number }
  /** PDA: pre-formatted `read, pop → push` labels, one per member transition. */
  pdaLabels?: string[]
  /** PDA flag — switches label rendering and routes editing to the modal. */
  isPDA?: boolean
  /** TM/LBA: pre-formatted `read → write, dir` labels, one per member transition. */
  tmLabels?: string[]
  /** TM/LBA flag — switches label rendering and routes editing to the modal. */
  isTM?: boolean
  /** Mealy flag — inline labels use `input / output` pairs. */
  isMealy?: boolean
  /** All transition ids represented by this visual edge (for active highlighting). */
  memberTransitionIds?: string[]
  [key: string]: unknown
}

/**
 * Above this many states we skip the per-edge "bow around intervening nodes"
 * auto-routing. That routing scans every state for every edge — O(states·edges)
 * on each canvas render (and it re-renders on every pan/drag/sim step) — so it
 * stalls very large graphs. Past the threshold edges keep the cheap reverse-bow
 * and may overlap a node; the user can still drag any edge to curve it.
 */
const AUTO_ROUTE_MAX_STATES = 80

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
    const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()
    const { activeTransitionIds, pathTransitionIds, status: simStatus } = useSimulationStore()
    const { isEditingTransition, setEditingTransition, openTransitionEditor } = useUIStore()
    const isENFA = machine.type === 'ENFA'
    const isPDA = !!edgeData?.isPDA
    const isTM = !!edgeData?.isTM
    const isMealy = !!edgeData?.isMealy
    // PDA and TM/LBA labels are multi-line and edited through the modal.
    const isModalEdited = isPDA || isTM
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

    // Edge geometry is computed from node CENTRES, read LIVE from React Flow's
    // internal node store so the curve follows a state while it is being dragged
    // (the machine store only persists the new position on drag-stop, which would
    // otherwise leave the edge anchored to the old spot mid-drag). We use the node
    // centre (top-left + radius), not React Flow's rim handle points, so the
    // right-rim drag-to-connect handle doesn't skew outgoing curves. State nodes
    // are a fixed 52px circle ⇒ centre = positionAbsolute + NODE_RADIUS.
    const srcNode = useInternalNode(source)
    const tgtNode = useInternalNode(target)
    const sCenterX = srcNode ? srcNode.internals.positionAbsolute.x + NODE_RADIUS : sourceX
    const sCenterY = srcNode ? srcNode.internals.positionAbsolute.y + NODE_RADIUS : sourceY
    const tCenterX = tgtNode ? tgtNode.internals.positionAbsolute.x + NODE_RADIUS : targetX
    const tCenterY = tgtNode ? tgtNode.internals.positionAbsolute.y + NODE_RADIUS : targetY

    useEffect(() => {
      // PDA and TM/LBA labels are edited through the modal, never inline.
      if (isEditingTransition === id && !isModalEdited) {
        setIsEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
      }
    }, [isEditingTransition, id, isModalEdited])

    useEffect(() => {
      setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
    }, [edgeData?.symbols])

    // Compute edge path and label position. `labelAnchor*` is the point ON the
    // curve; `label*` is the off-curve position the chip is drawn at (UX #2).
    let edgePath = ''
    let labelX = 0
    let labelY = 0
    let labelAnchorX = 0
    let labelAnchorY = 0

    if (isSelfLoop) {
      // Self loop geometry
      const cx = sCenterX
      const cy = sCenterY - NODE_RADIUS

      const defaultOffsetX = 0
      const defaultOffsetY = -60
      defaultOffsetRef.current = { x: defaultOffsetX, y: defaultOffsetY }

      const offset = edgeData.controlPointOffset || { x: defaultOffsetX, y: defaultOffsetY }

      const cp1x = cx - 40 + offset.x
      const cp1y = cy - 40 + offset.y
      const cp2x = cx + 40 + offset.x
      const cp2y = cy - 40 + offset.y

      // Compute dynamic intersections with the node circle
      const start = getIntersection(sCenterX, sCenterY, cp1x, cp1y, NODE_RADIUS)
      const end = getIntersection(tCenterX, tCenterY, cp2x, cp2y, NODE_RADIUS)

      const sx = start.x
      const sy = start.y
      const tx = end.x
      const ty = end.y

      edgePath = `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${tx} ${ty}`

      // Position label at t=0.5 of cubic bezier. The loop apex already sits
      // clear of the node, so no perpendicular offset/leader is needed here.
      labelX = 0.125 * sx + 0.375 * cp1x + 0.375 * cp2x + 0.125 * tx
      labelY = 0.125 * sy + 0.375 * cp1y + 0.375 * cp2y + 0.125 * ty
      labelAnchorX = labelX
      labelAnchorY = labelY

    } else {
      // Connect between two different nodes
      const dx_centers = tCenterX - sCenterX
      const dy_centers = tCenterY - sCenterY
      const dist_centers = Math.sqrt(dx_centers * dx_centers + dy_centers * dy_centers)

      const mx = (sCenterX + tCenterX) / 2
      const my = (sCenterY + tCenterY) / 2

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

        // Only auto-route when the user hasn't manually curved this edge — and
        // only for reasonably sized graphs (the scan below is O(states) per edge).
        if (!edgeData.controlPointOffset && machine.states.length <= AUTO_ROUTE_MAX_STATES) {
          const ux = dx_centers / dist_centers
          const uy = dy_centers / dist_centers
          const clearance = NODE_RADIUS + 22

          let bow = edgeData.hasReverse ? 35 : 0
          for (const st of machine.states) {
            if (st.isText || st.id === source || st.id === target) continue
            const relX = st.x + NODE_RADIUS - sCenterX
            const relY = st.y + NODE_RADIUS - sCenterY
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

      const start = getIntersection(sCenterX, sCenterY, cx, cy, NODE_RADIUS)
      const end = getIntersection(tCenterX, tCenterY, cx, cy, NODE_RADIUS)

      const sx = start.x
      const sy = start.y
      const tx = end.x
      const ty = end.y

      edgePath = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`

      // Anchor on the curve at t=0.5 of the quadratic bezier …
      labelAnchorX = 0.25 * sx + 0.5 * cx + 0.25 * tx
      labelAnchorY = 0.25 * sy + 0.5 * cy + 0.25 * ty
      // … then push the chip off the line, perpendicular to the chord on the
      // bowed side, so it never lands on the curve or the states it joins (#2).
      const chordLen = dist_centers || 1
      const perpLX = -dy_centers / chordLen
      const perpLY = dx_centers / chordLen
      const bowDot = perpLX * offset.x + perpLY * offset.y
      const labelSide = bowDot >= 0 ? 1 : -1
      const LABEL_OFFSET = 16
      labelX = labelAnchorX + perpLX * labelSide * LABEL_OFFSET
      labelY = labelAnchorY + perpLY * labelSide * LABEL_OFFSET
    }

    const commitEdit = useCallback(() => {
      const trimmed = labelDraft.trim()
      // Collapse the visual edge's sibling transitions into this one so the
      // rendered label and the stored transitions stay in sync.
      const collapseSiblings = () => {
        for (const mid of memberIds) {
          if (mid !== id) deleteTransition(mid)
        }
      }
      if (trimmed) {
        if (isMealy) {
          const pairs = parseMealyLabel(trimmed)
          if (!pairs) {
            setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
            return
          }
          const uniquePairs = pairs.filter((pair, index) => pairs.findIndex((candidate) => candidate.input === pair.input && candidate.output === pair.output) === index)
          updateTransition(id, { symbols: [uniquePairs[0].input], output: uniquePairs[0].output })
          collapseSiblings()
          for (const pair of uniquePairs.slice(1)) {
            const sibling = addTransition(source, target, [pair.input])
            updateTransition(sibling.id, { output: pair.output })
          }
          setIsEditing(false)
          if (isEditingTransition === id) setEditingTransition(null)
          return
        }
        const symbols = Array.from(
          new Set(
            trimmed
              .split(/[,，\s]+/)
              .map((s) => s.trim())
              .filter(Boolean)
              // Normalise any epsilon spelling (eps / λ / lambda / blank) to the
              // canonical ε so the stored + displayed symbol is unambiguous and
              // ε is discoverable without the inserter (UX audit DISC-1).
              .map((s) => (isEpsilon(s) ? EPSILON : s)),
          ),
        )
        updateTransition(id, { symbols })
        collapseSiblings()
      } else if (isENFA) {
        // On an ε-NFA, an emptied label means an ε-move — make that explicit
        // instead of silently reverting (UX audit DISC-1).
        updateTransition(id, { symbols: [EPSILON] })
        collapseSiblings()
      } else {
        setLabelDraft(edgeData?.symbols?.join(', ') ?? '')
      }
      setIsEditing(false)
      if (isEditingTransition === id) {
        setEditingTransition(null)
      }
    }, [id, memberIds, labelDraft, isENFA, isMealy, source, target, addTransition, updateTransition, deleteTransition, edgeData?.symbols, isEditingTransition, setEditingTransition])

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
      ? 'var(--trace)'
      : selected
      ? 'var(--border-strong)'
      : 'var(--text-primary)'

    const strokeWidth = isActive ? 2 : selected ? 1.5 : 1

    // ─── Label content (UX #2) ───────────────────────────────────────────
    // Merged FA edges and stacked PDA/TM rules collapse to a compact chip with
    // a "+N" count; the full text appears on hover/select/active (and always in
    // the tooltip), so dense graphs stay readable without losing information.
    const showFull = hovered || selected || isActive || isEditing
    let fullLabel: string
    let collapsedLabel: string
    if (isTM) {
      const ls = edgeData?.tmLabels ?? []
      fullLabel = ls.join('\n') || '?'
      collapsedLabel = ls.length > 1 ? `${ls[0]}  +${ls.length - 1}` : (ls[0] ?? '?')
    } else if (isPDA) {
      const ls = edgeData?.pdaLabels ?? []
      fullLabel = ls.join('\n') || '?'
      collapsedLabel = ls.length > 1 ? `${ls[0]}  +${ls.length - 1}` : (ls[0] ?? '?')
    } else {
      const syms = edgeData?.symbols ?? []
      fullLabel = syms.join(', ') || '?'
      const MAX_INLINE = 4
      collapsedLabel = syms.length > MAX_INLINE
        ? `${syms.slice(0, MAX_INLINE).join(', ')} +${syms.length - MAX_INLINE}`
        : fullLabel
    }
    const labelText = showFull ? fullLabel : collapsedLabel
    const labelTitle = isTM
      ? `${fullLabel}\n\nDouble-click to edit TM transitions.`
      : isPDA
      ? `${fullLabel}\n\nDouble-click to edit PDA transitions.`
      : `${fullLabel}\n\nDouble-click to edit · drag to curve.`

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

        {/* Short leader from the curve to the off-curve label (UX #2). */}
        {!isSelfLoop && (
          <line
            x1={labelAnchorX}
            y1={labelAnchorY}
            x2={labelX}
            y2={labelY}
            stroke={edgeColor}
            strokeWidth={1}
            strokeOpacity={0.45}
            style={{ pointerEvents: 'none' }}
          />
        )}

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
                  placeholder={isENFA ? 'empty = ε' : ''}
                  title={isENFA ? 'Comma- or space-separated symbols. Leave empty (or type eps) for an ε-move.' : 'Comma- or space-separated symbols.'}
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
                  if (isModalEdited) {
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
                  // Slightly translucent so the curve beneath stays visible (#2).
                  background: 'var(--bg-primary)',
                  opacity: 0.96,
                  border: `1px solid ${edgeColor}`,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--state-active)' : 'var(--text-secondary)',
                  cursor: 'grab',
                  userSelect: 'none',
                  whiteSpace: showFull && (isModalEdited || labelText.includes('\n')) ? 'pre-line' : 'nowrap',
                  maxWidth: showFull ? '220px' : 'none',
                  overflowWrap: 'anywhere',
                  textAlign: 'center',
                  lineHeight: 1.35,
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: 'var(--shadow-sm)',
                }}
                title={labelTitle}
              >
                {labelText}
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
