// ============================================================
// Exporters — turn the model + a run into research/teaching artifacts.
// δ-table (CSV / LaTeX), execution trace (CSV / JSON), computation tree (JSON).
// These serve the "researcher / instructor" personas: export is the single
// highest-leverage data-out feature (UX audit #7, PRD FR-6.3).
// Pure string builders here; `downloadText` handles web + Tauri delivery.
// ============================================================

import type { Configuration, HistoryEntry, MachineDefinition, Transition } from '@/engines/machine/core/types'
import type { LR0Table, ActionEntry } from '@/engines/parser/lr0'
import type { LL1Table } from '@/engines/parser/ll1'
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
  // Prepend UTF-8 BOM (\uFEFF) so Excel correctly renders symbols like ε
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
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

// ─── Grammar & Parser Exporters ──────────────────────────────────────────────────

export function firstFollowToCSV(firstSets: Map<string, Set<string>>, followSets: Map<string, Set<string>>): string {
  const header = ['Non-Terminal', 'FIRST', 'FOLLOW']
  const rows: string[][] = []
  
  // followSets only contains non-terminals, which is exactly what we want to export
  const allNts = Array.from(followSets.keys())
  for (const nt of allNts) {
    const first = Array.from(firstSets.get(nt) || []).join(' ')
    const follow = Array.from(followSets.get(nt) || []).join(' ')
    rows.push([nt, first, follow])
  }
  
  return toCSV([header, ...rows])
}

export function ll1TableToCSV(table: LL1Table): string {
  const terminals = Array.from(table.terminals)
  if (!terminals.includes('$')) terminals.push('$')
  const nonterminals = Array.from(table.nonterminals)

  const header = ['Non-Terminal', ...terminals]
  const rows: string[][] = []

  for (const nt of nonterminals) {
    const row = [nt]
    for (const t of terminals) {
      const prods = table.table.get(nt)?.get(t) || []
      const cell = prods.map(p => `${p.lhs} -> ${p.rhs.length === 1 && p.rhs[0] === 'ε' ? 'ε' : p.rhs.join(' ')}`).join(' / ')
      row.push(cell)
    }
    rows.push(row)
  }

  return toCSV([header, ...rows])
}

export function lrTableToCSV(table: LR0Table): string {
  const terminals = Array.from(table.terminals)
  if (!terminals.includes('$')) terminals.push('$')
  const nonterminals = Array.from(table.nonterminals).filter(nt => nt !== table.augmentedCfg.startSymbol)

  const topHeader = ['State', 'ACTION', ...Array(Math.max(0, terminals.length - 1)).fill(''), 'GOTO', ...Array(Math.max(0, nonterminals.length - 1)).fill('')]
  const subHeader = ['', ...terminals, ...nonterminals]
  const rows: string[][] = []

  for (let i = 0; i < table.states.length; i++) {
    const row = [String(i)]
    for (const t of terminals) {
      const actions = table.actionTable.get(i)?.get(t) || []
      const cell = actions.map(a => {
        if (a.type === 'Accept') return 'acc'
        if (a.type === 'Shift') return `s${a.target}`
        if (a.type === 'Reduce') return `r${a.target}`
        return ''
      }).join(' / ')
      row.push(cell)
    }
    for (const nt of nonterminals) {
      const g = table.gotoTable.get(i)?.get(nt)
      row.push((g !== undefined && g !== -1) ? String(g) : '')
    }
    rows.push(row)
  }

  return toCSV([topHeader, subHeader, ...rows])
}


/** Real (non-annotation) states, start first then creation order. */
function orderedStates(machine: MachineDefinition) {
  return [...machine.states.filter((s) => !s.isText)].sort(
    (a, b) => Number(b.isStart) - Number(a.isStart)
  )
}

