import { beforeEach, describe, expect, it } from 'vitest'
import { useTMDebugStore } from './tmDebugStore'
import type { TMWatcher } from '@/engines/machine/tm/watchers'

const watcher: TMWatcher = {
  id: 'w1',
  label: 'At start',
  enabled: true,
  predicate: { kind: 'step', comparator: 'eq', step: 0 },
}

describe('TM debug state', () => {
  beforeEach(() => useTMDebugStore.setState({ sessions: {} }))

  it('keeps watcher state isolated per tab', () => {
    const store = useTMDebugStore.getState()
    store.addWatcher('tab-a', watcher)
    store.addWatcher('tab-b', { ...watcher, id: 'w2' })

    expect(store.getSession('tab-a').watchers).toEqual([watcher])
    expect(store.getSession('tab-b').watchers.map((item) => item.id)).toEqual(['w2'])
  })

  it('removes a paused-hit reference when deleting its watcher', () => {
    const store = useTMDebugStore.getState()
    store.addWatcher('tab-a', watcher)
    store.setLastHit('tab-a', {
      watcherId: 'w1',
      watcherLabel: 'At start',
      summary: 'step = 0',
      stepCount: 0,
      configurationId: 'root',
      stateId: 'q0',
    })
    store.removeWatcher('tab-a', 'w1')

    expect(store.getSession('tab-a')).toEqual({ watchers: [], lastHit: null })
  })
})
