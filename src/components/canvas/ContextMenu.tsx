// ============================================================
// ContextMenu — Right-click context menus for canvas/state/transition/text
// Rich state options: toggle accept, set start, transitions, symbols.
// Plain black & white. No animations.
// ============================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

// ─── State context menu options ────────────────────────────────

interface StateMenuProps {
  x: number
  y: number
  stateId: string
  stateLabel: string
  isAccept: boolean
  isStart: boolean
  onClose: () => void
  onToggleAccept: () => void
  onSetStart: () => void
  onStartTransition: () => void    // enter "draw transition from this state" mode
  onEditSymbols: () => void        // open symbol editor for this state's outgoing transitions
  onRename: () => void
  onDelete: () => void
}

interface CanvasMenuProps {
  x: number
  y: number
  onClose: () => void
  onAddState: () => void
  onAddText: () => void
}

interface TransitionMenuProps {
  x: number
  y: number
  onClose: () => void
  onDelete: () => void
  onEditSymbols: () => void
}

interface TextMenuProps {
  x: number
  y: number
  stateId: string
  onClose: () => void
  onDelete: () => void
}

export type ContextMenuConfig =
  | { kind: 'state'; x: number; y: number; stateId: string; stateLabel: string; isAccept: boolean; isStart: boolean }
  | { kind: 'text'; x: number; y: number; stateId: string; stateLabel: string }
  | { kind: 'canvas'; x: number; y: number; canvasX: number; canvasY: number }
  | { kind: 'transition'; x: number; y: number; transitionId: string }

// ─── Shared menu container ─────────────────────────────────────

function MenuContainer({ x, y, onClose, children }: {
  x: number
  y: number
  onClose: () => void
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  // Start at the requested point, then clamp to the viewport once we can
  // measure the menu's real size (different menus have different heights).
  const [pos, setPos] = useState({ left: x, top: y })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const margin = 8
    const { width, height } = el.getBoundingClientRect()
    let left = x
    let top = y
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
    if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin
    left = Math.max(margin, left)
    top = Math.max(margin, top)
    setPos({ left, top })
  }, [x, y])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '200px',
        maxHeight: 'calc(100vh - 16px)',
        zIndex: 1000,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

// ─── Menu primitives ───────────────────────────────────────────

function MenuHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '6px 12px',
      fontSize: '10px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-muted)',
      borderBottom: '1px solid var(--border-subtle)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

// ─── Menu Divider ──────────────────────────────────────────────

function MenuDivider() {
  return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
}

// ─── Menu Item ──────────────────────────────────────────────────

