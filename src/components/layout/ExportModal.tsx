// ============================================================
// ExportModal — data-out for researchers/instructors (UX audit #7).
// Exports the δ-table (CSV / LaTeX), the execution trace (CSV / JSON), the
// computation tree (JSON), and the full machine (JSON). Trace/tree light up once
// a simulation has produced data.
// ============================================================

import React, { useMemo } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useGrammarStore } from '@/store/grammarStore'
import { useParserStore } from '@/store/parserStore'
import { useUIStore } from '@/store/uiStore'
import { supportsComputationTree } from '@/engines/machine/core/utils'
import { exportMachineJSON } from '@/utils/fileManager'
import JSZip from 'jszip'

const exportCounters = new Map<string, number>()
function getUniqueFilename(base: string, ext: string) {
  const count = exportCounters.get(base) || 0
  exportCounters.set(base, count + 1)
  if (count === 0) return `${base}.${ext}`
  return `${base} (${count}).${ext}`
}
import {
  deltaTableToCSV,
  deltaTableToLatex,
  traceToCSV,
  traceToJSON,
  treeToJSON,
  downloadText,
  downloadBlob,
  fileStem,
  firstFollowToCSV,
  ll1TableToCSV,
  lrTableToCSV,
} from '@/utils/exporters'
import { exportDiagramSVG, exportDiagramPNG, copyDiagramSVG, copyDiagramPNG, copyMachineJSON } from '@/utils/diagramExport'
import { exportJFLAP } from '@/utils/jflap'
import { toast } from '@/store/toastStore'
import Dialog from '@/components/common/Dialog'

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const { history, treeNodes, inputString } = useSimulationStore()
  const grammarAnalysis = useGrammarStore(s => s.analysis)
  const parserModel = useParserStore(s => s.model)
  const parserAlg = useParserStore(s => s.algorithm)
  const theme = useUIStore((s) => s.theme)

  const stem = fileStem(machine)
  const hasTrace = history.length > 0
  const hasTree = supportsComputationTree(machine.type) && treeNodes.length > 0
  
  const isGrammarTab = machine?.type === 'CFG' || machine?.type === 'CSG'
  const isParserTab = machine?.type === 'CFG_PARSER'
  const isGraphTab = !isGrammarTab && !isParserTab

  const isLRParser = isParserTab && ['LR0', 'SLR1', 'CLR1', 'LALR1'].includes(parserAlg);
  const isLL1Parser = isParserTab && parserAlg === 'LL1';
  const hasParserTable = isLRParser || isLL1Parser;

  const parserHasStates = React.useMemo(() => {
    if (!parserModel || !isLRParser) return false;
    if (parserAlg === 'LR0') return (parserModel.parsers.lr0.table?.states.length ?? 0) > 0;
    if (parserAlg === 'SLR1') return (parserModel.parsers.slr.table?.states.length ?? 0) > 0;
    if (parserAlg === 'CLR1') return (parserModel.parsers.clr.table?.states.length ?? 0) > 0;
    if (parserAlg === 'LALR1') return (parserModel.parsers.lalr.table?.states.length ?? 0) > 0;
    return false;
  }, [parserModel, parserAlg, isLRParser]);

  const parserSimulation = useParserStore(s => s.simulation)
  const parserHasTree = (parserSimulation?.history?.length ?? 0) > 0;

  const hasDiagram = isGraphTab 
    ? (machine?.states?.some((s) => !s.isText) ?? false)
    : parserHasStates;

  const save = async (content: string, name: string, ext: 'csv' | 'json' | 'tex' | 'jff' | 'txt') => {
    try {
      const out = await downloadText(name, content, ext)
      if (out) toast.success(`Exported ${name}`)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Export failed.')
    }
  }

  const saveDiagram = async (fn: () => Promise<string | null>, kind: string) => {
    try {
      const out = await fn()
      if (out) toast.success(`Exported ${kind}`)
    } catch (err) {
      console.error('Diagram export failed:', err)
      toast.error('Diagram export failed.')
    }
  }

  const copyDiagram = async (fn: () => Promise<void>, kind: string) => {
    try {
      await fn()
      toast.success(`Copied ${kind} to clipboard`)
    } catch (err) {
      console.error('Diagram copy failed:', err)
      toast.error('Failed to copy diagram.')
    }
  }

  const copyData = async (fn: () => Promise<void>, kind: string) => {
    try {
      await fn()
      toast.success(`Copied ${kind} to clipboard`)
    } catch (err) {
      console.error('Data copy failed:', err)
      toast.error('Failed to copy data.')
    }
  }

  const exportParserDiagram = async (format: 'svg' | 'png', copy: boolean) => {
    let canvas = document.querySelector('.automaton-viewer-pane .react-flow') as HTMLElement | null
    let switchedView = false
    const originalViewMode = machine?.activeViewMode || 'table'
    
    if (!canvas) {
      if (!machine) return
      useMachineStore.setState(s => {
        const tabs = [...s.tabs]
        tabs[s.activeTabIndex] = { ...tabs[s.activeTabIndex], activeViewMode: 'automaton' }
        return { tabs, machine: tabs[s.activeTabIndex] }
      })
      switchedView = true
      toast.info('Preparing graph...')
      await new Promise(r => setTimeout(r, 600)) // Wait for mount and render
      canvas = document.querySelector('.automaton-viewer-pane .react-flow') as HTMLElement | null
    }

    if (!canvas) {
      toast.error('Graph could not be rendered')
      if (switchedView && machine) {
        useMachineStore.setState(s => {
          const tabs = [...s.tabs]
          tabs[s.activeTabIndex] = { ...tabs[s.activeTabIndex], activeViewMode: originalViewMode as any }
          return { tabs, machine: tabs[s.activeTabIndex] }
        })
      }
      return
    }

    try {
      const { toSvg, toPng } = await import('html-to-image')
      const options = { backgroundColor: theme === 'dark' ? '#1e1e24' : '#ffffff', pixelRatio: 3 }
      if (format === 'png') {
        const dataUrl = await toPng(canvas, options)
        if (copy) {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast.success('Copied PNG to clipboard')
        } else {
          const base64 = dataUrl.split(',')[1]
          const binStr = atob(base64)
          const bytes = new Uint8Array(binStr.length)
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
          const filename = getUniqueFilename(`${stem}_${parserAlg.toLowerCase()}_graph`, 'png')
          const path = await downloadBlob(filename, bytes, 'png' as any)
          if (path) toast.success('Exported PNG')
        }
      } else {
        const dataUrl = await toSvg(canvas, options)
        const svgStr = decodeURIComponent(dataUrl.split(',')[1])
        if (copy) {
          await navigator.clipboard.writeText(svgStr)
          toast.success('Copied SVG to clipboard')
        } else {
          const filename = getUniqueFilename(`${stem}_${parserAlg.toLowerCase()}_graph`, 'svg')
          const path = await downloadText(filename, svgStr, 'svg')
          if (path) toast.success('Exported SVG')
        }
      }
    } catch (e) {
      console.error(e)
      toast.error(`Failed to export diagram`)
    } finally {
      if (switchedView && machine) {
        useMachineStore.setState(s => {
          const tabs = [...s.tabs]
          tabs[s.activeTabIndex] = { ...tabs[s.activeTabIndex], activeViewMode: originalViewMode as any }
          return { tabs, machine: tabs[s.activeTabIndex] }
        })
      }
    }
  }

  const exportParserTree = async (format: 'svg' | 'png', copy: boolean) => {
    const canvas = document.querySelector('.react-flow.syntax-tree-viewer') as HTMLElement | null
    if (!canvas) {
      toast.error('Tree is not visible')
      return
    }
    try {
      const { toSvg, toPng } = await import('html-to-image')
      const options = { backgroundColor: theme === 'dark' ? '#1e1e24' : '#ffffff', pixelRatio: 3 }
      if (format === 'png') {
        const dataUrl = await toPng(canvas, options)
        if (copy) {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast.success('Copied PNG to clipboard')
        } else {
          const base64 = dataUrl.split(',')[1]
          const binStr = atob(base64)
          const bytes = new Uint8Array(binStr.length)
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
          const filename = getUniqueFilename(`${stem}_${parserAlg.toLowerCase()}_tree`, 'png')
          const path = await downloadBlob(filename, bytes, 'png' as any)
          if (path) toast.success('Exported PNG')
        }
      } else {
        const dataUrl = await toSvg(canvas, options)
        const svgStr = decodeURIComponent(dataUrl.split(',')[1])
        if (copy) {
          await navigator.clipboard.writeText(svgStr)
          toast.success('Copied SVG to clipboard')
        } else {
          const filename = getUniqueFilename(`${stem}_${parserAlg.toLowerCase()}_tree`, 'svg')
          const path = await downloadText(filename, svgStr, 'svg')
          if (path) toast.success('Exported SVG')
        }
      }
    } catch (e) {
      console.error(e)
      toast.error(`Failed to export tree`)
    }
  }

  const exportZip = async () => {
    try {
      const zip = new JSZip()
      
      // Add Grammar
      if (machine?.grammarText) {
        zip.file(`${stem}.txt`, machine.grammarText)
      }
      
      // Add FIRST/FOLLOW
      const analysisToExport = isParserTab ? parserModel?.analysis : grammarAnalysis
      if (analysisToExport) {
        zip.file(`${stem}_first_follow.csv`, firstFollowToCSV(analysisToExport.firstSets, analysisToExport.followSets))
      }
      
      // Add Parser Table
      if (isParserTab && parserModel && hasParserTable) {
        if (isLL1Parser && parserModel.parsers.ll1.table) {
          zip.file(`${stem}_ll1_table.csv`, ll1TableToCSV(parserModel.parsers.ll1.table))
        } else if (parserAlg === 'LR0' && parserModel.parsers.lr0.table) {
          zip.file(`${stem}_lr0_table.csv`, lrTableToCSV(parserModel.parsers.lr0.table))
        } else if (parserAlg === 'SLR1' && parserModel.parsers.slr.table) {
          zip.file(`${stem}_slr1_table.csv`, lrTableToCSV(parserModel.parsers.slr.table))
        } else if (parserAlg === 'CLR1' && parserModel.parsers.clr.table) {
          zip.file(`${stem}_clr1_table.csv`, lrTableToCSV(parserModel.parsers.clr.table))
        } else if (parserAlg === 'LALR1' && parserModel.parsers.lalr.table) {
          zip.file(`${stem}_lalr1_table.csv`, lrTableToCSV(parserModel.parsers.lalr.table))
        }
      }
      
      // Add diagrams
      if (isGraphTab && hasDiagram && machine) {
        // Graph Studio: use pure SVG rendering
        const { renderFullSvg } = await import('@/utils/diagramExport')
        const { svg } = renderFullSvg(machine, theme === 'dark')
        zip.file(`${stem}_graph.svg`, svg)
      }

      if (isParserTab && hasDiagram) {
        // Parser Studio Graph
        let canvas = document.querySelector('.automaton-viewer-pane .react-flow') as HTMLElement | null
        let switchedView = false
        const originalViewMode = machine?.activeViewMode || 'table'
        if (!canvas) {
          useMachineStore.setState(s => {
            const tabs = [...s.tabs]
            tabs[s.activeTabIndex] = { ...tabs[s.activeTabIndex], activeViewMode: 'automaton' }
            return { tabs, machine: tabs[s.activeTabIndex] }
          })
          switchedView = true
          await new Promise(r => setTimeout(r, 600))
          canvas = document.querySelector('.automaton-viewer-pane .react-flow') as HTMLElement | null
        }
        
        if (canvas) {
          const { toPng } = await import('html-to-image')
          const dataUrl = await toPng(canvas, { backgroundColor: theme === 'dark' ? '#1e1e24' : '#ffffff', pixelRatio: 3 })
          const base64 = dataUrl.split(',')[1]
          zip.file(`${stem}_${parserAlg.toLowerCase()}_graph.png`, base64, { base64: true })
        }
        
        if (switchedView && machine) {
          useMachineStore.setState(s => {
            const tabs = [...s.tabs]
            tabs[s.activeTabIndex] = { ...tabs[s.activeTabIndex], activeViewMode: originalViewMode as any }
            return { tabs, machine: tabs[s.activeTabIndex] }
          })
        }
      }
      
      // Add parse tree
      if (isParserTab && parserHasTree) {
        const treeCanvas = document.querySelector('.react-flow.syntax-tree-viewer')
        if (treeCanvas) {
          const { toPng } = await import('html-to-image')
          const dataUrl = await toPng(treeCanvas as HTMLElement, { backgroundColor: theme === 'dark' ? '#1e1e24' : '#ffffff', pixelRatio: 3 })
          const base64 = dataUrl.split(',')[1]
          zip.file(`${stem}_${parserAlg.toLowerCase()}_tree.png`, base64, { base64: true })
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const filename = getUniqueFilename(`${stem}_export`, 'zip')
      const path = await downloadBlob(filename, content, 'zip')
      if (path) toast.success(`Exported complete zip package`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to create ZIP file')
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label="Export data"
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '90vw',
        maxWidth: '460px',
        maxHeight: '84vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Export data</div>
          <button
            onClick={onClose}
            aria-label="Close export dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '8px 0', overflow: 'auto' }}>
          
          {(isGrammarTab || isParserTab) && (
            <>
              <Section
                title="Grammar Artifacts"
                hint="Grammar rules and FIRST/FOLLOW sets."
              >
                <ExportButton 
                  label="Grammar Source (.txt)" 
                  onClick={() => save(machine.grammarText || '', `${stem}-grammar.txt`, 'txt')} 
                />
                <ExportButton 
                  label="FIRST/FOLLOW Table (CSV)" 
                  disabled={isParserTab ? !parserModel?.analysis : !grammarAnalysis} 
                  onClick={() => {
                    const analysisToExport = isParserTab ? parserModel?.analysis : grammarAnalysis;
                    if (analysisToExport) {
                      save(firstFollowToCSV(analysisToExport.firstSets, analysisToExport.followSets), `${stem}-first-follow.csv`, 'csv')
                    }
                  }} 
                />
              </Section>
            </>
          )}

          {isParserTab && (
            <>
              <Section
                title="Parser Artifacts"
                hint={hasParserTable ? "Parsing table and bundled ZIP." : "Bundled ZIP."}
              >
                {hasParserTable && (
                  <ExportButton label="Parser Table (CSV)" disabled={!parserModel} onClick={() => {
                    if (!parserModel) return
                    if (isLL1Parser && parserModel.parsers.ll1.table) save(ll1TableToCSV(parserModel.parsers.ll1.table), `${stem}-ll1.csv`, 'csv')
                    else if (parserAlg === 'LR0' && parserModel.parsers.lr0.table) save(lrTableToCSV(parserModel.parsers.lr0.table), `${stem}-lr0.csv`, 'csv')
                    else if (parserAlg === 'SLR1' && parserModel.parsers.slr.table) save(lrTableToCSV(parserModel.parsers.slr.table), `${stem}-slr1.csv`, 'csv')
                    else if (parserAlg === 'CLR1' && parserModel.parsers.clr.table) save(lrTableToCSV(parserModel.parsers.clr.table), `${stem}-clr1.csv`, 'csv')
                    else if (parserAlg === 'LALR1' && parserModel.parsers.lalr.table) save(lrTableToCSV(parserModel.parsers.lalr.table), `${stem}-lalr1.csv`, 'csv')
                  }} />
                )}
                <ExportButton label="Download ZIP Bundle" onClick={exportZip} />
              </Section>

              <Section
                title="Automaton Graph"
                hint={isLRParser ? (hasDiagram ? 'The automaton graph as a vector or image.' : 'No graph available.') : 'This parsing algorithm does not produce an automaton graph.'}
              >
                <ExportButton label="Download SVG" disabled={!isLRParser || !hasDiagram} onClick={() => exportParserDiagram('svg', false)} />
                <ExportButton label="Download PNG" disabled={!isLRParser || !hasDiagram} onClick={() => exportParserDiagram('png', false)} />
                <ExportButton label="Copy SVG" disabled={!isLRParser || !hasDiagram} onClick={() => exportParserDiagram('svg', true)} />
                <ExportButton label="Copy PNG" disabled={!isLRParser || !hasDiagram} onClick={() => exportParserDiagram('png', true)} />
              </Section>

              <Section
                title="Parse Tree"
                hint={parserHasTree ? "The visual syntax tree." : "No tree available. Run a simulation."}
              >
                <ExportButton label="Download SVG" disabled={!parserHasTree} onClick={() => exportParserTree('svg', false)} />
                <ExportButton label="Download PNG" disabled={!parserHasTree} onClick={() => exportParserTree('png', false)} />
                <ExportButton label="Copy SVG" disabled={!parserHasTree} onClick={() => exportParserTree('svg', true)} />
                <ExportButton label="Copy PNG" disabled={!parserHasTree} onClick={() => exportParserTree('png', true)} />
              </Section>
            </>
          )}

          {isGraphTab && (
            <Section
              title="Diagram"
              hint={hasDiagram ? 'The automaton graph as a vector or image.' : 'No graph available.'}
            >
              <ExportButton label="Download SVG" disabled={!hasDiagram} onClick={() => saveDiagram(() => exportDiagramSVG(machine, theme === 'dark'), 'diagram (SVG)')} />
              <ExportButton label="Download PNG" disabled={!hasDiagram} onClick={() => saveDiagram(() => exportDiagramPNG(machine, theme === 'dark'), 'diagram (PNG)')} />
              <ExportButton label="Copy SVG" disabled={!hasDiagram} onClick={() => copyDiagram(() => copyDiagramSVG(machine, theme === 'dark'), 'SVG')} />
              <ExportButton label="Copy PNG" disabled={!hasDiagram} onClick={() => copyDiagram(() => copyDiagramPNG(machine, theme === 'dark'), 'PNG')} />
            </Section>
          )}

          {isGraphTab && (
            <>
              <Section title="Transition table (δ)" hint="Every move, grouped by source state.">
                <ExportButton label="CSV" onClick={() => save(deltaTableToCSV(machine), `${stem}-delta.csv`, 'csv')} />
                <ExportButton label="LaTeX" onClick={() => save(deltaTableToLatex(machine), `${stem}-delta.tex`, 'tex')} />
              </Section>

              <Section
                title="Execution trace"
                hint={hasTrace ? `${history.length} step(s) from the last run.` : 'Run a simulation first.'}
              >
                <ExportButton label="CSV" disabled={!hasTrace} onClick={() => save(traceToCSV(machine, history), `${stem}-trace.csv`, 'csv')} />
                <ExportButton
                  label="JSON"
                  disabled={!hasTrace}
                  onClick={() => save(traceToJSON(machine, history, inputString), `${stem}-trace.json`, 'json')}
                />
              </Section>

              <Section
                title="Computation tree"
                hint={
                  supportsComputationTree(machine.type)
                    ? hasTree
                      ? `${treeNodes.length} branch node(s).`
                      : 'Run a simulation first.'
                    : 'Only NFA / ε-NFA / NPDA explore a tree.'
                }
              >
                <ExportButton label="JSON" disabled={!hasTree} onClick={() => save(treeToJSON(machine, treeNodes), `${stem}-tree.json`, 'json')} />
              </Section>

              <Section title="Machine definition" hint="The full diagram + δ as a reloadable file.">
                <ExportButton label="Download JSON" onClick={() => save(exportMachineJSON(machine), `${stem}.autolab.json`, 'json')} />
                <ExportButton label="Copy JSON" onClick={() => copyData(() => copyMachineJSON(machine), 'Machine JSON')} />
                <ExportButton label="JFLAP (.jff)" onClick={() => save(exportJFLAP(machine), `${stem}.jff`, 'jff')} />
              </Section>
            </>
          )}
        </div>
    </Dialog>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 8px' }}>{hint}</div>
      <div style={{ display: 'flex', gap: '8px' }}>{children}</div>
    </div>
  )
}

function ExportButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        padding: '5px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}
