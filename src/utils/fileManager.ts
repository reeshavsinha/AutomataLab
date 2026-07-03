// ============================================================
// File Manager — Save / Load machine definitions as JSON
// ============================================================

import type { AutomataState, MachineDefinition, Transition } from '@/engines/machine/core/types'
import { generateId, isPDAType } from '@/engines/machine/core/utils'
import { addRecentFile } from '@/utils/recentFiles'
import { isTauri } from '@tauri-apps/api/core'
import { parseJFLAP } from '@/utils/jflap'
import { toast } from '@/store/toastStore'
const FILE_EXTENSION = '.autolab.json'
const MIME_TYPE = 'application/json'
const VALID_TYPES = ['DFA', 'NFA', 'ENFA', 'DPDA', 'NPDA', 'TM', 'LBA']

/** Copy only the known state fields, dropping anything unexpected from the file. */
function sanitizeState(raw: any): AutomataState {
  const state: AutomataState = {
    id: typeof raw?.id === 'string' ? raw.id : generateId('state'),
    label: typeof raw?.label === 'string' ? raw.label : '',
    x: Number(raw?.x) || 0,
    y: Number(raw?.y) || 0,
    isStart: !!raw?.isStart,
    isAccept: !!raw?.isAccept,
  }
  if (raw?.isReject) state.isReject = true
  if (raw?.isText) state.isText = true
  if (typeof raw?.description === 'string' && raw.description !== '') state.description = raw.description
  if (Number.isFinite(raw?.width)) state.width = Number(raw.width)
  if (Number.isFinite(raw?.height)) state.height = Number(raw.height)
  return state
}

/** Copy only the known transition fields (FA + PDA + reserved TM), dropping the rest. */
function sanitizeTransition(raw: any): Transition {
  const t: Transition = {
    id: typeof raw?.id === 'string' ? raw.id : generateId('trans'),
    from: String(raw?.from ?? ''),
    to: String(raw?.to ?? ''),
    symbols: Array.isArray(raw?.symbols) ? raw.symbols.map(String) : [],
  }
  if (raw?.controlPointOffset && typeof raw.controlPointOffset === 'object') {
    t.controlPointOffset = {
      x: Number(raw.controlPointOffset.x) || 0,
      y: Number(raw.controlPointOffset.y) || 0,
    }
  }
  if (typeof raw?.read === 'string') t.read = raw.read
  if (typeof raw?.pop === 'string') t.pop = raw.pop
  if (typeof raw?.push === 'string') t.push = raw.push
  if (typeof raw?.write === 'string') t.write = raw.write
  if (raw?.direction === 'L' || raw?.direction === 'R' || raw?.direction === 'S') {
    t.direction = raw.direction
  }
  // Multi-tape TM arrays (additive — single-tape files omit them).
  if (Array.isArray(raw?.reads)) t.reads = raw.reads.map(String)
  if (Array.isArray(raw?.writes)) t.writes = raw.writes.map(String)
  if (Array.isArray(raw?.directions)) {
    t.directions = raw.directions.map((d: unknown) =>
      d === 'L' || d === 'R' || d === 'S' ? d : 'S'
    )
  }
  return t
}

export function parseMachineJson(jsonString: string): MachineDefinition {
  let raw: any
  try {
    raw = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid machine file: not valid JSON')
  }
  // The payload must be a JSON object — guard against null / arrays / primitives
  // so the field access below can't throw a raw TypeError ("…of null").
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Invalid machine file: expected a machine object')
  }
  // Minimal validation
  if (!raw.states || !raw.transitions || !raw.type) {
    throw new Error('Invalid machine file: missing required fields')
  }

  if (!VALID_TYPES.includes(raw.type)) {
    throw new Error('Invalid machine file: unknown machine type')
  }

  // Ensure a unique id on load, and prevent prototype pollution / injection by
  // explicitly rebuilding every state and transition from known fields only.
  const def: MachineDefinition = {
    id: generateId('machine'),
    // Force string-typed metadata: a numeric/boolean `name` would otherwise flow
    // through and crash later (e.g. `fileStem` calls String.prototype.replace).
    name: typeof raw.name === 'string' && raw.name !== '' ? raw.name : 'Imported Machine',
    type: raw.type,
    language: typeof raw.language === 'string' ? raw.language : '',
    states: Array.isArray(raw.states) ? raw.states.map(sanitizeState) : [],
    transitions: Array.isArray(raw.transitions) ? raw.transitions.map(sanitizeTransition) : [],
    alphabet: Array.isArray(raw.alphabet) ? raw.alphabet.map(String) : [],
  }
  // Optional declared alphabets Γ (additive — old files omit them).
  if (Array.isArray(raw.stackAlphabet) && raw.stackAlphabet.length > 0) {
    def.stackAlphabet = raw.stackAlphabet.map(String)
  }
  if (Array.isArray(raw.tapeAlphabet) && raw.tapeAlphabet.length > 0) {
    def.tapeAlphabet = raw.tapeAlphabet.map(String)
  }
  // Optional TM/LBA fields (additive — old files simply omit them).
  if (typeof raw.blankSymbol === 'string' && raw.blankSymbol.length > 0) {
    def.blankSymbol = raw.blankSymbol
  }
  if (Number.isFinite(raw.stepLimit) && raw.stepLimit > 0) {
    def.stepLimit = Number(raw.stepLimit)
  }
  if (Number.isFinite(raw.tapeCount) && raw.tapeCount > 1) {
    def.tapeCount = Math.floor(Number(raw.tapeCount))
  }

  // Phase 2 Validation
  const stateIds = new Set<string>()
  let startStateCount = 0
  for (const s of def.states) {
    if (stateIds.has(s.id)) throw new Error('Invalid machine file: duplicate state IDs detected')
    stateIds.add(s.id)
    if (s.isStart) startStateCount++
  }

  if (def.states.length > 0 && startStateCount !== 1) {
    throw new Error('Invalid machine file: machine must have exactly one start state')
  }

  const transIds = new Set<string>()
  for (const t of def.transitions) {
    if (transIds.has(t.id)) throw new Error('Invalid machine file: duplicate transition IDs detected')
    transIds.add(t.id)
    if (!stateIds.has(t.from) || !stateIds.has(t.to)) {
      throw new Error('Invalid machine file: transition references a nonexistent state')
    }
  }

  return def
}

