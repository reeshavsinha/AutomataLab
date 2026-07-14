// ============================================================
// Toolbar icons — small monochrome SVGs that inherit currentColor.
// Used by the classic MenuBar + icon Toolbar. Rendered ~16px.
// ============================================================

type IconProps = { size?: number }

function S({ size = 16, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function NewIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </S>
  )
}

export function OpenIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </S>
  )
}

export function SaveIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </S>
  )
}

export function ExportIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </S>
  )
}

export function UndoIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-5" />
    </S>
  )
}

export function RedoIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h5" />
    </S>
  )
}

export function CutIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </S>
  )
}

export function CopyIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </S>
  )
}

export function PasteIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </S>
  )
}

export function DeleteIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </S>
  )
}

export function ZoomInIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </S>
  )
}

export function ZoomOutIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </S>
  )
}

export function FitIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </S>
  )
}

export function LayoutIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <line x1="7" y1="7" x2="10.5" y2="16" />
      <line x1="17" y1="7" x2="13.5" y2="16" />
    </S>
  )
}

export function PlayIcon({ size = 16 }: IconProps) {
  // Filled green play — the conventional "run" affordance.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4" fill="#2e9e44" stroke="#1f7a32" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}

export function PauseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="#9a6700" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="#9a6700" />
    </svg>
  )
}

export function StepIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 4 15 12 5 20 5 4" />
      <rect x="16" y="4" width="3" height="16" rx="1" />
    </svg>
  )
}

export function StepBackIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="3" height="16" rx="1" />
      <polygon points="19 4 9 12 19 20 19 4" />
    </svg>
  )
}

export function ResetIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </S>
  )
}

export function ConvertIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <polyline points="17 2 21 6 17 10" />
      <path d="M21 6H9a4 4 0 0 0-4 4" />
      <polyline points="7 22 3 18 7 14" />
      <path d="M3 18h12a4 4 0 0 0 4-4" />
    </S>
  )
}

export function ThemeIcon({ size = 16 }: IconProps & { dark?: boolean }) {
  return (
    <S size={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </S>
  )
}

export function HelpIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 2-2.6 2.4-2.6 4" />
      <line x1="12" y1="17.5" x2="12" y2="17.5" />
    </S>
  )
}

export function AnalyzeIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </S>
  )
}

export function GrammarLabIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </S>
  )
}

export function ParserStudioIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <polyline points="10 9 15 4 20 9" />
      <path d="M4 20h16" />
      <path d="M15 4v12" />
      <path d="M15 16l-5-5" />
    </S>
  )
}

export function MachineWorkspaceIcon({ size }: IconProps) {
  return (
    <S size={size}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </S>
  )
}
