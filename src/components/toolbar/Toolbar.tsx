// ============================================================
// Toolbar — Top navigation bar. Black & white styling.
// Includes logo, machine name, type selector, and language input.
// ============================================================

import { useMachineStore } from '@/store/machineStore'
import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'

export default function Toolbar() {
  const { machine, setMachineName, setMachineType, setAlphabet } = useMachineStore()

  const [alphabetInput, setAlphabetInput] = useState(machine.alphabet?.join(', ') || '')
  const [isFocused, setIsFocused] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    try {
      const update = await check()
      if (update) {
        const yes = window.confirm(`Update to ${update.version} is available!\nRelease notes: ${update.body}\n\nDownload and install?`)
        if (yes) {
          await update.downloadAndInstall()
          alert("Update installed successfully. Please restart the application.")
        }
      } else {
        alert("You are on the latest version.")
      }
    } catch (error) {
      alert("Failed to check for updates. Ensure you have internet access or the update server is reachable.")
      console.error("Update check error:", error)
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  useEffect(() => {
    if (!isFocused) {
      setAlphabetInput(machine.alphabet?.join(', ') || '')
    }
  }, [machine.alphabet, isFocused])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      height: '48px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0,
      gap: '24px',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          fontWeight: 800,
          fontSize: '14px',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          AutomataLab
        </div>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />

      {/* Title Input */}
      <input
        type="text"
        value={machine.name}
        onChange={(e) => setMachineName(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          width: '140px',
        }}
      />

      <div style={{ flex: 1 }} />

      {/* Alphabet Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}>
          ALPHABET (Σ)
        </span>
        <input
          type="text"
          value={alphabetInput}
          onChange={(e) => setAlphabetInput(e.target.value)}
          placeholder="e.g. a, b, c"
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => {
            setIsFocused(true)
            e.target.style.borderColor = 'var(--border-strong)'
          }}
          onBlur={(e) => {
            setIsFocused(false)
            e.target.style.borderColor = 'var(--border-default)'
            const symbols = alphabetInput.split(',').map(s => s.trim()).filter(Boolean)
            setAlphabet(symbols)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', marginLeft: '12px', marginRight: '12px' }} />

      {/* Machine Type Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}>
          TYPE
        </span>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={machine.type}
            onChange={(e) => setMachineType(e.target.value as any)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '4px 28px 4px 8px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='black' d='M0 0l5 5 5-5z'/></svg>")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '10px 6px',
            }}
          >
            <option value="DFA">DFA</option>
            <option value="NFA">NFA</option>
            <option value="ENFA">ε-NFA</option>
          </select>
        </div>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', marginLeft: '12px', marginRight: '12px' }} />

      {/* Update Check Button */}
      <button
        onClick={handleCheckUpdate}
        disabled={isCheckingUpdate}
        style={{
          background: isCheckingUpdate ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          padding: '4px 12px',
          outline: 'none',
          cursor: isCheckingUpdate ? 'not-allowed' : 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        {isCheckingUpdate ? 'CHECKING...' : 'UPDATES'}
      </button>
    </div>
  )
}
