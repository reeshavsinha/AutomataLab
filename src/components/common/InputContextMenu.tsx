import { useEffect, useState } from 'react'
import { Scissors, Copy, ClipboardPaste, ListCheck } from 'lucide-react'

interface MenuState {
  x: number
  y: number
  target: HTMLElement
}

function MenuItem({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '12px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{icon}</span>
      {label}
    </div>
  )
}

export default function InputContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Since this is in the bubble phase (capture: false), this will only run if 
      // no other component (like the Canvas or TabBar) called e.stopPropagation().
      // This makes it the perfect global fallback context menu.
      
      // Ensure the browser default is still prevented just in case
      e.preventDefault()
      
      // If they clicked an input, focus it so cut/paste works automatically
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        ;(e.target as HTMLElement).focus()
      }
      
      setMenu({
        x: e.clientX,
        y: e.clientY,
        target: e.target as HTMLElement
      })
    }

    const handleClick = () => {
      setMenu(null)
    }

    // IMPORTANT: Not using capture: true here! We want local context menus 
    // to have priority. If they stopPropagation(), this won't fire.
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('mousedown', handleClick, { capture: true })

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('mousedown', handleClick, { capture: true })
    }
  }, [])

  if (!menu) return null

  const handleAction = async (action: 'cut' | 'copy' | 'paste' | 'selectAll') => {
    setMenu(null)
    
    try {
      const target = menu.target;
      if (action === 'cut') {
        document.execCommand('cut');
      } else if (action === 'copy') {
        document.execCommand('copy');
      } else if (action === 'paste') {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text);
          } catch {
            document.execCommand('paste');
          }
        } else {
          document.execCommand('paste');
        }
      } else if (action === 'selectAll') {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.select()
        } else {
          document.execCommand('selectAll')
        }
      }
    } catch (e) {
      console.error('Context menu action failed', e)
    }
  }

  // Ensure menu stays within viewport bounds
  let { x, y } = menu
  const menuWidth = 160
  const menuHeight = 130
  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight

  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        width: menuWidth,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10000,
        padding: '4px 0',
        fontFamily: 'var(--font-sans)',
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <MenuItem label="Cut" icon={<Scissors size={14} />} onClick={() => handleAction('cut')} />
      <MenuItem label="Copy" icon={<Copy size={14} />} onClick={() => handleAction('copy')} />
      <MenuItem label="Paste" icon={<ClipboardPaste size={14} />} onClick={() => handleAction('paste')} />
      
      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
      
      <MenuItem label="Select All" icon={<ListCheck size={14} />} onClick={() => handleAction('selectAll')} />
    </div>
  )
}
