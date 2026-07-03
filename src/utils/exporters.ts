// ============================================================
// Exporters — turn the model + a run into research/teaching artifacts.
// δ-table (CSV / LaTeX), execution trace (CSV / JSON), computation tree (JSON).
// These serve the "researcher / instructor" personas: export is the single
// highest-leverage data-out feature (UX audit #7, PRD FR-6.3).
// Pure string builders here; `downloadText` handles web + Tauri delivery.
// ============================================================

import type { Configuration, HistoryEntry, MachineDefinition, Transition } from '@/engines/machine/core/types'
import {
  EPSILON,
  isEpsilon,
  isPDAType,
  isTMType,
  formatTmTransition,
  tmTapeOps,
  BLANK,
} from '@/engines/machine/core/utils'
import { isTauri } from '@tauri-apps/api/core'

// ─── small helpers ─────────────────────────────────────────────

function csvCell(value: string): string {
  // Quote when the value contains a delimiter, quote, or newline (RFC 4180).
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCSV(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

function latexEscape(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

function labelMap(machine: MachineDefinition): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of machine.states) m.set(s.id, s.label)
  return m
}

/** Real (non-annotation) states, start first then creation order. */
function orderedStates(machine: MachineDefinition) {
  return [...machine.states.filter((s) => !s.isText)].sort(
    (a, b) => Number(b.isStart) - Number(a.isStart)
  )
}

/** Decorate a state label for δ-tables: `→` start, `*` accept, `⊘` reject. */
function decorate(machine: MachineDefinition, id: string): string {
  const s = machine.states.find((st) => st.id === id)
  if (!s) return id
  let prefix = ''
  if (s.isStart) prefix += '→ '
  if (s.isAccept) prefix += '* '
  if (s.isReject) prefix += '⊘ '
  return prefix + s.label
}

// ─── δ-table ────────────────────────────────────────────────────

/**
 * For finite automata, the alphabet columns of a δ-matrix. ENFA gains a trailing
 * ε column iff the machine actually has ε-moves.
 */
function faColumns(machine: MachineDefinition): { symbols: string[]; hasEpsilon: boolean } {
  const symbols = [...machine.alphabet]
  const hasEpsilon =
    machine.type === 'ENFA' &&
    machine.transitions.some((t) => t.symbols.some(isEpsilon))
  return { symbols, hasEpsilon }
}

/** Targets reachable from `stateId` on `symbol` (or ε when `epsilon`), as labels. */
function faCell(
  machine: MachineDefinition,
  labels: Map<string, string>,
  stateId: string,
  symbol: string,
  epsilon = false
): string {
  const targets: string[] = []
  for (const t of machine.transitions) {
    if (t.from !== stateId) continue
    const match = epsilon ? t.symbols.some(isEpsilon) : t.symbols.includes(symbol)
    if (match) {
      const lbl = labels.get(t.to) ?? t.to
      if (!targets.includes(lbl)) targets.push(lbl)
    }
  }
  if (targets.length === 0) return '—'
  return targets.length === 1 ? targets[0] : `{${targets.join(', ')}}`
}

/** Build a δ-table as a matrix (FA) or long format (PDA/TM) of header + rows. */
function deltaRows(machine: MachineDefinition): { header: string[]; rows: string[][] } {
  const labels = labelMap(machine)
  const states = orderedStates(machine)
  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const tapeCount = isTM ? Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1) : 1
  const blank = machine.blankSymbol || BLANK

  if (isTM) {
    const header = ['From', 'Read', 'Write', 'Move', 'To']
    const rows: string[][] = []
    for (const st of states) {
      for (const t of machine.transitions.filter((tr) => tr.from === st.id)) {
        const ops = tmTapeOps(t, tapeCount)
        if (tapeCount === 1) {
          rows.push([
            decorate(machine, st.id),
            ops.reads[0] || blank,
            ops.writes[0] || blank,
            ops.directions[0],
            labels.get(t.to) ?? t.to,
          ])
        } else {
          // Multi-tape: collapse per-tape ops into one cell each, joined by " | ".
          rows.push([
            decorate(machine, st.id),
            ops.reads.map((r) => r || blank).join(' | '),
            ops.writes.map((w) => w || blank).join(' | '),
            ops.directions.join(' | '),
            labels.get(t.to) ?? t.to,
          ])
        }
      }
    }
    return { header, rows }
  }

  if (isPDA) {
    const header = ['From', 'Read', 'Pop', 'Push', 'To']
    const rows: string[][] = []
    for (const st of states) {
      for (const t of machine.transitions.filter((tr) => tr.from === st.id)) {
        rows.push([
          decorate(machine, st.id),
          isEpsilon(t.read) ? EPSILON : t.read!,
          isEpsilon(t.pop) ? EPSILON : t.pop!,
          isEpsilon(t.push) ? EPSILON : t.push!,
          labels.get(t.to) ?? t.to,
        ])
      }
    }
    return { header, rows }
  }

  // FA matrix: rows = states, columns = Σ (+ ε for ENFA).
  const { symbols, hasEpsilon } = faColumns(machine)
  const header = ['δ', ...symbols, ...(hasEpsilon ? [EPSILON] : [])]
  const rows: string[][] = states.map((st) => [
    decorate(machine, st.id),
    ...symbols.map((sym) => faCell(machine, labels, st.id, sym)),
    ...(hasEpsilon ? [faCell(machine, labels, st.id, '', true)] : []),
  ])
  return { header, rows }
}

