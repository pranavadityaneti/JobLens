// src/lib/otp.test.ts
import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, compareOtp } from './otp'

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const otp = generateOtp()
    expect(otp).toMatch(/^\d{6}$/)
  })

  it('returns different values on subsequent calls', () => {
    const otps = new Set()
    for (let i = 0; i < 20; i++) otps.add(generateOtp())
    expect(otps.size).toBeGreaterThan(15)
  })
})

describe('hashOtp / compareOtp', () => {
  it('hashes an OTP and the hash matches on compare', async () => {
    const otp = '123456'
    const hash = await hashOtp(otp)
    expect(hash).not.toBe(otp)
    expect(await compareOtp(otp, hash)).toBe(true)
  })

  it('compare returns false for the wrong OTP', async () => {
    const hash = await hashOtp('123456')
    expect(await compareOtp('999999', hash)).toBe(false)
  })

  it('produces different hashes for the same input (salt)', async () => {
    const a = await hashOtp('123456')
    const b = await hashOtp('123456')
    expect(a).not.toBe(b)
  })
})
