// Live internship listings — replaces the old hardcoded mock array entirely.
// Primary provider: Adzuna Jobs API. Structured so JSearch/Remotive can be
// added later as siblings of `adzunaProvider` without touching any page —
// they'd just need to be registered in `PROVIDERS` and made the active one.

import { extractSkillsFromText } from '../lib/skills'

const ADZUNA_APP_ID = import.meta.env.VITE_ADZUNA_APP_ID
const ADZUNA_APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY
const ADZUNA_COUNTRY = import.meta.env.VITE_ADZUNA_COUNTRY || 'in'
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes — avoids duplicate requests for the same query
const searchCache = new Map()

const JOB_STORE_KEY = 'careeros:jobcache'

function loadJobStore() {
  try {
    return JSON.parse(sessionStorage.getItem(JOB_STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveJobStore(store) {
  try {
    sessionStorage.setItem(JOB_STORE_KEY, JSON.stringify(store))
  } catch {
    // sessionStorage unavailable (private mode, quota) — cache stays in-memory for this call only
  }
}

// Every job fetched through searchJobs() gets remembered here, keyed by id,
// so Opportunity Detail (reached via a plain route param, no fetch context)
// and Chat's job cards can look a job up without re-querying the API.
export const jobStore = {
  get(id) {
    return loadJobStore()[id] ?? null
  },
  getAll() {
    return Object.values(loadJobStore())
  },
  put(jobs) {
    const store = loadJobStore()
    for (const job of jobs) store[job.id] = job
    saveJobStore(store)
  },
}

function detectWorkMode(job) {
  const text = `${job.location ?? ''} ${job.title ?? ''} ${job.description ?? ''}`.toLowerCase()
  if (text.includes('remote') || text.includes('work from home')) return 'remote'
  if (text.includes('hybrid')) return 'hybrid'
  return 'onsite'
}

function formatSalary(min, max, currency = '₹') {
  if (!min && !max) return null
  const fmt = (n) => `${currency}${Math.round(n).toLocaleString('en-IN')}`
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}/mo`
  return `${fmt(min || max)}/mo`
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

// Adzuna's `salary_min`/`salary_max` are annual in most locales; internships
// are frequently monthly stipends quoted directly in the description instead,
// so this is a best-effort normalization, not a guarantee.
function normalizeAdzunaJob(raw) {
  const description = raw.description || ''
  return {
    id: `adzuna_${raw.id}`,
    source: 'adzuna',
    company: raw.company?.display_name || 'Unknown Company',
    companyLogo: initials(raw.company?.display_name),
    // `role` is what every page in this app reads; `title` is kept as an
    // alias so the object also matches the exact normalized contract
    // ({ id, company, title, location, salary, ... }) requested for jobs.js.
    role: raw.title,
    title: raw.title,
    location: raw.location?.display_name || 'Location not specified',
    workMode: detectWorkMode({ location: raw.location?.display_name, title: raw.title, description }),
    salary: formatSalary(raw.salary_min, raw.salary_max),
    description,
    applyUrl: raw.redirect_url,
    postedDate: raw.created,
    employmentType: raw.contract_time || raw.contract_type || 'Internship',
    requiredSkills: extractSkillsFromText(`${raw.title} ${description}`),
    baseMatch: 70, // neutral baseline quality signal — real ranking comes from lib/match.js
  }
}

async function fetchAdzuna({ query, location, page, resultsPerPage, maxDaysOld }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error(
      'MISSING_API_KEY: VITE_ADZUNA_APP_ID / VITE_ADZUNA_APP_KEY are not set. Add them to your .env file and restart the dev server.',
    )
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: String(resultsPerPage),
    what: query || 'internship',
    sort_by: 'date',
    'content-type': 'application/json',
  })
  if (location) params.set('where', location)
  // A real server-side filter — Adzuna only returns listings posted within
  // this many days, so "Posted Today" actually re-queries the API instead
  // of just hiding rows client-side.
  if (maxDaysOld) params.set('max_days_old', String(maxDaysOld))

  const url = `${ADZUNA_BASE}/${ADZUNA_COUNTRY}/search/${page}?${params.toString()}`

  let response
  try {
    response = await fetch(url)
  } catch (err) {
    throw Object.assign(new Error('NETWORK_ERROR: Could not reach Adzuna.'), { cause: err })
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('INVALID_API_KEY: Adzuna rejected the app id/key.')
    }
    throw new Error(`ADZUNA_ERROR: HTTP ${response.status}`)
  }

  const data = await response.json()
  return {
    results: (data.results || []).map(normalizeAdzunaJob),
    count: data.count ?? 0,
  }
}

// Registered here so a future provider only needs a `search(params)` function
// with this same shape — no page or component would need to change.
const PROVIDERS = {
  adzuna: { search: fetchAdzuna },
  jsearch: {
    search: async () => {
      throw new Error('NOT_IMPLEMENTED: JSearch provider is not connected yet.')
    },
  },
  remotive: {
    search: async () => {
      throw new Error('NOT_IMPLEMENTED: Remotive provider is not connected yet.')
    },
  },
}

export const ACTIVE_PROVIDER = 'adzuna'

/**
 * searchJobs — the one entry point every page uses to get live internships.
 *
 * @param {object} params
 * @param {string} [params.query] role/keywords, e.g. "UX design intern"
 * @param {string} [params.location] free-text location filter
 * @param {boolean} [params.remoteOnly] client-side filter applied after fetch (kept for callers still using it)
 * @param {'all'|'remote'|'hybrid'|'onsite'} [params.workMode] client-side work-mode filter
 * @param {boolean} [params.postedToday] real server-side filter — refetches with Adzuna's max_days_old=1
 * @param {number} [params.minStipend] client-side filter applied after fetch
 * @param {number} [params.page] 1-indexed page for pagination/infinite scroll
 * @param {number} [params.resultsPerPage]
 */
export async function searchJobs({
  query = 'internship',
  location = '',
  remoteOnly = false,
  workMode = 'all',
  postedToday = false,
  minStipend = 0,
  page = 1,
  resultsPerPage = 20,
} = {}) {
  const maxDaysOld = postedToday ? 1 : undefined
  const cacheKey = JSON.stringify({ query, location, page, resultsPerPage, maxDaysOld })
  const cached = searchCache.get(cacheKey)
  const effectiveWorkMode = remoteOnly ? 'remote' : workMode
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return applyClientFilters(cached.data, { workMode: effectiveWorkMode, minStipend })
  }

  const provider = PROVIDERS[ACTIVE_PROVIDER]
  const data = await provider.search({ query, location, page, resultsPerPage, maxDaysOld })

  searchCache.set(cacheKey, { at: Date.now(), data })
  jobStore.put(data.results)

  return applyClientFilters(data, { workMode: effectiveWorkMode, minStipend })
}

function applyClientFilters(data, { workMode, minStipend }) {
  let results = data.results
  if (workMode && workMode !== 'all') results = results.filter((j) => j.workMode === workMode)
  if (minStipend > 0) {
    results = results.filter((j) => {
      if (!j.salary) return true // don't discard undisclosed-salary listings
      const num = parseFloat(j.salary.replace(/[^0-9.]/g, ''))
      return Number.isNaN(num) || num >= minStipend
    })
  }
  return {
    results,
    count: data.count,
    hasMore: results.length >= 1 && data.count > results.length,
  }
}

export function getCachedJob(id) {
  return jobStore.get(id)
}
