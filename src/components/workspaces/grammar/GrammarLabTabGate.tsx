import React from 'react';
import type { GrammarLabTab } from '@/engines/grammar/grammarLabCapabilities';
import { getGrammarLabTabs } from '@/engines/grammar/grammarLabCapabilities';
import type { GrammarFormat } from '@/engines/machine/core/types';

export function GrammarLabTabGate({
  format,
  tabId,
  children,
}: {
  format: GrammarFormat;
  tabId: GrammarLabTab;
  children: React.ReactNode;
}) {
  const descriptor = getGrammarLabTabs(format).find((t) => t.id === tabId);
  if (descriptor?.available) {
    return <>{children}</>;
  }

  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: 1.6 }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.25 }}>ⓘ</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        {descriptor?.label ?? 'Tab'} is not available for this format
      </div>
      <div style={{ fontSize: '0.8rem', marginTop: '8px', maxWidth: 420, margin: '8px auto 0' }}>
        {descriptor?.unavailableReason ?? 'This tab does not apply to the current format. Try Properties or press F2 for which tools match each Chomsky type.'}
      </div>
    </div>
  );
}
