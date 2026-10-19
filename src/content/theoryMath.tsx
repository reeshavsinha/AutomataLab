// Renders handbook math as Unicode + HTML sub/sup — not LaTeX (no MathJax in the app).

import type { CSSProperties, ReactNode } from 'react'

const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  n: 'ⁿ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', m: 'ᵐ', '+': '⁺', '*': '∗', '(': '⁽', ')': '⁾',
}

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  L: 'ₗ', m: 'ₘ', p: 'ₚ', i: 'ᵢ', j: 'ⱼ', n: 'ₙ', x: 'ₓ',
}

function toSuperScript(text: string): string {
  return [...text].map((ch) => SUPER[ch] ?? ch).join('')
}

function toSubScript(text: string): string {
  return [...text].map((ch) => SUB[ch] ?? ch).join('')
}

/** Decode HTML entities sometimes embedded in legacy formula strings. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Strip $...$ and convert common LaTeX fragments to Unicode. */
export function normalizeTheoryMath(input: string): string {
  let s = decodeEntities(input)
  s = s.replace(/\$([^$]+)\$/g, (_, inner) => inner)
  const latex: [RegExp, string][] = [
    [/\\le_m/g, '≤ₘ'],
    [/\\le_p/g, '≤ₚ'],
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\neq/g, '≠'],
    [/\\implies/g, '⇒'],
    [/\\iff/g, '⇔'],
    [/\\equiv/g, '≡'],
    [/\\not\\equiv/g, '≢'],
    [/\\in/g, '∈'],
    [/\\notin/g, '∉'],
    [/\\subseteq/g, '⊆'],
    [/\\cup/g, '∪'],
    [/\\cap/g, '∩'],
    [/\\emptyset/g, '∅'],
    [/\\forall/g, '∀'],
    [/\\exists/g, '∃'],
    [/\\Sigma/g, 'Σ'],
    [/\\Delta/g, 'Δ'],
    [/\\Gamma/g, 'Γ'],
    [/\\lambda/g, 'λ'],
    [/\\mu/g, 'μ'],
    [/\\phi/g, 'φ'],
    [/\\wedge/g, '∧'],
    [/\\to/g, '→'],
    [/\\{/g, '{'],
    [/\\}/g, '}'],
  ]
  for (const [re, rep] of latex) s = s.replace(re, rep)
  s = s.replace(/\\bar\{([^}]+)\}/g, (_, c: string) => `${c}\u0304`)
  s = s.replace(/\\overline\{([^}]+)\}/g, (_, c: string) => `${c}\u0305`)
  return s
}

/**
 * Parse ^ and _ into sup/sub elements when they are not inside already-unicode superscripts.
 * Prefers Unicode superscripts for single letters (a^i → aⁱ).
 */
export function renderTheoryMath(input: string, keyPrefix = 'm'): ReactNode {
  const s = normalizeTheoryMath(input)
  const nodes: ReactNode[] = []
  let buf = ''
  let i = 0
  let key = 0

  const flush = () => {
    if (buf) {
      nodes.push(buf)
      buf = ''
    }
  }

  while (i < s.length) {
    const ch = s[i]
    if (ch === '^') {
      flush()
      let j = i + 1
      let script = ''
      if (s[j] === '{') {
        const end = s.indexOf('}', j)
        if (end !== -1) {
          script = s.slice(j + 1, end)
          i = end + 1
        } else {
          script = s[j] ?? ''
          i = j + 1
        }
      } else {
        while (j < s.length && /[A-Za-z0-9*+()]/.test(s[j])) j++
        script = s.slice(i + 1, j)
        i = j
      }
      const uni = toSuperScript(script)
      if (uni.length === script.length && [...script].every((c) => SUPER[c])) {
        nodes.push(uni)
      } else {
        nodes.push(<sup key={`${keyPrefix}-${key++}`}>{script}</sup>)
      }
      continue
    }
    if (ch === '_') {
      flush()
      let j = i + 1
      let script = ''
      if (s[j] === '{') {
        const end = s.indexOf('}', j)
        if (end !== -1) {
          script = s.slice(j + 1, end)
          i = end + 1
        } else {
          script = s[j] ?? ''
          i = j + 1
        }
      } else {
        while (j < s.length && /[A-Za-z0-9]/.test(s[j])) j++
        script = s.slice(i + 1, j)
        i = j
      }
      const uni = toSubScript(script)
      if (uni.length === script.length && [...script].every((c) => SUB[c])) {
        nodes.push(uni)
      } else {
        nodes.push(<sub key={`${keyPrefix}-${key++}`}>{script}</sub>)
      }
      continue
    }
    buf += ch
    i++
  }
  flush()
  const hasElement = nodes.some((n) => typeof n !== 'string')
  if (!hasElement) return nodes.join('')
  return nodes.length === 1 ? nodes[0] : nodes
}

const codeBoxStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '10px 14px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '12px',
  color: 'var(--text-primary)',
  lineHeight: 1.5,
  overflowX: 'auto',
  margin: '8px 0 14px',
}

const inlineCodeStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '3px',
  padding: '2px 5px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '11.5px',
  color: 'var(--text-primary)',
}

export function TheoryMathInline({ children }: { children: string }) {
  return <code style={inlineCodeStyle}>{renderTheoryMath(children)}</code>
}

export function TheoryMathBox({ formula, label }: { formula: string; label?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '10px 16px',
        margin: '10px 0 14px',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '13px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflowX: 'auto',
        lineHeight: 1.55,
      }}
    >
      <span>{renderTheoryMath(formula, 'box')}</span>
      {label && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '12px', flexShrink: 0 }}>
          ({label})
        </span>
      )}
    </div>
  )
}

/** Language set like {aⁿ bⁿ | n ≥ 0} for inline use. */
export function langPattern(
  left: string,
  right?: string,
  condition?: string,
): string {
  const l = normalizeTheoryMath(left)
  const r = right ? ` ${normalizeTheoryMath(right)}` : ''
  const c = condition ? ` | ${normalizeTheoryMath(condition)}` : ''
  return `{${l}${r}${c}}`
}
