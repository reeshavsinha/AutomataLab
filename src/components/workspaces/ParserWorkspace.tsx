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
import { GrammarFirstFollowTab } from "./grammar/GrammarFirstFollowTab";
import TabBar from "../layout/TabBar";
import { WorkspaceShell } from "../layout/WorkspaceShell";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, PanelImperativeHandle } from 'react-resizable-panels';
import { usePanelLayout } from "../../hooks/usePanelLayout";
import { useParserStore } from "../../store/parserStore";

import "./ParserWorkspace.css";

import Toolbar from "../toolbar/Toolbar";

const ResizeHandle = ({ disabled }: { disabled?: boolean }) => (
  <PanelResizeHandle className="workspace-resize-handle" disabled={disabled}>
    <div className="workspace-resize-handle-inner" />
  </PanelResizeHandle>
);

export function ParserWorkspace({ definition }: { definition?: MachineDefinition }) {
  const [rightTab, setRightTab] = React.useState<'stack' | 'closure' | 'derivation' | 'firstfollow'>('stack');
  const { layout, onLayoutChange } = usePanelLayout('parser-workspace-middle-split-v3', [45, 55]);

  const handleCollapseTop = () => {
    setTopCollapsed(true);
    setBottomCollapsed(false);
  };

  const handleCollapseBottom = () => {
    setBottomCollapsed(true);
    setTopCollapsed(false);
  };

  const handleExpandTop = () => {
    setTopCollapsed(false);
  };

  const handleExpandBottom = () => {
    setBottomCollapsed(false);
  };

  const { simulation, algorithm } = useParserStore();
  const presentation = simulation?.presentation;

  const stackVis = presentation ? presentation.stackVisible : (algorithm !== 'CYK' && algorithm !== 'EARLEY');
  const closVis = presentation ? presentation.closureVisible : algorithm.includes('LR');
  const derVis = presentation ? presentation.derivationVisible : true;

  const tabs: Array<'stack' | 'closure' | 'derivation' | 'firstfollow'> = [];
  if (stackVis !== false) tabs.push('stack');
  if (closVis !== false) tabs.push('closure');
  if (derVis !== false) tabs.push('derivation');
  tabs.push('firstfollow');

  React.useEffect(() => {
    if (!tabs.includes(rightTab as any) && tabs.length > 0) {
      setRightTab(tabs[tabs.length - 1]);
    }
  }, [presentation, rightTab, tabs, algorithm]);

  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [topCollapsed, setTopCollapsed] = React.useState(false);
  const [bottomCollapsed, setBottomCollapsed] = React.useState(false);

  const topPanelRef = React.useRef<PanelImperativeHandle>(null);
  const bottomPanelRef = React.useRef<PanelImperativeHandle>(null);
  const topSizeRef = React.useRef(45);
  const bottomSizeRef = React.useRef(55);

  React.useEffect(() => {
    // We no longer need to imperatively resize using refs,
    // because we will conditionally unmount PanelGroup when collapsed!
  }, [topCollapsed, bottomCollapsed]);

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
      sidebarLeftCollapsed={leftCollapsed}
      onSidebarLeftCollapseChange={setLeftCollapsed}
      sidebarRightCollapsed={rightCollapsed}
      onSidebarRightCollapseChange={setRightCollapsed}
      sidebarLeft={
        leftCollapsed ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', alignItems: 'center', paddingTop: 8 }}>
            <button onClick={() => setLeftCollapsed(false)} title="Expand Panel" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>›</button>
            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: 24, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2, userSelect: 'none' }}>GRAMMAR</div>
          </div>
        ) : (
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <GrammarEditorPanel onCollapse={() => setLeftCollapsed(true)} />
            </div>
          </div>
        )
      }
      content={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          {topCollapsed ? (
            <>
              {/* Collapsed Top Panel (Fixed 32px) */}
              <div style={{ height: '32px', display: 'flex', flexDirection: 'row', background: 'var(--bg-secondary)', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>PARSE TABLE & AUTOMATON</div>
                <button onClick={handleExpandTop} title="Expand Panel" style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌄</button>
              </div>
              {/* Expanded Bottom Panel */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '32px', display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', paddingRight: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>SYNTAX TREE</div>
                  <button onClick={handleCollapseBottom} title="Collapse Panel" style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌄</button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  <SyntaxTreePanel />
                </div>
              </div>
            </>
          ) : bottomCollapsed ? (
            <>
              {/* Expanded Top Panel */}
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <ParseTablePanel onCollapse={handleCollapseTop} />
              </div>
              {/* Collapsed Bottom Panel (Fixed 32px) */}
              <div style={{ height: '32px', display: 'flex', flexDirection: 'row', background: 'var(--bg-secondary)', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>SYNTAX TREE</div>
                <button onClick={handleExpandBottom} title="Expand Panel" style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌃</button>
              </div>
            </>
          ) : (
            <PanelGroup
              orientation="vertical"
              onLayoutChange={onLayoutChange as any}
              defaultLayout={layout as any}
            >
              {/* Parse Table + Automaton (top) */}
              <Panel id="table" minSize={20} className="workspace-shell-content">
                <ParseTablePanel onCollapse={handleCollapseTop} />
              </Panel>

              {/* Visual separator between table and tree areas */}
              <ResizeHandle />

              {/* Syntax Tree (bottom) */}
              <Panel id="tree" minSize={20} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '32px', display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', paddingRight: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>SYNTAX TREE</div>
                    <button onClick={handleCollapseBottom} title="Collapse Panel" style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌄</button>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    <SyntaxTreePanel />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          )}

          {/* Timeline bar */}
          <TimelinePanel />
        </div>
      }
      sidebarRight={
        rightCollapsed ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', alignItems: 'center', paddingTop: 8 }}>
            <button onClick={() => setRightCollapsed(false)} title="Expand Panel" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>‹</button>
            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: 24, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 2, userSelect: 'none' }}>ANALYSIS</div>
          </div>
        ) : (
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="parser-right-tabs" style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
              overflowX: 'auto',
              scrollbarWidth: 'thin',
            }}>
              <button onClick={() => setRightCollapsed(true)} title="Collapse Panel" style={{ padding: '0 8px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>›</button>
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    // Let each tab size itself from its label. Equal flex
                    // widths made short labels look padded while longer ones
                    // collapsed into their neighbours at narrow widths.
                    flex: '0 0 auto',
                    minWidth: 0,
                    padding: '6px 12px',
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
                  {tab === 'firstfollow' ? 'First/Follow' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {rightTab === 'stack' && <StackViewerPanel />}
              {rightTab === 'closure' && <ClosureGotoPanel />}
              {rightTab === 'derivation' && <DerivationPanel />}
              {rightTab === 'firstfollow' && <div style={{ height: '100%', overflowY: 'auto' }}><GrammarFirstFollowTab /></div>}
            </div>
          </div>
        )
      }
    />
  );
}
