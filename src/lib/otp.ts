// src/lib/otp.ts
// OTP generation and bcrypt-backed verification.
import bcrypt from 'bcryptjs'

/** Generate a 6-digit numeric OTP as a zero-padded string. */
export function generateOtp(): string {
  const n = Math.floor(Math.random() * 1_000_000)
  return n.toString().padStart(6, '0')
}

/** Bcrypt hash an OTP (cost 10). */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

/** Constant-time compare via bcrypt. */
export async function compareOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}
