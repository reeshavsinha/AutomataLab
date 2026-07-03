import { useEffect } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

interface UseCanvasKeyboardProps {
  handleCopy: () => void
  handleCut: () => void
  handlePaste: () => void
  handleSelectAll: () => void
  handleDeleteSelected: () => void
  handleAddStateAtCenter: () => void
  cancelTransitionMode: () => void
}

export function useCanvasKeyboard({
  handleCopy,
  handleCut,
  handlePaste,
  handleSelectAll,
  handleDeleteSelected,
  handleAddStateAtCenter,
  cancelTransitionMode,
}: UseCanvasKeyboardProps) {
  const status = useSimulationStore((s) => s.status)
  const { undo, redo, setStartState, toggleAcceptState } = useMachineStore()
  const { clearSelection } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const isCtrl = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()

      if (e.key === 'Escape') {
        cancelTransitionMode()
        return
      }

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
  }, [
    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleDeleteSelected,
    handleAddStateAtCenter,
    cancelTransitionMode,
    undo,
    redo,
    clearSelection,
    status,
    setStartState,
    toggleAcceptState,
  ])
}
