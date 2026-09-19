// Real readiness score — computed from actual uploaded documents, not a
// fabricated percentage. Every page that shows "Application Readiness"
// (Dashboard, Scout, Ready Kit, Opportunity Detail, Daily Brief) calls this
// same function so they can never disagree.

export const READINESS_WEIGHTS = {
  Resume: 40,
  Portfolio: 30,
  'Case Study': 20,
  'Cover Letter': 10,
}

// Whether a missing document blocks applying entirely, or is just a nice-to-have.
export const DOCUMENT_IMPORTANCE = {
  Resume: 'Required',
  Portfolio: 'Recommended',
  'Case Study': 'Optional',
  'Cover Letter': 'Optional',
}

export function categoryLabel(documents, category) {
  const status = categoryStatus(documents, category)
  if (status === 'ready') return `${category} Ready`
  if (status === 'indexing') return `${category} Indexing…`
  if (status === 'needs-update') return `${category} Needs Update`
  const importance = DOCUMENT_IMPORTANCE[category] ?? 'Optional'
  return `${category} ${importance === 'Recommended' ? 'Missing' : importance}`
}

const STATUS_SCORE = {
  ready: 1,
  indexing: 0.4,
  'needs-update': 0.5,
  error: 0,
}

// A category counts at its best-status document (uploading a second, better
// resume shouldn't lower your score because an old one also exists).
export function computeReadiness(documents) {
  const breakdown = Object.entries(READINESS_WEIGHTS).map(([category, weight]) => {
    const docsInCategory = documents.filter((d) => d.category === category)
    const best = docsInCategory.reduce((max, d) => Math.max(max, STATUS_SCORE[d.status] ?? 0), 0)
    return { category, weight, fraction: best, contributed: Math.round(weight * best) }
  })

  const percent = Math.round(breakdown.reduce((sum, b) => sum + b.contributed, 0))
  return { percent, breakdown }
}

export function categoryStatus(documents, category) {
  const docsInCategory = documents.filter((d) => d.category === category)
  if (docsInCategory.length === 0) return 'missing'
  if (docsInCategory.some((d) => d.status === 'ready')) return 'ready'
  if (docsInCategory.some((d) => d.status === 'indexing')) return 'indexing'
  return 'needs-update'
}
