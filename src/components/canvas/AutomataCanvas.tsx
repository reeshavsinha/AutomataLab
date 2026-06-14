// ============================================================
// AutomataCanvas — Main React Flow canvas wrapper
// Handles state/transition CRUD, context menu, transition-draw mode.
// Plain black & white. No animations.
// ============================================================

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useCommandStore } from '@/store/commandStore'
import { BLANK, formatPdaLabel, formatTmTransition, isPDAType, isTMType } from '@/engines/core/utils'
import StateNode from './StateNode'
import TransitionEdge from './TransitionEdge'
import TextNode from './TextNode'
import ContextMenu, { type ContextMenuConfig } from './ContextMenu'
import TransitionEditor from './TransitionEditor'

const NODE_TYPES = {
  stateNode: StateNode,
  textNode: TextNode,
}
const EDGE_TYPES = { transitionEdge: TransitionEdge }

type CanvasTool = 'select' | 'addState' | 'addText' | 'transition'

// Left-rail tools. Glyphs are backed by tooltips/aria-labels so the meaning is
// never carried by the icon alone (UX audit #6 / #4).
const TOOLS: { id: CanvasTool; glyph: string; label: string }[] = [
  { id: 'select',     glyph: '✥', label: 'Select & move — drag nodes (Esc)' },
  { id: 'addState',   glyph: '◯', label: 'Add state — click an empty spot on the canvas' },
  { id: 'transition', glyph: '↗', label: 'Add transition — click the source state, then the target' },
  { id: 'addText',    glyph: 'T', label: 'Add text note — click an empty spot on the canvas' },
]

const TOOL_HINT: Record<Exclude<CanvasTool, 'select'>, string> = {
  addState:   'Add state — click an empty spot · Esc to exit',
  addText:    'Add text note — click an empty spot · Esc to exit',
  transition: 'Add transition — click the source state · Esc to exit',
}

// ─── "Start Transition" mode ────────────────────────────────────
// When the user right-clicks a state → "Add Transition from This State",
// we enter this mode. Clicking another state completes the transition.
interface TransitionDrawMode {
  fromStateId: string
}

function buildNodes(
  machine: ReturnType<typeof useMachineStore.getState>['machine'],
  activeStateIds: string[],
  selectedStateIds: string[],
  transitionMode: TransitionDrawMode | null
): Node[] {
  return machine.states.map((s) => {
    const node: Node = {
      id: s.id,
      type: s.isText ? 'textNode' : 'stateNode',
      position: { x: s.x, y: s.y },
      data: {
        label: s.label,
        isStart: s.isStart,
        isAccept: s.isAccept,
        isReject: s.isReject ?? false,
        description: s.description,
        isTransitionTarget: transitionMode !== null && transitionMode.fromStateId !== s.id && !s.isText,
      },
      draggable: true,
      selected: selectedStateIds.includes(s.id),
    }
    // Text annotations are explicitly sized boxes so they can be resized.
    if (s.isText) {
      node.width = s.width ?? 190
      node.height = s.height ?? 56
    }
    return node
  })
}

function buildEdges(
  machine: ReturnType<typeof useMachineStore.getState>['machine'],
  activeTransitionIds: string[],
  selectedTransitionIds: string[],
  transitionMode: TransitionDrawMode | null
): Edge[] {
  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const tapeCount = isTM ? Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1) : 1
  const blank = machine.blankSymbol || BLANK

  // Group by from__to pair so multiple transitions share one visual edge
  const edgeMap = new Map<string, string[]>()      // FA: merged symbols
  const pdaLabelMap = new Map<string, string[]>()   // PDA: one label per transition
  const tmLabelMap = new Map<string, string[]>()    // TM/LBA: one label per transition
  const memberMap = new Map<string, string[]>()     // all transition ids for the pair
  const edgeIdMap = new Map<string, string>()
  const edgeOffsetMap = new Map<string, { x: number; y: number } | undefined>()

  // Skip orphan transitions whose endpoints no longer exist (e.g. corrupt /
  // partially-loaded files) so React Flow never tries to draw a dangling edge.
  const stateIds = new Set(machine.states.map((s) => s.id))

  for (const t of machine.transitions) {
    if (!stateIds.has(t.from) || !stateIds.has(t.to)) continue
    const key = `${t.from}__${t.to}`
    if (!edgeMap.has(key)) {
      edgeMap.set(key, [])
      pdaLabelMap.set(key, [])
      tmLabelMap.set(key, [])
      memberMap.set(key, [])
      edgeIdMap.set(key, t.id)
      edgeOffsetMap.set(key, t.controlPointOffset)
    }
    memberMap.get(key)!.push(t.id)
    if (isTM) {
      tmLabelMap.get(key)!.push(formatTmTransition(t, tapeCount, blank))
    } else if (isPDA) {
      pdaLabelMap.get(key)!.push(formatPdaLabel(t.read, t.pop, t.push))
    } else {
      for (const sym of t.symbols) {
        if (!edgeMap.get(key)!.includes(sym)) {
          edgeMap.get(key)!.push(sym)
        }
      }
    }
  }

  const edges: Edge[] = []
  for (const [key, symbols] of edgeMap) {
    const [from, to] = key.split('__')
    const edgeId = edgeIdMap.get(key)!
    const memberTransitionIds = memberMap.get(key)!
    const pdaLabels = pdaLabelMap.get(key)!
    const tmLabels = tmLabelMap.get(key)!
    const isActive = memberTransitionIds.some((mid) => activeTransitionIds.includes(mid))
    const hasReverse = edgeMap.has(`${to}__${from}`) && from !== to

    edges.push({
      id: edgeId,
      source: from,
      target: to,
      type: 'transitionEdge',
      data: {
        symbols,
        isSelfLoop: from === to,
        hasReverse,
        controlPointOffset: edgeOffsetMap.get(key),
        isPDA,
        pdaLabels,
        isTM,
        tmLabels,
        memberTransitionIds,
      },
      selected: selectedTransitionIds.includes(edgeId),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isActive ? 'var(--state-active)' : 'var(--text-primary)',
        width: 15,
        height: 15,
      },
    })
  }

  return edges
}

