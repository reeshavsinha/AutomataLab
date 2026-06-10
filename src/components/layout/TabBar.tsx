import { useEffect, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { saveMachine } from '@/utils/fileManager'
import { toast } from '@/store/toastStore'

export default function TabBar() {
  const { tabs, activeTabIndex, dirtyTabs, switchTab, addTab, closeTab } = useMachineStore()

  // Index of the unsaved tab the user is attempting to close (null = no prompt).
  const [pendingCloseIndex, setPendingCloseIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const requestClose = (index: number) => {
    const tab = tabs[index]
    if (tab && dirtyTabs[tab.id]) {
      setPendingCloseIndex(index)
    } else {
      closeTab(index)
    }
  }

  // Tab keyboard shortcuts: Ctrl/Cmd+W closes the active tab (dirty-aware),
  // Ctrl/Cmd+T opens a new one — matching browser/editor conventions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'w') {
        e.preventDefault()
        requestClose(activeTabIndex)
      } else if (k === 't') {
        e.preventDefault()
        addTab()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIndex, tabs, dirtyTabs, addTab])

  const handleSaveAndClose = async () => {
    if (pendingCloseIndex === null) return
    const tab = tabs[pendingCloseIndex]
    if (!tab) {
      setPendingCloseIndex(null)
      return
    }
    setIsSaving(true)
    try {
      const saved = await saveMachine(tab)
      if (saved) {
        toast.success(`Saved "${tab.name || 'Untitled'}".`)
        closeTab(pendingCloseIndex)
        setPendingCloseIndex(null)
      }
      // If the user cancelled the save dialog, keep the tab open.
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseWithoutSaving = () => {
    if (pendingCloseIndex === null) return
    closeTab(pendingCloseIndex)
    setPendingCloseIndex(null)
  }

  const handleCancel = () => setPendingCloseIndex(null)

  const pendingTabName =
    pendingCloseIndex !== null ? tabs[pendingCloseIndex]?.name || 'Untitled' : ''

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-default)',
      height: '36px',
      padding: '0 8px',
      gap: '4px',
      overflowX: 'auto',
      flexShrink: 0
    }}>
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex
        const isDirty = !!dirtyTabs[tab.id]
        return (
          <div
            key={`${index}-${tab.id}`}
            onClick={() => switchTab(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: isActive ? 'var(--bg-primary)' : 'transparent',
              borderTopLeftRadius: 'var(--radius-sm)',
              borderTopRightRadius: 'var(--radius-sm)',
              borderTop: isActive ? '2px solid var(--text-primary)' : '1px solid transparent',
              borderLeft: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
              borderRight: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: '80px',
              maxWidth: '160px',
              height: '32px',
              boxSizing: 'border-box',
              marginBottom: isActive ? '-1px' : '0', // Overlap bottom border
              zIndex: isActive ? 10 : 1
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {tab.name || 'Untitled'}
            </span>
            {isDirty && (
              <span
                title="Unsaved changes"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  flexShrink: 0,
                  opacity: 0.8,
                }}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                requestClose(index)
              }}
              title="Close tab"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                opacity: isActive ? 0.7 : 0.3,
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.opacity = isActive ? '0.7' : '0.3'
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
      
      {/* Add Tab Button */}
      <button
        onClick={addTab}
        title="New Tab"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '32px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        +
      </button>

      {/* Unsaved-changes confirmation dialog */}
      {pendingCloseIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={handleCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '420px',
              maxWidth: '90vw',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              Unsaved changes
            </div>
            <div style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              marginBottom: '24px',
            }}>
              "{pendingTabName}" has unsaved changes. Do you want to save before closing?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWithoutSaving}
                disabled={isSaving}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                Don't Save
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                style={{
                  background: 'var(--text-primary)',
                  border: '1px solid var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--bg-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '6px 14px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
