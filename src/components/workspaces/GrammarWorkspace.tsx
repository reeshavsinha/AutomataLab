import React from "react";
import { GrammarEditorPanel } from "./parser/GrammarEditorPanel";
import { GrammarToolsPanel } from "./grammar/GrammarToolsPanel";
import { GrammarStatusBar } from "./grammar/GrammarStatusBar";
import TabBar from "../layout/TabBar";
import { WorkspaceShell } from "../layout/WorkspaceShell";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { usePanelLayout } from "../../hooks/usePanelLayout";
import Toolbar from "../toolbar/Toolbar";

const ResizeHandle = () => (
  <PanelResizeHandle className="workspace-resize-handle">
    <div className="workspace-resize-handle-inner" />
  </PanelResizeHandle>
);

export function GrammarWorkspace() {
  const { layout, onLayoutChange } = usePanelLayout('grammar-workspace-main', [40, 60]);

  return (
    <WorkspaceShell
      header={<TabBar />}
      toolbar={<Toolbar />}
      statusBar={
        <GrammarStatusBar />
      }
      content={
        <PanelGroup orientation="horizontal" onLayoutChange={onLayoutChange as any} defaultLayout={layout as any}>
          <Panel id="editor" defaultSize={40} minSize={20}>
            <GrammarEditorPanel />
          </Panel>
          <ResizeHandle />
          <Panel id="tools" defaultSize={60} minSize={20}>
            <GrammarToolsPanel />
          </Panel>
        </PanelGroup>
      }
    />
  );
}
