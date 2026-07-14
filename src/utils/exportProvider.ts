// ============================================================
// Export Framework Architecture
// Pluggable provider system for exporting data/visuals to various formats.
// ============================================================

import { toPng, toSvg } from 'html-to-image';

export type ExportFormat = 'PNG' | 'SVG' | 'JSON' | 'JFLAP';

export interface ExportContext {
  /** The root DOM element to export (for visual exports). */
  element?: HTMLElement | null;
  /** The state object to export (for data exports). */
  data?: any;
  /** Suggested filename without extension. */
  filename: string;
}

export interface ExportProvider {
  format: ExportFormat;
  canHandle: (context: ExportContext) => boolean;
  exportFile: (context: ExportContext) => Promise<void>;
  copyToClipboard?: (context: ExportContext) => Promise<void>;
}

// --------------------------------------------------
// Base Utilities
// --------------------------------------------------

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --------------------------------------------------
// Providers
// --------------------------------------------------

export const PNGExportProvider: ExportProvider = {
  format: 'PNG',
  canHandle: (ctx) => !!ctx.element,
  exportFile: async (ctx) => {
    if (!ctx.element) throw new Error('No element provided for PNG export.');
    const dataUrl = await toPng(ctx.element, { backgroundColor: '#ffffff' });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadBlob(blob, `${ctx.filename}.png`);
  },
  copyToClipboard: async (ctx) => {
    if (!ctx.element) throw new Error('No element provided for PNG export.');
    const dataUrl = await toPng(ctx.element, { backgroundColor: '#ffffff' });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } else {
      throw new Error('Clipboard API not supported.');
    }
  }
};

export const SVGExportProvider: ExportProvider = {
  format: 'SVG',
  canHandle: (ctx) => !!ctx.element,
  exportFile: async (ctx) => {
    if (!ctx.element) throw new Error('No element provided for SVG export.');
    const dataUrl = await toSvg(ctx.element, { backgroundColor: '#ffffff' });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadBlob(blob, `${ctx.filename}.svg`);
  },
  copyToClipboard: async (ctx) => {
    if (!ctx.element) throw new Error('No element provided for SVG export.');
    const dataUrl = await toSvg(ctx.element, { backgroundColor: '#ffffff' });
    const res = await fetch(dataUrl);
    const text = await res.text();
    // Copy as plain text so it can be pasted into editors
    await navigator.clipboard.writeText(text);
  }
};

export const JSONExportProvider: ExportProvider = {
  format: 'JSON',
  canHandle: (ctx) => !!ctx.data,
  exportFile: async (ctx) => {
    if (!ctx.data) throw new Error('No data provided for JSON export.');
    const jsonStr = JSON.stringify(ctx.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, `${ctx.filename}.json`);
  },
  copyToClipboard: async (ctx) => {
    if (!ctx.data) throw new Error('No data provided for JSON export.');
    const jsonStr = JSON.stringify(ctx.data, null, 2);
    await navigator.clipboard.writeText(jsonStr);
  }
};

// Registry to house all active export providers
export const exportProviders: ExportProvider[] = [
  PNGExportProvider,
  SVGExportProvider,
  JSONExportProvider
];

export const getProvider = (format: ExportFormat): ExportProvider | undefined => {
  return exportProviders.find((p) => p.format === format);
};
