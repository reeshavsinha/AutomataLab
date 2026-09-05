/** True when a window-level application shortcut must not escape its owner. */
export function shouldSuppressGlobalShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[role="dialog"], [data-keyboard-suppress="true"]')) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}
