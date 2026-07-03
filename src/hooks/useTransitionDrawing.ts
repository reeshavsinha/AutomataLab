import { useCallback, useState } from 'react'
import type { Connection, Node } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { useSimulationStore } from '@/store/simulationStore'
import { isPDAType, isTMType } from '@/engines/machine/core/utils'

interface TransitionDrawMode {
  fromStateId: string
}

export function useTransitionDrawing(canvasTool: string, setCanvasTool: (t: any) => void) {
  const machine = useMachineStore((s) => s.machine)
  const { addTransition } = useMachineStore()
  const status = useSimulationStore((s) => s.status)
  const { openTransitionEditor, setEditingTransition } = useUIStore()

  const [transitionMode, setTransitionMode] = useState<TransitionDrawMode | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const isModalEdited = isPDA || isTM

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

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (transitionMode) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [transitionMode])

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id === 'cursor-node') return

      if (canvasTool === 'transition' && !transitionMode && status !== 'running') {
        const s = machine.states.find((st) => st.id === node.id)
        if (s && !s.isText) {
          setTransitionMode({ fromStateId: node.id })
          return
        }
      }

      if (transitionMode) {
        const { fromStateId } = transitionMode
        const s = machine.states.find((st) => st.id === node.id)
        if (s?.isText) return

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

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const targetState = machine.states.find(s => s.id === connection.target)
      if (targetState?.isText) return

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

  const cancelDrawing = useCallback(() => {
    setTransitionMode(null)
    setMousePos(null)
  }, [])

  return {
    transitionMode,
    setTransitionMode,
    mousePos,
    setMousePos,
    onPointerMove,
    onNodeClick,
    onConnect,
    cancelDrawing,
  }
}
