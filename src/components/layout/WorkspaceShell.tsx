import React, { ReactNode } from 'react';
import TabBar from './TabBar';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, PanelImperativeHandle } from 'react-resizable-panels';
import { usePanelLayout } from '../../hooks/usePanelLayout';
import './WorkspaceShell.css';

interface WorkspaceShellProps {
  header?: ReactNode; // Replaces TabBar if needed, though TabBar is standard
  toolbar?: ReactNode;
  sidebarLeft?: ReactNode;
  content: ReactNode;
  sidebarRight?: ReactNode;
  sidebarRightCollapsed?: boolean;
  onSidebarRightCollapseChange?: (collapsed: boolean) => void;
  statusBar?: ReactNode;
  className?: string;
  autoSaveId?: string;
  defaultLayout?: number[];
}

const ResizeHandle = ({ disabled }: { disabled?: boolean }) => (
  <PanelResizeHandle className="workspace-resize-handle" disabled={disabled}>
    <div className="workspace-resize-handle-inner" />
  </PanelResizeHandle>
);

export function WorkspaceShell({
  header = <TabBar />,
  toolbar,
  sidebarLeft,
  content,
  sidebarRight,
  sidebarRightCollapsed = false,
  onSidebarRightCollapseChange,
  statusBar,
  className = '',
  autoSaveId,
  defaultLayout = [20, 55, 25]
}: WorkspaceShellProps) {
  const { layout, onLayoutChange } = usePanelLayout(autoSaveId || 'workspace-shell-default', {
    left: defaultLayout[0],
    content: defaultLayout[1],
    right: defaultLayout[2]
  });

  const rightPanelRef = React.useRef<PanelImperativeHandle>(null);
  const lastSizeRef = React.useRef<number>(25);

  React.useEffect(() => {
    if (rightPanelRef.current) {
      if (sidebarRightCollapsed) {
        // Only save size if it wasn't already collapsed
        const currentSize = rightPanelRef.current.getSize().asPercentage ?? rightPanelRef.current.getSize(); // fallback if library version differs
        if ((currentSize as number) > 10) {
          lastSizeRef.current = currentSize as number;
        }
      } else {
        // Wait a tick for minSize/maxSize DOM updates to apply before resizing back
        setTimeout(() => {
          if (rightPanelRef.current) {
            rightPanelRef.current.resize(lastSizeRef.current);
          }
        }, 0);
      }
    }
  }, [sidebarRightCollapsed]);

  return (
    <div className={`workspace-shell-container ${className}`}>
      {header && <div className="workspace-shell-header">{header}</div>}

      {toolbar && <div className="workspace-shell-toolbar">{toolbar}</div>}

      <div className="workspace-shell-main">
        <PanelGroup
          orientation="horizontal"
          onLayoutChange={autoSaveId ? onLayoutChange : undefined}
          defaultLayout={layout}
        >
          {sidebarLeft && (
            <>
              <Panel id="left" defaultSize="20" minSize="25" className="workspace-shell-sidebar workspace-shell-sidebar-left">
                {sidebarLeft}
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel id="content" minSize="30" className="workspace-shell-content">
            {content}
          </Panel>

          {sidebarRight && (
            <>
              <ResizeHandle disabled={sidebarRightCollapsed} />
              <Panel
                panelRef={rightPanelRef}
                collapsible={false}
                collapsedSize="2"
                id="right"
                defaultSize="25"
                minSize={sidebarRightCollapsed ? "2" : "20"}
                maxSize={sidebarRightCollapsed ? "2" : undefined}
                className="workspace-shell-sidebar workspace-shell-sidebar-right">
                {sidebarRight}
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {statusBar && <div className="workspace-shell-statusbar">{statusBar}</div>}
    </div>
  );
}
