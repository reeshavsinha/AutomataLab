import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force'
import { MachineDefinition } from '@/engines/core/types'

const CENTER_X = 400
const CENTER_Y = 300

/**
 * Arrange the automaton with a force-directed layout.
 *
 * The simulation is seeded from a deterministic ring (not the current, possibly
 * messy/near-collinear positions) and run to convergence in one go. That makes
 * a single press produce a clean, stable result instead of needing repeated
 * presses to settle. Text annotations are left where the user placed them.
 */
export function applyAutoLayout(machine: MachineDefinition): MachineDefinition {
  const layoutStates = machine.states.filter((s) => !s.isText)
  const n = layoutStates.length
  if (n === 0) return machine

  if (n === 1) {
    return {
      ...machine,
      states: machine.states.map((s) =>
        s.id === layoutStates[0].id ? { ...s, x: CENTER_X, y: CENTER_Y } : s
      ),
    }
  }

  // Deterministic, symmetric seed → avoids the degenerate (clustered/collinear)
  // starting configurations that made the old layout look wild on first press.
  const ringRadius = Math.max(200, (n * 70) / (2 * Math.PI))
  const simNodes = layoutStates.map((state, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return {
      id: state.id,
      x: CENTER_X + ringRadius * Math.cos(angle),
      y: CENTER_Y + ringRadius * Math.sin(angle),
    }
  })

  const ids = new Set(simNodes.map((node) => node.id))
  const links = machine.transitions
    .filter((t) => t.from !== t.to && ids.has(t.from) && ids.has(t.to))
    .map((t) => ({ source: t.from, target: t.to }))

  const simulation = forceSimulation(simNodes as any)
    .force('link', forceLink(links).id((d: any) => d.id).distance(170).strength(0.55))
    .force('charge', forceManyBody().strength(-750).distanceMax(700))
    .force('collide', forceCollide().radius(62).strength(1))
    .force('center', forceCenter(CENTER_X, CENTER_Y))
    .force('x', forceX(CENTER_X).strength(0.06))
    .force('y', forceY(CENTER_Y).strength(0.06))
    .alpha(1)
    .alphaMin(0.001)
    .alphaDecay(0.0228)
    .velocityDecay(0.45)
    .stop()

  // Run to convergence synchronously.
  for (let i = 0; i < 400; i++) simulation.tick()

  const posById = new Map<string, { x: number; y: number }>()
  for (const node of simNodes as any[]) {
    posById.set(node.id, { x: Math.round(node.x), y: Math.round(node.y) })
  }

  return {
    ...machine,
    states: machine.states.map((s) => {
      const p = posById.get(s.id)
      return p ? { ...s, x: p.x, y: p.y } : s
    }),
  }
}
