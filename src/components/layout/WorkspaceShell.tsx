import React, { ReactNode } from 'react';
import TabBar from './TabBar';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, PanelImperativeHandle } from 'react-resizable-panels';
import { usePanelLayout } from '../../hooks/usePanelLayout';
import './WorkspaceShell.css';

interface WorkspaceShellProps {
  header?: ReactNode; // Replaces TabBar if needed, though TabBar is standard
  toolbar?: ReactNode;
  sidebarLeft?: ReactNode;
  sidebarLeftCollapsed?: boolean;
  onSidebarLeftCollapseChange?: (collapsed: boolean) => void;
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
  sidebarLeftCollapsed = false,
  onSidebarLeftCollapseChange,
  content,
  sidebarRight,
  sidebarRightCollapsed = false,
  onSidebarRightCollapseChange,
  statusBar,
  className = '',
  autoSaveId,
  defaultLayout = [20, 55, 25]
}: WorkspaceShellProps) {
  const { layout, onLayoutChange } = usePanelLayout(autoSaveId || 'workspace-shell-default', defaultLayout);

  const rightPanelRef = React.useRef<PanelImperativeHandle>(null);
  const leftPanelRef = React.useRef<PanelImperativeHandle>(null);
  const lastRightSizeRef = React.useRef<number>(25);
  const lastLeftSizeRef = React.useRef<number>(20);

  React.useEffect(() => {
    if (rightPanelRef.current) {
      if (sidebarRightCollapsed) {
        // Only save size if it wasn't already collapsed
        const currentSize = rightPanelRef.current.getSize().asPercentage ?? rightPanelRef.current.getSize();
        if ((currentSize as number) > 10) {
          lastRightSizeRef.current = currentSize as number;
        }
      } else {
        setTimeout(() => {
          if (rightPanelRef.current) {
            rightPanelRef.current.resize(lastRightSizeRef.current);
          }
        }, 0);
      }
    }
  }, [sidebarRightCollapsed]);

  React.useEffect(() => {
    if (leftPanelRef.current) {
      if (sidebarLeftCollapsed) {
        const currentSize = leftPanelRef.current.getSize().asPercentage ?? leftPanelRef.current.getSize();
        if ((currentSize as number) > 10) {
          lastLeftSizeRef.current = currentSize as number;
        }
      } else {
        setTimeout(() => {
          if (leftPanelRef.current) {
            leftPanelRef.current.resize(lastLeftSizeRef.current);
          }
        }, 0);
      }
    }
  }, [sidebarLeftCollapsed]);

  return (
    <div className={`workspace-shell-container ${className}`}>
      {header && <div className="workspace-shell-header">{header}</div>}

      {toolbar && <div className="workspace-shell-toolbar">{toolbar}</div>}

      <div className="workspace-shell-main">
        <PanelGroup
          orientation="horizontal"
          onLayoutChange={autoSaveId ? onLayoutChange as any : undefined}
          defaultLayout={layout as any}
        >
          {sidebarLeft && (
            <>
              <Panel
                panelRef={leftPanelRef}
                collapsible={false}
                collapsedSize="2"
                id="left"
                defaultSize="20"
                minSize={sidebarLeftCollapsed ? "2" : "25"}
                maxSize={sidebarLeftCollapsed ? "2" : undefined}
                className="workspace-shell-sidebar workspace-shell-sidebar-left">
                {sidebarLeft}
              </Panel>
              <ResizeHandle disabled={sidebarLeftCollapsed} />
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
