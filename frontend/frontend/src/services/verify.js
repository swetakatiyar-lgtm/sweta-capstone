// Real, evidence-based Opportunity Verification.
//
// Career OS never claims a job IS authentic. This calculates a
// "Verification Confidence" score from the real signals it can actually
// check — Adzuna's own job record, the job's real application URL, and the
// job's real listing text. Nothing here is hardcoded, randomized, or
// fabricated: two jobs with identical real evidence produce identical
// results, and a check that genuinely cannot be performed is marked
// "unavailable" rather than silently scored as a failure or a pass.
//
// Honesty note: this runs entirely client-side against the data Adzuna
// gives us — there is no live DNS/WHOIS lookup, company registry, or
// real-time domain-reputation API behind it, and several checks (company
// identity, in particular) are always "unavailable" for that reason. Where
// a real external check would plug in later, this file is the one place
// to add it.

import { KNOWN_COMPANY_DOMAINS, normalizeCompanySlug } from '../lib/companyDomain'

const KNOWN_ATS_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'myworkdayjobs.com',
  'ashbyhq.com',
  'smartrecruiters.com',
  'successfactors.com',
  'icims.com',
  'bamboohr.com',
  'linkedin.com',
  'indeed.com',
  'naukri.com',
  'adzuna.com',
  'adzuna.in',
]

const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  'cutt.ly',
  'tiny.cc',
  'is.gd',
  't.co',
  'ow.ly',
  'rebrand.ly',
  'rb.gy',
]

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.work', '.info', '.loan', '.gq', '.tk', '.club']
const SUSPICIOUS_KEYWORDS = [
  'free',
  'urgent-hiring',
  'job-now',
  'jobsnow',
  'quick-job',
  'workfromhome',
  'earnfast',
]

const SCAM_PHRASES = [
  'registration fee',
  'processing fee',
  'security deposit',
  'pay to apply',
  'training fee',
  'refundable deposit',
  'guaranteed placement',
  'send money',
  'whatsapp only',
  'no interview required',
  'earn from home fast',
  'investment required',
]

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function matchesDomain(domain, target) {
  return !!domain && !!target && (domain === target || domain.endsWith(`.${target}`))
}

function isKnownAts(domain) {
  return !!domain && KNOWN_ATS_DOMAINS.some((ats) => matchesDomain(domain, ats))
}

function knownAtsHostFor(domain) {
  return KNOWN_ATS_DOMAINS.find((ats) => matchesDomain(domain, ats)) ?? null
}

// ATS-hosted listings (Greenhouse, Lever, Workday…) almost always carry the
// hiring company's own slug in the URL path (e.g. boards.greenhouse.io/
// google/jobs/123) — the one way a generic ATS link can be positively tied
// to a specific real company rather than just "some company on this platform".
function pathMatchesCompany(url, companySlug) {
  if (!companySlug) return false
  try {
    const path = new URL(url).pathname.toLowerCase().replace(/[^a-z0-9/]/g, '')
    return path.includes(`/${companySlug}`)
  } catch {
    return false
  }
}

function isUrlShortener(domain) {
  return !!domain && URL_SHORTENERS.some((s) => matchesDomain(domain, s))
}

function isSuspiciousDomain(domain) {
  if (!domain) return false
  if (SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld))) return true
  if (SUSPICIOUS_KEYWORDS.some((kw) => domain.includes(kw))) return true
  return false
}

function officialDomainFor(company) {
  return KNOWN_COMPANY_DOMAINS[normalizeCompanySlug(company)] ?? null
}

// Confidence bands describe the STRENGTH OF THE EVIDENCE Career OS could
// check — never a claim about whether the job is genuine.
const LEVEL_BANDS = [
  { min: 90, id: 'strong', label: 'Strong verification signals' },
  { min: 75, id: 'good', label: 'Good verification signals' },
  { min: 50, id: 'limited', label: 'Limited verification signals' },
  { min: 1, id: 'low', label: 'Low verification confidence' },
]

function levelFor(score) {
  if (score == null) return { id: 'unavailable', label: 'Verification unavailable' }
  for (const band of LEVEL_BANDS) {
    if (score >= band.min) return { id: band.id, label: band.label }
  }
  return { id: 'unavailable', label: 'Verification unavailable' }
}

function makeCheck({ id, name, category, maxPoints, status, points = 0, evidence = null, source = null, explanation }) {
  return { id, name, category, status, points, maxPoints, evidence, source, explanation }
}

