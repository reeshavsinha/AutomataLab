import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MachineType } from '@/engines/machine/core/types'
import {
  EXAMPLE_GROUP_LABEL,
  EXAMPLES,
  groupedExamples,
  type ExampleDef,
} from '@/utils/examples'

interface ExamplePickerProps {
  types: MachineType[]
  onSelect: (key: string, ex: ExampleDef) => void
}

export default function ExamplePicker({ types, onSelect }: ExamplePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0, maxHeight: 420 })

  const groups = useMemo(() => groupedExamples(types), [types])
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(([, ex]) =>
          `${ex.name} ${ex.language} ${ex.type}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [groups, query])

  const shown = filtered.reduce((n, g) => n + g.items.length, 0)

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
        maxHeight: Math.min(520, window.innerHeight - rect.bottom - 16),
      })
    }
    setQuery('')
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="tb-select"
        title="Load a built-in textbook or real-world example"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          marginRight: 16,
          minWidth: 168,
          textAlign: 'left',
          fontWeight: 600,
        }}
      >
        Load Example ({total})
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="example-picker"
          role="listbox"
          aria-label="Built-in examples"
          style={{ top: pos.top, right: pos.right, maxHeight: pos.maxHeight }}
        >
          <div className="example-picker-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${total} examples…`}
              spellCheck={false}
            />
            <span className="example-picker-count">{shown}</span>
          </div>
          <div className="example-picker-list">
            {filtered.length === 0 && (
              <div className="example-picker-empty">No examples match “{query}”.</div>
            )}
            {filtered.map((g) => (
              <div key={g.type} className="example-picker-group">
                <div className="example-picker-head">
                  {EXAMPLE_GROUP_LABEL[g.type] ?? g.type}
                  <span>{g.items.length}</span>
                </div>
                {g.items.map(([key, ex]) => (
                  <button
                    key={key}
                    type="button"
                    className="example-picker-item"
                    onClick={() => {
                      onSelect(key, EXAMPLES[key])
                      setOpen(false)
                    }}
                  >
                    <span className="example-picker-name">{ex.name}</span>
                    <span className="example-picker-lang">{ex.language}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
