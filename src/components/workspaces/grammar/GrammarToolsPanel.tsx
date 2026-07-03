import React, { useState } from 'react';
import { GrammarDerivationTab } from './GrammarDerivationTab';
import { GrammarTransformationsTab } from './GrammarTransformationsTab';
import { GrammarAmbiguityTab } from './GrammarAmbiguityTab';
import { GrammarSampleTab } from './GrammarSampleTab';
import { GrammarPropertiesTab } from './GrammarPropertiesTab';
import { GrammarFirstFollowTab } from './GrammarFirstFollowTab';
import { GrammarDiagnosticsTab } from './GrammarDiagnosticsTab';

type Tab = 'derivations' | 'transformations' | 'ambiguity' | 'sampler' | 'properties' | 'firstfollow' | 'diagnostics';

export function GrammarToolsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('derivations');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-subtle)', 
        background: 'var(--bg-tertiary)',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        <TabButton active={activeTab === 'derivations'} onClick={() => setActiveTab('derivations')}>Derivations</TabButton>
        <TabButton active={activeTab === 'transformations'} onClick={() => setActiveTab('transformations')}>Transformations</TabButton>
        <TabButton active={activeTab === 'ambiguity'} onClick={() => setActiveTab('ambiguity')}>Ambiguity</TabButton>
        <TabButton active={activeTab === 'sampler'} onClick={() => setActiveTab('sampler')}>Sampler</TabButton>
        <TabButton active={activeTab === 'properties'} onClick={() => setActiveTab('properties')}>Properties</TabButton>
        <TabButton active={activeTab === 'firstfollow'} onClick={() => setActiveTab('firstfollow')}>FIRST/FOLLOW</TabButton>
        <TabButton active={activeTab === 'diagnostics'} onClick={() => setActiveTab('diagnostics')}>Problems</TabButton>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'derivations' && <GrammarDerivationTab />}
        {activeTab === 'transformations' && <GrammarTransformationsTab />}
        {activeTab === 'ambiguity' && <GrammarAmbiguityTab />}
        {activeTab === 'sampler' && <GrammarSampleTab />}
        {activeTab === 'properties' && <GrammarPropertiesTab />}
        {activeTab === 'firstfollow' && <GrammarFirstFollowTab />}
        {activeTab === 'diagnostics' && <GrammarDiagnosticsTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: active ? 'var(--bg-primary)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}
