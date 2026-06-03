// src/components/jobs/company-logo.tsx
'use client'

import { useState } from 'react'

/**
 * Curated company → domain overrides for the most common companies that
 * appear in our Indian feed. The heuristic guess fails for many of these
 * (e.g. "Tata Consultancy Services" → "tataconsultancyservices.com" which
 * doesn't exist). Curated map keeps logos working for top employers.
 *
 * Keys are normalized via `normalize()` below so input matching is case-
 * and whitespace-insensitive.
 */
const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Indian IT services
  'tata consultancy services': 'tcs.com',
  'tcs': 'tcs.com',
  'infosys': 'infosys.com',
  'wipro': 'wipro.com',
  'hcl technologies': 'hcltech.com',
  'hcltech': 'hcltech.com',
  'tech mahindra': 'techmahindra.com',
  'cognizant': 'cognizant.com',
  'accenture': 'accenture.com',
  'ltimindtree': 'ltimindtree.com',
  'mphasis': 'mphasis.com',
  'persistent systems': 'persistent.com',
  'capgemini': 'capgemini.com',
  'birlasoft': 'birlasoft.com',
  // Indian conglomerates / banks
  'reliance industries': 'ril.com',
  'reliance jio': 'jio.com',
  'tata group': 'tata.com',
  'icici bank': 'icicibank.com',
  'hdfc bank': 'hdfcbank.com',
  'sbi': 'sbi.co.in',
  'axis bank': 'axisbank.com',
  'kotak mahindra bank': 'kotak.com',
  'bajaj finserv': 'bajajfinserv.in',
  // Indian tech / unicorns
  'flipkart': 'flipkart.com',
  'paytm': 'paytm.com',
  'zomato': 'zomato.com',
  'swiggy': 'swiggy.com',
  'ola': 'olacabs.com',
  'olacabs': 'olacabs.com',
  'phonepe': 'phonepe.com',
  'razorpay': 'razorpay.com',
  'cred': 'cred.club',
  'meesho': 'meesho.com',
  'byjus': 'byjus.com',
  'unacademy': 'unacademy.com',
  'zerodha': 'zerodha.com',
  'freshworks': 'freshworks.com',
  'zoho': 'zoho.com',
  'postman': 'postman.com',
  'gojek': 'gojek.com',
  // Global big-tech with India ops
  'microsoft': 'microsoft.com',
  'google': 'google.com',
  'amazon': 'amazon.com',
  'meta': 'meta.com',
  'facebook': 'meta.com',
  'apple': 'apple.com',
  'netflix': 'netflix.com',
  'adobe': 'adobe.com',
  'intel': 'intel.com',
  'nvidia': 'nvidia.com',
  'oracle': 'oracle.com',
  'ibm': 'ibm.com',
  'sap': 'sap.com',
  'salesforce': 'salesforce.com',
  'cisco': 'cisco.com',
  'samsung': 'samsung.com',
  'dell': 'dell.com',
  'vmware': 'vmware.com',
  'atlassian': 'atlassian.com',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'stripe': 'stripe.com',
  'shopify': 'shopify.com',
  'airbnb': 'airbnb.com',
  'uber': 'uber.com',
  'spotify': 'spotify.com',
  'twilio': 'twilio.com',
  'mongodb': 'mongodb.com',
  'snowflake': 'snowflake.com',
  'databricks': 'databricks.com',
  'okta': 'okta.com',
  'workday': 'workday.com',
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\.?|ltd\.?|llp|inc\.?|corp\.?|corporation|limited|llc|gmbh|co\.?|plc|technologies?|technology|solutions?|systems?|services?|group|india|consulting|consultancy)\b/gi,
      '',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function guessDomain(name: string): string | null {
  const key = normalize(name)
  if (!key) return null
  // Curated override wins
  if (COMPANY_DOMAIN_MAP[key]) return COMPANY_DOMAIN_MAP[key]
  // Try the raw curated lookup too (e.g. "TCS" → already in map)
  const compact = key.replace(/\s+/g, '')
  if (COMPANY_DOMAIN_MAP[compact]) return COMPANY_DOMAIN_MAP[compact]
  // Heuristic: strip all whitespace, append .com
  return `${compact}.com`
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

type Size = 'sm' | 'lg'

const SIZE_CLASSES: Record<Size, { wrap: string; text: string }> = {
  sm: { wrap: 'h-12 w-12 rounded-xl', text: 'text-lg' },
  lg: { wrap: 'h-16 w-16 rounded-2xl', text: 'text-2xl' },
}

type ImgSource = 'brandfetch' | 'google' | null

function nextSource(current: ImgSource): ImgSource {
  if (current === 'brandfetch') return 'google'
  return null
}

function urlFor(source: ImgSource, domain: string, size: Size): string | null {
  const px = size === 'sm' ? 96 : 128
  if (source === 'brandfetch') return `https://cdn.brandfetch.io/${domain}/w/${px}/h/${px}`
  if (source === 'google') return `https://www.google.com/s2/favicons?domain=${domain}&sz=${px}`
  return null
}

export function CompanyLogo({
  company,
  size = 'sm',
}: {
  company: string
  size?: Size
}) {
  const [source, setSource] = useState<ImgSource>('brandfetch')
  const domain = guessDomain(company)
  const url = domain ? urlFor(source, domain, size) : null
  const cls = SIZE_CLASSES[size]

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center bg-emerald-100 font-semibold text-emerald-700 ${cls.wrap}`}
      aria-label={`${company} logo`}
    >
      {/* Always-present initial avatar — visible only when image is gone */}
      <span className={cls.text}>{initial(company)}</span>

      {/* Image overlay; removed entirely when all sources exhausted */}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={source ?? 'none'}
          src={url}
          alt=""
          onError={() => setSource(nextSource(source))}
          className={`absolute inset-0 h-full w-full ${cls.wrap} border border-zinc-200 bg-white object-contain p-1.5`}
        />
      )}
    </div>
  )
}
