import React from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { PNGExportProvider, SVGExportProvider } from '@/utils/exportProvider';
import { toast } from '@/store/toastStore';

interface Props {
  filename: string;
}

export function ReactFlowExportControls({ filename }: Props) {
  const { getViewport } = useReactFlow();

  const handleExport = async (format: 'PNG' | 'SVG', action: 'download' | 'copy') => {
    // Select the ReactFlow viewport element
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;

    // ReactFlow viewport can have transforms applied, we might need to reset or apply a specific bounds
    // but html-to-image handles transforms relatively well if the container is right.
    const container = element.parentElement as HTMLElement;
    
    const context = {
      element: container,
      filename
    };

    try {
      if (format === 'PNG') {
        if (action === 'download') await PNGExportProvider.exportFile(context);
        else await PNGExportProvider.copyToClipboard?.(context);
      } else {
        if (action === 'download') await SVGExportProvider.exportFile(context);
        else await SVGExportProvider.copyToClipboard?.(context);
      }
      toast.success(action === 'download' ? `Exported ${format}` : `Copied ${format}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} ${format}`);
    }
  };

  return (
    <Panel position="top-right" style={{ display: 'flex', gap: '4px' }}>
      <div className="flex gap-1 bg-surface-100 p-1 rounded-md border border-surface-300 shadow-sm">
        <button
          onClick={() => handleExport('PNG', 'copy')}
          className="p-1.5 hover:bg-surface-200 rounded text-sm text-text-secondary flex items-center gap-1"
          title="Copy PNG"
        >
          Copy PNG
        </button>
        <button
          onClick={() => handleExport('PNG', 'download')}
          className="p-1.5 hover:bg-surface-200 rounded text-sm text-text-secondary flex items-center gap-1"
          title="Download PNG"
        >
          Export PNG
        </button>
        <div className="w-px bg-surface-300 mx-1" />
        <button
          onClick={() => handleExport('SVG', 'copy')}
          className="p-1.5 hover:bg-surface-200 rounded text-sm text-text-secondary flex items-center gap-1"
          title="Copy SVG"
        >
          Copy SVG
        </button>
        <button
          onClick={() => handleExport('SVG', 'download')}
          className="p-1.5 hover:bg-surface-200 rounded text-sm text-text-secondary flex items-center gap-1"
          title="Download SVG"
        >
          Export SVG
        </button>
      </div>
    </Panel>
  );
}
