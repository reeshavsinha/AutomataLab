// ============================================================
// ExportModal — data-out for researchers/instructors (UX audit #7).
// Exports the δ-table (CSV / LaTeX), the execution trace (CSV / JSON), the
// computation tree (JSON), and the full machine (JSON). Trace/tree light up once
// a simulation has produced data.
// ============================================================

import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { supportsComputationTree } from '@/engines/core/utils'
import { exportMachineJSON } from '@/utils/fileManager'
import {
  deltaTableToCSV,
  deltaTableToLatex,
  traceToCSV,
  traceToJSON,
  treeToJSON,
  downloadText,
  fileStem,
} from '@/utils/exporters'
import { exportDiagramSVG, exportDiagramPNG } from '@/utils/diagramExport'
import { exportJFLAP } from '@/utils/jflap'
import { toast } from '@/store/toastStore'
import Dialog from '@/components/common/Dialog'

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const { history, treeNodes, inputString } = useSimulationStore()
  const theme = useUIStore((s) => s.theme)

  const stem = fileStem(machine)
  const hasTrace = history.length > 0
  const hasTree = supportsComputationTree(machine.type) && treeNodes.length > 0
  const hasDiagram = machine.states.some((s) => !s.isText)

  const save = async (content: string, name: string, ext: 'csv' | 'json' | 'tex' | 'jff') => {
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
          <Section
            title="Diagram"
            hint={hasDiagram ? 'The state diagram as a vector or image.' : 'Add a state first.'}
          >
            <ExportButton label="SVG" disabled={!hasDiagram} onClick={() => saveDiagram(() => exportDiagramSVG(machine, theme === 'dark'), 'diagram (SVG)')} />
            <ExportButton label="PNG" disabled={!hasDiagram} onClick={() => saveDiagram(() => exportDiagramPNG(machine, theme === 'dark'), 'diagram (PNG)')} />
          </Section>

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
            <ExportButton label="JSON" onClick={() => save(exportMachineJSON(machine), `${stem}.autolab.json`, 'json')} />
            <ExportButton label="JFLAP (.jff)" onClick={() => save(exportJFLAP(machine), `${stem}.jff`, 'jff')} />
          </Section>
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
