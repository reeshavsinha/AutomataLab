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
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useCommandStore } from '@/store/commandStore'
import { BLANK, formatPdaLabel, formatTmTransition, isPDAType, isTMType } from '@/engines/machine/core/utils'
import StateNode from './StateNode'
import TransitionEdge from './TransitionEdge'
import TextNode from './TextNode'
import ContextMenu from './ContextMenu'
import TransitionEditor from './TransitionEditor'

// Custom canvas hooks
import { useCanvasClipboard } from '@/hooks/useCanvasClipboard'
import { useCanvasSelection } from '@/hooks/useCanvasSelection'
import { useCanvasKeyboard } from '@/hooks/useCanvasKeyboard'
import { useTransitionDrawing } from '@/hooks/useTransitionDrawing'
import { useViewportManagement } from '@/hooks/useViewportManagement'
import { useCanvasContextMenu } from '@/hooks/useCanvasContextMenu'

const NODE_TYPES = {
  stateNode: StateNode,
  textNode: TextNode,
}
const EDGE_TYPES = { transitionEdge: TransitionEdge }

type CanvasTool = 'select' | 'addState' | 'addText' | 'transition'

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

  const edgeMap = new Map<string, string[]>()
  const pdaLabelMap = new Map<string, string[]>()
  const tmLabelMap = new Map<string, string[]>()
  const memberMap = new Map<string, string[]>()
  const edgeIdMap = new Map<string, string>()
  const edgeOffsetMap = new Map<string, { x: number; y: number } | undefined>()

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
        color: isActive ? 'var(--trace)' : 'var(--text-primary)',
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
    toggleAcceptState, toggleRejectState, deleteTransition,
  } = useMachineStore()
  const { activeStateIds, activeTransitionIds, status } = useSimulationStore()
  
  const { 
    selectedStateIds, selectedTransitionIds,
    setSelectedStateIds, setSelectedTransitionIds,
    clearSelection, startRenaming, openTransitionEditor,
    transitionEditorStateId, closeTransitionEditor,
    clipboard, theme, setAnalysisHighlights,
  } = useUIStore()

  const isDark = theme === 'dark'
  const showMinimap = machine.states.filter((s) => !s.isText).length > 5

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('select')
  const [flash, setFlash] = useState<{ kind: 'accept' | 'reject'; id: number } | null>(null)

  // Clear analysis highlights only on structural topology changes (ignores x/y node dragging)
  const topologyKey = useMemo(() => {
    return `${machine.states.length}-${machine.transitions.length}-${machine.states.map(s => `${s.id}:${s.isAccept}:${s.isStart}`).join(',')}-${machine.transitions.map(t => `${t.from}->${t.to}`).join(',')}`
  }, [machine])

  useEffect(() => {
    setAnalysisHighlights({})
  }, [topologyKey, setAnalysisHighlights])

  // ── Derived nodes/edges from machine store ──────────────────
  const [transitionDrawModeForNodesEdges, setTransitionDrawModeForNodesEdges] = useState<TransitionDrawMode | null>(null)

  const nodes = useMemo(
    () => buildNodes(machine, activeStateIds, selectedStateIds, transitionDrawModeForNodesEdges),
    [machine, activeStateIds, selectedStateIds, transitionDrawModeForNodesEdges]
  )

  const edges = useMemo(
    () => buildEdges(machine, activeTransitionIds, selectedTransitionIds, transitionDrawModeForNodesEdges),
    [machine, activeTransitionIds, selectedTransitionIds, transitionDrawModeForNodesEdges]
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges)

  // Sync helpers from custom hooks
  const {
    selectionModeActive,
    setSelectionModeActive,
    expandEdgeMembers,
    onSelectionChange,
    onDoubleClick,
    onSelectionEnd,
    handleSelectAll,
  } = useCanvasSelection(setRfNodes, setRfEdges)

  const { handleCopy, handleCut, handlePaste } = useCanvasClipboard(setRfNodes, setRfEdges)

  const {
    transitionMode,
    setTransitionMode,
    mousePos,
    onPointerMove,
    onNodeClick,
    onConnect,
    cancelDrawing,
  } = useTransitionDrawing(canvasTool, setCanvasTool)

  // Update nodes/edges builder transitionMode reference
  useEffect(() => {
    setTransitionDrawModeForNodesEdges(transitionMode)
  }, [transitionMode])

  const {
    rfInstance,
    setRfInstance,
    fitToContent,
  } = useViewportManagement(reactFlowWrapper, setRfNodes, setRfEdges, expandEdgeMembers)

  const {
    contextMenu,
    setContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    onPaneContextMenu,
  } = useCanvasContextMenu(rfInstance, transitionMode, cancelDrawing)

  // State modification actions
  const handleDeleteSelected = useCallback(() => {
    if (status === 'running') return
    selectedStateIds.forEach((id) => deleteState(id))
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [status, selectedStateIds, selectedTransitionIds, deleteState, deleteTransition, clearSelection])

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

  // Keyboard Shortcuts hook
  useCanvasKeyboard({
    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleDeleteSelected,
    handleAddStateAtCenter,
    cancelTransitionMode: useCallback(() => {
      cancelDrawing()
      setContextMenu(null)
      setCanvasTool('select')
      setSelectionModeActive(false)
    }, [cancelDrawing, setContextMenu, setSelectionModeActive])
  })

  // Structural tools auto-reset on running sim
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

  // Keep RF nodes/edges in sync with store
  useEffect(() => {
    setRfNodes((prev) => {
      if (areNodesEqual(nodes, prev)) return prev
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

  // Publish edit actions to the command bus
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

  // Node Drag Stop position persistence
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.id === 'cursor-node') return
      updateState(node.id, { x: node.position.x, y: node.position.y })
    },
    [updateState]
  )

  const onPaneClick = useCallback((event: React.MouseEvent) => {
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
    if (transitionMode) {
      cancelDrawing()
    }
  }, [clearSelection, transitionMode, setRfNodes, setRfEdges, status, canvasTool, rfInstance, addState, addTextState, startRenaming, cancelDrawing, setContextMenu, setSelectionModeActive])

  // Transition mode banner
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
                setSelectionModeActive(false)
                if (t.id !== 'transition') {
                  cancelDrawing()
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
        deleteKeyCode={null}
        
        selectionOnDrag={selectionModeActive}
        panOnDrag={!selectionModeActive}
        onSelectionEnd={onSelectionEnd}
        
        selectionKeyCode="Shift"
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        nodesDraggable={true}
        nodesConnectable={status !== 'running'}
        elementsSelectable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={4}
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

      {flash && <div key={flash.id} className={`result-flash ${flash.kind}`} />}

      {machine.states.length === 0 && !transitionMode && (
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

      {contextMenu && (
        <ContextMenu
          config={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddState={(x, y) => { addState(x, y); setContextMenu(null) }}
          onAddText={(x, y) => { const t = addTextState(x, y); startRenaming(t.id); setContextMenu(null) }}
          onSelectionMode={machine.states.length > 0 ? () => { setSelectionModeActive(true); setContextMenu(null); } : undefined}
          onDeleteState={(id) => { deleteState(id); setContextMenu(null) }}
          onSetStart={(id) => { setStartState(id); setContextMenu(null) }}
          onToggleAccept={(id) => { toggleAcceptState(id); setContextMenu(null) }}
          onToggleReject={(id) => { toggleRejectState(id); setContextMenu(null) }}
          onDeleteTransition={(id) => {
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
