import { useMachineStore } from '@/store/machineStore'

export default function TabBar() {
  const { tabs, activeTabIndex, switchTab, addTab, closeTab } = useMachineStore()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-default)',
      height: '36px',
      padding: '0 8px',
      gap: '4px',
      overflowX: 'auto',
      flexShrink: 0
    }}>
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex
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
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(index)
              }}
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
    </div>
  )
}
