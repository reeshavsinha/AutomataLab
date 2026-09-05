// ============================================================
// AutomataLab — Diagram → SVG renderer (v4.0)
// A pure, dependency-free function that draws a machine to an SVG string.
// Reused by (a) the conversion preview (revealing elements step-by-step with
// highlights) and (b) PNG/SVG diagram export (PRD FR-6.3). Treats each state's
// (x, y) as its centre; the caller is expected to have laid the machine out.
// No React/DOM imports — safe to unit test and run headless.
// ============================================================

import type { MachineDefinition, Transition } from '@/engines/machine/core/types'
import {
  BLANK,
  EPSILON,
  formatPdaLabel,
  formatTmTransition,
  isEpsilon,
  isPDAType,
  isTMType,
} from '@/engines/machine/core/utils'

export interface DiagramColors {
  background: string
  nodeFill: string
  nodeStroke: string
  nodeText: string
  edge: string
  edgeText: string
  highlight: string
  reject: string
}

export const LIGHT_COLORS: DiagramColors = {
  background: '#ffffff',
  nodeFill: '#ffffff',
  nodeStroke: '#1a1a1a',
  nodeText: '#1a1a1a',
  edge: '#404040',
  edgeText: '#1a1a1a',
  highlight: '#2563eb',
  reject: '#dc2626',
}

export const DARK_COLORS: DiagramColors = {
  background: '#0f0f0f',
  nodeFill: '#1c1c1c',
  nodeStroke: '#e5e5e5',
  nodeText: '#f5f5f5',
  edge: '#a3a3a3',
  edgeText: '#ededed',
  highlight: '#60a5fa',
  reject: '#f87171',
}

export interface DiagramSvgOptions {
  /** Render only these states (and edges between them). Omit = all real states. */
  includeStateIds?: Set<string>
  /** Render only these transitions. Omit = all (subject to endpoint inclusion). */
  includeTransitionIds?: Set<string>
  /** States to emphasise. */
  highlightStateIds?: Set<string>
  /** Transitions to emphasise. */
  highlightTransitionIds?: Set<string>
  colors?: DiagramColors
  /** Outer margin around the content. */
  padding?: number
  /** Include text-annotation nodes (used by export, not the conversion preview). */
  includeTextNodes?: boolean
  /**
   * Reserve the viewBox for these states regardless of what is actually drawn.
   * Used by the step-by-step conversion preview to keep the frame fixed while
   * states are revealed one step at a time (otherwise the diagram would jump).
   */
  frameStateIds?: Set<string>
  /**
   * Draw each state's `description` (its provenance, e.g. a subset of source
   * states) in place of its short label. Off by default — used by the conversion
   * preview's "full labels" mode.
   */
  verboseLabels?: boolean
}

export interface DiagramSvgResult {
  svg: string
  width: number
  height: number
}

const NODE_R = 26
const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A combined, human-readable label for all transitions on one (from→to) pair. */
function bundleLabel(machine: MachineDefinition, group: Transition[]): string[] {
  if (isTMType(machine.type)) {
    const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
    const blank = machine.blankSymbol || BLANK
    return group.map((t) => formatTmTransition(t, tapeCount, blank))
  }
  if (isPDAType(machine.type)) {
    return group.map((t) => formatPdaLabel(t.read, t.pop, t.push))
  }
  // FA: combine the symbol sets into one comma list.
  const syms: string[] = []
  for (const t of group) {
    for (const s of t.symbols) {
      const input = isEpsilon(s) ? EPSILON : s
      const disp = machine.type === 'MEALY' ? `${input} / ${t.output ?? ''}` : input
      if (!syms.includes(disp)) syms.push(disp)
    }
  }
  return [syms.join(', ') || EPSILON]
}

function arrowHead(ex: number, ey: number, dx: number, dy: number, color: string): string {
  const len = 11
  const w = 5
  const bx = ex - dx * len
  const by = ey - dy * len
  const px = -dy
  const py = dx
  const x1 = bx + px * w
  const y1 = by + py * w
  const x2 = bx - px * w
  const y2 = by - py * w
  return `<polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${color}" />`
}

