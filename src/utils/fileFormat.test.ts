import { describe, expect, it } from 'vitest'
import {
  AUTOMATALAB_FILE_FORMAT_VERSION,
  readFileFormatVersion,
} from './fileFormat'

describe('AutomataLab project-file version contract', () => {
  it('uses the current version for missing or invalid metadata', () => {
    expect(readFileFormatVersion(undefined)).toBe(AUTOMATALAB_FILE_FORMAT_VERSION)
    expect(readFileFormatVersion('not-a-version')).toBe(AUTOMATALAB_FILE_FORMAT_VERSION)
    expect(readFileFormatVersion(0)).toBe(AUTOMATALAB_FILE_FORMAT_VERSION)
  })

  it('accepts numeric versions and historical semver-like strings', () => {
    expect(readFileFormatVersion(1)).toBe(1)
    expect(readFileFormatVersion(2.9)).toBe(2)
    expect(readFileFormatVersion('1.0.0')).toBe(1)
    expect(readFileFormatVersion('2.4.1')).toBe(2)
  })
})
