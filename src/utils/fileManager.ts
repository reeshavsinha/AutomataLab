// ============================================================
// File Manager — Save / Load machine definitions as JSON
// ============================================================

import type { AutomataState, GrammarFormat, MachineDefinition, Transition } from '@/engines/machine/core/types'
import { generateId, isPDAType, isTransducerType } from '@/engines/machine/core/utils'
import { getWorkspaceForMachineType, isMachineType } from '@/engines/machine/core/capabilities'
import { AUTOMATALAB_FILE_FORMAT_VERSION, readFileFormatVersion } from '@/utils/fileFormat'
import { addRecentFile } from '@/utils/recentFiles'
import { isTauri } from '@tauri-apps/api/core'
import { parseJFLAP } from '@/utils/jflap'
import { toast } from '@/store/toastStore'
const FILE_EXTENSION = '.autolab.json'
const MIME_TYPE = 'application/json'
const MAX_TAPE_COUNT = 9
const MAX_PROJECT_BYTES = 10 * 1024 * 1024
const MAX_STATES = 5_000
const MAX_TRANSITIONS = 20_000
const MAX_SUBMACHINE_DEPTH = 16
const MAX_SUBMACHINES_PER_MACHINE = 100

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
  if (typeof raw?.output === 'string') state.output = raw.output
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
  if (typeof raw?.output === 'string') t.output = raw.output
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
  if (Array.isArray(raw?.trackReads)) t.trackReads = raw.trackReads.map(String)
  if (Array.isArray(raw?.trackWrites)) t.trackWrites = raw.trackWrites.map(String)
  if (typeof raw?.submachineId === 'string' && raw.submachineId.trim()) {
    t.submachineId = raw.submachineId.trim()
  }
  return t
}

