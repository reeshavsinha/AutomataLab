import { useCallback, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { ContextMenuConfig } from '@/components/canvas/ContextMenu'
import { useMachineStore } from '@/store/machineStore'
import { isTMType } from '@/engines/machine/core/utils'

export function useCanvasContextMenu(rfInstance: any, transitionMode: any, cancelDrawing: () => void) {
  const machine = useMachineStore((s) => s.machine)
  const isTM = isTMType(machine.type)
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null)

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
        cancelDrawing()
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
    [rfInstance, transitionMode, cancelDrawing]
  )

  return {
    contextMenu,
    setContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    onPaneContextMenu,
  }
}