/** Decorate a state label for δ-tables. Transducers only have a start role. */
function decorate(machine: MachineDefinition, id: string): string {
  const s = machine.states.find((st) => st.id === id)
  if (!s) return id
  let prefix = ''
  if (s.isStart) prefix += '→ '
  if (machine.type !== 'MEALY' && machine.type !== 'MOORE') {
    if (s.isAccept) prefix += '* '
    if (s.isReject) prefix += '⊘ '
  }
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
      const target = labels.get(t.to) ?? t.to
      const lbl = machine.type === 'MEALY' ? `${target} / ${t.output ?? ''}` : target
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

function resolveStates(labels: Map<string, string>, ids: string[]): string {
  if (ids.length === 0) return '∅'
  return ids.map((id) => labels.get(id) ?? id).join(' ')
}

export interface ConfigurationMatrix {
  columns: string[]
  rows: string[][]
  /** Explains whether tape columns represent independent tapes. */
  note?: string
}

export interface ExportHistoryMeta {
  /** The simulator's total completed step count, including evicted entries. */
  totalSteps?: number
}

function formatTape(tape: NonNullable<HistoryEntry['tapes']>[number]): string {
  const right = tape.left + tape.cells.length - 1
  const cells = tape.cells
    .map((cell, index) => index === tape.head ? `⟦${cell}⟧` : cell)
    .join('')
  const bounds = tape.leftBound !== undefined || tape.rightBound !== undefined
    ? `; bounds ${tape.leftBound ?? '−∞'}..${tape.rightBound ?? '∞'}`
    : ''
  return `[${tape.left}..${right}; head ${tape.left + tape.head}${bounds}] ${cells}`
}

/** Build a model-aware configuration matrix without inventing stack/tape columns for FA runs. */
export function configurationMatrix(machine: MachineDefinition, history: HistoryEntry[], meta: ExportHistoryMeta = {}): ConfigurationMatrix {
  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const isTransducer = machine.type === 'MEALY' || machine.type === 'MOORE'
  const tapeCount = isTM ? Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1) : 0
  const columns = ['Step', 'State']
  if (!isTM) columns.push('Input position', 'Consumed input', 'Remaining input')
  if (isPDA) columns.push('Stack')
  if (isTM) {
    for (let index = 0; index < tapeCount; index++) {
      columns.push(`Tape ${index + 1} head`, `Tape ${index + 1}`)
    }
  }
  if (isTransducer) columns.push('Output')
  columns.push('Status')

  const labels = labelMap(machine)
  const rows: string[][] = []
  const startState = machine.states.find((state) => state.isStart)
  const initialOutput = machine.type === 'MOORE'
    ? startState?.output ?? ''
    : machine.initialOutput ?? ''
  if (isTransducer && initialOutput) {
    rows.push(columns.map((column) => {
      if (column === 'Step') return 'init'
      if (column === 'State') return startState ? (labels.get(startState.id) ?? startState.id) : ''
      if (column === 'Input position') return '0'
      if (column === 'Output') return initialOutput
      if (column === 'Status') return 'initialized'
      return ''
    }))
  }
  rows.push(...history.map((entry) => {
    const stateIds = entry.toStateIds.length > 0 ? entry.toStateIds : entry.fromStateIds
    const row = [String(entry.step), resolveStates(labels, stateIds)]
    if (!isTM) row.push(
      entry.inputIndex === undefined ? '' : String(entry.inputIndex),
      entry.consumedInput ?? '',
      entry.remainingInput ?? '',
    )
    if (isPDA) row.push((entry.stack ?? []).join(' '))
    if (isTM) {
      for (let index = 0; index < tapeCount; index++) {
        const tape = entry.tapes?.[index]
        row.push(tape ? String(tape.left + tape.head) : '', tape ? formatTape(tape) : '')
      }
    }
    if (isTransducer) row.push(entry.output ?? '')
    row.push(entry.status)
    return row
  }))

  return {
    columns,
    rows,
    ...((isTM || meta.totalSteps !== undefined) ? {
      note: [
        ...(isTM && tapeCount > 1 ? ['Tape columns are independent tapes; each column has its own head. They are not multi-track cells.'] : []),
        ...(isTM ? ['Each tape value is a bounded render window with absolute coordinates.'] : []),
        ...(meta.totalSteps !== undefined && meta.totalSteps > history.length
          ? [`Retained history window: ${history.length === 0 ? 'no entries' : `${history[0].step}–${history[history.length - 1].step}`} of ${meta.totalSteps} total steps.`]
          : []),
      ].join(' '),
    } : {}),
  }
}

