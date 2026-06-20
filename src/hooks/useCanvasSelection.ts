import { useCallback, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'

export function useCanvasSelection(
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) {
  const machine = useMachineStore((s) => s.machine)
  const {
    setSelectedStateIds, setSelectedTransitionIds
  } = useUIStore()

  const [selectionModeActive, setSelectionModeActive] = useState(false)

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

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    const nodeIds = params.nodes.map((n) => n.id)
    const edgeMemberIds = params.edges.flatMap(
      (e) => ((e.data as { memberTransitionIds?: string[] })?.memberTransitionIds) ?? [e.id]
    )
    setSelectedStateIds(nodeIds)
    setSelectedTransitionIds(edgeMemberIds)
  }, [setSelectedStateIds, setSelectedTransitionIds])

  const onDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest('.react-flow__pane')) return
    setSelectionModeActive(true)
  }, [])

  const onSelectionEnd = useCallback(() => {
    setSelectionModeActive(false)
  }, [])

  const handleSelectAll = useCallback(() => {
    const allStateIds = machine.states.map((s) => s.id)
    const allTransitionIds = machine.transitions.map((t) => t.id)
    setSelectedStateIds(allStateIds)
    setSelectedTransitionIds(allTransitionIds)

    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: true })))
  }, [machine.states, machine.transitions, setSelectedStateIds, setSelectedTransitionIds, setRfNodes, setRfEdges])

  return {
    selectionModeActive,
    setSelectionModeActive,
    expandEdgeMembers,
    onSelectionChange,
    onDoubleClick,
    onSelectionEnd,
    handleSelectAll,
  }
}