export function machineToSVG(
  machine: MachineDefinition,
  options: DiagramSvgOptions = {}
): DiagramSvgResult {
  const colors = options.colors ?? LIGHT_COLORS
  const padding = options.padding ?? 48
  const hlStates = options.highlightStateIds ?? new Set<string>()
  const hlTrans = options.highlightTransitionIds ?? new Set<string>()

  const states = machine.states.filter((s) => {
    if (s.isText && !options.includeTextNodes) return false
    if (options.includeStateIds && !options.includeStateIds.has(s.id)) return false
    return true
  })
  const stateById = new Map(states.map((s) => [s.id, s]))

  if (states.filter((s) => !s.isText).length === 0) {
    const w = 320
    const h = 120
    return {
      width: w,
      height: h,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${colors.background}"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="13" fill="${colors.edgeText}">No states to display yet</text></svg>`,
    }
  }

  const transitions = machine.transitions.filter((t) => {
    if (options.includeTransitionIds && !options.includeTransitionIds.has(t.id)) return false
    return stateById.has(t.from) && stateById.has(t.to)
  })

  // Group transitions by ordered (from→to) pair.
  const groups = new Map<string, Transition[]>()
  for (const t of transitions) {
    const key = `${t.from}->${t.to}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  const hasReverse = (from: string, to: string) => groups.has(`${to}->${from}`)

  const edgeParts: string[] = []
  const labelParts: string[] = []

  for (const [key, group] of groups) {
    const [fromId, toId] = key.split('->')
    const a = stateById.get(fromId)!
    const b = stateById.get(toId)!
    const emphasise = group.some((t) => hlTrans.has(t.id))
    const stroke = emphasise ? colors.highlight : colors.edge
    const sw = emphasise ? 2.4 : 1.6
    const lines = bundleLabel(machine, group)

    if (fromId === toId) {
      // Self-loop above the node.
      const cx = a.x
      const cy = a.y
      const p1x = cx - NODE_R * 0.55
      const p1y = cy - NODE_R * 0.82
      const p2x = cx + NODE_R * 0.55
      const p2y = cy - NODE_R * 0.82
      const c1x = cx - NODE_R * 1.7
      const c1y = cy - NODE_R * 3.1
      const c2x = cx + NODE_R * 1.7
      const c2y = cy - NODE_R * 3.1
      edgeParts.push(
        `<path d="M ${p1x.toFixed(1)} ${p1y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`
      )
      edgeParts.push(arrowHead(p2x, p2y, Math.cos(Math.PI / 3.2), -Math.sin(Math.PI / 3.2), stroke))
      const ly = cy - NODE_R * 3.2
      lines.forEach((ln, i) => {
        labelParts.push(textLabel(cx, ly + i * 14, ln, colors.edgeText, colors.background, emphasise))
      })
      continue
    }

    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    const curve = hasReverse(fromId, toId)

    if (!curve) {
      const sx = a.x + ux * NODE_R
      const sy = a.y + uy * NODE_R
      const ex = b.x - ux * NODE_R
      const ey = b.y - uy * NODE_R
      edgeParts.push(
        `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" />`
      )
      edgeParts.push(arrowHead(ex, ey, ux, uy, stroke))
      const mx = (sx + ex) / 2 - uy * 12
      const my = (sy + ey) / 2 + ux * 12
      lines.forEach((ln, i) => labelParts.push(textLabel(mx, my + i * 14 - (lines.length - 1) * 7, ln, colors.edgeText, colors.background, emphasise)))
    } else {
      // Bow to one side so opposing edges don't overlap.
      const px = -uy
      const py = ux
      const bow = 34
      const mx = (a.x + b.x) / 2 + px * bow
      const my = (a.y + b.y) / 2 + py * bow
      const sAng = Math.atan2(my - a.y, mx - a.x)
      const eAng = Math.atan2(my - b.y, mx - b.x)
      const sx = a.x + Math.cos(sAng) * NODE_R
      const sy = a.y + Math.sin(sAng) * NODE_R
      const ex = b.x + Math.cos(eAng) * NODE_R
      const ey = b.y + Math.sin(eAng) * NODE_R
      edgeParts.push(
        `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`
      )
      const adx = ex - mx
      const ady = ey - my
      const al = Math.hypot(adx, ady) || 1
      edgeParts.push(arrowHead(ex, ey, adx / al, ady / al, stroke))
      lines.forEach((ln, i) =>
        labelParts.push(textLabel(mx + px * 10, my + py * 10 + i * 14 - (lines.length - 1) * 7, ln, colors.edgeText, colors.background, emphasise))
      )
    }
  }

  // ── Nodes ──
  const verbose = !!options.verboseLabels
  const nodeParts: string[] = []
  for (const s of states) {
    if (s.isText) {
      nodeParts.push(
        `<text x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="13" fill="${colors.edgeText}">${escapeXml(s.label)}</text>`
      )
      continue
    }
    const emphasise = hlStates.has(s.id)
    const stroke = emphasise ? colors.highlight : s.isReject ? colors.reject : colors.nodeStroke
    const sw = emphasise ? 3 : 2
    // Group each state's pieces so a single <title> gives a native hover tooltip
    // with its provenance (e.g. the subset it represents).
    const parts: string[] = []
    if (s.isStart) {
      const ax = s.x - NODE_R - 26
      parts.push(
        `<line x1="${ax.toFixed(1)}" y1="${s.y}" x2="${(s.x - NODE_R).toFixed(1)}" y2="${s.y}" stroke="${stroke}" stroke-width="${sw}" />`
      )
      parts.push(arrowHead(s.x - NODE_R, s.y, 1, 0, stroke))
    }
    parts.push(
      `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${NODE_R}" fill="${colors.nodeFill}" stroke="${stroke}" stroke-width="${sw}" />`
    )
    if (s.isAccept || s.isReject) {
      parts.push(
        `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${NODE_R - 4.5}" fill="none" stroke="${stroke}" stroke-width="${Math.max(1.2, sw - 0.6)}" />`
      )
    }
    const shown = verbose && s.description ? s.description : s.label
    parts.push(
      `<text x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="13" font-weight="600" fill="${colors.nodeText}">${escapeXml(shown)}</text>`
    )
    const tip = s.description ? `${s.label} = ${s.description}` : s.label
    if (machine.type === 'MOORE' && s.output) {
      parts.push(
        `<text x="${s.x.toFixed(1)}" y="${(s.y + NODE_R + 14).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${colors.edgeText}">out: ${escapeXml(s.output)}</text>`
      )
    }
    nodeParts.push(`<g><title>${escapeXml(tip)}</title>${parts.join('')}</g>`)
  }

  // ── Bounds ──
  // When a frame is supplied, reserve space for those states even if they
  // aren't drawn yet (stable viewBox across reveal steps); else fit the drawn set.
  const boundsStates = options.frameStateIds
    ? machine.states.filter((s) => !s.isText && options.frameStateIds!.has(s.id))
    : states
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of boundsStates) {
    minX = Math.min(minX, s.x - NODE_R)
    maxX = Math.max(maxX, s.x + NODE_R)
    minY = Math.min(minY, s.y - NODE_R)
    maxY = Math.max(maxY, s.y + NODE_R)
    if (machine.type === 'MOORE' && s.output) maxY = Math.max(maxY, s.y + NODE_R + 22)
    if (s.isStart) minX = Math.min(minX, s.x - NODE_R - 30)
    // self-loops + labels extend above
    minY = Math.min(minY, s.y - NODE_R * 3.6)
  }
  const padX = padding
  const padTop = padding
  const width = Math.ceil(maxX - minX + padX * 2)
  const height = Math.ceil(maxY - minY + padTop * 2)
  const tx = padX - minX
  const ty = padTop - minY

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${colors.background}"/>` +
    `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})">` +
    edgeParts.join('') +
    nodeParts.join('') +
    labelParts.join('') +
    `</g></svg>`

  return { svg, width, height }
}

function textLabel(x: number, y: number, text: string, color: string, halo: string, emphasise: boolean): string {
  const t = escapeXml(text)
  // A halo in the background colour keeps the label legible where it crosses an edge.
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="12.5" font-weight="${emphasise ? 700 : 500}" fill="${color}" paint-order="stroke" stroke="${halo}" stroke-width="3.5" stroke-linejoin="round">${t}</text>`
}
