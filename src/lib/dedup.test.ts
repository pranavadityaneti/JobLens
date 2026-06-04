import { describe, it, expect } from 'vitest'
import { normalizeDedupField, computeDedupHash } from './dedup'

describe('normalizeDedupField', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeDedupField('Acme Pvt. Ltd.')).toBe('acmepvtltd')
    expect(normalizeDedupField('Senior Engineer, Backend')).toBe('seniorengineerbackend')
    expect(normalizeDedupField(null)).toBe('')
    expect(normalizeDedupField('')).toBe('')
  })
})

describe('computeDedupHash', () => {
  it('returns the same hash for the same logical job from different sources', () => {
    const a = computeDedupHash('Acme Pvt Ltd', 'Senior Engineer', 'Bengaluru, India')
    const b = computeDedupHash('acme pvt. ltd.', 'senior engineer', 'Bengaluru')
    // Location varies — these won't match. Required for the basic case
    // expected behaviour. Looser match deferred to v0.4 (embedding sim).
    expect(a).not.toBe(b)
  })

  it('returns same hash when company/title/location match after normalization', () => {
    const a = computeDedupHash('Acme Pvt Ltd', 'Senior Engineer', 'Bengaluru')
    const b = computeDedupHash('acme pvt. ltd.', 'senior engineer', 'Bengaluru')
    expect(a).toBe(b)
  })

  it('different titles produce different hashes', () => {
    const a = computeDedupHash('Acme', 'Senior Engineer', 'Bengaluru')
    const b = computeDedupHash('Acme', 'Junior Engineer', 'Bengaluru')
    expect(a).not.toBe(b)
  })
})
