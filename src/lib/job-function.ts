// src/lib/job-function.ts
// Title-pattern → sub-role detection. Used as a post-fetch filter (same
// pattern as work-model / experience extractors).

const PATTERNS: Array<[string, RegExp[]]> = [
  ['Backend Engineering', [/\bback[\s-]?end\b.*\b(engineer|developer|dev|swe)\b/i, /\bbackend\s+(engineer|developer)\b/i]],
  ['Frontend Engineering', [/\bfront[\s-]?end\b.*\b(engineer|developer|dev)\b/i, /\b(react|vue|angular)\s+(engineer|developer)\b/i]],
  ['Full-stack Engineering', [/\bfull[\s-]?stack\b/i]],
  ['Mobile Engineering (iOS)', [/\bios\b/i, /\bswift(ui)?\s+(engineer|developer)\b/i]],
  ['Mobile Engineering (Android)', [/\bandroid\b/i, /\bkotlin\s+(engineer|developer)\b/i]],
  ['Mobile Engineering (Cross-platform)', [/\b(react\s*native|flutter|expo)\b/i]],
  ['DevOps / SRE', [/\b(devops|sre|site\s+reliability)\b/i]],
  ['Platform Engineering', [/\bplatform\s+engineer/i]],
  ['Infrastructure Engineering', [/\binfrastructure\s+(engineer|architect)/i]],
  ['Cloud Engineering', [/\bcloud\s+(engineer|architect)/i, /\b(aws|gcp|azure)\s+engineer/i]],
  ['Data Engineering', [/\bdata\s+engineer/i, /\betl\s+engineer/i]],
  ['QA / Test Engineering', [/\b(qa|quality\s+assurance|sdet)\b/i, /\btest\s+(engineer|automation)/i]],
  ['Embedded / Firmware', [/\b(embedded|firmware)\b.*\b(engineer|developer)/i]],
  ['Hardware Engineering', [/\bhardware\s+(engineer|design)/i, /\b(asic|fpga|verilog|vlsi)\b/i]],
  ['ML Engineering', [/\bml\s+engineer/i, /\bmachine\s+learning\s+engineer/i, /\bai\s+engineer/i]],
  ['Security Engineering', [/\bsecurity\s+engineer/i, /\bappsec\s+engineer/i]],
  ['Engineering Management', [/\bengineering\s+manager/i, /\b(head|director|vp)\s+(of\s+)?engineering/i, /\bem\b/i]],
  ['Solutions / Sales Engineering', [/\b(solution|sales|solutions)\s+engineer/i, /\bpre[\s-]?sales\s+engineer/i]],

  ['Data Science', [/\bdata\s+scien(tist|ce)/i]],
  ['Data Analytics / BI', [/\b(data\s+analyst|business\s+intelligence|bi\s+(analyst|developer))/i]],
  ['ML / AI Research', [/\b(machine\s+learning|ml|ai)\s+(research|scientist)/i, /\bresearch\s+scientist/i, /\bapplied\s+scientist/i]],
  ['Quantitative Research', [/\bquant(itative)?\s+(research|analyst|trader)/i]],
  ['Analytics Engineering', [/\banalytics\s+engineer/i]],

  ['Product Management', [/\bproduct\s+(manager|lead)\b/i, /\b(vp|head|director)\s+(of\s+)?product/i, /\b(g|s)pm\b/i]],
  ['Technical Product Management', [/\btechnical\s+product\s+manager/i, /\btpm\b/i]],
  ['Product Operations', [/\bproduct\s+ops/i, /\bproduct\s+operations/i]],
  ['Product Marketing (PMM)', [/\bproduct\s+marketing/i, /\bpmm\b/i]],
  ['Growth Product', [/\bgrowth\s+(product|pm)/i]],

  ['Product Design', [/\bproduct\s+designer/i]],
  ['UX Design', [/\bux\s+designer/i, /\buser\s+experience\s+designer/i]],
  ['UI Design', [/\bui\s+designer/i, /\buser\s+interface\s+designer/i]],
  ['Visual Design', [/\bvisual\s+designer/i]],
  ['Graphic Design', [/\bgraphic\s+designer/i]],
  ['Brand Design', [/\bbrand\s+designer/i, /\bbrand\s+identity/i]],
  ['Motion / Interaction Design', [/\b(motion|interaction)\s+designer/i, /\b(motion\s+graphics|animator)/i]],
  ['UX Research', [/\b(ux\s+research|user\s+research|design\s+researcher)/i]],
  ['Service Design', [/\bservice\s+designer/i]],
  ['Industrial Design', [/\bindustrial\s+designer/i]],

  ['Account Executive', [/\baccount\s+executive/i, /\b\bae\b/i, /\benterprise\s+account/i]],
  ['Business Development', [/\bbusiness\s+development/i, /\bbd\b/i, /\bbdr\b/i]],
  ['Sales Development Rep (SDR)', [/\bsdr\b/i, /\bsales\s+development\s+rep/i]],
  ['Account Management', [/\baccount\s+manager\b/i]],
  ['Solutions / Pre-sales', [/\bpre[\s-]?sales/i, /\bsolutions\s+architect/i]],
  ['Field Sales', [/\b(field|outside)\s+sales/i]],
  ['Inside Sales', [/\binside\s+sales/i]],
  ['Channel / Partner Sales', [/\b(channel|partner)\s+sales/i, /\bpartnerships?\b/i]],
  ['Sales Operations', [/\bsales\s+(operations|ops)/i, /\b(revenue\s+operations|revops)/i]],

  ['Performance / Growth Marketing', [/\b(growth|performance)\s+marketing/i, /\bgrowth\s+marketer/i]],
  ['Content Marketing', [/\bcontent\s+(marketing|marketer|strategist|writer)/i]],
  ['Brand Marketing', [/\bbrand\s+(marketing|manager)/i]],
  ['SEO / SEM', [/\b(seo|sem|search\s+(engine|marketing))/i]],
  ['Social Media', [/\b(social\s+media|community\s+manager)/i]],
  // Closing \b on the group prevents \bpr from matching "Pr" at the start
  // of "Product", "Press", "Process", "Principal", "Presales", etc. We also
  // require the comms branch to be followed by a role noun so we don't catch
  // "Internal Communications Strategy Lead Analyst" through vague mid-title
  // matches.
  ['PR & Communications', [
    /\b(?:pr|public\s+relations)\b/i,
    /\bcommunications?\s+(manager|specialist|lead|director|head|associate|coordinator)\b/i,
    /\bcorporate\s+communications\b/i,
  ]],
  ['Marketing Operations', [/\bmarketing\s+(operations|ops)/i]],
  ['Lifecycle / CRM Marketing', [/\b(lifecycle|crm|email|retention)\s+marketing/i]],
  ['Influencer Marketing', [/\binfluencer/i]],
  ['Event Marketing', [/\bevents?\s+(marketing|manager|coordinator)/i]],

  ['Customer Success Management', [/\bcustomer\s+success/i, /\bcsm\b/i]],
  ['Customer Support', [/\bcustomer\s+(support|service)/i, /\bsupport\s+(specialist|rep)/i]],
  ['Implementation / Onboarding', [/\b(implementation|onboarding)\s+(specialist|manager|engineer)/i]],
  ['Technical Account Management', [/\btechnical\s+account\s+manager/i, /\btam\b/i]],
  ['Customer Experience', [/\bcustomer\s+experience/i, /\bcx\b/i]],

  ['Business Operations', [/\bbusiness\s+(operations|ops)/i, /\bbiz\s+ops/i]],
  ['Strategy & Operations', [/\bstrategy\s+(and|&)\s+operations/i, /\b(chief\s+of\s+staff|corporate\s+strategy)/i]],
  ['Supply Chain', [/\bsupply\s+chain/i]],
  ['Logistics', [/\b(logistics|warehouse|fulfillment)/i]],
  ['Program Management', [/\bprogram\s+manager/i]],
  ['Project Management', [/\bproject\s+manager/i]],
  ['Vendor Management', [/\bvendor\s+(management|manager)/i]],
  ['Office Operations', [/\b(office|workplace|admin)\s+(manager|coordinator|operations)/i]],

  ['Talent Acquisition (Tech)', [/\b(technical|tech)\s+recruiter/i]],
  ['Talent Acquisition (Non-tech)', [/\b(non-tech\s+)?(recruiter|sourcer)\b/i, /\btalent\s+acquisition/i]],
  ['HR Business Partner', [/\b(hr\s+business\s+partner|hrbp|people\s+business\s+partner)/i]],
  ['Compensation & Benefits', [/\b(compensation|benefits|total\s+rewards)/i]],
  ['Learning & Development', [/\b(learning\s+(and|&)\s+development|l\s*&\s*d|training\s+manager)/i]],
  ['People Operations', [/\b(people|hr)\s+(operations|ops)/i]],
  ['DEI', [/\b(dei|diversity,?\s+equity|inclusion)/i]],
  ['Employer Branding', [/\bemployer\s+brand/i]],

  ['FP&A', [/\b(fp\s*&\s*a|financial\s+planning)/i]],
  ['Accounting', [/\baccount(ant|ing)\b(?!\s+(executive|manager))/i, /\bgeneral\s+ledger/i]],
  ['Controller / Bookkeeping', [/\b(controller|bookkeep)/i]],
  ['Treasury', [/\btreasury\b/i]],
  ['Internal Audit', [/\binternal\s+audit/i]],
  ['Investor Relations', [/\binvestor\s+relations/i]],
  ['Tax', [/\btax\s+(analyst|manager|director|associate|specialist)/i]],
  ['Procurement', [/\b(procurement|sourcing\s+manager)/i]],

  ['Corporate Legal', [/\b(corporate|general|legal|in[\s-]?house)\s+counsel/i]],
  ['IP / Patent Law', [/\b(ip|intellectual\s+property|patent)\s+(law|counsel|attorney)/i]],
  ['Privacy / Data Protection', [/\b(privacy|data\s+protection|gdpr|dpo)/i]],
  ['Regulatory Compliance', [/\b(regulatory|compliance)\s+(manager|officer|specialist)/i]],
  ['Contract Management', [/\bcontract\s+(manager|specialist)/i, /\bcontracting/i]],

  ['Information Security', [/\b(information\s+security|infosec|ciso)/i]],
  ['Application Security (AppSec)', [/\b(appsec|application\s+security)/i]],
  ['Security Operations (SOC)', [/\b(soc\s+analyst|security\s+operations)/i]],
  ['Penetration Testing', [/\b(pen[\s-]?test|red\s+team)/i]],
  ['GRC', [/\b(grc|governance,?\s+risk)/i]],

  ['IT Operations', [/\bit\s+(operations|ops)/i]],
  ['IT Support / Helpdesk', [/\b(it\s+support|helpdesk|service\s+desk)/i]],
  ['Systems Administration', [/\b(systems?\s+admin|sysadmin)/i]],
  ['Network Engineering', [/\bnetwork\s+(engineer|administrator)/i]],

  ['Management Consulting', [/\bmanagement\s+consultant/i]],
  ['Strategy Consulting', [/\bstrategy\s+consultant/i]],
  ['Industry Consulting', [/\bconsultant\b/i]],

  ['Editorial / Content', [/\b(editor|copywriter|writer|journalist|editorial)/i]],
  ['Recruitment Consultant', [/\brecruitment\s+consultant/i]],
  ['Healthcare — Clinical', [/\b(physician|doctor|nurse|clinical|medical\s+officer)/i]],
  ['Healthcare — Regulatory Affairs', [/\bregulatory\s+affairs/i]],
]

/**
 * Best-effort sub-role classification driven by title keywords. A title can
 * match multiple sub-roles (e.g. "Senior Full-stack Engineer" → Full-stack
 * Engineering, plus possibly Engineering Management for "Senior") — we
 * return all matches so the filter is generous on the OR side.
 */
export function classifySubRoles(title: string, _category: string | null): string[] {
  const matches: string[] = []
  for (const [sub, regs] of PATTERNS) {
    if (regs.some((r) => r.test(title))) matches.push(sub)
  }
  return matches
}

/**
 * True when the job matches ANY of the selected sub-roles. Empty selection
 * = no filter (every job passes).
 */
export function jobMatchesSubRoleFilter(
  title: string,
  category: string | null,
  selected: Set<string>,
): boolean {
  if (selected.size === 0) return true
  const matched = classifySubRoles(title, category)
  return matched.some((m) => selected.has(m))
}
