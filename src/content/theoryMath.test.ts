import { describe, expect, it } from 'vitest'
import { normalizeTheoryMath, renderTheoryMath } from './theoryMath'

describe('theoryMath', () => {
  it('normalizes LaTeX-style fragments', () => {
    expect(normalizeTheoryMath('$A \\le_m B$')).toBe('A ≤ₘ B')
    expect(normalizeTheoryMath('x \\neq y')).toBe('x ≠ y')
    expect(normalizeTheoryMath('&#123;ε&#125;')).toBe('{ε}')
  })

  it('renders subscripts for indistinguishability', () => {
    const rendered = renderTheoryMath('x ≡_L y ⇔ ∀ z ∈ Σ*')
    expect(rendered).toBe('x ≡ₗ y ⇔ ∀ z ∈ Σ*')
  })

  it('renders superscripts for pumping-style strings', () => {
    expect(renderTheoryMath('a^i')).toBe('aⁱ')
  })
})
