// ============================================================
// File Manager — Save / Load machine definitions as JSON
// ============================================================

import type { MachineDefinition } from '@/engines/core/types'
import { generateId } from '@/engines/core/utils'
import { isTauri } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

const FILE_EXTENSION = '.autolab.json'
const MIME_TYPE = 'application/json'

function parseMachineJson(jsonString: string): MachineDefinition {
  const raw = JSON.parse(jsonString)
  // Minimal validation
  if (!raw.states || !raw.transitions || !raw.type) {
    throw new Error('Invalid machine file: missing required fields')
  }
  
  if (!['DFA', 'NFA', 'ENFA'].includes(raw.type)) {
    throw new Error('Invalid machine file: unknown machine type')
  }

  // Ensure unique id on load, and prevent prototype pollution / injection
  // by explicitly picking only the expected fields.
  return {
    id: generateId('machine'),
    name: raw.name ?? 'Imported Machine',
    type: raw.type,
    language: raw.language ?? '',
    states: Array.isArray(raw.states) ? raw.states : [],
    transitions: Array.isArray(raw.transitions) ? raw.transitions : [],
    alphabet: Array.isArray(raw.alphabet) ? raw.alphabet : [],
  }
}

/** Serialize and save machine as .autolab.json */
export async function saveMachine(machine: MachineDefinition): Promise<void> {
  const json = JSON.stringify(machine, null, 2)
  const defaultName = `${machine.name.replace(/\s+/g, '_')}${FILE_EXTENSION}`

  if (isTauri()) {
    try {
      const path = await save({
        defaultPath: defaultName,
        filters: [{
          name: 'AutomataLab Machine',
          extensions: ['autolab.json', 'json']
        }]
      })
      if (path) {
        await writeTextFile(path, json)
      }
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
  }
}

/** Open file picker and parse a .autolab.json file */
export async function loadMachine(): Promise<MachineDefinition> {
  if (isTauri()) {
    const path = await open({
      multiple: false,
      filters: [{
        name: 'AutomataLab Machine',
        extensions: ['autolab.json', 'json']
      }]
    })

    if (!path) {
      throw new Error('No file selected')
    }

    const filePath = Array.isArray(path) ? path[0] : path
    const content = await readTextFile(filePath)
    return parseMachineJson(content)
  } else {
    // Web fallback
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.autolab.json'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            resolve(parseMachineJson(e.target?.result as string))
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

/** Export machine as plain JSON string (for clipboard or other uses) */
export function exportMachineJSON(machine: MachineDefinition): string {
  return JSON.stringify(machine, null, 2)
}
