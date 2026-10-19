import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GrammarFormat, MachineType } from '@/engines/machine/core/types'
import { grammarMachineTargets } from '@/engines/machine/core/capabilities'
import { isGrammarToMachineTargetAvailable } from '@/engines/machine/conversions'
import { MachineWorkspaceIcon } from './icons'

interface MachineTargetPickerProps {
  grammarFormat: GrammarFormat
  onSelect: (target: MachineType) => void
}

export function MachineTargetPicker({ grammarFormat, onSelect }: MachineTargetPickerProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0, maxHeight: 320 })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setPos({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
        maxHeight: Math.min(360, window.innerHeight - rect.bottom - 16),
      })
    }
  }, [open])

  const targets = grammarMachineTargets(grammarFormat)

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`tb-btn ${open ? 'on' : ''}`}
        title="Convert grammar to a machine"
        aria-label="Convert grammar to a machine"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MachineWorkspaceIcon />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="grammar-target-picker"
          role="menu"
          aria-label="Machine recognizer targets"
          style={{ top: pos.top, right: pos.right, maxHeight: pos.maxHeight }}
        >
          <div className="grammar-target-picker-head">
            {grammarFormat.replace('_', ' ')} targets
          </div>
          <div className="grammar-target-picker-list">
            {targets.map((target) => {
              const available = isGrammarToMachineTargetAvailable(grammarFormat, target)
              return (
                <button
                  key={target}
                  type="button"
                  role="menuitem"
                  disabled={!available}
                  title={available ? `Build an equivalent ${target}` : 'No verified construction for this target.'}
                  onClick={() => {
                    if (!available) return
                    setOpen(false)
                    onSelect(target)
                  }}
                  className="grammar-target-picker-item"
                  data-available={available ? 'true' : 'false'}
                >
                  {target}{available ? '' : ' — unavailable'}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