/** Result of a load operation: the parsed machine plus its source path (Tauri only). */
export interface LoadedMachine {
  def: MachineDefinition
  path: string | null
}

/**
 * Serialize and save machine as .autolab.json.
 * Returns the saved file path (Tauri) or the download filename (web) on success,
 * or null if the user cancelled the native save dialog.
 */
export async function saveMachine(machine: MachineDefinition): Promise<string | null> {
  const json = JSON.stringify(machine, null, 2)
  const defaultName = `${machine.name.replace(/\s+/g, '_')}${FILE_EXTENSION}`

  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({
        defaultPath: defaultName,
        filters: [{
          name: 'AutomataLab Machine',
          extensions: ['autolab.json', 'json']
        }]
      })
      if (path) {
        await writeTextFile(path, json)
        addRecentFile(path, machine.name)
        return path
      }
      return null
    } catch (err) {
      console.error('Failed to save file:', err)
      throw new Error('Failed to save file via native dialog')
    }
  } else {
    // Web fallback
    const blob = new Blob([json], { type: MIME_TYPE })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return defaultName
  }
}

/**
 * Save a machine directly to a known path without showing a dialog (Tauri only).
 * Used by "Save" once a file already has a location. Returns the path on success.
 */
export async function saveMachineToPath(machine: MachineDefinition, path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('Saving to a path is only supported in the desktop app')
  }
  const json = JSON.stringify(machine, null, 2)
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, json)
    addRecentFile(path, machine.name)
    return path
  } catch (err) {
    console.error('Failed to save file:', err)
    throw new Error('Failed to save file')
  }
}

/** Open file picker and parse a .autolab.json file. */
export async function loadMachine(): Promise<LoadedMachine> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({
      multiple: false,
      filters: [{
        name: 'AutomataLab Machine',
        extensions: ['autolab.json', 'json', 'jff']
      }]
    })

    if (!path) {
      throw new Error('No file selected')
    }

    const filePath = Array.isArray(path) ? path[0] : path
    const content = await readTextFile(filePath)
    const isJff = filePath.toLowerCase().endsWith('.jff')
    const def = isJff ? parseJFLAP(content) : parseMachineJson(content)
    if (isJff) checkImportWarnings(def)
    addRecentFile(filePath, def.name)
    return { def, path: filePath }
  } else {
    // Web fallback
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.autolab.json,.jff'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string
            const isJff = file.name.toLowerCase().endsWith('.jff')
            const def = isJff ? parseJFLAP(content) : parseMachineJson(content)
            if (isJff) checkImportWarnings(def)
            resolve({ def, path: null })
          } catch (err) {
            reject(new Error('Failed to parse machine file'))
          }
        }
        reader.readAsText(file)
      }
      input.click()
    })
  }
}

/** Load a machine directly from a known absolute path (Tauri — recent files). */
export async function loadMachineFromPath(path: string): Promise<MachineDefinition> {
  if (!isTauri()) {
    throw new Error('Opening files by path is only supported in the desktop app')
  }
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const content = await readTextFile(path)
  const isJff = path.toLowerCase().endsWith('.jff')
  const def = isJff ? parseJFLAP(content) : parseMachineJson(content)
  if (isJff) checkImportWarnings(def)
  addRecentFile(path, def.name)
  return def
}

function checkImportWarnings(def: MachineDefinition) {
  if (isPDAType(def.type) && !def.states.some((s) => s.isAccept)) {
    toast.warning(
      'Warning: This imported PDA has no final states. AutomataLab evaluates acceptance by Final State, not Empty Stack.',
      8000
    )
  }
}

/** Export machine as plain JSON string (for clipboard or other uses) */
export function exportMachineJSON(machine: MachineDefinition): string {
  return JSON.stringify(machine, null, 2)
}