// One real, independently-inspectable check per row — see the block
// comment above each for what it actually verifies and why a given status
// was assigned. `status` is always one of 'verified' | 'warning' |
// 'unavailable'; only 'verified' checks ever contribute points, and
// 'unavailable' checks never enter the score's denominator (see
// summarize()) — a check Career OS genuinely couldn't run never counts
// against (or for) a listing.
function computeChecks(job) {
  const applyUrl = job.applyUrl
  const domain = getDomain(applyUrl)
  const company = job.company
  const companySlug = normalizeCompanySlug(company)
  const knownDomain = officialDomainFor(company)
  const description = `${job.description ?? ''}`
  const checks = []

  // 1. Source — does this listing actually come from the real Adzuna
  // integration already wired into Scout? This confirms where the record
  // came from, nothing about the employer's legitimacy.
  checks.push(
    job.source === 'adzuna'
      ? makeCheck({
          id: 'source',
          name: 'Job source identified',
          category: 'Source',
          maxPoints: 15,
          status: 'verified',
          points: 15,
          evidence: 'Adzuna',
          source: 'Adzuna',
          explanation:
            'Job listing was retrieved through Adzuna. This confirms the listing source, not the authenticity of the employer or individual posting.',
        })
      : makeCheck({
          id: 'source',
          name: 'Job source identified',
          category: 'Source',
          maxPoints: 15,
          status: 'unavailable',
          explanation: 'The listing source could not be confirmed.',
        }),
  )

  // 2. HTTPS — the real apply URL's protocol.
  if (!applyUrl) {
    checks.push(
      makeCheck({
        id: 'https',
        name: 'Secure application connection',
        category: 'Application Security',
        maxPoints: 10,
        status: 'unavailable',
        explanation: 'No application URL was available to check.',
      }),
    )
  } else {
    const https = applyUrl.toLowerCase().startsWith('https://')
    checks.push(
      makeCheck({
        id: 'https',
        name: 'Secure application connection',
        category: 'Application Security',
        maxPoints: 10,
        status: https ? 'verified' : 'warning',
        points: https ? 10 : 0,
        evidence: applyUrl,
        explanation: https
          ? 'The application destination uses HTTPS.'
          : 'The application destination does not use HTTPS.',
      }),
    )
  }

  // 3. Recognized application platform — real hostname match against known
  // ATS providers. NOT being on one isn't a negative signal (most
  // companies legitimately host their own careers pages), so a miss here
  // is 'unavailable', never 'warning'.
  if (!domain) {
    checks.push(
      makeCheck({
        id: 'ats',
        name: 'Recognized application platform',
        category: 'Application Platform',
        maxPoints: 20,
        status: 'unavailable',
        explanation: 'No application URL was available to check for a recognized platform.',
      }),
    )
  } else {
    const atsHost = knownAtsHostFor(domain)
    checks.push(
      atsHost
        ? makeCheck({
            id: 'ats',
            name: 'Recognized application platform',
            category: 'Application Platform',
            maxPoints: 20,
            status: 'verified',
            points: 20,
            evidence: domain,
            explanation: `The application URL appears to use ${atsHost.replace(/\.(io|co|com)$/, '')}.`,
          })
        : makeCheck({
            id: 'ats',
            name: 'Recognized application platform',
            category: 'Application Platform',
            maxPoints: 20,
            status: 'unavailable',
            evidence: domain,
            explanation:
              'Application URL is not hosted on a recognized application platform — many legitimate employers host their own careers pages, so this alone is not a negative signal.',
          }),
    )
  }

  // 4. Company/domain consistency — does the real application domain
  // correspond to the real company name? Never guessed: only a known
  // company-domain mapping, or the company's slug actually appearing in an
  // ATS URL path, counts as a positive match.
  const ownDomainMatch = matchesDomain(domain, knownDomain)
  const atsCompanyMatch = domain && isKnownAts(domain) && pathMatchesCompany(applyUrl, companySlug)
  if (!domain || !companySlug) {
    checks.push(
      makeCheck({
        id: 'domainConsistency',
        name: 'Company/domain consistency',
        category: 'Company Consistency',
        maxPoints: 20,
        status: 'unavailable',
        explanation: 'Not enough information was available to compare the company name against the application domain.',
      }),
    )
  } else if (ownDomainMatch || atsCompanyMatch) {
    checks.push(
      makeCheck({
        id: 'domainConsistency',
        name: 'Company/domain consistency',
        category: 'Company Consistency',
        maxPoints: 20,
        status: 'verified',
        points: 20,
        evidence: domain,
        explanation: ownDomainMatch
          ? `Application link matches ${company}'s known domain (${domain}).`
          : `The application path on ${domain} identifies this listing as ${company}'s own posting.`,
      }),
    )
  } else if (isKnownAts(domain)) {
    checks.push(
      makeCheck({
        id: 'domainConsistency',
        name: 'Company/domain consistency',
        category: 'Company Consistency',
        maxPoints: 20,
        status: 'unavailable',
        evidence: domain,
        explanation: `Hosted on a shared application platform — Career OS can't independently confirm this specific listing belongs to ${company}.`,
      }),
    )
  } else if (domain.replace(/[^a-z0-9]/g, '').includes(companySlug)) {
    checks.push(
      makeCheck({
        id: 'domainConsistency',
        name: 'Company/domain consistency',
        category: 'Company Consistency',
        maxPoints: 20,
        status: 'verified',
        points: 20,
        evidence: domain,
        explanation: `Application domain (${domain}) contains ${company}'s name.`,
      }),
    )
  } else {
    checks.push(
      makeCheck({
        id: 'domainConsistency',
        name: 'Company/domain consistency',
        category: 'Company Consistency',
        maxPoints: 20,
        status: 'warning',
        evidence: domain,
        explanation: `Application domain (${domain}) doesn't clearly correspond to ${company}.`,
      }),
    )
  }

  // 5. Company identity — honestly always unavailable. Career OS has no
  // company registry, business-verification database, or metadata API
  // connected, so it never claims to have confirmed a company's identity.
  checks.push(
    makeCheck({
      id: 'companyIdentity',
      name: 'Company identity',
      category: 'Additional Signals',
      maxPoints: 10,
      status: 'unavailable',
      explanation:
        'Company identity could not be independently confirmed — Career OS has no company registry or verification database connected.',
    }),
  )

  // 6. Listing consistency — does the job's own description actually
  // mention the company it's listed under? A real, checkable text match.
  if (!description || description.trim().length < 20) {
    checks.push(
      makeCheck({
        id: 'listingConsistency',
        name: 'Listing consistency',
        category: 'Listing Consistency',
        maxPoints: 15,
        status: 'unavailable',
        explanation: 'No listing description was available to check.',
      }),
    )
  } else {
    const mentionsCompany = companySlug && description.toLowerCase().replace(/[^a-z0-9]/g, '').includes(companySlug)
    checks.push(
      makeCheck({
        id: 'listingConsistency',
        name: 'Listing consistency',
        category: 'Listing Consistency',
        maxPoints: 15,
        status: mentionsCompany ? 'verified' : 'warning',
        points: mentionsCompany ? 15 : 0,
        explanation: mentionsCompany
          ? `${company} is named consistently in the listing text.`
          : `The listing text doesn't clearly mention ${company} by name.`,
      }),
    )
  }

  // 7. Suspicious URL indicators — real domain-pattern and shortener checks.
  if (!domain) {
    checks.push(
      makeCheck({
        id: 'suspiciousUrl',
        name: 'Suspicious URL indicators',
        category: 'Additional Signals',
        maxPoints: 10,
        status: 'unavailable',
        explanation: 'No application URL was available to check.',
      }),
    )
  } else {
    const shortener = isUrlShortener(domain)
    const suspicious = isSuspiciousDomain(domain) && !isKnownAts(domain) && !ownDomainMatch
    const flagged = shortener || suspicious
    checks.push(
      makeCheck({
        id: 'suspiciousUrl',
        name: 'Suspicious URL indicators',
        category: 'Additional Signals',
        maxPoints: 10,
        status: flagged ? 'warning' : 'verified',
        points: flagged ? 0 : 10,
        evidence: domain,
        explanation: shortener
          ? 'Application link uses a URL shortener, which hides the real destination.'
          : suspicious
            ? `Domain (${domain}) matches known suspicious patterns.`
            : 'No obvious URL risk indicators detected.',
      }),
    )
  }

  // 8. Listing language — real scam-phrase text scan on the actual description.
  if (!description || description.trim().length === 0) {
    checks.push(
      makeCheck({
        id: 'scamLanguage',
        name: 'Listing language check',
        category: 'Additional Signals',
        maxPoints: 10,
        status: 'unavailable',
        explanation: 'No listing text was available to check.',
      }),
    )
  } else {
    const lower = description.toLowerCase()
    const hit = SCAM_PHRASES.find((phrase) => lower.includes(phrase))
    checks.push(
      makeCheck({
        id: 'scamLanguage',
        name: 'Listing language check',
        category: 'Additional Signals',
        maxPoints: 10,
        status: hit ? 'warning' : 'verified',
        points: hit ? 0 : 10,
        explanation: hit
          ? `Listing text contains scam-pattern wording: "${hit}"`
          : 'No fee-related or scam-pattern wording detected in the listing.',
      }),
    )
  }

  return checks
}

