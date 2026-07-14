import React, { ReactNode } from 'react';
import './WorkspaceSidePanel.css';

interface WorkspaceSidePanelProps {
  children: ReactNode;
  position: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export function WorkspaceSidePanel({ children, position, className = '', style }: WorkspaceSidePanelProps) {
  return (
    <div 
      className={`workspace-sidepanel workspace-sidepanel-${position} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface WorkspacePanelSectionProps {
  title?: string;
  children: ReactNode;
  flex?: number | string;
  className?: string;
}

export function WorkspacePanelSection({ title, children, flex = 'none', className = '' }: WorkspacePanelSectionProps) {
  return (
    <div className={`workspace-panel-section ${className}`} style={{ flex }}>
      {title && (
        <div className="workspace-panel-header">
          {title}
        </div>
      )}
      <div className="workspace-panel-content">
        {children}
      </div>
    </div>
  );
}
