// ============================================================
// JFLAP XML Parser and Exporter
// Handles import/export of .jff files to ensure compatibility
// with JFLAP's broad automata library.
// ============================================================

import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/machine/core/types'
import { generateId, isEpsilon, EPSILON, isPDAType, isTMType, isTransducerType, normalizeTransducerOutput } from '@/engines/machine/core/utils'
import type { TapeDir } from '@/engines/machine/core/utils'

const MAX_JFLAP_BYTES = 10 * 1024 * 1024
const MAX_JFLAP_STATES = 5_000
const MAX_JFLAP_TRANSITIONS = 20_000

function getChildText(parent: Element, tagName: string): string | null {
  const child = Array.from(parent.children).find((c) => c.tagName === tagName)
  return child ? child.textContent || '' : null
}

function getChildTextsByTape(parent: Element, tagName: string, tapeCount: number): string[] {
  const children = Array.from(parent.children).filter((c) => c.tagName === tagName)
  const result: string[] = Array(tapeCount).fill('')
  if (children.length === 0) return result

  if (tapeCount === 1) {
    result[0] = children[0].textContent || ''
    return result
  }

  for (const child of children) {
    const tapeAttr = child.getAttribute('tape')
    const idx = tapeAttr ? parseInt(tapeAttr, 10) - 1 : 0
    if (idx >= 0 && idx < tapeCount) {
      result[idx] = child.textContent || ''
    }
  }
  return result
}

