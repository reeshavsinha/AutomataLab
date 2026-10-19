import React, { useEffect, useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { GrammarDerivationTab } from './GrammarDerivationTab';
import { GrammarTransformationsTab } from './GrammarTransformationsTab';
import { GrammarAmbiguityTab } from './GrammarAmbiguityTab';
import { GrammarSampleTab } from './GrammarSampleTab';
import { GrammarPropertiesTab } from './GrammarPropertiesTab';
import { GrammarFirstFollowTab } from './GrammarFirstFollowTab';
import { GrammarDiagnosticsTab } from './GrammarDiagnosticsTab';
import {
  defaultGrammarLabTab,
  getGrammarLabTabs,
  isGrammarLabTabAvailable,
  type GrammarLabTab,
} from '@/engines/grammar/grammarLabCapabilities';
import { GrammarLabTabGate } from './GrammarLabTabGate';

export function GrammarToolsPanel() {
  const grammarFormat = useGrammarStore((state) => state.grammarFormat);
  const [activeTab, setActiveTab] = useState<GrammarLabTab>('properties');
  const tabDescriptors = getGrammarLabTabs(grammarFormat);

  useEffect(() => {
    if (!isGrammarLabTabAvailable(grammarFormat, activeTab)) {
      setActiveTab(defaultGrammarLabTab(grammarFormat));
    }
  }, [grammarFormat, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-tertiary)',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {tabDescriptors.map((descriptor) => (
          <TabButton
            key={descriptor.id}
            active={activeTab === descriptor.id}
            muted={!descriptor.available}
            onClick={() => setActiveTab(descriptor.id)}
          >
            {descriptor.label}
          </TabButton>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GrammarLabTabGate format={grammarFormat} tabId={activeTab}>
          {activeTab === 'sampler' && <GrammarSampleTab />}
          {activeTab === 'properties' && <GrammarPropertiesTab />}
          {activeTab === 'derivations' && <GrammarDerivationTab />}
          {activeTab === 'transformations' && <GrammarTransformationsTab />}
          {activeTab === 'ambiguity' && <GrammarAmbiguityTab />}
          {activeTab === 'firstfollow' && <GrammarFirstFollowTab />}
          {activeTab === 'diagnostics' && <GrammarDiagnosticsTab />}
        </GrammarLabTabGate>
      </div>
    </div>
  );
}

function TabButton({
  active,
  muted,
  onClick,
  children,
}: {
  active: boolean;
  muted?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: active ? 'var(--bg-primary)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : muted ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        opacity: muted && !active ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
}