export function configurationMatrixToCSV(machine: MachineDefinition, history: HistoryEntry[], meta: ExportHistoryMeta = {}): string {
  const matrix = configurationMatrix(machine, history, meta)
  return toCSV([matrix.columns, ...matrix.rows, ...(matrix.note ? [[`Note: ${matrix.note}`]] : [])])
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function configurationMatrixToMarkdown(machine: MachineDefinition, history: HistoryEntry[], meta: ExportHistoryMeta = {}): string {
  const matrix = configurationMatrix(machine, history, meta)
  const lines = [
    `# Configuration matrix — ${machine.name}`,
    '',
    `| ${matrix.columns.join(' | ')} |`,
    `| ${matrix.columns.map(() => '---').join(' | ')} |`,
    ...matrix.rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ]
  if (matrix.note) lines.push('', `> ${matrix.note}`)
  return lines.join('\n')
}

export function configurationMatrixToLatex(machine: MachineDefinition, history: HistoryEntry[], meta: ExportHistoryMeta = {}): string {
  const matrix = configurationMatrix(machine, history, meta)
  const colSpec = `|${'l|'.repeat(matrix.columns.length)}`
  const lines = [
    '% AutomataLab — configuration matrix',
    `% Machine: ${machine.name} (${machine.type})`,
    ...(matrix.note ? [`% ${matrix.note}`] : []),
    `\\begin{tabular}{${colSpec}}`,
    '\\hline',
    matrix.columns.map(latexEscape).join(' & ') + ' \\\\',
    '\\hline',
    ...matrix.rows.map((row) => row.map(latexEscape).join(' & ') + ' \\\\'),
    '\\hline',
    '\\end{tabular}',
  ]
  return lines.join('\n')
}

// ─── execution trace ────────────────────────────────────────────

export function traceToCSV(machine: MachineDefinition, history: HistoryEntry[]): string {
  const labels = labelMap(machine)
  const isTransducer = machine.type === 'MEALY' || machine.type === 'MOORE'
  const header = isTransducer
    ? ['Step', 'Read', 'From', 'To', 'Output', 'Status']
    : ['Step', 'Read', 'From', 'To', 'Status']
  const rows: string[][] = []
  const startState = machine.states.find((state) => state.isStart)
  const initialOutput = machine.type === 'MOORE'
    ? startState?.output ?? ''
    : machine.initialOutput ?? ''
  if (isTransducer && initialOutput) {
    rows.push(['init', '—', startState ? (labels.get(startState.id) ?? startState.id) : '', startState ? (labels.get(startState.id) ?? startState.id) : '', initialOutput, 'initialized'])
  }
  rows.push(...history.map((h) => [
    String(h.step),
    h.symbol === '' ? EPSILON : h.symbol,
    resolveStates(labels, h.fromStateIds),
    resolveStates(labels, h.toStateIds),
    ...(isTransducer ? [h.output ?? ''] : []),
    h.status,
  ]))
  return toCSV([header, ...rows])
}

export function traceToJSON(
  machine: MachineDefinition,
  history: HistoryEntry[],
  input: string
): string {
  const labels = labelMap(machine)
  const isTransducer = machine.type === 'MEALY' || machine.type === 'MOORE'
  const payload = {
    machine: { name: machine.name, type: machine.type },
    input,
    ...(isTransducer ? {
      initialOutput: machine.type === 'MOORE'
        ? machine.states.find((state) => state.isStart)?.output ?? ''
        : machine.initialOutput ?? '',
    } : {}),
    ...(isTransducer ? { outputTrace: history.length > 0 ? history[history.length - 1].outputTrace ?? [] : [] } : {}),
    steps: history.map((h) => ({
      step: h.step,
      read: h.symbol,
      from: h.fromStateIds.map((id) => labels.get(id) ?? id),
      to: h.toStateIds.map((id) => labels.get(id) ?? id),
      transitionIds: h.transitionIds,
      ...(h.inputIndex !== undefined ? { inputIndex: h.inputIndex } : {}),
      ...(h.consumedInput !== undefined ? { consumedInput: h.consumedInput } : {}),
      ...(h.remainingInput !== undefined ? { remainingInput: h.remainingInput } : {}),
      ...(h.stack ? { stack: h.stack } : {}),
      ...(h.tapes ? { tapes: h.tapes } : {}),
      ...(h.output !== undefined ? { output: h.output, outputTrace: h.outputTrace ?? [] } : {}),
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
  md: 'text/markdown',
  tex: 'text/plain',
  txt: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  jff: 'application/xml',
  zip: 'application/zip',
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

/**
 * Save binary data to disk.
 */
export async function downloadBlob(
  filename: string,
  content: Uint8Array | Blob,
  ext: keyof typeof MIME
): Promise<string | null> {
  const mime = MIME[ext] ?? 'application/octet-stream'
  try {
    if (isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
      if (!path) return null
      
      const uint8Array = content instanceof Blob ? new Uint8Array(await content.arrayBuffer()) : content
      await writeFile(path, uint8Array)
      return path
    }
  } catch {
    // Fall through
  }
  const blob = content instanceof Blob ? content : new Blob([content as any], { type: mime })
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
