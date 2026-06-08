// ============================================================
// ComputationTreePanel — Computation Tree Viewer (NFA / ε-NFA / NPDA).
// Renders the tree of all explored computation branches: colour-coded by
// status (🟢 accepted / 🔴 rejected / 🟡 running / ⚪ interior), collapsible
// subtrees, click-to-inspect, and branch/depth stats. The headline
// differentiator from other simulators (PRD §4).
//
// The tree is built from the per-branch lineage the engines accumulate
// (Configuration.{id,parentId}); see engines/core/computationTree.ts.
// ============================================================

import { useMemo, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import {
  buildComputationTree,
  type ComputationTreeNode,
  type TreeNodeStatus,
} from '@/engines/core/computationTree'

/** Cap on rendered rows — guards against UI freeze on huge branchings (PRD risk). */
const MAX_ROWS = 600

const STATUS_COLOR: Record<TreeNodeStatus, string> = {
  accepted: 'var(--status-accept)',
  rejected: 'var(--status-reject)',
  running: 'var(--status-running)',
  internal: 'var(--text-muted)',
}

const STATUS_LABEL: Record<TreeNodeStatus, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  running: 'Running',
  internal: 'Path',
}

function StatusDot({ status, size = 9 }: { status: TreeNodeStatus; size?: number }) {
  const color = STATUS_COLOR[status]
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: status === 'internal' ? 'transparent' : color,
        border: `1.5px solid ${color}`,
        boxSizing: 'border-box',
      }}
    />
  )
}

export default function ComputationTreePanel() {
  const { treeNodes, liveBranchIds, status } = useSimulationStore()
  const machine = useMachineStore((s) => s.machine)
  const selectState = useUIStore((s) => s.selectState)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id

  const { tree, byId } = useMemo(() => {
    const built = buildComputationTree(treeNodes, new Set(liveBranchIds))
    const map = new Map<string, ComputationTreeNode>()
    const stack = [...built.roots]
    while (stack.length > 0) {
      const node = stack.pop()!
      map.set(node.config.id, node)
      for (const c of node.children) stack.push(c)
    }
    return { tree: built, byId: map }
  }, [treeNodes, liveBranchIds])

  // Pre-order flatten into visible rows, honouring collapsed subtrees + the cap.
  const { rows, truncated } = useMemo(() => {
    const out: ComputationTreeNode[] = []
    let cut = false
    const stack = [...tree.roots].reverse()
    while (stack.length > 0) {
      if (out.length >= MAX_ROWS) {
        cut = true
        break
      }
      const node = stack.pop()!
      out.push(node)
      if (node.children.length > 0 && !collapsed.has(node.config.id)) {
        for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i])
      }
    }
    return { rows: out, truncated: cut }
  }, [tree, collapsed])

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onSelect = (node: ComputationTreeNode) => {
    setSelectedId(node.config.id)
    selectState(node.config.stateId)
  }

  if (treeNodes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>No branches yet.</div>
        <div style={{ fontSize: '11px' }}>Press ▶ or ⏭ to explore the computation tree.</div>
      </div>
    )
  }

  const selected = selectedId ? byId.get(selectedId) : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span><span style={{ color: 'var(--text-primary)' }}>{tree.totalNodes}</span> branches</span>
        <span>·</span>
        <span>depth <span style={{ color: 'var(--text-primary)' }}>{tree.maxDepth}</span></span>
        {tree.acceptingCount > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--status-accept)' }}>{tree.acceptingCount} accept</span>
          </>
        )}
        {status === 'running' && tree.liveCount > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--status-running)' }}>{tree.liveCount} live</span>
          </>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--text-muted)',
        }}
      >
        {(['accepted', 'rejected', 'running'] as TreeNodeStatus[]).map((s) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StatusDot status={s} size={7} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {rows.map((node) => {
          const hasChildren = node.children.length > 0
          const isCollapsed = collapsed.has(node.config.id)
          const isSelected = node.config.id === selectedId
          return (
            <div
              key={node.config.id}
              onClick={() => onSelect(node)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px 3px',
                paddingLeft: `${12 + node.depth * 13}px`,
                cursor: 'pointer',
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: `2px solid ${isSelected ? 'var(--text-primary)' : 'transparent'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Collapse toggle (or spacer) */}
              <span
                onClick={(e) => {
                  if (!hasChildren) return
                  e.stopPropagation()
                  toggle(node.config.id)
                }}
                style={{
                  width: '10px',
                  flexShrink: 0,
                  color: 'var(--text-muted)',
                  fontSize: '9px',
                  cursor: hasChildren ? 'pointer' : 'default',
                  textAlign: 'center',
                }}
              >
                {hasChildren ? (isCollapsed ? '▸' : '▾') : ''}
              </span>

              <StatusDot status={node.status} />

              <span style={{ color: 'var(--text-primary)' }}>{labelFor(node.config.stateId)}</span>

              {/* Stack (PDA branches) — top of stack shown first */}
              {node.config.stack.length > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  [{[...node.config.stack].reverse().join('')}]
                </span>
              )}

              {/* Collapsed subtree size hint */}
              {hasChildren && isCollapsed && (
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  +{node.children.length}
                </span>
              )}
            </div>
          )
        })}

        {truncated && (
          <div
            style={{
              padding: '8px 12px',
              color: 'var(--text-muted)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontStyle: 'italic',
            }}
          >
            Tree truncated at {MAX_ROWS} branches — collapse subtrees to explore further.
          </div>
        )}
      </div>

      {/* Selected-branch detail */}
      {selected && (
        <div
          style={{
            borderTop: '1px solid var(--border-default)',
            padding: '8px 12px',
            flexShrink: 0,
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>BRANCH · DEPTH {selected.depth}</span>
            <span style={{ color: STATUS_COLOR[selected.status] }}>
              {STATUS_LABEL[selected.status].toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            ({labelFor(selected.config.stateId)}, {selected.config.remainingInput || 'ε'}
            {selected.config.stack.length > 0
              ? `, ${[...selected.config.stack].reverse().join('')}`
              : ''}
            )
          </div>
        </div>
      )}
    </div>
  )
}
