// ============================================================
// File Manager — Save / Load machine definitions as JSON
// ============================================================

import type { MachineDefinition } from '@/engines/core/types'
import { generateId } from '@/engines/core/utils'

const FILE_EXTENSION = '.autolab.json'
const MIME_TYPE = 'application/json'

/** Serialize and download machine as .autolab.json */
export function saveMachine(machine: MachineDefinition): void {
  const json = JSON.stringify(machine, null, 2)
  const blob = new Blob([json], { type: MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${machine.name.replace(/\s+/g, '_')}${FILE_EXTENSION}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Open file picker and parse a .autolab.json file */
export function loadMachine(): Promise<MachineDefinition> {
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
          const raw = JSON.parse(e.target?.result as string)
          // Minimal validation
          if (!raw.states || !raw.transitions || !raw.type) {
            reject(new Error('Invalid machine file: missing required fields'))
            return
          }
          
          if (!['DFA', 'NFA', 'ENFA'].includes(raw.type)) {
            reject(new Error('Invalid machine file: unknown machine type'))
            return
          }

          // Ensure unique id on load, and prevent prototype pollution / injection
          // by explicitly picking only the expected fields.
          const machine: MachineDefinition = {
            id: generateId('machine'),
            name: raw.name ?? 'Imported Machine',
            type: raw.type,
            language: raw.language ?? '',
            states: Array.isArray(raw.states) ? raw.states : [],
            transitions: Array.isArray(raw.transitions) ? raw.transitions : [],
            alphabet: Array.isArray(raw.alphabet) ? raw.alphabet : [],
          }
          resolve(machine)
        } catch {
          reject(new Error('Failed to parse machine file'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}

/** Export machine as plain JSON string (for clipboard or other uses) */
export function exportMachineJSON(machine: MachineDefinition): string {
  return JSON.stringify(machine, null, 2)
}
