// src/lib/phone.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeIndianPhone } from './phone'

describe('normalizeIndianPhone', () => {
  it('accepts a bare 10-digit Indian number and adds +91', () => {
    expect(normalizeIndianPhone('9959777027')).toBe('+919959777027')
  })

  it('accepts an "091" prefix and converts to E.164', () => {
    expect(normalizeIndianPhone('09959777027')).toBe('+919959777027')
  })

  it('accepts "+91 99597 77027" with spaces', () => {
    expect(normalizeIndianPhone('+91 99597 77027')).toBe('+919959777027')
  })

  it('accepts "91-9959777027" with hyphen', () => {
    expect(normalizeIndianPhone('91-9959777027')).toBe('+919959777027')
  })

  it('rejects numbers that are too short', () => {
    expect(normalizeIndianPhone('99597')).toBeNull()
  })

  it('rejects numbers that are too long', () => {
    expect(normalizeIndianPhone('+919959777027000')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(normalizeIndianPhone('')).toBeNull()
  })

  it('rejects null/undefined', () => {
    expect(normalizeIndianPhone(null as unknown as string)).toBeNull()
    expect(normalizeIndianPhone(undefined as unknown as string)).toBeNull()
  })

  it('rejects letters', () => {
    expect(normalizeIndianPhone('99597abc27')).toBeNull()
  })
})
