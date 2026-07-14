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

  const containerRef = useRef<HTMLDivElement>(null);
  const status = simulation?.status ?? 'idle';
  const isDone = status === 'accepted' || status === 'rejected' || status === 'error';

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
      const target = e.target as Element;
      if (target.closest('[data-prevent-preview-exit="true"]')) return;

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