export function parseJFLAP(xmlString: string): MachineDefinition {
  if (xmlString.length > MAX_JFLAP_BYTES) {
    throw new Error('Invalid JFLAP file: File is larger than 10 MB.')
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid JFLAP file: XML parsing failed')
  }

  const structure = doc.documentElement
  if (structure.tagName !== 'structure') {
    throw new Error('Invalid JFLAP file: Missing <structure> root element')
  }

  const typeNode = structure.querySelector('type')
  if (!typeNode || !typeNode.textContent) {
    throw new Error('Invalid JFLAP file: Missing <type>')
  }

  const jflapType = typeNode.textContent.trim()
  const normalizedJflapType = jflapType.toLowerCase()
  let type: MachineType
  if (normalizedJflapType === 'fa') type = 'NFA'
  else if (normalizedJflapType === 'mealy') type = 'MEALY'
  else if (normalizedJflapType === 'moore') type = 'MOORE'
  else if (normalizedJflapType === 'pda') type = 'NPDA'
  else if (normalizedJflapType === 'turing') type = 'TM'
  else throw new Error(`Unsupported JFLAP type: ${jflapType}`)

  const tapesNode = structure.querySelector('tapes')
  const tapeCount = tapesNode && tapesNode.textContent ? parseInt(tapesNode.textContent, 10) : 1
  if (!Number.isInteger(tapeCount) || tapeCount < 1 || tapeCount > 4) {
    throw new Error('Invalid JFLAP file: tape count must be an integer from 1 to 4.')
  }

  const automaton = structure.querySelector('automaton')
  if (!automaton) {
    throw new Error('Invalid JFLAP file: Missing <automaton>')
  }

  const states: AutomataState[] = []
  const transitions: Transition[] = []

  // Parse states
  const stateNodes = Array.from(automaton.querySelectorAll('state'))
  if (stateNodes.length > MAX_JFLAP_STATES) {
    throw new Error(`Invalid JFLAP file: More than ${MAX_JFLAP_STATES.toLocaleString()} states.`)
  }
  for (const node of stateNodes) {
    const id = node.getAttribute('id') || generateId('state')
    const name = node.getAttribute('name') || `q${id}`
    const rawX = parseFloat(getChildText(node, 'x') || '0')
    const rawY = parseFloat(getChildText(node, 'y') || '0')
    const x = Number.isFinite(rawX) ? rawX : 0
    const y = Number.isFinite(rawY) ? rawY : 0
    const isStart = Array.from(node.children).some(c => c.tagName === 'initial')
    const isAccept = !isTransducerType(type) && Array.from(node.children).some(c => c.tagName === 'final')

    const state: AutomataState = { id, label: name, x, y, isStart, isAccept }
    if (type === 'MOORE') {
      state.output = normalizeTransducerOutput(getChildText(node, 'output'))
    }
    states.push(state)
  }

  // Parse transitions
  const transitionNodes = Array.from(automaton.querySelectorAll('transition'))
  if (transitionNodes.length > MAX_JFLAP_TRANSITIONS) {
    throw new Error(`Invalid JFLAP file: More than ${MAX_JFLAP_TRANSITIONS.toLocaleString()} transitions.`)
  }
  for (const node of transitionNodes) {
    const from = getChildText(node, 'from')
    const to = getChildText(node, 'to')
    if (!from || !to) continue

    const t: Transition = {
      id: generateId('trans'),
      from,
      to,
      symbols: []
    }

    if (type === 'NFA' || isTransducerType(type)) {
      const read = getChildText(node, 'read')
      // JFLAP uses empty tags <read/> for epsilon
      t.symbols = [read === null || read === '' ? EPSILON : read]
      if (type === 'MEALY') {
        // JFLAP stores Mealy output separately from the input label.
        t.output = normalizeTransducerOutput(getChildText(node, 'transout'))
      }
    } else if (type === 'NPDA') {
      const read = getChildText(node, 'read')
      const pop = getChildText(node, 'pop')
      const push = getChildText(node, 'push')
      t.read = read === null || read === '' ? EPSILON : read
      t.pop = pop === null || pop === '' ? EPSILON : pop
      t.push = push === null || push === '' ? EPSILON : push
    } else if (type === 'TM') {
      const reads = getChildTextsByTape(node, 'read', tapeCount)
      const writes = getChildTextsByTape(node, 'write', tapeCount)
      const moves = getChildTextsByTape(node, 'move', tapeCount)

      if (tapeCount === 1) {
        t.read = reads[0]
        t.write = writes[0]
        t.direction = (moves[0] === 'L' || moves[0] === 'R' || moves[0] === 'S' ? moves[0] : 'S') as TapeDir
      } else {
        t.reads = reads
        t.writes = writes
        t.directions = moves.map(m => (m === 'L' || m === 'R' || m === 'S' ? m : 'S') as TapeDir)
      }
    }

    // Attempt to merge identical from/to transitions for FA to keep the graph cleaner
    if (type === 'NFA') {
      const existing = transitions.find(tr => tr.from === t.from && tr.to === t.to)
      if (existing) {
        existing.symbols.push(...t.symbols)
        // Ensure no duplicate symbols
        existing.symbols = Array.from(new Set(existing.symbols))
        continue
      }
    }

    transitions.push(t)
  }

  const alphabet = new Set<string>()
  const outputAlphabet = new Set<string>()
  const stackAlphabet = new Set<string>()
  const tapeAlphabet = new Set<string>()

  for (const t of transitions) {
    if (type === 'NFA' || isTransducerType(type)) {
      t.symbols.forEach((s) => {
        if (!isEpsilon(s)) alphabet.add(s)
      })
      if (type === 'MEALY' && t.output) outputAlphabet.add(t.output)
    } else if (type === 'NPDA') {
      if (t.read && !isEpsilon(t.read)) alphabet.add(t.read)
      if (t.pop && !isEpsilon(t.pop)) stackAlphabet.add(t.pop)
      if (t.push && !isEpsilon(t.push)) stackAlphabet.add(t.push)
    } else if (type === 'TM') {
      const reads = tapeCount > 1 ? t.reads! : [t.read!]
      const writes = tapeCount > 1 ? t.writes! : [t.write!]
      reads.forEach((s) => {
        if (s !== '') {
          alphabet.add(s)
          tapeAlphabet.add(s)
        }
      })
      writes.forEach((s) => {
        if (s !== '') tapeAlphabet.add(s)
      })
    }
  }
  if (type === 'MOORE') {
    states.forEach((state) => {
      if (state.output) outputAlphabet.add(state.output)
    })
  }

  const def: MachineDefinition = {
    id: generateId('machine'),
    name: 'Imported JFLAP Machine',
    type,
    language: '',
    states,
    transitions,
    alphabet: Array.from(alphabet).sort(),
  }

  if (type === 'NPDA' && stackAlphabet.size > 0) {
    def.stackAlphabet = Array.from(stackAlphabet).sort()
  }
  if (type === 'TM' && tapeAlphabet.size > 0) {
    def.tapeAlphabet = Array.from(tapeAlphabet).sort()
  }
  if (isTransducerType(type) && outputAlphabet.size > 0) {
    def.outputAlphabet = Array.from(outputAlphabet).sort()
  }

  if (tapeCount > 1) {
    def.tapeCount = tapeCount
  }

  // Phase 2 Validation
  const stateIds = new Set<string>()
  let startStateCount = 0
  for (const s of def.states) {
    if (stateIds.has(s.id)) throw new Error('Invalid JFLAP file: duplicate state IDs detected')
    stateIds.add(s.id)
    if (s.isStart) startStateCount++
  }

  if (def.states.length > 0 && startStateCount !== 1) {
    throw new Error('Invalid JFLAP file: machine must have exactly one start state')
  }

  const transIds = new Set<string>()
  for (const t of def.transitions) {
    if (transIds.has(t.id)) throw new Error('Invalid JFLAP file: duplicate transition IDs detected')
    transIds.add(t.id)
    if (!stateIds.has(t.from) || !stateIds.has(t.to)) {
      throw new Error('Invalid JFLAP file: transition references a nonexistent state')
    }
  }

  return def
}

