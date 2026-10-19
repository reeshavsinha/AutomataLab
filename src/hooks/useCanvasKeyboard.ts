import { useEffect } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { shouldSuppressGlobalShortcut } from '@/utils/keyboardShortcuts'

interface UseCanvasKeyboardProps {
  handleCopy: () => void
  handleCut: () => void
  handlePaste: () => void
  handleSelectAll: () => void
  handleDeleteSelected: () => void
  handleAddStateAtCenter: () => void
  startTransition: () => void
  completeTransition: () => void
  cycleTransitionTarget: (direction: 1 | -1) => void
  transitionModeActive: boolean
  cancelTransitionMode: () => void
}

export function useCanvasKeyboard({
  handleCopy,
  handleCut,
  handlePaste,
  handleSelectAll,
  handleDeleteSelected,
  handleAddStateAtCenter,
  startTransition,
  completeTransition,
  cycleTransitionTarget,
  transitionModeActive,
  cancelTransitionMode,
}: UseCanvasKeyboardProps) {
  const status = useSimulationStore((s) => s.status)
  const { undo, redo, setStartState, toggleAcceptState } = useMachineStore()
  const { clearSelection } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const hasSelection = window.getSelection()?.toString().length
      if (shouldSuppressGlobalShortcut(target) || hasSelection) return

      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const isCtrl = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()

      // App owns global edit shortcuts. Keeping a second canvas listener for
      // these commands caused one keypress to undo/cut/paste multiple times.
      if (isCtrl && ['z', 'y', 'c', 'x', 'v'].includes(key)) return

      if (e.key === 'Escape') {
        cancelTransitionMode()
        return
      }

      if (transitionModeActive && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        cycleTransitionTarget(e.key === 'ArrowRight' ? 1 : -1)
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
      } else if (!isCtrl && key === 't') {
        e.preventDefault()
        startTransition()
      } else if (!isCtrl && transitionModeActive && (e.key === 'Enter' || key === 's')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        completeTransition()
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
    startTransition,
    completeTransition,
    cycleTransitionTarget,
    transitionModeActive,
    cancelTransitionMode,
    undo,
    redo,
    clearSelection,
    status,
    setStartState,
    toggleAcceptState,
  ])
}
