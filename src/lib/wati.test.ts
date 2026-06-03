// src/lib/wati.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendOtpViaWati } from './wati'

describe('sendOtpViaWati', () => {
  beforeEach(() => {
    vi.stubEnv('WATI_API_KEY', 'test-key')
    vi.stubEnv('WATI_API_BASE_URL', 'https://example.wati.io/12345')
    vi.stubEnv('WATI_OTP_TEMPLATE_NAME', 'otp')
  })

  it('calls Wati Send Template endpoint with correct payload', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ result: true }), { status: 200 }),
    )

    await sendOtpViaWati('+919876543210', '123456')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('https://example.wati.io/12345/api/v1/sendTemplateMessage')
    expect(url).toContain('whatsappNumber=919876543210')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    })
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.template_name).toBe('otp')
    expect(body.parameters).toEqual([{ name: '1', value: '123456' }])
  })

  it('throws on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    )
    await expect(sendOtpViaWati('+919876543210', '123456')).rejects.toThrow(/Wati/)
  })

  it('throws when Wati responds with result:false', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ result: false, info: 'rejected' }), { status: 200 }),
    )
    await expect(sendOtpViaWati('+919876543210', '123456')).rejects.toThrow(/rejected/)
  })
})
