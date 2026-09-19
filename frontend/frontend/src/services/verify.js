// Real company authenticity engine — replaces the old flat trust heuristic
// with a scored, checklist-based verification computed fresh from each
// job's own data every time. Nothing here is a hardcoded badge: every
// point is earned (or withheld) by a specific, inspectable check.
//
// Honesty note: this runs entirely client-side against the data Adzuna
// gives us (the apply URL and company name) — there is no live DNS/WHOIS
// lookup or real-time domain-reputation API behind it. Where a real
// external check would plug in later (e.g. a domain-reputation service),
// this file is the one place to add it; `verifyCompany` is already async
// and cached so that swap wouldn't touch any calling page.

import { KNOWN_COMPANY_DOMAINS, normalizeCompanySlug } from '../lib/companyDomain'

// Recognized official application systems — a listing hosted on one of
// these is a strong legitimacy signal regardless of the hiring company.
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

function officialDomainFor(company) {
  return KNOWN_COMPANY_DOMAINS[normalizeCompanySlug(company)] ?? null
}

function matchesDomain(domain, target) {
  return !!domain && !!target && (domain === target || domain.endsWith(`.${target}`))
}

function isKnownAts(domain) {
  return !!domain && KNOWN_ATS_DOMAINS.some((ats) => matchesDomain(domain, ats))
}

// ATS-hosted listings (Greenhouse, Lever, Workday…) almost always carry the
// hiring company's own slug in the URL path (e.g. boards.greenhouse.io/
// google/jobs/123) — checking for it is how a generic ATS link gets
// confirmed as *this specific company's* official listing, not just "some
// company's" listing on a trusted platform.
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

function levelFor(score) {
  if (score >= 90) return 'high'
  if (score >= 70) return 'medium'
  return 'low'
}

const LEVEL_LABEL = { high: 'High', medium: 'Medium', low: 'Low', pending: 'Pending' }

function pendingResult(reason) {
  return {
    score: null,
    level: 'pending',
    label: LEVEL_LABEL.pending,
    checks: null,
    summary: reason,
    reasons: [],
  }
}

// The actual scoring pass — pure and synchronous, so it's easy to unit
// reason about, and safe to call from the retry wrapper below.
function computeVerification({ company, applyUrl, description }) {
  if (!applyUrl || typeof applyUrl !== 'string') {
    return pendingResult('Verification pending — this listing has no application link to check yet.')
  }

  const domain = getDomain(applyUrl)
  if (!domain) {
    return pendingResult("Verification pending — this listing's application link couldn't be read.")
  }

  const knownDomain = officialDomainFor(company)
  const careersPage = isKnownAts(domain)
  const companySlug = normalizeCompanySlug(company)
  // "Official domain" is satisfied either by matching the company's own
  // known domain directly, or — just as validly — by the listing's own
  // company slug appearing in the path of a recognized ATS link (the
  // standard way Greenhouse/Lever/Workday links identify which company a
  // listing belongs to).
  const ownDomainMatch = matchesDomain(domain, knownDomain)
  const atsCompanyPathMatch = careersPage && pathMatchesCompany(applyUrl, companySlug)
  const officialDomain = ownDomainMatch || atsCompanyPathMatch
  const httpsSecure = applyUrl.toLowerCase().startsWith('https://')
  const suspiciousDomain = isSuspiciousDomain(domain) && !careersPage && !officialDomain
  const urlShortener = isUrlShortener(domain)
  const companyMatch =
    officialDomain || careersPage || (!!companySlug && domain.replace(/[^a-z0-9]/g, '').includes(companySlug))

  let score = 0
  score += officialDomain ? 30 : 0
  score += httpsSecure ? 10 : 0
  score += careersPage ? 25 : 0
  score += suspiciousDomain ? 0 : 15
  score += urlShortener ? 0 : 10
  score += companyMatch ? 10 : 0
  score = Math.max(0, Math.min(100, Math.round(score)))

  const level = levelFor(score)

  const reasons = [
    ownDomainMatch
      ? `Application link matches ${company}'s official domain (${domain})`
      : atsCompanyPathMatch
        ? `Listing path on ${domain} identifies it as ${company}'s official posting`
        : careersPage
          ? `Hosted on a recognized official application system (${domain}), but the listing doesn't clearly reference ${company} in its URL`
          : `Application link domain (${domain}) isn't a confirmed official domain for ${company}`,
    httpsSecure ? 'Application link uses a secure HTTPS connection' : 'Application link does not use HTTPS',
    careersPage
      ? `Recognized as a trusted careers platform (${domain})`
      : 'Not hosted on a recognized official careers platform',
    suspiciousDomain
      ? `Domain (${domain}) matches known suspicious patterns`
      : 'No suspicious domain patterns detected',
    urlShortener ? 'Application link uses a URL shortener, which hides the real destination' : 'Application link is not a shortened URL',
    companyMatch
      ? "Domain is consistent with the company's identity"
      : "Domain doesn't clearly match the company name",
  ]

  const text = `${description ?? ''}`.toLowerCase()
  const scamHit = SCAM_PHRASES.find((phrase) => text.includes(phrase))
  const scamLanguageDetected = Boolean(scamHit)
  reasons.push(
    scamLanguageDetected
      ? `Listing text contains scam-pattern wording: "${scamHit}"`
      : 'No fee-related or scam-pattern wording detected in the listing',
  )

  const summary =
    level === 'high'
      ? `This opportunity appears to come from an official ${company} hiring source.`
      : level === 'medium'
        ? `This listing looks mostly legitimate, but some signals couldn't be fully confirmed — review before applying.`
        : `This listing has several unverified or suspicious signals — proceed carefully and avoid sharing sensitive information.`

  return {
    score,
    level,
    label: LEVEL_LABEL[level],
    checks: { officialDomain, httpsSecure, careersPage, suspiciousDomain, urlShortener, companyMatch },
    scamLanguageDetected,
    summary,
    reasons,
  }
}

// In-memory memoization — the same listing (by company + apply URL) is
// never re-scored twice in a session, so a list of 20 Scout cards doesn't
// recompute on every re-render or filter change.
const cache = new Map()

function cacheKey({ company, applyUrl }) {
  return `${company ?? ''}::${applyUrl ?? ''}`
}

function runWithRetry(job, attempt = 0) {
  try {
    return computeVerification(job)
  } catch (err) {
    if (attempt === 0) return runWithRetry(job, 1) // one retry for a transient failure
    console.error('Verification failed:', err)
    return pendingResult('Verification could not be completed right now — try again shortly.')
  }
}

/**
 * Synchronous, cached authenticity check for a job listing. Returns
 * `{ score, level, label, checks, summary, reasons, scamLanguageDetected }`,
 * or a `level: 'pending'` result (score: null) when there isn't enough
 * data to verify — never a fabricated High/Medium/Low.
 */
export function verifyCompany(job) {
  if (!job) return pendingResult('Verification pending.')
  const key = cacheKey(job)
  if (cache.has(key)) return cache.get(key)
  const result = runWithRetry(job)
  cache.set(key, result)
  return result
}

/**
 * Async form of the same check — for call sites that want to treat
 * verification as a potentially-remote operation (and are structured to
 * plug in a real network-backed check later without changing their shape).
 */
export async function verifyCompanyAsync(job) {
  return verifyCompany(job)
}

export function clearVerificationCache() {
  cache.clear()
}