function areNodesEqual(nodesA: Node[], nodesB: Node[]): boolean {
  if (nodesA.length !== nodesB.length) { return false; }
  const mapB = new Map(nodesB.map((n) => [n.id, n]))
  for (const nA of nodesA) {
    const nB = mapB.get(nA.id)
    if (!nB) { return false; }
    if (nA.type !== nB.type) { return false; }
    if (nA.draggable !== nB.draggable) { return false; }
    if (nA.position.x !== nB.position.x || nA.position.y !== nB.position.y) { return false; }

    const dA = nA.data as any
    const dB = nB.data as any
    if (!dA || !dB) { return false; }
    if (dA.label !== dB.label) { return false; }
    if (dA.isStart !== dB.isStart) { return false; }
    if (dA.isAccept !== dB.isAccept) { return false; }
    if ((dA.isReject ?? false) !== (dB.isReject ?? false)) { return false; }
    if ((dA.description ?? '') !== (dB.description ?? '')) { return false; }
    if ((dA.isTransitionTarget ?? false) !== (dB.isTransitionTarget ?? false)) { return false; }
  }
  return true
}

function areEdgesEqual(edgesA: Edge[], edgesB: Edge[]): boolean {
  if (edgesA.length !== edgesB.length) { return false; }
  const mapB = new Map(edgesB.map((e) => [e.id, e]))
  for (const eA of edgesA) {
    const eB = mapB.get(eA.id)
    if (!eB) { return false; }
    if (eA.source !== eB.source) { return false; }
    if (eA.target !== eB.target) { return false; }
    if (eA.type !== eB.type) { return false; }

    const mA = eA.markerEnd as any
    const mB = eB.markerEnd as any
    if (mA?.color !== mB?.color) { return false; }

    const dA = eA.data as any
    const dB = eB.data as any
    if (!dA || !dB) { return false; }
    if (dA.isSelfLoop !== dB.isSelfLoop) { return false; }
    if (dA.hasReverse !== dB.hasReverse) { return false; }

    const symsA = dA.symbols || []
    const symsB = dB.symbols || []
    if (symsA.length !== symsB.length) { return false; }
    for (let i = 0; i < symsA.length; i++) {
      if (symsA[i] !== symsB[i]) { return false; }
    }

    if ((dA.isPDA ?? false) !== (dB.isPDA ?? false)) { return false; }

    const pdaA = dA.pdaLabels || []
    const pdaB = dB.pdaLabels || []
    if (pdaA.length !== pdaB.length) { return false; }
    for (let i = 0; i < pdaA.length; i++) {
      if (pdaA[i] !== pdaB[i]) { return false; }
    }

    if ((dA.isTM ?? false) !== (dB.isTM ?? false)) { return false; }

    const tmA = dA.tmLabels || []
    const tmB = dB.tmLabels || []
    if (tmA.length !== tmB.length) { return false; }
    for (let i = 0; i < tmA.length; i++) {
      if (tmA[i] !== tmB[i]) { return false; }
    }

    const memA = dA.memberTransitionIds || []
    const memB = dB.memberTransitionIds || []
    if (memA.length !== memB.length) { return false; }
    for (let i = 0; i < memA.length; i++) {
      if (memA[i] !== memB[i]) { return false; }
    }

    const oA = dA.controlPointOffset
    const oB = dB.controlPointOffset
    if (!!oA !== !!oB) { return false; }
    if (oA && oB && (oA.x !== oB.x || oA.y !== oB.y)) { return false; }
  }
  return true
}

