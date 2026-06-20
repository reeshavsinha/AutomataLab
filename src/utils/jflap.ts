// ============================================================
// JFLAP XML Parser and Exporter
// Handles import/export of .jff files to ensure compatibility
// with JFLAP's broad automata library.
// ============================================================

import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/core/types'
import { generateId, isEpsilon, EPSILON, isPDAType, isTMType } from '@/engines/core/utils'
import type { TapeDir } from '@/engines/core/utils'

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
  let type: MachineType
  if (jflapType === 'fa') type = 'NFA'
  else if (jflapType === 'pda') type = 'NPDA'
  else if (jflapType === 'turing') type = 'TM'
  else throw new Error(`Unsupported JFLAP type: ${jflapType}`)

  const tapesNode = structure.querySelector('tapes')
  const tapeCount = tapesNode && tapesNode.textContent ? parseInt(tapesNode.textContent, 10) : 1
  if (tapeCount > 4) {
    throw new Error('Invalid JFLAP file: AutomataLab supports a maximum of 4 tapes.')
  }

  const automaton = structure.querySelector('automaton')
  if (!automaton) {
    throw new Error('Invalid JFLAP file: Missing <automaton>')
  }

  const states: AutomataState[] = []
  const transitions: Transition[] = []

  // Parse states
  const stateNodes = Array.from(automaton.querySelectorAll('state'))
  for (const node of stateNodes) {
    const id = node.getAttribute('id') || generateId('state')
    const name = node.getAttribute('name') || `q${id}`
    const x = parseFloat(getChildText(node, 'x') || '0')
    const y = parseFloat(getChildText(node, 'y') || '0')
    const isStart = Array.from(node.children).some(c => c.tagName === 'initial')
    const isAccept = Array.from(node.children).some(c => c.tagName === 'final')

    states.push({ id, label: name, x, y, isStart, isAccept })
  }

  // Parse transitions
  const transitionNodes = Array.from(automaton.querySelectorAll('transition'))
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

    if (type === 'NFA') {
      const read = getChildText(node, 'read')
      // JFLAP uses empty tags <read/> for epsilon
      t.symbols = [read === null || read === '' ? EPSILON : read]
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
  const stackAlphabet = new Set<string>()
  const tapeAlphabet = new Set<string>()

  for (const t of transitions) {
    if (type === 'NFA') {
      t.symbols.forEach((s) => {
        if (!isEpsilon(s)) alphabet.add(s)
      })
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

  if (tapeCount > 1) {
    def.tapeCount = tapeCount
  }

  return def
}

export function exportJFLAP(machine: MachineDefinition): string {
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
