import { describe, it, expect } from 'vitest'
import { parseJFLAP, exportJFLAP } from './jflap'

describe('JFLAP Parser and Exporter', () => {
  it('parses a basic JFLAP FA and exports it back', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!--Created with JFLAP 7.1.--><structure>
	<type>fa</type>
	<automaton>
		<!--The list of states.-->
		<state id="0" name="q0">
			<x>116.0</x>
			<y>133.0</y>
			<initial/>
		</state>
		<state id="1" name="q1">
			<x>260.0</x>
			<y>133.0</y>
			<final/>
		</state>
		<!--The list of transitions.-->
		<transition>
			<from>0</from>
			<to>1</to>
			<read>a</read>
		</transition>
    <transition>
			<from>1</from>
			<to>1</to>
			<read/>
		</transition>
	</automaton>
</structure>`

    const machine = parseJFLAP(xml)
    expect(machine.type).toBe('NFA')
    expect(machine.states).toHaveLength(2)
    expect(machine.states[0].isStart).toBe(true)
    expect(machine.states[1].isAccept).toBe(true)
    expect(machine.transitions).toHaveLength(2)

    // Check transition merging logic (same from/to pairs)
    // Here we have 0->1(a) and 1->1(eps)
    const t1 = machine.transitions.find(t => t.from === '0' && t.to === '1')
    expect(t1?.symbols).toContain('a')

    const t2 = machine.transitions.find(t => t.from === '1' && t.to === '1')
    expect(t2?.symbols).toContain('ε')

    // Export back
    const exportedXml = exportJFLAP(machine)
    expect(exportedXml).toContain('<type>fa</type>')
    expect(exportedXml).toContain('<initial/>')
    expect(exportedXml).toContain('<final/>')
    expect(exportedXml).toContain('<read>a</read>')
    expect(exportedXml).toContain('<read/>')
  })

  it('parses a basic PDA', () => {
    const xml = `<structure>
      <type>pda</type>
      <automaton>
        <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
        <transition>
          <from>0</from><to>0</to>
          <read>a</read><pop/><push>A</push>
        </transition>
      </automaton>
    </structure>`

    const machine = parseJFLAP(xml)
    expect(machine.type).toBe('NPDA')
    expect(machine.transitions[0].read).toBe('a')
    expect(machine.transitions[0].pop).toBe('ε')
    expect(machine.transitions[0].push).toBe('A')

    const exportedXml = exportJFLAP(machine)
    expect(exportedXml).toContain('<type>pda</type>')
    expect(exportedXml).toContain('<read>a</read>')
    expect(exportedXml).toContain('<pop/>')
    expect(exportedXml).toContain('<push>A</push>')
  })

  it('parses a JFLAP Mealy machine and infers its alphabets', () => {
    const xml = `<structure>
      <type>mealy</type>
      <automaton>
        <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
        <state id="1" name="q1"><x>100</x><y>0</y><final/></state>
        <transition>
          <from>0</from><to>1</to>
          <read>0</read><transout>1</transout>
        </transition>
        <transition>
          <from>1</from><to>0</to>
          <read>1</read><transout>0</transout>
        </transition>
      </automaton>
    </structure>`

    const machine = parseJFLAP(xml)

    expect(machine.type).toBe('MEALY')
    expect(machine.alphabet).toEqual(['0', '1'])
    expect(machine.outputAlphabet).toEqual(['0', '1'])
    expect(machine.states[1].isAccept).toBe(false)
    expect(machine.transitions).toMatchObject([
      { from: '0', to: '1', symbols: ['0'], output: '1' },
      { from: '1', to: '0', symbols: ['1'], output: '0' },
    ])
  })

  it('parses a JFLAP Moore machine with state outputs', () => {
    const xml = `<structure>
      <type>moore</type>
      <automaton>
        <state id="0" name="q0">
          <x>0</x><y>0</y><initial/><output>0</output>
        </state>
        <state id="1" name="q1">
          <x>100</x><y>0</y><final/><output>1</output>
        </state>
        <transition>
          <from>0</from><to>1</to>
          <read>0</read><transout>1</transout>
        </transition>
        <transition>
          <from>1</from><to>0</to>
          <read>1</read><transout>0</transout>
        </transition>
      </automaton>
    </structure>`

    const machine = parseJFLAP(xml)

    expect(machine.type).toBe('MOORE')
    expect(machine.alphabet).toEqual(['0', '1'])
    expect(machine.outputAlphabet).toEqual(['0', '1'])
    expect(machine.states.map((state) => state.output)).toEqual(['0', '1'])
    expect(machine.states[1].isAccept).toBe(false)
    expect(machine.transitions[0]).toMatchObject({ symbols: ['0'] })
    expect(machine.transitions[0].output).toBeUndefined()
  })

  it.each(['ε', 'eps', 'epsilon', 'λ', 'lambda', ''])(
    'normalizes Mealy epsilon/lambda output "%s" to no output',
    (output) => {
      const outputNode = output ? `<transout>${output}</transout>` : '<transout/>'
      const xml = `<structure>
        <type>mealy</type>
        <automaton>
          <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
          <transition>
            <from>0</from><to>0</to><read>a</read>${outputNode}
          </transition>
        </automaton>
      </structure>`

      const machine = parseJFLAP(xml)

      expect(machine.transitions[0].output).toBe('')
      expect(machine.outputAlphabet).toBeUndefined()
    },
  )

  it.each(['ε', 'eps', 'epsilon', 'λ', 'lambda', ''])(
    'normalizes Moore epsilon/lambda state output "%s" to no output',
    (output) => {
      const outputNode = output ? `<output>${output}</output>` : '<output/>'
      const xml = `<structure>
        <type>moore</type>
        <automaton>
          <state id="0" name="q0"><x>0</x><y>0</y><initial/>${outputNode}</state>
          <transition><from>0</from><to>0</to><read>a</read></transition>
        </automaton>
      </structure>`

      const machine = parseJFLAP(xml)

      expect(machine.states[0].output).toBe('')
      expect(machine.outputAlphabet).toBeUndefined()
    },
  )

  it('parses a multi-tape TM', () => {
    const xml = `<structure>
      <type>turing</type>
      <tapes>2</tapes>
      <automaton>
        <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
        <transition>
          <from>0</from><to>0</to>
          <read tape="1">a</read>
          <write tape="1">b</write>
          <move tape="1">R</move>
          <read tape="2"/>
          <write tape="2">c</write>
          <move tape="2">L</move>
        </transition>
      </automaton>
    </structure>`

    const machine = parseJFLAP(xml)
    expect(machine.type).toBe('TM')
    expect(machine.tapeCount).toBe(2)
    expect(machine.transitions[0].reads).toEqual(['a', ''])
    expect(machine.transitions[0].writes).toEqual(['b', 'c'])
    expect(machine.transitions[0].directions).toEqual(['R', 'L'])

    const exportedXml = exportJFLAP(machine)
    expect(exportedXml).toContain('<type>turing</type>')
    expect(exportedXml).toContain('<tapes>2</tapes>')
    expect(exportedXml).toContain('<read>a</read>')
    expect(exportedXml).toContain('<read tape="2"/>')
  })

  it.each(['abc', '-1', '0', '5'])('rejects invalid tape count %s cleanly', (count) => {
    const xml = `<structure>
      <type>turing</type>
      <tapes>${count}</tapes>
      <automaton>
        <state id="0" name="q0"><x>0</x><y>0</y><initial/></state>
        <transition><from>0</from><to>0</to><read/><write/><move>S</move></transition>
      </automaton>
    </structure>`

    expect(() => parseJFLAP(xml)).toThrow(/Invalid JFLAP file: tape count/)
  })

  it('normalizes non-numeric state coordinates to zero', () => {
    const xml = `<structure>
      <type>fa</type>
      <automaton>
        <state id="0" name="q0"><x>not-a-number</x><y>∞</y><initial/></state>
      </automaton>
    </structure>`

    const machine = parseJFLAP(xml)
    expect(machine.states[0]).toMatchObject({ x: 0, y: 0 })
  })
})
