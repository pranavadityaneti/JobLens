// src/app/(auth)/login/actions.ts
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { normalizeIndianPhone } from '@/lib/phone'
import { generateOtp, hashOtp, compareOtp } from '@/lib/otp'
import { sendOtpViaWati } from '@/lib/wati'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabaseServer } from '@/lib/supabase/server'

const MAX_ATTEMPTS = 5

/**
 * Synthesize an internal email for phone-only users.
 * Never shown to the user, never used for delivery. Required by Supabase
 * to mint a session via generateLink(magiclink).
 */
function syntheticEmail(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  return `phone-${digits}@joblens.internal`
}

/**
 * Request OTP for a phone number.
 * - Validates and normalizes the phone (Indian E.164).
 * - If the phone matches TEST_PHONE_NUMBER, skips Wati but still stores a
 *   hashed record using TEST_OTP so verifyOtp path stays uniform.
 * - Otherwise generates an OTP, stores the hash, sends via Wati.
 */
export async function requestOtp(
  formData: FormData,
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const raw = formData.get('phone')
  const parsed = z.string().min(1).safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Phone is required.' }

  const phone = normalizeIndianPhone(parsed.data)
  if (!phone) return { ok: false, error: 'Enter a valid Indian mobile number.' }

  const supabase = getSupabaseAdmin()

  const isTestPhone = phone === process.env.TEST_PHONE_NUMBER
  const otp = isTestPhone ? (process.env.TEST_OTP ?? '123456') : generateOtp()

  const otpHash = await hashOtp(otp)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error: insertErr } = await supabase
    .from('otp_requests')
    .insert({ phone, otp_hash: otpHash, expires_at: expiresAt })

  if (insertErr) {
    console.error('otp_requests insert failed', insertErr)
    return { ok: false, error: 'Could not start login. Try again.' }
  }

  if (!isTestPhone) {
    try {
      await sendOtpViaWati(phone, otp)
    } catch (err) {
      console.error('Wati send failed', err)
      return { ok: false, error: 'Could not send WhatsApp OTP. Try again.' }
    }
  }

  return { ok: true, phone }
}

/**
 * Verify the OTP submitted by the user. On success, find-or-create the
 * Supabase auth user by phone and mint a session via the magic-link pattern.
 */
export async function verifyOtp(
  formData: FormData,
): Promise<{ ok: false; error: string } | void> {
  const phoneRaw = formData.get('phone')
  const otpRaw = formData.get('otp')

  const phone = typeof phoneRaw === 'string' ? normalizeIndianPhone(phoneRaw) : null
  if (!phone) return { ok: false, error: 'Invalid phone.' }

  const otp = typeof otpRaw === 'string' ? otpRaw.trim() : ''
  if (!/^\d{6}$/.test(otp)) return { ok: false, error: 'Enter the 6-digit code.' }

  const admin = getSupabaseAdmin()

  // Find the most recent unexpired OTP for this phone.
  const { data: rows, error: fetchErr } = await admin
    .from('otp_requests')
    .select('id, otp_hash, expires_at, attempts')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)

  if (fetchErr || !rows || rows.length === 0) {
    return { ok: false, error: 'No active OTP. Request a new one.' }
  }
  const row = rows[0]

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Code expired. Request a new one.' }
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Try a new code.' }
  }

  // Increment attempts up-front (mitigates timing-based brute force).
  await admin
    .from('otp_requests')
    .update({ attempts: row.attempts + 1 })
    .eq('id', row.id)

  const matched = await compareOtp(otp, row.otp_hash)
  if (!matched) return { ok: false, error: 'Incorrect code.' }

  // Burn the OTP — no replay.
  await admin.from('otp_requests').delete().eq('id', row.id)

  // Find-or-create user
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  let userEmail: string

  if (profile) {
    // Existing user — fetch their synthetic email
    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(
      profile.id,
    )
    if (getErr || !existing.user?.email) {
      console.error('getUserById failed', getErr)
      return { ok: false, error: 'Account lookup failed.' }
    }
    userEmail = existing.user.email
  } else {
    // New user — create with phone + synthetic email
    userEmail = syntheticEmail(phone)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone: phone.replace('+', ''),
      email: userEmail,
      phone_confirm: true,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      console.error('createUser failed', createErr)
      return { ok: false, error: 'Could not create account. Try again.' }
    }

    const { error: profileErr } = await admin
      .from('profiles')
      .insert({ id: created.user.id, phone })
    if (profileErr) {
      console.error('profile insert failed', profileErr)
      return { ok: false, error: 'Profile setup failed.' }
    }
  }

  // Mint a session via the magic-link pattern.
  // 1) Admin generates a one-time magic link for the synthetic email.
  // 2) Server client (cookie-aware) verifies the link's hashed token, which
  //    sets the auth session cookie on the response.
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    })
  if (linkErr || !linkData.properties?.hashed_token) {
    console.error('generateLink failed', linkErr)
    return { ok: false, error: 'Login session setup failed.' }
  }

  const server = await getSupabaseServer()
  const { error: verifyErr } = await server.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })
  if (verifyErr) {
    console.error('verifyOtp (session mint) failed', verifyErr)
    return { ok: false, error: 'Login failed. Try again.' }
  }

  redirect('/')
}
