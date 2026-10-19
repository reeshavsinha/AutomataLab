import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { useSimulationStore } from '@/store/simulationStore'

export function useCanvasClipboard(
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) {
  const machine = useMachineStore((s) => s.machine)
  const { addState, addTextState, deleteState, updateState, addTransition, updateTransition, deleteTransition } = useMachineStore()
  const status = useSimulationStore((s) => s.status)
  const {
    selectedStateIds, selectedTransitionIds,
    setSelectedStateIds, setSelectedTransitionIds,
    clearSelection, clipboard, setClipboard, startRenaming
  } = useUIStore()

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
        output: s.output,
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
        trackReads: t.trackReads,
        trackWrites: t.trackWrites,
        submachineId: t.submachineId,
        output: t.output,
      })),
    })
  }, [machine, selectedStateIds, setClipboard])

  // ── Cut Action ───────────────────────────────────────────────
  const handleCut = useCallback(() => {
    if (status === 'running') return
    if (selectedStateIds.length === 0 && selectedTransitionIds.length === 0) return
    handleCopy()

    selectedStateIds.forEach((id) => deleteState(id))
    selectedTransitionIds.forEach((id) => deleteTransition(id))
    clearSelection()
  }, [status, selectedStateIds, selectedTransitionIds, handleCopy, deleteState, deleteTransition, clearSelection])

  // ── Paste Action ─────────────────────────────────────────────
  const handlePaste = useCallback(() => {
    if (status === 'running') return
    if (!clipboard) return

    const idMapping: Record<string, string> = {}
    const newSelectedStateIds: string[] = []
    const newSelectedTransitionIds: string[] = []
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
          output: s.output,
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
        const hasOps =
          t.read !== undefined || t.pop !== undefined || t.push !== undefined ||
          t.write !== undefined || t.direction !== undefined ||
          t.reads !== undefined || t.writes !== undefined || t.directions !== undefined
          || t.trackReads !== undefined || t.trackWrites !== undefined ||
          t.submachineId !== undefined || t.output !== undefined
        if (hasOps) {
          updateTransition(newTrans.id, {
            read: t.read, pop: t.pop, push: t.push,
            write: t.write, direction: t.direction,
            reads: t.reads, writes: t.writes, directions: t.directions,
            trackReads: t.trackReads, trackWrites: t.trackWrites,
            submachineId: t.submachineId,
            output: t.output,
          })
        }
        newSelectedTransitionIds.push(newTrans.id)
      }
    })

    setSelectedStateIds(newSelectedStateIds)
    setSelectedTransitionIds(newSelectedTransitionIds)

    setRfNodes((nds) => nds.map((n) => ({ ...n, selected: newSelectedStateIds.includes(n.id) })))
    setRfEdges((eds) => eds.map((e) => ({ ...e, selected: newSelectedTransitionIds.includes(e.id) })))
  }, [status, clipboard, machine.states, addState, addTextState, updateState, addTransition, updateTransition, setSelectedStateIds, setSelectedTransitionIds, setRfNodes, setRfEdges])

  return { handleCopy, handleCut, handlePaste }
}
