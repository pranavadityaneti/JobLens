// src/lib/phone.ts
// Normalize Indian phone numbers to E.164 (+91XXXXXXXXXX).
// Returns null for invalid input. MVP is India-only.

export function normalizeIndianPhone(input: string): string | null {
  if (typeof input !== 'string' || input.length === 0) return null

  // Strip everything except digits
  const digits = input.replace(/\D/g, '')

  // Indian mobile numbers are 10 digits. With country code: 12 digits (91XXXXXXXXXX).
  // Allow leading 0 (e.g. "09959777027" — 11 digits, the leading 0 is local dial)
  let phone10: string | null = null

  if (digits.length === 10) {
    phone10 = digits
  } else if (digits.length === 11 && digits.startsWith('0')) {
    phone10 = digits.slice(1)
  } else if (digits.length === 12 && digits.startsWith('91')) {
    phone10 = digits.slice(2)
  } else {
    return null
  }

  // Indian mobile numbers start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(phone10)) return null

  return `+91${phone10}`
}
