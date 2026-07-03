import React, { useEffect, useRef, useState } from 'react';
import { useParserStore } from '@/store/parserStore';

const BTN_BASE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: '3px',
  padding: '2px 7px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.72rem',
  fontWeight: 600,
  lineHeight: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px'
};

export function TimelinePanel() {
  const {
    simulation,
    currentStep,
    maxStep,
    isPlaying,
    playSpeed,
    setIsPlaying,
    setPlaySpeed,
    seekToStep,
    stepBack,
    stepSim,
    seekToStart,
    seekToEnd,
    initializeSim,
    exitPreviewMode
  } = useParserStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const status = simulation?.status ?? 'idle';
  const isDone = status === 'accepted' || status === 'rejected' || status === 'error';
  const history = simulation?.history ?? [];

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Auto-play interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !isDone) {
      const speedMs = 1000 / playSpeed;
      interval = setInterval(() => { stepSim(); }, speedMs);
    } else if (isDone && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isDone, playSpeed, stepSim, setIsPlaying]);

  // Keyboard shortcuts: Space = pause/play, Enter = restart
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (simulation && !isDone) setIsPlaying(!isPlaying);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (simulation) { setIsPlaying(false); initializeSim(); setIsPlaying(true); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [simulation, isPlaying, isDone, setIsPlaying, initializeSim]);

  // Click outside to exit preview mode
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (currentStep < maxStep) {
          exitPreviewMode();
        }
      }
    };
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitPreviewMode();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [currentStep, maxStep, exitPreviewMode]);

  // Auto-scroll timeline to active step
  useEffect(() => {
    if (timelineRef.current) {
      const active = timelineRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        // scroll to bottom
        timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
      }
    }
  }, [currentStep, history.length]);

  const toggleExpand = (e: React.MouseEvent, step: number) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const isExpanded = !!expandedItems[step];
      const next = { ...expandedItems };
      history.forEach(h => {
        next[h.step] = !isExpanded;
      });
      setExpandedItems(next);
    } else {
      setExpandedItems(prev => ({ ...prev, [step]: !prev[step] }));
    }
  };

  const handleRowClick = (e: React.MouseEvent, step: number) => {
    if (e.ctrlKey || e.metaKey) {
      toggleExpand(e, step);
    } else {
      seekToStep(step);
    }
  };

  const statusColor =
    status === 'accepted' ? '#4ade80' :
    status === 'error' || status === 'rejected' ? '#f87171' :
    '#fb923c';

  const statusLabel =
    status === 'idle' ? '' :
    status === 'running' ? 'Running' :
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div ref={containerRef} style={{
      flexShrink: 0,
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Row 1: Interactive Timeline List */}
      {history.length > 0 && (
        <div
          ref={timelineRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '180px',
            overflowY: 'auto',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            scrollbarWidth: 'thin'
          }}
        >
          {history.map((entry) => {
            const isActive = entry.step === currentStep;
            const isExpanded = !!expandedItems[entry.step];
            
            return (
              <div
                key={entry.step}
                data-active={isActive}
                onClick={(e) => handleRowClick(e, entry.step)}
                title={entry.explanation.join(' ')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  background: isActive ? 'rgba(96,165,250,0.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--blue-400)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: isActive ? 'var(--blue-300)' : 'var(--text-primary)',
                  transition: 'background 0.1s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => toggleExpand(e, entry.step)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      width: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    {isExpanded ? '[-]' : '[+]'}
                  </button>
                  <span style={{ fontWeight: isActive ? 700 : 400, minWidth: '50px' }}>
                    Step {entry.step}
                  </span>
                  <span style={{ color: isActive ? 'var(--blue-200)' : 'var(--text-secondary)' }}>
                    {entry.actionTitle}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{
                    marginTop: '6px',
                    marginLeft: '24px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {entry.explanation.map((line, idx) => (
                      <div key={idx}>• {line}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Row 2: Transport controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        gap: '6px',
        minHeight: '36px'
      }}>
        {/* Transport buttons */}
        <button onClick={seekToStart} style={BTN_BASE} title="Go to beginning">|&lt;&lt;</button>
        <button onClick={stepBack} style={BTN_BASE} title="One step back">&lt;</button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            ...BTN_BASE,
            background: isPlaying ? 'var(--trace-ring)' : 'transparent',
            color: isPlaying ? 'var(--trace)' : 'var(--text-primary)',
            minWidth: '28px'
          }}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={stepSim} style={BTN_BASE} title="One step forward">&gt;</button>
        <button onClick={seekToEnd} style={BTN_BASE} title="Go to end">&gt;&gt;|</button>
        <button onClick={() => initializeSim()} style={BTN_BASE} title="Reset">⟲</button>

        {/* Divider */}
        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 4px' }} />

        {/* Speed selector */}
        <span style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          marginLeft: '8px',
          marginRight: '4px'
        }}>
          SPEED
        </span>
        <input
          type="range"
          min="0.1"
          max="8"
          step="0.1"
          value={playSpeed}
          title={`${playSpeed}x speed`}
          onChange={(e) => setPlaySpeed(parseFloat(e.target.value))}
          style={{ width: '80px', cursor: 'pointer' }}
        />
        <span style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          marginLeft: '4px',
          minWidth: '24px',
          display: 'inline-block'
        }}>
          {playSpeed}x
        </span>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 8px' }} />

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => setPlaySpeed(s)}
              style={{
                ...BTN_BASE,
                background: playSpeed === s ? 'var(--border-strong)' : 'transparent'
              }}
              title={`${s}x Speed`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Step counter + status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentStep > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}>
              {currentStep < maxStep ? `Previewing Step ${currentStep}` : `step ${currentStep}`}
            </span>
          )}
          {statusLabel && (
            <span style={{
              padding: '1px 8px',
              background: `${statusColor}18`,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: '3px',
              fontSize: '0.68rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em'
            }}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

