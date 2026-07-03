import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LR0Item } from '@/engines/parser/lr0';

export interface LRStateNodeData {
  stateId: number;
  items: string[];
  isFocused?: boolean;
}

export function LRStateNode({ data }: { data: LRStateNodeData }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: data.isFocused ? '1px solid var(--blue-400)' : '1px solid var(--border-subtle)',
      boxShadow: data.isFocused ? '0 0 0 1px var(--blue-400)' : 'none',
      borderRadius: '4px',
      minWidth: '120px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--text-muted)' }} />
      
      <div style={{
        background: data.isFocused ? 'rgba(96,165,250,0.15)' : 'var(--bg-tertiary)',
        padding: '2px 8px',
        fontWeight: 'bold',
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)'
      }}>
        State {data.stateId}
      </div>
      
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {data.items.map((item, idx) => {
          // Replace '.' with bullet '•' and highlight it
          const parts = item.split('.');
          return (
            <div key={idx} style={{ color: 'var(--text-primary)' }}>
              {parts.map((part, i) => (
                <React.Fragment key={i}>
                  {part}
                  {i < parts.length - 1 && <strong style={{ color: '#ef4444', fontWeight: 900, margin: '0 2px' }}>•</strong>}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>
      
      <Handle type="source" position={Position.Right} style={{ background: 'var(--text-muted)' }} />
    </div>
  );
}