export function deltaTableToCSV(machine: MachineDefinition): string {
  const { header, rows } = deltaRows(machine)
  return toCSV([header, ...rows])
}

export function deltaTableToLatex(machine: MachineDefinition): string {
  const { header, rows } = deltaRows(machine)
  const cols = header.length
  const colSpec = `|${'c|'.repeat(cols)}`
  const lines: string[] = []
  lines.push('% AutomataLab — transition (δ) table')
  lines.push(`% Machine: ${machine.name} (${machine.type})`)
  lines.push('\\begin{tabular}{' + colSpec + '}')
  lines.push('\\hline')
  lines.push(header.map(latexEscape).join(' & ') + ' \\\\')
  lines.push('\\hline')
  for (const r of rows) lines.push(r.map(latexEscape).join(' & ') + ' \\\\')
  lines.push('\\hline')
  lines.push('\\end{tabular}')
  return lines.join('\n')
}

// ─── execution trace ────────────────────────────────────────────

function resolveStates(labels: Map<string, string>, ids: string[]): string {
  if (ids.length === 0) return '∅'
  return ids.map((id) => labels.get(id) ?? id).join(' ')
}

export function traceToCSV(machine: MachineDefinition, history: HistoryEntry[]): string {
  const labels = labelMap(machine)
  const header = ['Step', 'Read', 'From', 'To', 'Status']
  const rows = history.map((h) => [
    String(h.step),
    h.symbol === '' ? EPSILON : h.symbol,
    resolveStates(labels, h.fromStateIds),
    resolveStates(labels, h.toStateIds),
    h.status,
  ])
  return toCSV([header, ...rows])
}

export function traceToJSON(
  machine: MachineDefinition,
  history: HistoryEntry[],
  input: string
): string {
  const labels = labelMap(machine)
  const payload = {
    machine: { name: machine.name, type: machine.type },
    input,
    steps: history.map((h) => ({
      step: h.step,
      read: h.symbol,
      from: h.fromStateIds.map((id) => labels.get(id) ?? id),
      to: h.toStateIds.map((id) => labels.get(id) ?? id),
      transitionIds: h.transitionIds,
      status: h.status,
    })),
  }
  return JSON.stringify(payload, null, 2)
}

// ─── computation tree ───────────────────────────────────────────

export function treeToJSON(machine: MachineDefinition, treeNodes: Configuration[]): string {
  const labels = labelMap(machine)
  const payload = {
    machine: { name: machine.name, type: machine.type },
    nodes: treeNodes.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      state: labels.get(c.stateId) ?? c.stateId,
      stack: c.stack,
      remainingInput: c.remainingInput,
      status: c.status,
      ...(c.mergedParents ? { mergedParents: c.mergedParents } : {}),
    })),
  }
  return JSON.stringify(payload, null, 2)
}

// ─── delivery ───────────────────────────────────────────────────

const MIME: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  tex: 'text/plain',
  txt: 'text/plain',
  svg: 'image/svg+xml',
  jff: 'application/xml',
}

/** A safe-ish file stem from the machine name. */
export function fileStem(machine: MachineDefinition): string {
  return (machine.name || 'machine').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'machine'
}

/**
 * Save text to disk: a native dialog under Tauri, an anchor download on web.
 * Returns the chosen/used filename, or null if the user cancelled.
 */
export async function downloadText(
  filename: string,
  content: string,
  ext: keyof typeof MIME
): Promise<string | null> {
  const mime = MIME[ext] ?? 'text/plain'
  try {
    if (isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
      if (!path) return null
      await writeTextFile(path, content)
      return path
    }
  } catch {
    // Fall through to the web download path.
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return filename
}