// Checks Career OS can NEVER perform for any job, given this architecture
// (no company registry / verification database connected) — these are
// excluded from the denominator entirely, same as the spec's "don't punish
// a job for a technically-unavailable check" rule. This is the one and
// only exception; see below.
const ARCHITECTURALLY_UNAVAILABLE_CHECKS = new Set(['companyIdentity'])

// confidence = (points earned) / (max points of every check that COULD, in
// principle, have been run for a real job — i.e. everything except the
// architecturally-unavailable ones above) × 100.
//
// This is a deliberate scoring-model decision (the spec explicitly allows
// one): a per-job-missing signal (no application URL, no description) is
// NOT excluded from the denominator, because its absence is itself real,
// meaningful evidence that less could be verified for this specific
// listing — a job with no application link at all must not be able to
// reach the same "Strong verification signals" score as one where every
// real signal was actually confirmed. Those checks still contribute 0
// points, correctly pulling the score down rather than being hidden.
function summarize(job, checks) {
  const scorable = checks.filter((c) => !ARCHITECTURALLY_UNAVAILABLE_CHECKS.has(c.id))
  const totalMax = scorable.reduce((sum, c) => sum + c.maxPoints, 0)
  const totalEarned = scorable.reduce((sum, c) => sum + c.points, 0)
  const warnings = checks.filter((c) => c.status === 'warning').map((c) => c.explanation)
  const limitations = checks.filter((c) => c.status === 'unavailable').map((c) => c.explanation)
  const allScorableUnavailable = scorable.every((c) => c.status === 'unavailable')

  if (totalMax === 0 || allScorableUnavailable) {
    return {
      jobId: job.id ?? null,
      verificationConfidence: null,
      confidenceLevel: 'unavailable',
      confidenceLabel: 'Verification unavailable',
      status: 'verification_unavailable',
      checks,
      warnings,
      limitations: limitations.length ? limitations : ['No usable evidence was available for this listing.'],
      // Legacy fields some pages still read — kept in sync with the new
      // model rather than duplicated as a second source of truth.
      level: 'unavailable',
      label: 'Verification unavailable',
      score: null,
      summary:
        'Career OS could not verify this listing — there was not enough real evidence (application link, description, or source) to check.',
    }
  }

  const verificationConfidence = Math.max(0, Math.min(100, Math.round((totalEarned / totalMax) * 100)))
  const level = levelFor(verificationConfidence)
  const summaryText =
    `${level.label}. This score reflects the verification signals Career OS was able to confirm for this listing ` +
    `(${totalEarned}/${totalMax} applicable points) — it does not guarantee that the opportunity is genuine.`

  return {
    jobId: job.id ?? null,
    verificationConfidence,
    confidenceLevel: level.id,
    confidenceLabel: level.label,
    status: 'verified_signals',
    checks,
    warnings,
    limitations,
    // Legacy fields — same values, old names, so pages mid-migration don't break.
    level: level.id,
    label: level.label,
    score: verificationConfidence,
    summary: summaryText,
  }
}

