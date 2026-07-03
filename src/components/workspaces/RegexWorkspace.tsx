import React from 'react';
import TabBar from '../layout/TabBar';
import { WorkspaceShell } from '../layout/WorkspaceShell';
import Toolbar from '../toolbar/Toolbar';

export function RegexWorkspace() {
  return (
    <WorkspaceShell
      header={<TabBar />}
      toolbar={<Toolbar />}
      content={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>Regex Laboratory</h2>
          <p style={{ color: 'var(--text-muted)' }}>Under Construction</p>
        </div>
      }
    />
  );
}
