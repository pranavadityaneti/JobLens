// src/app/(auth)/login/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestOtp, verifyOtp } from './actions'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRequestOtp = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await requestOtp(formData)
      if (result.ok) {
        setPhone(result.phone)
        setStep('otp')
      } else {
        setError(result.error)
      }
    })
  }

  const handleVerifyOtp = (formData: FormData) => {
    setError(null)
    formData.set('phone', phone)
    startTransition(async () => {
      const result = await verifyOtp(formData)
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            JobLens
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Indian jobs, AI-assisted.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-zinc-950">Sign in</h2>
            <p className="mt-1 text-sm text-zinc-500">
              We&apos;ll send a one-time code to your WhatsApp.
            </p>
          </header>

          {step === 'phone' && (
            <form action={handleRequestOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-zinc-700"
                >
                  WhatsApp number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9XXXXXXXXX"
                  autoComplete="tel"
                  required
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form action={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="text-sm text-zinc-600">
                Code sent to{' '}
                <span className="font-medium text-zinc-900">{phone}</span>.{' '}
                <button
                  type="button"
                  className="text-emerald-600 underline-offset-2 hover:underline"
                  onClick={() => {
                    setStep('phone')
                    setError(null)
                  }}
                >
                  Change
                </button>
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="otp"
                  className="text-sm font-medium text-zinc-700"
                >
                  6-digit code
                </label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </form>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