function MenuItem({
  label,
  icon,
  onClick,
  danger,
  checked,
  description,
}: {
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
  checked?: boolean
  description?: string
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: description ? '7px 12px' : '7px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        color: danger ? '#888' : 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Checkmark / icon column */}
      <span style={{
        minWidth: '14px',
        fontSize: '11px',
        color: checked ? 'var(--text-primary)' : 'var(--text-muted)',
        marginTop: '1px',
        fontFamily: 'var(--font-mono)',
      }}>
        {checked !== undefined ? (checked ? '✓' : '·') : (icon ?? ' ')}
      </span>

      <div>
        <div style={{ lineHeight: 1.3 }}>{label}</div>
        {description && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── State context menu ────────────────────────────────────────

function StateContextMenu(props: StateMenuProps) {
  const { stateId, stateLabel, isAccept, isStart, onClose } = props

  return (
    <MenuContainer x={props.x} y={props.y} onClose={onClose}>
      <MenuHeader label={`State: ${stateLabel}`} />

      <MenuItem
        label={isAccept ? 'Remove Final State' : 'Set as Final State'}
        checked={isAccept}
        description="Double ring marks accept/final state"
        onClick={() => { props.onToggleAccept(); onClose() }}
      />

      <MenuItem
        label="Set as Start State"
        checked={isStart}
        description="Arrow points to start state"
        onClick={() => { if (!isStart) props.onSetStart(); onClose() }}
      />

      <MenuDivider />

      <MenuItem
        label="Add Transition from This State"
        icon="→"
        description="Click a target state to connect"
        onClick={() => { props.onStartTransition(); onClose() }}
      />

      <MenuItem
        label="Edit Outgoing Transitions"
        icon="⊞"
        description="Set symbols for each transition"
        onClick={() => { props.onEditSymbols(); onClose() }}
      />

      <MenuDivider />

      <MenuItem
        label="Rename State"
        icon="✎"
        onClick={() => { props.onRename(); onClose() }}
      />

      <MenuItem
        label="Delete State"
        icon="✕"
        danger={true}
        onClick={() => { props.onDelete(); onClose() }}
      />
    </MenuContainer>
  )
}

// ─── Canvas context menu ────────────────────────────────────────

function CanvasContextMenu({ x, y, onClose, onAddState, onAddText }: CanvasMenuProps) {
  return (
    <MenuContainer x={x} y={y} onClose={onClose}>
      <MenuHeader label="Canvas" />
      <MenuItem
        label="Add State"
        icon="◯"
        onClick={() => { onAddState(); onClose() }}
      />
      <MenuItem
        label="Add Text"
        icon="✎"
        onClick={() => { onAddText(); onClose() }}
      />
    </MenuContainer>
  )
}

// ─── Transition context menu ────────────────────────────────────

function TransitionContextMenu({ x, y, onClose, onDelete, onEditSymbols }: TransitionMenuProps) {
  return (
    <MenuContainer x={x} y={y} onClose={onClose}>
      <MenuHeader label="Transition" />
      <MenuItem
        label="Edit Symbols"
        icon="✎"
        description="Double-click label to edit"
        onClick={() => { onEditSymbols(); onClose() }}
      />
      <MenuDivider />
      <MenuItem
        label="Delete Transition"
        icon="✕"
        danger={true}
        onClick={() => { onDelete(); onClose() }}
      />
    </MenuContainer>
  )
}

// ─── Text context menu ──────────────────────────────────────────

function TextContextMenu({ x, y, onClose, onDelete }: TextMenuProps) {
  return (
    <MenuContainer x={x} y={y} onClose={onClose}>
      <MenuHeader label="Text Note" />
      <MenuItem
        label="Delete Text Note"
        icon="✕"
        danger={true}
        onClick={() => { onDelete(); onClose() }}
      />
    </MenuContainer>
  )
}

// ─── Main export ───────────────────────────────────────────────

interface ContextMenuProps {
  config: ContextMenuConfig
  onClose: () => void
  onAddState: (x: number, y: number) => void
  onAddText: (x: number, y: number) => void
  onDeleteState: (id: string) => void
  onSetStart: (id: string) => void
  onToggleAccept: (id: string) => void
  onDeleteTransition: (id: string) => void
  onStartTransition: (fromStateId: string) => void
  onEditStateTransitions: (stateId: string) => void
  onEditTransitionSymbols: (transitionId: string) => void
  onRenameState: (stateId: string) => void
}

export default function ContextMenu(props: ContextMenuProps) {
  const { config, onClose } = props
  const { startRenaming } = useUIStore()

  if (config.kind === 'canvas') {
    return (
      <CanvasContextMenu
        x={config.x}
        y={config.y}
        onClose={onClose}
        onAddState={() => props.onAddState(config.canvasX, config.canvasY)}
        onAddText={() => props.onAddText(config.canvasX, config.canvasY)}
      />
    )
  }

  if (config.kind === 'state') {
    return (
      <StateContextMenu
        x={config.x}
        y={config.y}
        stateId={config.stateId}
        stateLabel={config.stateLabel}
        isAccept={config.isAccept}
        isStart={config.isStart}
        onClose={onClose}
        onToggleAccept={() => props.onToggleAccept(config.stateId)}
        onSetStart={() => props.onSetStart(config.stateId)}
        onStartTransition={() => props.onStartTransition(config.stateId)}
        onEditSymbols={() => props.onEditStateTransitions(config.stateId)}
        onRename={() => { startRenaming(config.stateId); onClose() }}
        onDelete={() => props.onDeleteState(config.stateId)}
      />
    )
  }

  if (config.kind === 'transition') {
    return (
      <TransitionContextMenu
        x={config.x}
        y={config.y}
        onClose={onClose}
        onDelete={() => props.onDeleteTransition(config.transitionId)}
        onEditSymbols={() => props.onEditTransitionSymbols(config.transitionId)}
      />
    )
  }

  if (config.kind === 'text') {
    return (
      <TextContextMenu
        x={config.x}
        y={config.y}
        stateId={config.stateId}
        onClose={onClose}
        onDelete={() => props.onDeleteState(config.stateId)}
      />
    )
  }

  return null
}
