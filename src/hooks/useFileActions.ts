// ============================================================
// useFileActions — shared New / Open / Save / Save As / Recent logic.
// Extracted from the old FileControls so both the classic MenuBar (File
// menu) and the icon Toolbar can drive the same file operations.
// Opening never clobbers unsaved work — machineStore.openMachine reuses a
// pristine tab or opens a new one. Pass { bindKeys: true } in exactly one
// caller to register the global Ctrl/Cmd+N/O/S/Shift+S shortcuts.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { saveMachine, saveMachineToPath, loadMachine as loadFromFile, loadMachineFromPath } from '@/utils/fileManager'
import { getRecentFiles, removeRecentFile, clearRecentFiles, type RecentFile } from '@/utils/recentFiles'
import { isTauri } from '@tauri-apps/api/core'
import { toast } from '@/store/toastStore'

export function useFileActions(opts?: { bindKeys?: boolean }) {
  const { machine, activeTabIndex, dirtyTabs, tabPaths, addTab, openMachine, markTabSaved } = useMachineStore()
  const requestFitView = useUIStore((s) => s.requestFitView)
  // Bump to force the recent-files list to re-read localStorage after a save/open.
  const [, setRecentNonce] = useState(0)
  const bumpRecent = () => setRecentNonce((n) => n + 1)

  const isDirty = !!dirtyTabs[machine.id]
  const recentFiles: RecentFile[] = isTauri() ? getRecentFiles() : []

  const handleNew = useCallback(() => {
    addTab()
    requestFitView()
  }, [addTab, requestFitView])

  const handleOpen = useCallback(async () => {
    try {
      const { def, path } = await loadFromFile()
      openMachine(def, path)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
      bumpRecent()
    } catch (err) {
      if (err instanceof Error && err.message !== 'No file selected') toast.error(err.message)
    }
  }, [openMachine, requestFitView])

  const handleOpenRecent = useCallback(async (file: RecentFile) => {
    try {
      const def = await loadMachineFromPath(file.path)
      openMachine(def, file.path)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
      bumpRecent()
    } catch {
      removeRecentFile(file.path)
      bumpRecent()
      toast.error(`Could not open "${file.name}". It may have been moved or deleted.`)
    }
  }, [openMachine, requestFitView])

  const handleClearRecent = useCallback(() => {
    clearRecentFiles()
    bumpRecent()
    toast.info('Recent files cleared.')
  }, [])

  // Save in place if the path is known; otherwise behave like Save As.
  const handleSave = useCallback(async () => {
    const knownPath = tabPaths[machine.id]
    try {
      if (isTauri() && knownPath) {
        await saveMachineToPath(machine, knownPath)
        markTabSaved(activeTabIndex, knownPath)
        toast.success(`Saved "${machine.name}".`)
      } else {
        const saved = await saveMachine(machine)
        if (saved) {
          markTabSaved(activeTabIndex, isTauri() ? saved : null)
          toast.success(`Saved "${machine.name}".`)
          bumpRecent()
        }
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    }
  }, [machine, activeTabIndex, tabPaths, markTabSaved])

  const handleSaveAs = useCallback(async () => {
    try {
      const saved = await saveMachine(machine)
      if (saved) {
        markTabSaved(activeTabIndex, isTauri() ? saved : null)
        toast.success(`Saved "${machine.name}".`)
        bumpRecent()
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    }
  }, [machine, activeTabIndex, markTabSaved])

  // Global file shortcuts (registered by a single caller).
  useEffect(() => {
    if (!opts?.bindKeys) return
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'n') { e.preventDefault(); handleNew() }
      else if (k === 'o') { e.preventDefault(); handleOpen() }
      else if (k === 's' && e.shiftKey) { e.preventDefault(); handleSaveAs() }
      else if (k === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opts?.bindKeys, handleNew, handleOpen, handleSave, handleSaveAs])

  return { machine, isDirty, recentFiles, handleNew, handleOpen, handleOpenRecent, handleClearRecent, handleSave, handleSaveAs }
}
