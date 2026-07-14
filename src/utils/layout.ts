import type { MachineDefinition, AutomataState } from '@/engines/machine/core/types'
import type { ELK, ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api'

// ============================================================
// Auto-layout — compact, symmetric arrangement via ELK "stress".
//
// Automata are typically cyclic (self-loops + back-edges), and a strict
// left-to-right *layered* layout stretches them out and turns every back-edge
// into a long sweeping arc. ELK's **stress** algorithm (stress majorization)
// instead produces a compact, roughly-symmetric drawing that keeps edges short
// — much closer to how people arrange these diagrams by hand.
//
// To make it production-friendly we wrap ELK with three guarantees:
//   1. **Deterministic** — seeded from a fixed ring (sorted by id), so the same
//      machine always lays out identically regardless of its current (messy)
//      positions. "Auto Layout" is idempotent.
//   2. **No overlaps** — a deterministic pairwise push-apart pass runs after ELK
//      so node circles never intersect (stress alone doesn't hard-guarantee it).
//   3. **Start on the left** — the drawing is mirrored horizontally if the start
//      state landed on the right half (distance-preserving, so quality/overlaps
//      are unaffected). Conventional reading order.
//
// Disconnected components are separated/packed by ELK. Text annotations are left
// exactly where the user placed them. elkjs is lazy-loaded (dynamic import) so it
// stays out of the initial bundle.
// ============================================================

const NODE_SIZE = 52 // .state-node is a 52px circle (see index.css)
const HALF = NODE_SIZE / 2
const DESIRED_EDGE_LENGTH = 130
const MIN_CENTER_DIST = NODE_SIZE + 22 // min center-to-center spacing for overlap removal

interface Pos {
  x: number
  y: number
}

let elkSingleton: ELK | null = null
async function getElk(): Promise<ELK> {
  if (!elkSingleton) {
    const ElkConstructor = (await import('elkjs/lib/elk.bundled.js')).default
    elkSingleton = new ElkConstructor()
  }
  return elkSingleton
}

/**
 * Rearrange the automaton into a clean, compact, deterministic diagram.
 * Async (ELK runs asynchronously); returns a new MachineDefinition.
 */
export async function applyAutoLayout(machine: MachineDefinition): Promise<MachineDefinition> {
  const nodes = machine.states.filter((s) => !s.isText)
  const n = nodes.length
  if (n === 0) return machine
  if (n === 1) {
    return {
      ...machine,
      states: machine.states.map((s) => (s.id === nodes[0].id ? { ...s, x: 0, y: 0 } : s)),
    }
  }

  // Deterministic ring seed (sorted by id) → identical result every run.
  const ringRadius = Math.max(160, (n * 60) / (2 * Math.PI))
  const seed = new Map<string, Pos>()
  ;[...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((s, i) => {
      const angle = (i / n) * 2 * Math.PI
      seed.set(s.id, {
        x: Math.round(ringRadius * Math.cos(angle)),
        y: Math.round(ringRadius * Math.sin(angle)),
      })
    })

  // Unique directed edges between distinct layout states (self-loops/multi-edges
  // don't affect placement).
  const ids = new Set(nodes.map((s) => s.id))
  const seenPairs = new Set<string>()
  const edges: ElkExtendedEdge[] = []
  for (const t of machine.transitions) {
    if (t.from === t.to || !ids.has(t.from) || !ids.has(t.to)) continue
    const key = `${t.from}__${t.to}`
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    edges.push({ id: `e${seenPairs.size}`, sources: [t.from], targets: [t.to] })
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'stress',
      'elk.stress.desiredEdgeLength': String(DESIRED_EDGE_LENGTH),
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '70',
    },
    children: nodes.map((s) => {
      const p = seed.get(s.id) as Pos
      return { id: s.id, width: NODE_SIZE, height: NODE_SIZE, x: p.x, y: p.y }
    }),
    edges,
  }

  const pos = new Map<string, Pos>()
  try {
    const elk = await getElk()
    const res = await elk.layout(graph)
    for (const c of res.children ?? []) {
      pos.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 })
    }
  } catch {
    // ELK unavailable → fall back to the (already deterministic) ring seed.
    for (const [id, p] of seed) pos.set(id, p)
  }

  const startId = machine.states.find((s) => s.isStart && !s.isText)?.id

  let placed = machine.states.map((s) => {
    const p = pos.get(s.id)
    return p ? { ...s, x: p.x, y: p.y } : s
  })
  placed = orientStartLeft(placed, startId)
  placed = removeOverlaps(placed)

  return { ...machine, states: placed }
}

/**
 * Mirror the layout horizontally if the start state ended up on the right half,
 * so the diagram reads left→right by convention. Mirroring is distance-preserving
 * (no overlaps introduced, crossings unchanged). Text nodes are not moved.
 */
function orientStartLeft(states: AutomataState[], startId: string | undefined): AutomataState[] {
  if (!startId) return states
  const layout = states.filter((s) => !s.isText)
  const start = layout.find((s) => s.id === startId)
  if (!start || layout.length < 2) return states

  let minX = Infinity
  let maxX = -Infinity
  for (const s of layout) {
    minX = Math.min(minX, s.x)
    maxX = Math.max(maxX, s.x)
  }
  if (start.x <= (minX + maxX) / 2) return states

  return states.map((s) => (s.isText ? s : { ...s, x: Math.round(minX + maxX - s.x) }))
}

/**
 * Deterministic pairwise push-apart so node circles never intersect. Stress/force
 * layouts respect spacing softly but don't hard-guarantee it; this does.
 */
function removeOverlaps(states: AutomataState[]): AutomataState[] {
  const pts = states
    .filter((s) => !s.isText)
    .map((s) => ({ id: s.id, x: s.x + HALF, y: s.y + HALF }))

  for (let iter = 0; iter < 300; iter++) {
    let moved = false
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].x - pts[i].x
        let dy = pts[j].y - pts[i].y
        let d = Math.hypot(dx, dy)
        if (d === 0) {
          // Coincident → separate along a deterministic direction.
          dx = 1
          dy = i - j || 1
          d = Math.hypot(dx, dy)
        }
        if (d < MIN_CENTER_DIST) {
          const push = (MIN_CENTER_DIST - d) / 2
          const ux = dx / d
          const uy = dy / d
          pts[i].x -= ux * push
          pts[i].y -= uy * push
          pts[j].x += ux * push
          pts[j].y += uy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }

  const byId = new Map(pts.map((p) => [p.id, p]))
  return states.map((s) => {
    const p = byId.get(s.id)
    return p ? { ...s, x: Math.round(p.x - HALF), y: Math.round(p.y - HALF) } : s
  })
}
