// src/lib/job-industry.ts
// Curated company → industry mapping. Keys are normalized (lowercased,
// punctuation stripped, common suffixes removed) so that "Stripe Inc",
// "Stripe", and "stripe.com" all match the same entry.
//
// The fallback for unknown companies is 'Other'. Future Batch 3 (Apify
// LinkedIn) will provide real industry data per job — until then this
// curated map covers the top ~100 employers in our feed.

const COMPANY_INDUSTRY_MAP: Record<string, string> = {
  // --- Software & SaaS ---
  'stripe': 'Software & SaaS',
  'atlassian': 'Software & SaaS',
  'slack': 'Software & SaaS',
  'notion': 'Software & SaaS',
  'figma': 'Software & SaaS',
  'linear': 'Software & SaaS',
  'vercel': 'Software & SaaS',
  'supabase': 'Software & SaaS',
  'mongodb': 'Software & SaaS',
  'snowflake': 'Software & SaaS',
  'databricks': 'Software & SaaS',
  'twilio': 'Software & SaaS',
  'gitlab': 'Software & SaaS',
  'github': 'Software & SaaS',
  'salesforce': 'Software & SaaS',
  'workday': 'Software & SaaS',
  'oracle': 'Software & SaaS',
  'sap': 'Software & SaaS',
  'microsoft': 'Software & SaaS',
  'adobe': 'Software & SaaS',
  'autodesk': 'Software & SaaS',
  'intercom': 'Software & SaaS',
  'mercury': 'Software & SaaS',
  'replit': 'Software & SaaS',
  'modal': 'Software & SaaS',
  'cursor': 'Software & SaaS',
  'airtable': 'Software & SaaS',
  'coda': 'Software & SaaS',
  'ironclad': 'Software & SaaS',
  'ramp': 'Software & SaaS',
  'brex': 'Software & SaaS',
  'freshworks': 'Software & SaaS',
  'zoho': 'Software & SaaS',
  'postman': 'Software & SaaS',
  'discord': 'Software & SaaS',

  // --- Internet / Consumer Apps ---
  'airbnb': 'Internet / Consumer Apps',
  'spotify': 'Internet / Consumer Apps',
  'pinterest': 'Internet / Consumer Apps',
  'reddit': 'Internet / Consumer Apps',
  'twitter': 'Internet / Consumer Apps',
  'meta': 'Internet / Consumer Apps',
  'facebook': 'Internet / Consumer Apps',
  'google': 'Internet / Consumer Apps',
  'youtube': 'Internet / Consumer Apps',
  'tiktok': 'Internet / Consumer Apps',
  'snap': 'Internet / Consumer Apps',
  'gojek': 'Internet / Consumer Apps',
  'grab': 'Internet / Consumer Apps',
  'meesho': 'Internet / Consumer Apps',
  'phonepe': 'Internet / Consumer Apps',

  // --- AI / ML ---
  'openai': 'AI / ML',
  'anthropic': 'AI / ML',
  'perplexity': 'AI / ML',
  'elevenlabs': 'AI / ML',
  'mistral': 'AI / ML',
  'huggingface': 'AI / ML',
  'cohere': 'AI / ML',
  'character ai': 'AI / ML',
  'character.ai': 'AI / ML',
  'stability ai': 'AI / ML',
  'runway': 'AI / ML',

  // --- Cybersecurity ---
  'okta': 'Cybersecurity',
  'cloudflare': 'Cybersecurity',
  'crowdstrike': 'Cybersecurity',
  'palo alto networks': 'Cybersecurity',
  'fortinet': 'Cybersecurity',
  'zscaler': 'Cybersecurity',

  // --- Hardware / Semiconductors ---
  'nvidia': 'Hardware / Semiconductors',
  'intel': 'Hardware / Semiconductors',
  'amd': 'Hardware / Semiconductors',
  'qualcomm': 'Hardware / Semiconductors',
  'broadcom': 'Hardware / Semiconductors',
  'apple': 'Hardware / Semiconductors',
  'samsung': 'Hardware / Semiconductors',
  'dell': 'Hardware / Semiconductors',
  'cisco': 'Hardware / Semiconductors',

  // --- Banking & Fintech ---
  'razorpay': 'Banking & Fintech',
  'cred': 'Banking & Fintech',
  'paytm': 'Banking & Fintech',
  'icici bank': 'Banking & Fintech',
  'hdfc bank': 'Banking & Fintech',
  'sbi': 'Banking & Fintech',
  'axis bank': 'Banking & Fintech',
  'kotak mahindra bank': 'Banking & Fintech',
  'jpmorgan': 'Banking & Fintech',
  'goldman sachs': 'Banking & Fintech',
  'morgan stanley': 'Banking & Fintech',
  'coinbase': 'Banking & Fintech',
  'plaid': 'Banking & Fintech',
  'square': 'Banking & Fintech',
  'block': 'Banking & Fintech',
  'gusto': 'Banking & Fintech',
  'bajaj finserv': 'Banking & Fintech',

  // --- Insurance & InsurTech ---
  'acko': 'Insurance & InsurTech',
  'policybazaar': 'Insurance & InsurTech',
  'lemonade': 'Insurance & InsurTech',
  'hippo': 'Insurance & InsurTech',

  // --- Investments / Asset Management ---
  'zerodha': 'Investments / Asset Management',
  'groww': 'Investments / Asset Management',
  'smallcase': 'Investments / Asset Management',
  'blackrock': 'Investments / Asset Management',

  // --- Pharma & Biotech ---
  'cipla': 'Pharma & Biotech',
  'dr reddy': 'Pharma & Biotech',
  'sun pharma': 'Pharma & Biotech',
  'lupin': 'Pharma & Biotech',
  'biocon': 'Pharma & Biotech',
  'pfizer': 'Pharma & Biotech',
  'moderna': 'Pharma & Biotech',
  'novartis': 'Pharma & Biotech',
  'roche': 'Pharma & Biotech',
  'merck': 'Pharma & Biotech',

  // --- Medical Devices ---
  'medtronic': 'Medical Devices',
  'philips healthcare': 'Medical Devices',
  'ge healthcare': 'Medical Devices',
  'siemens healthineers': 'Medical Devices',

  // --- Healthcare Services / HealthTech ---
  'practo': 'Healthcare Services / HealthTech',
  'pharmeasy': 'Healthcare Services / HealthTech',
  '1mg': 'Healthcare Services / HealthTech',
  'apollo hospitals': 'Healthcare Services / HealthTech',
  'manipal hospitals': 'Healthcare Services / HealthTech',

  // --- E-commerce & Retail ---
  'flipkart': 'E-commerce & Retail',
  'amazon': 'E-commerce & Retail',
  'myntra': 'E-commerce & Retail',
  'nykaa': 'E-commerce & Retail',
  'shopify': 'E-commerce & Retail',
  'walmart': 'E-commerce & Retail',
  'target': 'E-commerce & Retail',
  'reliance retail': 'E-commerce & Retail',
  'firstcry': 'E-commerce & Retail',

  // --- Education & EdTech ---
  'byjus': 'Education & EdTech',
  'unacademy': 'Education & EdTech',
  'upgrad': 'Education & EdTech',
  'vedantu': 'Education & EdTech',
  'cuemath': 'Education & EdTech',
  'coursera': 'Education & EdTech',
  'udemy': 'Education & EdTech',
  'duolingo': 'Education & EdTech',

  // --- Media, Entertainment & Gaming ---
  'netflix': 'Media, Entertainment & Gaming',
  'disney': 'Media, Entertainment & Gaming',
  'hotstar': 'Media, Entertainment & Gaming',
  'dream11': 'Media, Entertainment & Gaming',
  'mpl': 'Media, Entertainment & Gaming',
  'paytm first games': 'Media, Entertainment & Gaming',
  'roblox': 'Media, Entertainment & Gaming',
  'epic games': 'Media, Entertainment & Gaming',
  'unity': 'Media, Entertainment & Gaming',

  // --- Real Estate & PropTech ---
  'nobroker': 'Real Estate & PropTech',
  'square yards': 'Real Estate & PropTech',
  'magicbricks': 'Real Estate & PropTech',
  '99acres': 'Real Estate & PropTech',
  'wework': 'Real Estate & PropTech',

  // --- Manufacturing & Industrial ---
  'tata motors': 'Manufacturing & Industrial',
  'mahindra': 'Manufacturing & Industrial',
  'l&t': 'Manufacturing & Industrial',
  'larsen toubro': 'Manufacturing & Industrial',
  'hyundai': 'Manufacturing & Industrial',
  'toyota': 'Manufacturing & Industrial',
  'ford': 'Manufacturing & Industrial',
  'general motors': 'Manufacturing & Industrial',

  // --- Energy, Utilities & CleanTech ---
  'reliance industries': 'Energy, Utilities & CleanTech',
  'ola electric': 'Energy, Utilities & CleanTech',
  'tata power': 'Energy, Utilities & CleanTech',
  'adani': 'Energy, Utilities & CleanTech',
  'reliance power': 'Energy, Utilities & CleanTech',

  // --- Logistics & Mobility ---
  'delhivery': 'Logistics & Mobility',
  'ola': 'Logistics & Mobility',
  'olacabs': 'Logistics & Mobility',
  'uber': 'Logistics & Mobility',
  'rapido': 'Logistics & Mobility',
  'shadowfax': 'Logistics & Mobility',
  'fedex': 'Logistics & Mobility',
  'dhl': 'Logistics & Mobility',

  // --- Travel, Hospitality & Food ---
  'makemytrip': 'Travel, Hospitality & Food',
  'oyo': 'Travel, Hospitality & Food',
  'goibibo': 'Travel, Hospitality & Food',
  'cleartrip': 'Travel, Hospitality & Food',
  'yatra': 'Travel, Hospitality & Food',
  'zomato': 'Travel, Hospitality & Food',
  'swiggy': 'Travel, Hospitality & Food',
  'doordash': 'Travel, Hospitality & Food',

  // --- Consulting & Professional Services ---
  'mckinsey': 'Consulting & Professional Services',
  'bcg': 'Consulting & Professional Services',
  'bain': 'Consulting & Professional Services',
  'deloitte': 'Consulting & Professional Services',
  'pwc': 'Consulting & Professional Services',
  'ey': 'Consulting & Professional Services',
  'kpmg': 'Consulting & Professional Services',
  'accenture': 'Consulting & Professional Services',
  'tata consultancy services': 'Consulting & Professional Services',
  'tcs': 'Consulting & Professional Services',
  'infosys': 'Consulting & Professional Services',
  'wipro': 'Consulting & Professional Services',
  'cognizant': 'Consulting & Professional Services',
  'hcl technologies': 'Consulting & Professional Services',
  'hcltech': 'Consulting & Professional Services',
  'tech mahindra': 'Consulting & Professional Services',
  'ltimindtree': 'Consulting & Professional Services',
  'mphasis': 'Consulting & Professional Services',
  'persistent systems': 'Consulting & Professional Services',
  'capgemini': 'Consulting & Professional Services',
}

function normalizeCompany(name: string): string {
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

function lightNormalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Classify a company name into one of the 20 industries.
 * Returns 'Other' if unknown.
 *
 * Lookup order:
 *   1) light-normalized full name (preserves multi-word keys like
 *      "tata consultancy services")
 *   2) aggressively-normalized name (strips Pvt Ltd / Technologies / etc.)
 */
export function classifyIndustry(company: string): string {
  if (!company) return 'Other'
  const light = lightNormalize(company)
  if (COMPANY_INDUSTRY_MAP[light]) return COMPANY_INDUSTRY_MAP[light]
  const aggressive = normalizeCompany(company)
  if (COMPANY_INDUSTRY_MAP[aggressive]) return COMPANY_INDUSTRY_MAP[aggressive]
  return 'Other'
}

export function jobMatchesIndustryFilter(
  company: string,
  selected: Set<string>,
): boolean {
  if (selected.size === 0) return true
  const industry = classifyIndustry(company)
  return selected.has(industry)
}
