import { describe, expect, it } from 'vitest'
import { COMMAND_REGISTRY, findShortcutConflicts, resolveCommand } from './commandStore'

describe('keyboard command registry', () => {
  it('documents S as context-sensitive without reporting a false conflict', () => {
    expect(COMMAND_REGISTRY.find((command) => command.id === 'canvas.transition-complete')?.shortcut).toContain('S')
    expect(COMMAND_REGISTRY.find((command) => command.id === 'simulation.step')?.shortcut).toContain('S')
    expect(findShortcutConflicts()).toEqual([])
    expect(resolveCommand('S', 'canvas')?.id).toBe('canvas.transition-complete')
    expect(resolveCommand('S', 'simulation')?.id).toBe('simulation.step')
  })

  it('detects overlapping shortcuts in the same context', () => {
    const commands = [
      { id: 'a', label: 'A', shortcut: 'X', contexts: ['canvas' as const], priority: 1 },
      { id: 'b', label: 'B', shortcut: 'X', contexts: ['canvas' as const], priority: 2 },
    ]
    expect(findShortcutConflicts(commands)).toHaveLength(1)
  })
})
