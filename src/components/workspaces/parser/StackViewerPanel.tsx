import React from 'react';
import { useActiveSimulationState } from '@/store/parserStore';
import { TimelineStyle } from '@/engines/parser/model';

export function StackViewerPanel() {
  const simulation = useActiveSimulationState();
  const stack = simulation?.stack ?? [];
  const timelineStyle = simulation?.presentation?.timelineStyle;

  if (stack.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        background: 'var(--bg-primary)'
      }}>
        Stack is empty
      </div>
    );
  }

  // Format stack elements safely
  const formatElement = (el: any) => {
    if (el === null || el === undefined) return '-';
    if (typeof el === 'object' && el.symbol !== undefined) return el.symbol;
    return String(el);
  };

  const renderLRStack = () => {
    const pairs = [];
    pairs.push({ symbol: null, state: stack[0] });
    for (let i = 1; i < stack.length; i += 2) {
      pairs.push({ symbol: stack[i], state: stack[i + 1] });
    }
    
    const displayPairs = pairs.reverse();

    return displayPairs.map((pair, index) => {
      const isTop = index === 0;
      return (
        <div
          key={`lr_${index}`}
          style={{
            display: 'flex',
            height: '28px',
            background: isTop ? 'rgba(96,165,250,0.15)' : (index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
            borderBottom: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: isTop ? 'var(--blue-400)' : 'var(--text-primary)',
            fontWeight: isTop ? 700 : 400
          }}
        >
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px dashed var(--border-subtle)',
            color: pair.symbol ? 'var(--orange-400)' : 'transparent'
          }}>
            {formatElement(pair.symbol)}
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isTop ? 'var(--blue-400)' : 'var(--blue-300)'
          }}>
            {formatElement(pair.state)}
          </div>
        </div>
      );
    });
  };

  const renderFlatStack = () => {
    // Reverse so top of stack is rendered first
    const displayStack = [...stack].reverse();
    return displayStack.map((item, index) => {
      const isTop = index === 0;
      return (
        <div
          key={`flat_${index}`}
          style={{
            display: 'flex',
            height: '28px',
            background: isTop ? 'rgba(96,165,250,0.15)' : (index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
            borderBottom: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: isTop ? 'var(--blue-400)' : 'var(--text-primary)',
            fontWeight: isTop ? 700 : 400,
            alignItems: 'center',
            padding: '0 12px'
          }}
        >
          {formatElement(item)}
        </div>
      );
    });
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden'
    }}>
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
          RUNTIME STACK
        </span>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {timelineStyle === TimelineStyle.LR ? (
          <>
            <div style={{
              display: 'flex',
              height: '24px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-subtle)' }}>
                SYMBOL
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                STATE
              </div>
            </div>
            {renderLRStack()}
          </>
        ) : (
          renderFlatStack()
        )}
      </div>
    </div>
  );
}
