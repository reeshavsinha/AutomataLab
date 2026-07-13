import React, { useEffect, useRef, useState } from 'react';
import { useParserStore } from '@/store/parserStore';

export function TimelineHistory() {
  const { simulation, currentStep, seekToStep, maxStep } = useParserStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const status = simulation?.status ?? 'idle';
  const history = simulation?.history ?? [];

  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Auto-scroll timeline to active step
  useEffect(() => {
    if (timelineRef.current) {
      const active = timelineRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (active) {
        const containerHeight = timelineRef.current.clientHeight;
        const offsetTop = active.offsetTop;
        const height = active.clientHeight;
        timelineRef.current.scrollTo({
          top: offsetTop - containerHeight / 2 + height / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [currentStep, history.length]);

  const toggleExpand = (e: React.MouseEvent, step: number) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const isCurrentlyExpanded = !!expandedItems[step];
      const newExpanded: Record<number, boolean> = {};
      history.forEach(h => { newExpanded[h.step] = !isCurrentlyExpanded; });
      setExpandedItems(newExpanded);
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

  if (history.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '4px 8px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          height: '28px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)'
          }}>
            TIMELINE
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-primary)' }}>
          No timeline history
        </div>
      </div>
    );
  }

  return (
    <div data-prevent-preview-exit="true" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
        height: '28px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)'
        }}>
          TIMELINE
        </span>
      </div>

      <div
        ref={timelineRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
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
    </div>
  );
}