export function exportJFLAP(machine: MachineDefinition): string {
  if (machine.transitions.some((transition) => transition.submachineId)) {
    throw new Error('JFLAP export is unavailable for hierarchical TMs because it cannot represent embedded submachine calls.')
  }
  if (machine.type === 'MTM') {
    throw new Error('JFLAP export is unavailable for multi-track TMs because its portable format represents independent tapes, not vector-valued cells.')
  }
  if (isTransducerType(machine.type)) {
    throw new Error('JFLAP does not define a portable Mealy/Moore output format.')
  }
  const doc = document.implementation.createDocument(null, 'structure')
  const structure = doc.documentElement

  const typeNode = doc.createElement('type')
  let jflapType = 'fa'
  if (isPDAType(machine.type)) jflapType = 'pda'
  else if (isTMType(machine.type)) jflapType = 'turing'
  typeNode.textContent = jflapType
  structure.appendChild(typeNode)

  const automaton = doc.createElement('automaton')

  // Export states
  for (const s of machine.states) {
    if (s.isText) continue // JFLAP does not support our text annotation nodes directly

    const stateNode = doc.createElement('state')
    stateNode.setAttribute('id', s.id)
    stateNode.setAttribute('name', s.label)

    const xNode = doc.createElement('x')
    xNode.textContent = s.x.toString()
    stateNode.appendChild(xNode)

    const yNode = doc.createElement('y')
    yNode.textContent = s.y.toString()
    stateNode.appendChild(yNode)

    if (s.isStart) {
      stateNode.appendChild(doc.createElement('initial'))
    }
    if (s.isAccept) {
      stateNode.appendChild(doc.createElement('final'))
    }

    automaton.appendChild(stateNode)
  }

  // Export transitions
  const createTapeNode = (tagName: string, value: string | undefined, tapeIdx?: number) => {
    const node = doc.createElement(tagName)
    if (tapeIdx !== undefined && tapeIdx > 0) {
      node.setAttribute('tape', (tapeIdx + 1).toString())
    }
    // Convert epsilon back to empty string for JFLAP
    if (value && !isEpsilon(value)) {
      node.textContent = value
    }
    return node
  }

  for (const t of machine.transitions) {
    // If it's an FA, a single transition edge might contain multiple symbols.
    // In JFLAP, each symbol is its own <transition> block.
    if (jflapType === 'fa') {
      for (const sym of t.symbols) {
        const trNode = doc.createElement('transition')

        const fromNode = doc.createElement('from')
        fromNode.textContent = t.from
        trNode.appendChild(fromNode)

        const toNode = doc.createElement('to')
        toNode.textContent = t.to
        trNode.appendChild(toNode)

        trNode.appendChild(createTapeNode('read', sym))
        automaton.appendChild(trNode)
      }
    } else if (jflapType === 'pda') {
      const trNode = doc.createElement('transition')

      const fromNode = doc.createElement('from')
      fromNode.textContent = t.from
      trNode.appendChild(fromNode)

      const toNode = doc.createElement('to')
      toNode.textContent = t.to
      trNode.appendChild(toNode)

      trNode.appendChild(createTapeNode('read', t.read))
      trNode.appendChild(createTapeNode('pop', t.pop))
      trNode.appendChild(createTapeNode('push', t.push))
      automaton.appendChild(trNode)
    } else if (jflapType === 'turing') {
      const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
      const trNode = doc.createElement('transition')

      const fromNode = doc.createElement('from')
      fromNode.textContent = t.from
      trNode.appendChild(fromNode)

      const toNode = doc.createElement('to')
      toNode.textContent = t.to
      trNode.appendChild(toNode)

      for (let i = 0; i < tapeCount; i++) {
        const readVal = (tapeCount > 1 ? t.reads?.[i] : t.read) ?? ''
        const writeVal = (tapeCount > 1 ? t.writes?.[i] : t.write) ?? ''
        const dirVal = (tapeCount > 1 ? t.directions?.[i] : t.direction) ?? 'S'

        trNode.appendChild(createTapeNode('read', readVal, tapeCount > 1 ? i : undefined))
        trNode.appendChild(createTapeNode('write', writeVal, tapeCount > 1 ? i : undefined))
        trNode.appendChild(createTapeNode('move', dirVal, tapeCount > 1 ? i : undefined))
      }
      automaton.appendChild(trNode)
    }
  }

  structure.appendChild(automaton)

  // Append <tapes> tag if multi-tape
  const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
  if (jflapType === 'turing' && tapeCount > 1) {
    const tapesNode = doc.createElement('tapes')
    tapesNode.textContent = tapeCount.toString()
    structure.insertBefore(tapesNode, automaton)
  }

  // Prepend xml declaration
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(doc)
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!--Created with AutomataLab-->\n${xmlString}`
}
