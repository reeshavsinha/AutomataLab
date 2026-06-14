// ============================================================
// AutomataLab — Diagram image export (v4.0, PRD FR-6.3 "Export as PNG/SVG")
// Renders the current machine to a standalone SVG (via the pure `machineToSVG`)
// and either saves the vector directly or rasterises it to a PNG. Save uses a
// native dialog under Tauri (binary write for PNG) and an anchor download on web.
// ============================================================

import type { MachineDefinition } from '@/engines/core/types'
import { isTauri } from '@tauri-apps/api/core'
import { machineToSVG, LIGHT_COLORS, DARK_COLORS, type DiagramSvgResult } from '@/utils/diagramSvg'
import { downloadText, fileStem } from '@/utils/exporters'

/** Render the whole machine (real states + text notes) to SVG for export. */
function renderFullSvg(machine: MachineDefinition, dark: boolean): DiagramSvgResult {
  return machineToSVG(machine, {
    colors: dark ? DARK_COLORS : LIGHT_COLORS,
    includeTextNodes: true,
    padding: 56,
  })
}

/** Export the diagram as a standalone .svg file. Returns the path/filename or null. */
export async function exportDiagramSVG(machine: MachineDefinition, dark = false): Promise<string | null> {
  const { svg } = renderFullSvg(machine, dark)
  return downloadText(`${fileStem(machine)}.svg`, svg, 'svg')
}

/** Rasterise the SVG to a PNG blob at `scale`× the natural size (DOM required). */
async function svgToPngBlob(result: DiagramSvgResult, scale: number): Promise<Blob> {
  const { svg, width, height } = result
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Failed to rasterise the diagram.'))
      i.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG encoding failed.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Export the diagram as a .png file at `scale`× resolution. Returns path/filename or null. */
export async function exportDiagramPNG(machine: MachineDefinition, dark = false, scale = 2): Promise<string | null> {
  const result = renderFullSvg(machine, dark)
  const blob = await svgToPngBlob(result, scale)
  const filename = `${fileStem(machine)}.png`

  try {
    if (isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({ defaultPath: filename, filters: [{ name: 'PNG', extensions: ['png'] }] })
      if (!path) return null
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
      return path
    }
  } catch {
    // fall through to the web download path
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return filename
}