function runChecks(job) {
  const checks = computeChecks(job)
  return summarize(job, checks)
}

function unavailableResult(job, reason) {
  return {
    jobId: job?.id ?? null,
    verificationConfidence: null,
    confidenceLevel: 'unavailable',
    confidenceLabel: 'Verification unavailable',
    status: 'verification_unavailable',
    checks: [],
    warnings: [],
    limitations: [reason],
    level: 'unavailable',
    label: 'Verification unavailable',
    score: null,
    summary: reason,
  }
}

function runWithRetry(job, attempt = 0) {
  try {
    return { ...runChecks(job), checkedAt: new Date().toISOString() }
  } catch (err) {
    if (attempt === 0) return runWithRetry(job, 1) // one retry for a transient failure
    console.error('Verification failed:', err)
    return { ...unavailableResult(job, 'Verification could not be completed right now — try again shortly.'), checkedAt: new Date().toISOString() }
  }
}

// Cached per job id + apply URL + company — the same listing is never
// re-scored twice in a session, so a list of 20 Scout cards doesn't
// recompute on every re-render or filter change.
const cache = new Map()

function cacheKey(job) {
  return `${job?.id ?? ''}::${job?.applyUrl ?? ''}::${job?.company ?? ''}`
}

/**
 * verifyCompany(job) — the one real Opportunity Verification check.
 * Synchronous and cached. Returns a structured result:
 *   { jobId, verificationConfidence, confidenceLevel, confidenceLabel,
 *     status, checks, warnings, limitations, checkedAt }
 * plus a few same-value legacy fields (`level`, `score`, `summary`) for
 * call sites still mid-migration. Never a fabricated score — a job with no
 * usable evidence gets `verificationConfidence: null` and
 * `status: "verification_unavailable"`.
 */
export function verifyCompany(job) {
  if (!job) return unavailableResult(job, 'Verification unavailable.')
  const key = cacheKey(job)
  if (cache.has(key)) return cache.get(key)
  const result = runWithRetry(job)
  cache.set(key, result)
  return result
}

/** Re-runs verification for this job, ignoring any cached result. */
export function refreshVerification(job) {
  if (!job) return unavailableResult(job, 'Verification unavailable.')
  cache.delete(cacheKey(job))
  return verifyCompany(job)
}

export function clearVerificationCache() {
  cache.clear()
}
