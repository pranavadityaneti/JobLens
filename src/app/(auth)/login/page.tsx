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
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <header>
        <h1 className="text-2xl font-semibold">Sign in to JobLens</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send a one-time code to your WhatsApp.
        </p>
      </header>

      {step === 'phone' && (
        <form action={handleRequestOtp} className="flex flex-col gap-3">
          <label htmlFor="phone" className="text-sm font-medium">
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
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form action={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-sm">
            Code sent to <span className="font-medium">{phone}</span>.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setStep('phone')
                setError(null)
              }}
            >
              Change number
            </button>
          </p>
          <label htmlFor="otp" className="text-sm font-medium">
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
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </main>
  )
}
