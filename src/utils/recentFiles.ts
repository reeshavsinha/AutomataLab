// ============================================================
// Recent Files — persisted list of recently opened/saved machine
// files (Tauri only, where absolute paths are available).
// ============================================================

const STORAGE_KEY = 'automatalab-recent-files'
const MAX_RECENT = 8

export interface RecentFile {
  path: string
  name: string
}

export function getRecentFiles(): RecentFile[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((f) => f && typeof f.path === 'string')
      .map((f) => ({ path: String(f.path), name: String(f.name ?? f.path) }))
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function save(files: RecentFile[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files.slice(0, MAX_RECENT)))
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** Add (or move to front) a recently used file. Most-recent first, de-duplicated by path. */
export function addRecentFile(path: string, name: string): void {
  if (!path) return
  const existing = getRecentFiles().filter((f) => f.path !== path)
  save([{ path, name }, ...existing])
}

export function removeRecentFile(path: string): void {
  save(getRecentFiles().filter((f) => f.path !== path))
}

export function clearRecentFiles(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
