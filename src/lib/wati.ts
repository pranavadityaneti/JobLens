// src/lib/wati.ts
// Wati WhatsApp API client — send OTP via the approved template.
// Endpoint: POST {base}/api/v1/sendTemplateMessage?whatsappNumber={digits}

export async function sendOtpViaWati(
  phoneE164: string,
  otp: string,
): Promise<void> {
  const base = process.env.WATI_API_BASE_URL
  const key = process.env.WATI_API_KEY
  const templateName = process.env.WATI_OTP_TEMPLATE_NAME

  if (!base || !key || !templateName) {
    throw new Error('Wati env vars missing (BASE_URL / API_KEY / TEMPLATE_NAME)')
  }

  const digits = phoneE164.replace(/\D/g, '')
  const url = `${base}/api/v1/sendTemplateMessage?whatsappNumber=${digits}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_name: templateName,
      broadcast_name: 'joblens_otp',
      parameters: [{ name: '1', value: otp }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>')
    throw new Error(`Wati request failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as { result?: boolean; info?: string }
  if (json.result === false) {
    throw new Error(`Wati rejected message: ${json.info ?? 'unknown'}`)
  }
}
