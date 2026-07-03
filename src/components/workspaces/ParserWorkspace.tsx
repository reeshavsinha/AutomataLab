import React from "react";
import type { MachineDefinition } from "../../engines/machine/core/types";
import { GrammarEditorPanel } from "./parser/GrammarEditorPanel";
import { ParseTablePanel } from "./parser/ParseTablePanel";
import { SyntaxTreePanel } from "./parser/SyntaxTreePanel";
import { StackViewerPanel } from "./parser/StackViewerPanel";
import { ClosureGotoPanel } from "./parser/ClosureGotoPanel";
import { DerivationPanel } from "./parser/DerivationPanel";
import { TimelinePanel } from "./parser/TimelinePanel";
import { InputBufferPanel } from "./parser/InputBufferPanel";
import TabBar from "../layout/TabBar";
import { WorkspaceShell } from "../layout/WorkspaceShell";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { usePanelLayout } from "../../hooks/usePanelLayout";
import { useParserStore } from "../../store/parserStore";

import "./ParserWorkspace.css";

import Toolbar from "../toolbar/Toolbar";

const ResizeHandle = () => (
  <PanelResizeHandle className="workspace-resize-handle">
    <div className="workspace-resize-handle-inner" />
  </PanelResizeHandle>
);

export function ParserWorkspace({ definition }: { definition?: MachineDefinition }) {
  const [rightTab, setRightTab] = React.useState<'stack' | 'closure' | 'derivation'>('stack');
  const { layout, onLayoutChange } = usePanelLayout('parser-workspace-vertical-split', {
    table: 45,
    tree: 55
  });
  const { simulation, algorithm } = useParserStore();
  const presentation = simulation?.presentation;

  const stackVis = presentation ? presentation.stackVisible : (algorithm !== 'CYK' && algorithm !== 'EARLEY');
  const closVis = presentation ? presentation.closureVisible : algorithm.includes('LR');
  const derVis = presentation ? presentation.derivationVisible : true;

  const tabs: Array<'stack' | 'closure' | 'derivation'> = [];
  if (stackVis !== false) tabs.push('stack');
  if (closVis !== false) tabs.push('closure');
  if (derVis !== false) tabs.push('derivation');

  React.useEffect(() => {
    if (!tabs.includes(rightTab as any) && tabs.length > 0) {
      setRightTab(tabs[tabs.length - 1]);
    }
  }, [presentation, rightTab, tabs, algorithm]);

  return (
    <WorkspaceShell
      autoSaveId="parser-workspace-v7"
      defaultLayout={[22, 56, 22]}
      header={<TabBar />}
      toolbar={
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Toolbar />
          <InputBufferPanel />
        </div>
      }
      sidebarLeft={
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <GrammarEditorPanel />
        </div>
      }
      content={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          <PanelGroup
            orientation="vertical"
            onLayoutChange={onLayoutChange}
            defaultLayout={layout}
          >
            {/* Parse Table + Automaton (top) */}
            <Panel id="table" minSize={20} className="workspace-shell-content" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <ParseTablePanel />
            </Panel>

            {/* Visual separator between table and tree areas */}
            <ResizeHandle />

            {/* Syntax Tree (bottom) */}
            <Panel id="tree" minSize={20} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}>
              <SyntaxTreePanel />
            </Panel>
          </PanelGroup>

          {/* Timeline bar */}
          <TimelinePanel />
        </div>
      }
      sidebarRight={
        <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: '1px solid var(--border-subtle)',
                  background: rightTab === tab ? 'var(--trace-ring)' : 'transparent',
                  color: rightTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rightTab === 'stack' && <StackViewerPanel />}
            {rightTab === 'closure' && <ClosureGotoPanel />}
            {rightTab === 'derivation' && <DerivationPanel />}
          </div>
        </div>
      }
    />
  );
}
