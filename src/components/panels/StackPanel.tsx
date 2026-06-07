// ============================================================
// StackPanel — PDA stack visualizer + instantaneous description (ID).
// Vertical stack with animated push/pop and a stack-top indicator.
// Plain black & white, consistent with the rest of the side panel.
// ============================================================

import { AnimatePresence, motion } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'

const EMPTY = '∅'

export default function StackPanel() {
  const { activeStack, configurations, status, inputString, remainingInput } = useSimulationStore()
  const { machine } = useMachineStore()

  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id

  const isIdle = status === 'idle'
  const config = configurations[0]
  const stateLabel = config ? labelFor(config.stateId) : '—'
  // Remaining input for the ID: prefer the per-branch value, fall back to store/full input.
  const idRemaining = (config?.remainingInput ?? (isIdle ? inputString : remainingInput)) || 'ε'
  // ID stack is written top-of-stack first.
  const idStack = activeStack.length > 0 ? [...activeStack].reverse().join('') : 'ε'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Instantaneous description */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          marginBottom: '4px',
        }}>
          INSTANTANEOUS DESCRIPTION
        </div>
        <div style={{
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          wordBreak: 'break-all',
        }}>
          ({stateLabel}, {idRemaining}, {idStack})
        </div>
      </div>

      {/* Stack */}
      <div style={{
        padding: '8px 12px',
        fontSize: '10px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        flexShrink: 0,
      }}>
        STACK {activeStack.length > 0 && `(${activeStack.length})`}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 12px 16px',
        gap: '0',
      }}>
        {activeStack.length === 0 ? (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            marginTop: '16px',
            textAlign: 'center',
          }}>
            {isIdle ? 'Stack is empty.' : `Empty stack ${EMPTY}`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '140px' }}>
            <AnimatePresence initial={false}>
              {[...activeStack]
                .map((sym, idx) => ({ sym, idx }))
                .reverse()
                .map(({ sym, idx }, position) => {
                  const isTop = position === 0
                  return (
                    <motion.div
                      key={`${idx}-${sym}`}
                      initial={{ opacity: 0, y: -12, scaleY: 0.6 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -12, scaleY: 0.6 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        width: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '34px',
                        background: isTop ? 'var(--text-primary)' : 'var(--bg-card)',
                        color: isTop ? 'var(--bg-primary)' : 'var(--text-primary)',
                        border: '1px solid var(--border-strong)',
                        borderBottom: position === activeStack.length - 1 ? '2px solid var(--border-strong)' : '1px solid var(--border-strong)',
                        marginTop: position === 0 ? 0 : '-1px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      {sym}
                      {isTop && (
                        <span style={{
                          position: 'absolute',
                          right: '-30px',
                          fontSize: '9px',
                          color: 'var(--text-muted)',
                          fontWeight: 400,
                          letterSpacing: '0.05em',
                        }}>
                          ◄ TOP
                        </span>
                      )}
                    </motion.div>
                  )
                })}
            </AnimatePresence>
            {/* Stack bottom marker */}
            <div style={{
              fontSize: '9px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: '4px',
              letterSpacing: '0.08em',
            }}>
              BOTTOM
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
