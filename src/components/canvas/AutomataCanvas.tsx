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
import { formatPdaLabel, isPDAType } from '@/engines/core/utils'
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
  return machine.states.map((s) => ({
    id: s.id,
    type: s.isText ? 'textNode' : 'stateNode',
    position: { x: s.x, y: s.y },
    data: {
      label: s.label,
      isStart: s.isStart,
      isAccept: s.isAccept,
      isReject: s.isReject ?? false,
      isTransitionTarget: transitionMode !== null && transitionMode.fromStateId !== s.id && !s.isText,
    },
    draggable: true,
    selected: selectedStateIds.includes(s.id),
  }))
}

function buildEdges(
  machine: ReturnType<typeof useMachineStore.getState>['machine'],
  activeTransitionIds: string[],
  selectedTransitionIds: string[],
  transitionMode: TransitionDrawMode | null
): Edge[] {
  const isPDA = isPDAType(machine.type)

  // Group by from__to pair so multiple transitions share one visual edge
  const edgeMap = new Map<string, string[]>()      // FA: merged symbols
  const pdaLabelMap = new Map<string, string[]>()   // PDA: one label per transition
  const memberMap = new Map<string, string[]>()     // all transition ids for the pair
  const edgeIdMap = new Map<string, string>()
  const edgeOffsetMap = new Map<string, { x: number; y: number } | undefined>()

  for (const t of machine.transitions) {
    const key = `${t.from}__${t.to}`
    if (!edgeMap.has(key)) {
      edgeMap.set(key, [])
      pdaLabelMap.set(key, [])
      memberMap.set(key, [])
      edgeIdMap.set(key, t.id)
      edgeOffsetMap.set(key, t.controlPointOffset)
    }
    memberMap.get(key)!.push(t.id)
    if (isPDA) {
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
    toggleAcceptState, addTransition, deleteTransition,
  } = useMachineStore()
  const { activeStateIds, activeTransitionIds, status } = useSimulationStore()
  
  const { 
    selectedStateIds, selectedTransitionIds,
    setSelectedStateIds, setSelectedTransitionIds,
    clearSelection, startRenaming, setEditingTransition,
    openTransitionEditor, closeTransitionEditor, transitionEditorStateId,
    clipboard, setClipboard 
  } = useUIStore()

  const isPDA = isPDAType(machine.type)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<any>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null)
  const [transitionMode, setTransitionMode] = useState<TransitionDrawMode | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [selectionModeActive, setSelectionModeActive] = useState(false)

  // After creating a transition, FA edits inline on the canvas; PDA opens the modal.
  const beginEditingNewTransition = useCallback(
    (transitionId: string, fromStateId: string) => {
      if (isPDA) {
        openTransitionEditor(fromStateId)
      } else {
        setEditingTransition(transitionId)
      }
    },
    [isPDA, openTransitionEditor, setEditingTransition]
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
      // Merge React Flow's current selected state and dimensions into the new nodes
      return nodes.map((n) => {
        const p = prev.find((pr) => pr.id === n.id)
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
      return edges.map((e) => {
        const p = prev.find((pr) => pr.id === e.id)
        if (p) {
          return { ...e, selected: p.selected }
        }
        return e
      })
    })
  }, [edges, setRfEdges])

  // ── Track Mouse Position for Transition Mode ─────────────────
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (transitionMode) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [transitionMode])

  // ── Cancel transition mode on Escape ───────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTransitionMode(null)
        setContextMenu(null)
        setMousePos(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Double-click canvas → enter selection mode ──────────────
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest('.react-flow__node')) return
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

      if (transitionMode) {
        // Complete the transition
        const { fromStateId } = transitionMode
        // No epsilon/lambda transitions to text nodes
        const s = machine.states.find((st) => st.id === node.id)
        if (s?.isText) return

        const newTrans = addTransition(fromStateId, node.id, [])
        beginEditingNewTransition(newTrans.id, fromStateId)
        setTransitionMode(null)
        setMousePos(null)
      }
    },
    [transitionMode, addTransition, machine.states, beginEditingNewTransition]
  )

  // ── React Flow selection change sync ────────────────────────
  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    const nodeIds = params.nodes.map((n) => n.id)
    const edgeIds = params.edges.map((e) => e.id)
    setSelectedStateIds(nodeIds)
    setSelectedTransitionIds(edgeIds)
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
        oldId: s.id,
      })),
      transitions: transitionsToCopy.map((t) => ({
        oldFrom: t.from,
        oldTo: t.to,
        symbols: t.symbols,
      })),
    })
  }, [machine, selectedStateIds, setClipboard])

  // ── Cut Action ───────────────────────────────────────────────
  const handleCut = useCallback(() => {
    if (selectedStateIds.length === 0) return
    handleCopy()

    selectedStateIds.forEach((id) => deleteState(id))
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [selectedStateIds, selectedTransitionIds, handleCopy, deleteState, deleteTransition, clearSelection])

  // ── Paste Action ─────────────────────────────────────────────
  const handlePaste = useCallback(() => {
    if (!clipboard) return

    const idMapping: Record<string, string> = {}
    const newSelectedStateIds: string[] = []
    const newSelectedTransitionIds: string[] = []

    clipboard.states.forEach((s) => {
      const x = s.x + 40
      const y = s.y + 40
      let pastedState

      if (s.isText) {
        pastedState = addTextState(x, y)
        updateState(pastedState.id, { label: s.label })
      } else {
        pastedState = addState(x, y)
        const labelExists = machine.states.some((ms) => ms.label === s.label)
        const label = labelExists ? `${s.label}_copy` : s.label

        updateState(pastedState.id, {
          label,
          isAccept: s.isAccept,
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
        newSelectedTransitionIds.push(newTrans.id)
      }
    })

    setSelectedStateIds(newSelectedStateIds)
    setSelectedTransitionIds(newSelectedTransitionIds)

    // Force select new nodes in React Flow internal state
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: newSelectedStateIds.includes(n.id) })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: newSelectedTransitionIds.includes(e.id) })))
  }, [clipboard, machine.states, addState, addTextState, updateState, addTransition, setSelectedStateIds, setSelectedTransitionIds, setRfNodes, setRfEdges])

  // ── Delete Selection ─────────────────────────────────────────
  const handleDeleteSelected = useCallback(() => {
    selectedStateIds.forEach((id) => deleteState(id))
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [selectedStateIds, selectedTransitionIds, deleteState, deleteTransition, clearSelection])

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

  // ── Keyboard Event Listener for Shortcuts ────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const isCtrl = isMac ? e.metaKey : e.ctrlKey

      if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        handleCopy()
      } else if (isCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        handleCut()
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        handlePaste()
      } else if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        handleSelectAll()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCopy, handleCut, handlePaste, handleSelectAll, handleDeleteSelected])

  // ── Connect via drag ─────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      // No epsilon transitions to text nodes
      const targetState = machine.states.find(s => s.id === connection.target)
      if (targetState?.isText) return

      const newTrans = addTransition(connection.source, connection.target, [])
      beginEditingNewTransition(newTrans.id, connection.source)
    },
    [addTransition, machine.states, beginEditingNewTransition]
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
      })
    },
    [machine.states]
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

  const onPaneClick = useCallback(() => {
    clearSelection()
    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
    setContextMenu(null)
    setSelectionModeActive(false)
    if (transitionMode) {
      setTransitionMode(null)
      setMousePos(null)
    }
  }, [clearSelection, transitionMode, setRfNodes, setRfEdges])

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
        fitView
        fitViewOptions={{ padding: 0.4 }}
        deleteKeyCode={null} // Keyboard delete/backspace custom-handled for store sync
        
        // Drag to draw selection rectangle only in selectionModeActive
        selectionOnDrag={selectionModeActive}
        panOnDrag={!selectionModeActive}
        onSelectionEnd={onSelectionEnd}
        
        multiSelectionKeyCode="Control"
        nodesDraggable={true}
        nodesConnectable={status === 'idle'}
        elementsSelectable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={4}
        style={{ background: 'var(--bg-primary)', cursor: transitionMode ? 'crosshair' : selectionModeActive ? 'crosshair' : undefined }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={20}
          lineWidth={1}
          color="var(--border-subtle)"
        />
        <Controls
          showInteractive={false}
          style={{ bottom: 16, right: 16, top: 'auto', left: 'auto' }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === 'cursor-node') return 'transparent'
            const d = node.data as { isAccept?: boolean; isStart?: boolean }
            if (activeStateIds.includes(node.id)) return '#000'
            if (d?.isAccept) return '#ccc'
            return '#fff'
          }}
          nodeStrokeColor="#000"
          nodeStrokeWidth={2}
          maskColor="rgba(244, 244, 245, 0.7)"
          style={{
            background: '#fff',
            border: '1px solid #d4d4d8',
            borderRadius: 'var(--radius-md)',
            bottom: 16,
            left: 16,
            top: 'auto',
            right: 'auto',
          }}
        />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          config={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddState={(x, y) => { addState(x, y); setContextMenu(null) }}
          onAddText={(x, y) => { addTextState(x, y); setContextMenu(null) }}
          onDeleteState={(id) => { deleteState(id); setContextMenu(null) }}
          onSetStart={(id) => { setStartState(id); setContextMenu(null) }}
          onToggleAccept={(id) => { toggleAcceptState(id); setContextMenu(null) }}
          onDeleteTransition={(id) => { deleteTransition(id); setContextMenu(null) }}
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
