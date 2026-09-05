// ============================================================
// AutomataLab project-file contract.
//
// Persisted files use a numeric major version. The loader accepts the
// historical "1.0.0" string as a compatibility case and normalizes it
// to the current major version.
// ============================================================

export const AUTOMATALAB_FILE_FORMAT_VERSION = 2

export function readFileFormatVersion(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw)
  }

  if (typeof raw === 'string') {
    const major = raw.trim().match(/^(\d+)(?:\.\d+)*$/)?.[1]
    if (major) return Number(major)
  }

  return AUTOMATALAB_FILE_FORMAT_VERSION
}