function AutomataCanvasInner() {
  const machine = useMachineStore((s) => s.machine)
  const {
    addState, addTextState, deleteState, updateState, setStartState,
    toggleAcceptState, toggleRejectState, addTransition, updateTransition, deleteTransition, undo, redo,
  } = useMachineStore()
  const { activeStateIds, activeTransitionIds, status } = useSimulationStore()
  
  const { 
    selectedStateIds, selectedTransitionIds,
    setSelectedStateIds, setSelectedTransitionIds,
    clearSelection, startRenaming, setEditingTransition,
    openTransitionEditor, closeTransitionEditor, transitionEditorStateId,
    clipboard, setClipboard, theme, fitViewNonce, focusRequest,
  } = useUIStore()

  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  // PDA and TM/LBA transitions are created/edited through the modal, not inline.
  const isModalEdited = isPDA || isTM
  const isDark = theme === 'dark'
  // The minimap only earns its screen space once a graph is big enough to scroll
  // off-screen; hide it for tiny diagrams (UX audit S4).
  const showMinimap = machine.states.filter((s) => !s.isText).length > 5

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null)
  const [transitionMode, setTransitionMode] = useState<TransitionDrawMode | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [selectionModeActive, setSelectionModeActive] = useState(false)
  // Active canvas tool — makes the editing modes explicit and clickable instead
  // of relying on hidden gestures/right-click (UX audit #6).
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('select')
  // One-shot canvas glow when a run finishes (green=accept, red=reject).
  const [flash, setFlash] = useState<{ kind: 'accept' | 'reject'; id: number } | null>(null)

  // Structural tools stay usable on a finished run (editing auto-resets it);
  // only an active run forces back to Select.
  useEffect(() => {
    if (status === 'running' && canvasTool !== 'select') setCanvasTool('select')
  }, [status, canvasTool])

  useEffect(() => {
    if (status === 'accepted') setFlash({ kind: 'accept', id: Date.now() })
    else if (status === 'rejected' || status === 'stuck') setFlash({ kind: 'reject', id: Date.now() })
  }, [status])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 950)
    return () => clearTimeout(t)
  }, [flash])

  // After creating a transition, FA edits inline on the canvas; PDA/TM open the modal.
  const beginEditingNewTransition = useCallback(
    (transitionId: string, fromStateId: string) => {
      if (isModalEdited) {
        openTransitionEditor(fromStateId)
      } else {
        setEditingTransition(transitionId)
      }
    },
    [isModalEdited, openTransitionEditor, setEditingTransition]
  )

  // ── Derived nodes/edges from machine store ──────────────────
  const nodes = useMemo(
    () => buildNodes(machine, activeStateIds, selectedStateIds, transitionMode),
    [machine, activeStateIds, selectedStateIds, transitionMode]
  )

  const edges = useMemo(
    () => buildEdges(machine, activeTransitionIds, selectedTransitionIds, transitionMode),
    [machine, activeTransitionIds, selectedTransitionIds, transitionMode]
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges)

  // Keep RF nodes/edges in sync with store
  useEffect(() => {
    setRfNodes((prev) => {
      if (areNodesEqual(nodes, prev)) return prev
      // Merge React Flow's current selected state and dimensions into the new
      // nodes. Index `prev` by id once (O(n)) rather than scanning it per node
      // (O(n²)), which would stall the canvas on large machines.
      const prevById = new Map(prev.map((pr) => [pr.id, pr]))
      return nodes.map((n) => {
        const p = prevById.get(n.id)
        if (p) {
          return { ...n, selected: p.selected, measured: p.measured, width: p.width, height: p.height }
        }
        return n
      })
    })
  }, [nodes, setRfNodes])

  useEffect(() => {
    setRfEdges((prev) => {
      if (areEdgesEqual(edges, prev)) return prev
      const prevById = new Map(prev.map((pr) => [pr.id, pr]))
      return edges.map((e) => {
        const p = prevById.get(e.id)
        if (p) {
          return { ...e, selected: p.selected }
        }
        return e
      })
    })
  }, [edges, setRfEdges])

  // Frame the WHOLE machine — states *and* their transition curves. React Flow's
  // built-in fitView only measures node boxes, so tall self-loops or long bowed
  // edges spill outside the view. We union the node bounds with the actual edge
  // path bounding boxes (read from the rendered SVG, already in flow coords) and
  // fit to that rectangle instead.
  const fitToContent = useCallback(
    (duration = 400) => {
      if (!rfInstance) return
      const rfNodesNow = rfInstance.getNodes()
      if (rfNodesNow.length === 0) return

      const nb = rfInstance.getNodesBounds(rfNodesNow)
      let minX = nb.x
      let minY = nb.y
      let maxX = nb.x + nb.width
      let maxY = nb.y + nb.height

      const wrap = reactFlowWrapper.current
      if (wrap) {
        const paths = wrap.querySelectorAll<SVGPathElement>('.react-flow__edge-path')
        paths.forEach((p) => {
          let bb: { x: number; y: number; width: number; height: number } | null = null
          try {
            bb = p.getBBox()
          } catch {
            bb = null
          }
          if (!bb || (bb.width === 0 && bb.height === 0)) return
          minX = Math.min(minX, bb.x)
          minY = Math.min(minY, bb.y)
          maxX = Math.max(maxX, bb.x + bb.width)
          maxY = Math.max(maxY, bb.y + bb.height)
        })
      }

      rfInstance.fitBounds(
        { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        { padding: 0.18, duration }
      )
    },
    [rfInstance]
  )

  // Frame the whole machine when requested (e.g. after Auto Layout / file load).
  useEffect(() => {
    if (fitViewNonce === 0 || !rfInstance) return
    const handle = setTimeout(() => fitToContent(400), 80)
    return () => clearTimeout(handle)
  }, [fitViewNonce, rfInstance, fitToContent])

  // ── Track Mouse Position for Transition Mode ─────────────────
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (transitionMode) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [transitionMode])

  // ── Cancel transition mode / reset tool on Escape ───────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTransitionMode(null)
        setContextMenu(null)
        setMousePos(null)
        setCanvasTool('select')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Double-click empty canvas → enter selection mode ────────
  // Only the bare pane toggles selection mode — never nodes, edges, the
  // zoom/fit controls, the minimap, or any other panel rendered on top of
  // the canvas (double-clicking those used to wrongly arm selection mode).
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.react-flow__pane')) return
      setSelectionModeActive(true)
    },
    []
  )

  const onSelectionEnd = useCallback(() => {
    setSelectionModeActive(false)
  }, [])

  // ── Node click — handles transition-draw mode ───────────────
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id === 'cursor-node') return

      // Transition tool: first state click arms the draw-from-here mode; the
      // second state click is completed by the `transitionMode` branch below.
      if (canvasTool === 'transition' && !transitionMode && status !== 'running') {
        const s = machine.states.find((st) => st.id === node.id)
        if (s && !s.isText) {
          setTransitionMode({ fromStateId: node.id })
          return
        }
      }

      if (transitionMode) {
        // Complete the transition
        const { fromStateId } = transitionMode
        // No epsilon/lambda transitions to text nodes
        const s = machine.states.find((st) => st.id === node.id)
        if (s?.isText) return

        // FA: edit the existing edge instead of stacking an empty duplicate.
        const existing = !isModalEdited
          ? machine.transitions.find((t) => t.from === fromStateId && t.to === node.id)
          : undefined
        if (existing) {
          setEditingTransition(existing.id)
        } else {
          const newTrans = addTransition(fromStateId, node.id, [])
          beginEditingNewTransition(newTrans.id, fromStateId)
        }
        setTransitionMode(null)
        setMousePos(null)
      }
    },
    [transitionMode, addTransition, machine.states, machine.transitions, beginEditingNewTransition, isModalEdited, setEditingTransition, canvasTool, status]
  )

  // Expand a list of transition/edge ids to EVERY underlying transition that
  // shares the same from→to pair. A single visual edge can bundle many
  // transitions (always for PDAs, sometimes for FAs), so any edge-level
  // operation — select, delete, cut — must act on all of them, not just the
  // representative whose id the edge happens to carry.
  const expandEdgeMembers = useCallback(
    (transitionIds: string[]): string[] => {
      const pairs = new Set<string>()
      for (const tid of transitionIds) {
        const t = machine.transitions.find((tr) => tr.id === tid)
        if (t) pairs.add(`${t.from}__${t.to}`)
      }
      return machine.transitions
        .filter((t) => pairs.has(`${t.from}__${t.to}`))
        .map((t) => t.id)
    },
    [machine.transitions]
  )

  // ── Focus request → pan to + highlight an element (validation / δ-table) ──
  useEffect(() => {
    if (!focusRequest || !rfInstance) return
    const { kind, id } = focusRequest
    const { zoom } = rfInstance.getViewport()
    const targetZoom = Math.max(zoom, 0.9)
    if (kind === 'state') {
      const s = machine.states.find((st) => st.id === id)
      if (!s) return
      rfInstance.setCenter(s.x + 26, s.y + 26, { zoom: targetZoom, duration: 400 })
      setSelectedStateIds([id])
      setSelectedTransitionIds([])
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })))
      setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
    } else {
      const t = machine.transitions.find((tr) => tr.id === id)
      if (!t) return
      const from = machine.states.find((st) => st.id === t.from)
      const to = machine.states.find((st) => st.id === t.to)
      if (!from || !to) return
      rfInstance.setCenter((from.x + to.x) / 2 + 26, (from.y + to.y) / 2 + 26, { zoom: targetZoom, duration: 400 })
      setSelectedStateIds([])
      setSelectedTransitionIds(expandEdgeMembers([id]))
      setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
      setRfEdges((eds) => eds.map((e) => {
        const mem = (e.data as { memberTransitionIds?: string[] })?.memberTransitionIds
        return { ...e, selected: mem ? mem.includes(id) : e.id === id }
      }))
    }
    // Only react to a new focus request (nonce), not to unrelated machine edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce])

  // ── React Flow selection change sync ────────────────────────
  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    const nodeIds = params.nodes.map((n) => n.id)
    // Store all member transition ids so delete/cut affect the whole edge.
    const edgeMemberIds = params.edges.flatMap(
      (e) => ((e.data as { memberTransitionIds?: string[] })?.memberTransitionIds) ?? [e.id]
    )
    setSelectedStateIds(nodeIds)
    setSelectedTransitionIds(edgeMemberIds)
  }, [setSelectedStateIds, setSelectedTransitionIds])

  // ── Copy Action ──────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (selectedStateIds.length === 0) return

    const statesToCopy = machine.states.filter((s) => selectedStateIds.includes(s.id))
    const transitionsToCopy = machine.transitions.filter(
      (t) => selectedStateIds.includes(t.from) && selectedStateIds.includes(t.to)
    )

    setClipboard({
      states: statesToCopy.map((s) => ({
        label: s.label,
        x: s.x,
        y: s.y,
        isAccept: s.isAccept,
        isStart: s.isStart,
        isText: s.isText,
        isReject: s.isReject,
        oldId: s.id,
      })),
      transitions: transitionsToCopy.map((t) => ({
        oldFrom: t.from,
        oldTo: t.to,
        symbols: t.symbols,
        read: t.read,
        pop: t.pop,
        push: t.push,
        write: t.write,
        direction: t.direction,
        reads: t.reads,
        writes: t.writes,
        directions: t.directions,
      })),
    })
  }, [machine, selectedStateIds, setClipboard])

  // ── Cut Action ───────────────────────────────────────────────
  const handleCut = useCallback(() => {
    if (status === 'running') return // only an active run locks edits; a finished run is editable (auto-resets)
    if (selectedStateIds.length === 0 && selectedTransitionIds.length === 0) return
    handleCopy()

    selectedStateIds.forEach((id) => deleteState(id))
    // selectedTransitionIds already holds every member of each selected edge.
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [status, selectedStateIds, selectedTransitionIds, handleCopy, deleteState, deleteTransition, clearSelection])

  // ── Paste Action ─────────────────────────────────────────────
  const handlePaste = useCallback(() => {
    if (status === 'running') return // only an active run locks edits; a finished run is editable (auto-resets)
    if (!clipboard) return

    const idMapping: Record<string, string> = {}
    const newSelectedStateIds: string[] = []
    const newSelectedTransitionIds: string[] = []
    // Track labels created this paste so multi-node pastes stay unique too.
    const usedLabels = new Set(machine.states.map((s) => s.label))
    const uniqueLabel = (base: string): string => {
      let label = base
      while (usedLabels.has(label)) label = `${label}_copy`
      usedLabels.add(label)
      return label
    }

    clipboard.states.forEach((s) => {
      const x = s.x + 40
      const y = s.y + 40
      let pastedState

      if (s.isText) {
        pastedState = addTextState(x, y)
        updateState(pastedState.id, { label: s.label })
      } else {
        pastedState = addState(x, y)
        updateState(pastedState.id, {
          label: uniqueLabel(s.label),
          isAccept: s.isAccept,
          isReject: s.isReject,
          isStart: false,
        })
      }

      idMapping[s.oldId] = pastedState.id
      newSelectedStateIds.push(pastedState.id)
    })

    clipboard.transitions.forEach((t) => {
      const newFrom = idMapping[t.oldFrom]
      const newTo = idMapping[t.oldTo]
      if (newFrom && newTo) {
        const newTrans = addTransition(newFrom, newTo, t.symbols)
        // Preserve PDA (read/pop/push) and TM (write/direction + multi-tape arrays) ops.
        const hasOps =
          t.read !== undefined || t.pop !== undefined || t.push !== undefined ||
          t.write !== undefined || t.direction !== undefined ||
          t.reads !== undefined || t.writes !== undefined || t.directions !== undefined
        if (hasOps) {
          updateTransition(newTrans.id, {
            read: t.read, pop: t.pop, push: t.push,
            write: t.write, direction: t.direction,
            reads: t.reads, writes: t.writes, directions: t.directions,
          })
        }
        newSelectedTransitionIds.push(newTrans.id)
      }
    })

    setSelectedStateIds(newSelectedStateIds)
    setSelectedTransitionIds(newSelectedTransitionIds)

    // Force select new nodes in React Flow internal state
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: newSelectedStateIds.includes(n.id) })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: newSelectedTransitionIds.includes(e.id) })))
  }, [status, clipboard, machine.states, addState, addTextState, updateState, addTransition, updateTransition, setSelectedStateIds, setSelectedTransitionIds, setRfNodes, setRfEdges])

  // ── Delete Selection ─────────────────────────────────────────
  const handleDeleteSelected = useCallback(() => {
    if (status === 'running') return // only an active run locks edits; a finished run is editable (auto-resets)
    selectedStateIds.forEach((id) => deleteState(id))
    // selectedTransitionIds already holds every member of each selected edge.
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [status, selectedStateIds, selectedTransitionIds, deleteState, deleteTransition, clearSelection])

  // ── Select All ───────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    const allStateIds = machine.states.map((s) => s.id)
    const allTransitionIds = machine.transitions.map((t) => t.id)
    setSelectedStateIds(allStateIds)
    setSelectedTransitionIds(allTransitionIds)

    // Explicitly update React Flow internal state
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: true })))
  }, [machine.states, machine.transitions, setSelectedStateIds, setSelectedTransitionIds, setRfNodes, setRfEdges])

  // ── Add a state at the viewport centre (keyboard / empty-state button) ──
  const handleAddStateAtCenter = useCallback(() => {
    if (status === 'running') return
    let x = 0
    let y = 0
    if (rfInstance && reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect()
      const pos = rfInstance.screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
      x = pos.x
      y = pos.y
    }
    addState(x, y)
  }, [status, rfInstance, addState])

  // ── Keyboard Event Listener for Shortcuts ────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const isCtrl = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()

      if (isCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (status !== 'running') { clearSelection(); undo() }
      } else if (isCtrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (status !== 'running') { clearSelection(); redo() }
      } else if (isCtrl && key === 'c') {
        e.preventDefault()
        handleCopy()
      } else if (isCtrl && key === 'x') {
        e.preventDefault()
        handleCut()
      } else if (isCtrl && key === 'v') {
        e.preventDefault()
        handlePaste()
      } else if (isCtrl && key === 'a') {
        e.preventDefault()
        handleSelectAll()
      } else if (!isCtrl && key === 'n') {
        e.preventDefault()
        handleAddStateAtCenter()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSelected()
      } else if (!isCtrl && (key === 'f' || key === 'i')) {
        // Keyboard parity for state roles (UX audit ACC-2): F toggles the
        // accept/final mark on the selection; I sets the (single) selected
        // state as the start state. Right-click still works too.
        if (status === 'running') return
        const sel = useUIStore.getState().selectedStateIds
        const states = useMachineStore.getState().machine.states
        const targets = sel.filter((sid) => !states.find((s) => s.id === sid)?.isText)
        if (targets.length === 0) return
        e.preventDefault()
        if (key === 'f') {
          targets.forEach((sid) => toggleAcceptState(sid))
        } else if (targets.length === 1) {
          setStartState(targets[0])
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCopy, handleCut, handlePaste, handleSelectAll, handleDeleteSelected, handleAddStateAtCenter, undo, redo, clearSelection, status, setStartState, toggleAcceptState])

  // ── Publish edit actions to the command bus ──────────────────
  // The classic MenuBar / Toolbar live outside the canvas but need to drive
  // copy/cut/paste/delete/zoom; register the handlers so they can call through.
  const setCanvasApi = useCommandStore((s) => s.setCanvasApi)
  const hasSelection = selectedStateIds.length > 0 || selectedTransitionIds.length > 0
  const hasClipboard = !!clipboard
  useEffect(() => {
    setCanvasApi({
      copy: handleCopy,
      cut: handleCut,
      paste: handlePaste,
      deleteSelection: handleDeleteSelected,
      selectAll: handleSelectAll,
      addState: handleAddStateAtCenter,
      zoomIn: () => rfInstance?.zoomIn?.(),
      zoomOut: () => rfInstance?.zoomOut?.(),
      fit: () => fitToContent(),
      hasSelection,
      hasClipboard,
    })
    return () => setCanvasApi(null)
  }, [setCanvasApi, handleCopy, handleCut, handlePaste, handleDeleteSelected, handleSelectAll, handleAddStateAtCenter, rfInstance, fitToContent, hasSelection, hasClipboard])

  // ── Connect via drag ─────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      // No epsilon transitions to text nodes
      const targetState = machine.states.find(s => s.id === connection.target)
      if (targetState?.isText) return

      // FA: edit the existing edge instead of stacking an empty duplicate.
      const existing = !isModalEdited
        ? machine.transitions.find((t) => t.from === connection.source && t.to === connection.target)
        : undefined
      if (existing) {
        setEditingTransition(existing.id)
        return
      }

      const newTrans = addTransition(connection.source, connection.target, [])
      beginEditingNewTransition(newTrans.id, connection.source)
    },
    [addTransition, machine.states, machine.transitions, beginEditingNewTransition, isModalEdited, setEditingTransition]
  )

  // ── Drag stop → persist position ────────────────────────────
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.id === 'cursor-node') return
      updateState(node.id, { x: node.position.x, y: node.position.y })
    },
    [updateState]
  )

  // ── Right-click context menus ────────────────────────────────
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      if (node.id === 'cursor-node') return
      const s = machine.states.find((st) => st.id === node.id)
      if (!s) return
      setContextMenu({
        kind: s.isText ? 'text' : 'state',
        x: event.clientX,
        y: event.clientY,
        stateId: s.id,
        stateLabel: s.label,
        isAccept: s.isAccept,
        isStart: s.isStart,
        isReject: s.isReject ?? false,
        showReject: isTM,
      })
    },
    [machine.states, isTM]
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      if (edge.id === 'cursor-edge') return
      setContextMenu({
        kind: 'transition',
        x: event.clientX,
        y: event.clientY,
        transitionId: edge.id,
      })
    },
    []
  )

  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault()
      if (!rfInstance) return
      if (transitionMode) { 
        setTransitionMode(null)
        setMousePos(null)
        return 
      }
      const pos = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setContextMenu({
        kind: 'canvas',
        x: event.clientX,
        y: event.clientY,
        canvasX: pos.x,
        canvasY: pos.y,
      })
    },
    [rfInstance, transitionMode]
  )

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // Tool-driven placement: a plain click on empty canvas drops the element.
    if (status !== 'running' && (canvasTool === 'addState' || canvasTool === 'addText') && rfInstance) {
      const pos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      if (canvasTool === 'addState') {
        addState(pos.x, pos.y)
      } else {
        const t = addTextState(pos.x, pos.y)
        startRenaming(t.id)
      }
      setContextMenu(null)
      return
    }
    clearSelection()
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
    setContextMenu(null)
    setSelectionModeActive(false)
    if (transitionMode) {
      setTransitionMode(null)
      setMousePos(null)
    }
  }, [clearSelection, transitionMode, setRfNodes, setRfEdges, status, canvasTool, rfInstance, addState, addTextState, startRenaming])

  // ── Transition mode banner ──────────────────────────────────
  const fromStateName = transitionMode
    ? machine.states.find((s) => s.id === transitionMode.fromStateId)?.label ?? '?'
    : null

  // Compute screen coordinates for the transition mode dashed line
  let drawLinePath = null
  if (transitionMode && mousePos && rfInstance) {
    const fromState = machine.states.find(s => s.id === transitionMode.fromStateId)
    if (fromState) {
      const fromScreen = rfInstance.flowToScreenPosition({ x: fromState.x + 26, y: fromState.y + 26 })
      drawLinePath = `M ${fromScreen.x} ${fromScreen.y} L ${mousePos.x} ${mousePos.y}`
    }
  }

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onPointerMove={onPointerMove}
    >
      {drawLinePath && (
        <svg style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 1000 }}>
          <path d={drawLinePath} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" fill="none" />
        </svg>
      )}

      {/* Transition-mode overlay banner */}
      {transitionMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 16px',
          fontSize: '12px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
        }}>
          Transition from <strong>{fromStateName}</strong> — click target state · Esc to cancel
        </div>
      )}

      {/* Selection-mode overlay banner */}
      {selectionModeActive && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 16px',
          fontSize: '12px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
        }}>
          Selection Mode Active — drag on empty canvas to select · click pane to exit
        </div>
      )}

      {/* Tool palette — explicit, clickable editing modes (UX audit #6) */}
      <div
        role="toolbar"
        aria-label="Canvas tools"
        aria-orientation="vertical"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {TOOLS.map((t) => {
          const active = canvasTool === t.id
          const disabled = status === 'running' && t.id !== 'select'
          return (
            <button
              key={t.id}
              onClick={() => {
                if (disabled) return
                setCanvasTool(t.id)
                if (t.id !== 'transition') {
                  setTransitionMode(null)
                  setMousePos(null)
                }
              }}
              title={t.label}
              aria-label={t.label}
              aria-pressed={active}
              disabled={disabled}
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border-default)'}`,
                background: active ? 'var(--bg-elevated)' : 'transparent',
                color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                fontSize: '15px',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1,
              }}
            >
              {t.glyph}
            </button>
          )
        })}
      </div>

      {/* Active-tool hint — keeps the current mode visible (UX audit #6) */}
      {canvasTool !== 'select' && !transitionMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 16px',
          fontSize: '12px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
        }}>
          {TOOL_HINT[canvasTool]}
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={onPaneClick}
        onDoubleClick={onDoubleClick}
        onInit={setRfInstance}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        deleteKeyCode={null} // Keyboard delete/backspace custom-handled for store sync
        
        // Drag to draw selection rectangle only in selectionModeActive
        selectionOnDrag={selectionModeActive}
        panOnDrag={!selectionModeActive}
        onSelectionEnd={onSelectionEnd}
        
        // Shift = standard diagram-tool selection (hold-drag a marquee or
        // Shift-click to extend a multi-selection), alongside the explicit
        // Select tool — so selection isn't a hidden gesture (UX audit ACC-2).
        selectionKeyCode="Shift"
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        nodesDraggable={true}
        nodesConnectable={status !== 'running'}
        elementsSelectable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={4}
        // Forgiving drop target so releasing anywhere on/near a node connects,
        // and a clear dashed rubber-band while dragging the connection nub (#1).
        connectionRadius={32}
        connectionLineStyle={{ stroke: 'var(--border-strong)', strokeWidth: 2, strokeDasharray: '6 4' }}
        style={{ background: 'var(--bg-primary)', cursor: transitionMode || canvasTool !== 'select' || selectionModeActive ? 'crosshair' : undefined }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={20}
          lineWidth={1}
          color="var(--border-subtle)"
        />
        <Controls
          showInteractive={false}
          onFitView={() => fitToContent(400)}
          style={{ bottom: 16, right: 16, top: 'auto', left: 'auto' }}
        />
        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            ariaLabel="Minimap — drag to pan, scroll to zoom, click to recenter"
            onClick={(_, pos) => {
              if (!rfInstance) return
              const { zoom } = rfInstance.getViewport()
              rfInstance.setCenter(pos.x, pos.y, { zoom, duration: 300 })
            }}
            nodeColor={(node) => {
              if (node.id === 'cursor-node') return 'transparent'
              const d = node.data as { isAccept?: boolean; isStart?: boolean }
              if (activeStateIds.includes(node.id)) return isDark ? '#f4f4f5' : '#000'
              if (d?.isAccept) return isDark ? '#52525b' : '#ccc'
              return isDark ? '#27272a' : '#fff'
            }}
            nodeStrokeColor={isDark ? '#a1a1aa' : '#000'}
            nodeStrokeWidth={2}
            maskColor={isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(244, 244, 245, 0.7)'}
            style={{
              background: isDark ? '#18181b' : '#fff',
              border: `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}`,
              borderRadius: 'var(--radius-md)',
              bottom: 16,
              left: 16,
              top: 'auto',
              right: 'auto',
            }}
          />
        )}
      </ReactFlow>

      {/* Result flash — brief green/red glow when a run finishes */}
      {flash && <div key={flash.id} className={`result-flash ${flash.kind}`} />}

      {/* Empty-state onboarding hint */}
      {!machine.states.some((s) => !s.isText) && !transitionMode && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            pointerEvents: 'none',
            zIndex: 5,
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            fontSize: '13px',
            lineHeight: 1.7,
            maxWidth: '360px',
          }}>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
              Start building your automaton
            </div>
            Right-click the canvas or press <strong style={{ color: 'var(--text-secondary)' }}>N</strong> to add a state.<br />
            Hover a state, then drag the <strong style={{ color: 'var(--text-secondary)' }}>connection dot</strong> on its edge to another state.
            {machine.type === 'ENFA' && (
              <>
                <br />
                On an ε-NFA, leave a transition label empty (or type <strong style={{ color: 'var(--text-secondary)' }}>eps</strong>) for an <strong style={{ color: 'var(--text-secondary)' }}>ε</strong>-move.
              </>
            )}
          </div>
          <button
            onClick={handleAddStateAtCenter}
            style={{
              pointerEvents: 'auto',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '8px 18px',
              cursor: 'pointer',
            }}
          >
            + Add a state
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          config={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddState={(x, y) => { addState(x, y); setContextMenu(null) }}
          onAddText={(x, y) => { const t = addTextState(x, y); startRenaming(t.id); setContextMenu(null) }}
          onDeleteState={(id) => { deleteState(id); setContextMenu(null) }}
          onSetStart={(id) => { setStartState(id); setContextMenu(null) }}
          onToggleAccept={(id) => { toggleAcceptState(id); setContextMenu(null) }}
          onToggleReject={(id) => { toggleRejectState(id); setContextMenu(null) }}
          onDeleteTransition={(id) => {
            // Delete every transition bundled into this visual edge, not just one.
            expandEdgeMembers([id]).forEach((mid) => deleteTransition(mid))
            setContextMenu(null)
          }}
          onStartTransition={(fromStateId) => {
            setTransitionMode({ fromStateId })
            setContextMenu(null)
          }}
          onEditStateTransitions={(stateId) => {
            openTransitionEditor(stateId)
            setContextMenu(null)
          }}
          onEditTransitionSymbols={(transitionId) => {
            const t = machine.transitions.find((tr) => tr.id === transitionId)
            if (t) openTransitionEditor(t.from)
            setContextMenu(null)
          }}
          onRenameState={(stateId) => {
            startRenaming(stateId)
            setContextMenu(null)
          }}
        />
      )}

      {/* Transition editor modal */}
      {transitionEditorStateId && (
        <TransitionEditor
          stateId={transitionEditorStateId}
          onClose={closeTransitionEditor}
        />
      )}
    </div>
  )
}

export default function AutomataCanvas() {
  return (
    <ReactFlowProvider>
      <AutomataCanvasInner />
    </ReactFlowProvider>
  )
}