export function parseMachineJson(jsonString: string, nestingDepth = 0): MachineDefinition {
  if (nestingDepth > MAX_SUBMACHINE_DEPTH) {
    throw new Error(`Failed to load project: Submachine nesting cannot exceed ${MAX_SUBMACHINE_DEPTH}.`)
  }
  if (jsonString.length > MAX_PROJECT_BYTES) {
    throw new Error('Failed to load project: File is larger than 10 MB.')
  }
  let raw: any
  try {
    raw = JSON.parse(jsonString)
  } catch {
    throw new Error('Failed to load project: Not a valid JSON file.')
  }
  // The payload must be a JSON object — guard against null / arrays / primitives
  // so the field access below can't throw a raw TypeError ("…of null").
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Failed to load project: Expected a machine object.')
  }
  // Minimal validation
  if (!Array.isArray(raw.states) || !Array.isArray(raw.transitions) || !raw.type) {
    throw new Error('Failed to load project: Missing required fields (states, transitions, type).')
  }
  if (raw.states.length > MAX_STATES || raw.transitions.length > MAX_TRANSITIONS) {
    throw new Error(
      `Failed to load project: Maximum size is ${MAX_STATES.toLocaleString()} states and ${MAX_TRANSITIONS.toLocaleString()} transitions.`
    )
  }

  if (!isMachineType(raw.type)) {
    throw new Error(`Failed to load project: Unknown machine type "${raw.type}".`)
  }

  const fileVersion = readFileFormatVersion(raw.version)
  if (fileVersion > AUTOMATALAB_FILE_FORMAT_VERSION) {
    throw new Error(
      `Failed to load project: File format version ${fileVersion} is newer than this application supports.`
    )
  }

  // Ensure a unique id on load, and prevent prototype pollution / injection by
  // explicitly rebuilding every state and transition from known fields only.
  const def: MachineDefinition = {
    id: generateId('machine'),
    version: fileVersion,
    // Force string-typed metadata: a numeric/boolean `name` would otherwise flow
    // through and crash later (e.g. `fileStem` calls String.prototype.replace).
    name: typeof raw.name === 'string' && raw.name !== '' ? raw.name : 'Imported Machine',
    type: raw.type,
    language: typeof raw.language === 'string' ? raw.language : '',
    states: Array.isArray(raw.states)
      ? raw.states.map(sanitizeState).map((state: AutomataState) =>
        isTransducerType(raw.type) ? { ...state, isAccept: false, isReject: false } : state
      )
      : [],
    transitions: Array.isArray(raw.transitions) ? raw.transitions.map(sanitizeTransition) : [],
    alphabet: Array.isArray(raw.alphabet) ? raw.alphabet.map(String) : [],
  }
  if (Array.isArray(raw.outputAlphabet) && raw.outputAlphabet.length > 0) {
    def.outputAlphabet = raw.outputAlphabet.map(String)
  }
  if (typeof raw.initialOutput === 'string') {
    def.initialOutput = raw.initialOutput
  }
  if (typeof raw.grammarText === 'string') def.grammarText = raw.grammarText
  if (['REGEX', 'TYPE_0', 'TYPE_1', 'TYPE_2', 'TYPE_3'].includes(raw.grammarFormat)) {
    def.grammarFormat = raw.grammarFormat as GrammarFormat
  }
  if (typeof raw.parserAlgorithm === 'string') def.parserAlgorithm = raw.parserAlgorithm
  if (typeof raw.parserInput === 'string') def.parserInput = raw.parserInput
  if (raw.activeViewMode === 'table' || raw.activeViewMode === 'automaton') {
    def.activeViewMode = raw.activeViewMode
  }
  if (typeof raw.grammarDerivationInput === 'string') {
    def.grammarDerivationInput = raw.grammarDerivationInput
  }
  if (typeof raw.grammarSamplerMaxLength === 'string') {
    def.grammarSamplerMaxLength = raw.grammarSamplerMaxLength
  }
  if (typeof raw.grammarSamplerMaxSteps === 'string') {
    def.grammarSamplerMaxSteps = raw.grammarSamplerMaxSteps
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
    def.stepLimit = Math.min(100_000, Math.floor(Number(raw.stepLimit)))
  }
  if (Number.isFinite(raw.tapeCount) && raw.tapeCount > 1) {
    if (raw.tapeCount > MAX_TAPE_COUNT) {
      throw new Error(`Failed to load project: Tape count cannot exceed ${MAX_TAPE_COUNT}.`)
    }
    def.tapeCount = Math.floor(Number(raw.tapeCount))
  }
  if (raw.type === 'MTM') {
    if (def.tapeCount !== undefined) {
      throw new Error('Failed to load project: A multi-track TM has one physical tape and cannot declare multiple tapes.')
    }
    if (Number.isFinite(raw.trackCount) && (raw.trackCount < 2 || raw.trackCount > MAX_TAPE_COUNT)) {
      throw new Error(`Failed to load project: Track count must be between 2 and ${MAX_TAPE_COUNT}.`)
    }
    def.trackCount = Number.isFinite(raw.trackCount) ? Math.floor(Number(raw.trackCount)) : 2
    if (Array.isArray(raw.trackAlphabets)) {
      def.trackAlphabets = raw.trackAlphabets
        .slice(0, def.trackCount)
        .map((alphabet: unknown) => Array.isArray(alphabet) ? alphabet.map(String) : [])
    }
    if (Array.isArray(raw.trackBlanks)) {
      def.trackBlanks = raw.trackBlanks
        .slice(0, def.trackCount)
        .map((blank: unknown) => String(blank).slice(0, 1) || '_')
    }
  }
  if (raw.type === 'TM' && Number.isFinite(raw.submachineDepthLimit)) {
    def.submachineDepthLimit = Math.min(
      MAX_SUBMACHINE_DEPTH,
      Math.max(1, Math.floor(Number(raw.submachineDepthLimit))),
    )
  }
  if (raw.type === 'TM' && raw.submachines && typeof raw.submachines === 'object' && !Array.isArray(raw.submachines)) {
    const entries = Object.entries(raw.submachines)
    if (entries.length > MAX_SUBMACHINES_PER_MACHINE) {
      throw new Error(`Failed to load project: A machine can own at most ${MAX_SUBMACHINES_PER_MACHINE} submachines.`)
    }
    const submachines: Record<string, MachineDefinition> = {}
    for (const [id, child] of entries) {
      if (!id.trim() || !child || typeof child !== 'object' || Array.isArray(child)) continue
      try {
        const definition = parseMachineJson(JSON.stringify(child), nestingDepth + 1)
        // Hierarchical execution shares the caller's existing tape runtime; only
        // ordinary deterministic TMs can make that contract without conversion.
        if (definition.type === 'TM') submachines[id.trim()] = definition
      } catch {
        // Retain any transition's id reference. The validator/editor can then
        // expose it as an unresolved, repairable call instead of crashing load.
      }
    }
    if (Object.keys(submachines).length > 0) def.submachines = submachines
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
    if (transIds.has(t.id)) throw new Error(`Failed to load project: Duplicate transition ID detected (${t.id}).`)
    transIds.add(t.id)
    if (!stateIds.has(t.from)) {
      throw new Error(`Failed to load project: Missing transition source state ${t.from}.`)
    }
    if (!stateIds.has(t.to)) {
      throw new Error(`Failed to load project: Missing transition target state ${t.to}.`)
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
export async function saveMachine(machine: MachineDefinition, options?: { grammarOnly?: boolean }): Promise<string | null> {
  const grammarOnly = options?.grammarOnly ?? false;
  
  // Inject metadata for future migrations
  const toSave = toPersistedMachine(machine)
  
  const contentToWrite = grammarOnly ? (machine.grammarText || '') : JSON.stringify(toSave, null, 2);
  const extension = grammarOnly ? '.txt' : FILE_EXTENSION;
  const defaultName = `${machine.name.replace(/\s+/g, '_')}${extension}`

  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({
        defaultPath: defaultName,
        filters: grammarOnly ? [{
          name: 'Grammar File',
          extensions: ['txt']
        }] : [{
          name: 'AutomataLab Machine',
          extensions: ['autolab.json', 'json']
        }]
      })
      if (path) {
        await writeTextFile(path, contentToWrite)
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
    const mime = grammarOnly ? 'text/plain' : MIME_TYPE
    const blob = new Blob([contentToWrite], { type: mime })
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
export async function saveMachineToPath(machine: MachineDefinition, path: string, options?: { grammarOnly?: boolean }): Promise<string> {
  if (!isTauri()) {
    throw new Error('Saving to a path is only supported in the desktop app')
  }
  const grammarOnly = options?.grammarOnly ?? false;
  const contentToWrite = grammarOnly ? (machine.grammarText || '') : JSON.stringify(toPersistedMachine(machine), null, 2);
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, contentToWrite)
    addRecentFile(path, machine.name)
    return path
  } catch (err) {
    console.error('Failed to save file:', err)
    throw new Error('Failed to save file')
  }
}

/** Open file picker and parse a .autolab.json file, or a .txt file for grammar input. */
export async function loadMachine(options?: { grammarOnly?: boolean }): Promise<LoadedMachine> {
  const grammarOnly = options?.grammarOnly ?? false;
  
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({
      multiple: false,
      filters: grammarOnly ? [{
        name: 'Grammar File',
        extensions: ['txt']
      }] : [{
        name: 'AutomataLab Machine',
        extensions: ['autolab.json', 'json', 'jff']
      }]
    })

    if (!path) {
      throw new Error('No file selected')
    }

    const filePath = Array.isArray(path) ? path[0] : path
    const content = await readTextFile(filePath)
    
    let def: MachineDefinition;
    if (grammarOnly) {
      def = {
        id: generateId(),
        name: filePath.split(/[\\/]/).pop()?.replace('.txt', '') || 'Untitled Grammar',
        type: window.location.hash.includes('parser') ? 'CFG_PARSER' : 'CFG',
        states: [],
        transitions: [],
        grammarText: content,
        alphabet: [],
        language: ''
      }
    } else {
      const isJff = filePath.toLowerCase().endsWith('.jff')
      def = isJff ? parseJFLAP(content) : parseMachineJson(content)
      if (isJff) checkImportWarnings(def)
    }
    
    addRecentFile(filePath, def.name)
    return { def, path: filePath }
  } else {
    // Web fallback
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = grammarOnly ? '.txt' : '.json,.autolab.json,.jff'
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
            let def: MachineDefinition;
            if (grammarOnly) {
              def = {
                id: generateId(),
                name: file.name.replace('.txt', ''),
                type: window.location.hash.includes('parser') ? 'CFG_PARSER' : 'CFG',
                states: [],
                transitions: [],
                grammarText: content,
                alphabet: [],
                language: ''
              }
            } else {
              const isJff = file.name.toLowerCase().endsWith('.jff')
              def = isJff ? parseJFLAP(content) : parseMachineJson(content)
              if (isJff) checkImportWarnings(def)
            }
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

/** Open file picker to load a plain text file (.txt). Returns the string content and filename, or null if cancelled. */
export async function loadTextFile(options?: { title?: string; extensions?: string[] }): Promise<{ content: string; filename: string } | null> {
  const extensions = options?.extensions ?? ['txt']
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await open({
        multiple: false,
        title: options?.title ?? 'Open Text File',
        filters: [{
          name: 'Text File',
          extensions,
        }],
      })
      if (!path) return null
      const filePath = Array.isArray(path) ? path[0] : path
      const content = await readTextFile(filePath)
      const filename = filePath.split(/[\\/]/).pop() || 'file.txt'
      return { content, filename }
    } catch (err) {
      console.error('Failed to read text file:', err)
      return null
    }
  } else {
    // Web fallback
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = extensions.map((e) => `.${e}`).join(',')
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = (e.target?.result as string) || ''
          resolve({ content, filename: file.name })
        }
        reader.onerror = () => resolve(null)
        reader.readAsText(file)
      }
      input.oncancel = () => resolve(null)
      input.click()
    })
  }
}

/** Export machine as plain JSON string (for clipboard or other uses) */
export function exportMachineJSON(machine: MachineDefinition): string {
  return JSON.stringify(toPersistedMachine(machine), null, 2)
}

/** Add the stable file metadata without changing the in-memory machine object. */
function toPersistedMachine(machine: MachineDefinition): Record<string, unknown> {
  return {
    ...machine,
    ...(machine.submachines ? {
      submachines: Object.fromEntries(
        Object.entries(machine.submachines).map(([id, child]) => [id, toPersistedMachine(child)]),
      ),
    } : {}),
    version: AUTOMATALAB_FILE_FORMAT_VERSION,
    workspaceType: getWorkspaceForMachineType(machine.type),
  }
}
