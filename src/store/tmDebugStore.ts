import { create } from 'zustand'
import type { TMWatcher, WatcherHit } from '@/engines/machine/tm/watchers'
import { useMachineStore } from './machineStore'

export interface TMDebugSession {
  watchers: TMWatcher[]
  lastHit: WatcherHit | null
}

interface TMDebugStore {
  sessions: Record<string, TMDebugSession>
  getSession: (tabId: string) => TMDebugSession
  addWatcher: (tabId: string, watcher: TMWatcher) => void
  updateWatcher: (tabId: string, watcher: TMWatcher) => void
  removeWatcher: (tabId: string, watcherId: string) => void
  toggleWatcher: (tabId: string, watcherId: string) => void
  setLastHit: (tabId: string, hit: WatcherHit | null) => void
  clearSession: (tabId: string) => void
}

const emptySession = (): TMDebugSession => ({ watchers: [], lastHit: null })

export const useTMDebugStore = create<TMDebugStore>((set, get) => ({
  sessions: {},
  getSession: (tabId) => get().sessions[tabId] ?? emptySession(),
  addWatcher: (tabId, watcher) => set((state) => {
    const session = state.sessions[tabId] ?? emptySession()
    return { sessions: { ...state.sessions, [tabId]: { ...session, watchers: [...session.watchers, watcher] } } }
  }),
  updateWatcher: (tabId, watcher) => set((state) => {
    const session = state.sessions[tabId] ?? emptySession()
    return {
      sessions: {
        ...state.sessions,
        [tabId]: { ...session, watchers: session.watchers.map((current) => current.id === watcher.id ? watcher : current) },
      },
    }
  }),
  removeWatcher: (tabId, watcherId) => set((state) => {
    const session = state.sessions[tabId] ?? emptySession()
    return {
      sessions: {
        ...state.sessions,
        [tabId]: {
          watchers: session.watchers.filter((watcher) => watcher.id !== watcherId),
          lastHit: session.lastHit?.watcherId === watcherId ? null : session.lastHit,
        },
      },
    }
  }),
  toggleWatcher: (tabId, watcherId) => set((state) => {
    const session = state.sessions[tabId] ?? emptySession()
    return {
      sessions: {
        ...state.sessions,
        [tabId]: {
          ...session,
          watchers: session.watchers.map((watcher) => watcher.id === watcherId ? { ...watcher, enabled: !watcher.enabled } : watcher),
        },
      },
    }
  }),
  setLastHit: (tabId, lastHit) => set((state) => {
    const session = state.sessions[tabId] ?? emptySession()
    return { sessions: { ...state.sessions, [tabId]: { ...session, lastHit } } }
  }),
  clearSession: (tabId) => set((state) => {
    const sessions = { ...state.sessions }
    delete sessions[tabId]
    return { sessions }
  }),
}))

// Debugger state belongs to an open tab only: it is intentionally neither saved
// in a machine definition nor retained after that tab is closed.
useMachineStore.subscribe((state) => {
  const openIds = new Set(state.tabs.map((tab) => tab.id))
  const sessions = useTMDebugStore.getState().sessions
  const stale = Object.keys(sessions).filter((id) => !openIds.has(id))
  if (stale.length === 0) return
  const next = { ...sessions }
  for (const id of stale) delete next[id]
  useTMDebugStore.setState({ sessions: next })
})
