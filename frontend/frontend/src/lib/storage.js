const KEY = 'careeros:state'

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    return {
      ...fallback,
      ...saved,
      // Shallow top-level merge would let an older saved `profile` (missing
      // newer fields like skills/onboarded) fully replace the default and
      // silently drop them. Merge one level deeper for profile/settings so
      // schema additions show up for returning users instead of vanishing.
      profile: { ...fallback.profile, ...saved.profile },
      settings: { ...fallback.settings, ...saved.settings },
      // `applications` used to be an array of opportunity ids before Agent
      // Mode introduced rich records ({ id, opportunityId, status, ... }).
      // Drop anything from an older shape instead of letting it crash
      // `hasApplied`/the tracker on `.opportunityId` of a raw number.
      applications: Array.isArray(saved.applications)
        ? saved.applications.filter((a) => a && typeof a === 'object' && 'opportunityId' in a)
        : fallback.applications,
      // `documents` used to be a hardcoded mock list ({ id, kind, course,
      // lastOpened, indexed }) before Document Intelligence introduced real
      // uploads ({ id, category, status, fileReference, ... }). Drop the old
      // shape rather than showing stale mock cards with no real file behind them.
      documents: Array.isArray(saved.documents)
        ? saved.documents.filter((d) => d && typeof d === 'object' && 'fileReference' in d)
        : fallback.documents,
      // Job-specific tailored resumes (additive, derived from the master
      // resume) — guard the same way in case of corrupted/foreign data.
      tailoredResumes: Array.isArray(saved.tailoredResumes)
        ? saved.tailoredResumes.filter((r) => r && typeof r === 'object' && 'jobId' in r)
        : fallback.tailoredResumes,
    }
  } catch {
    return fallback
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — ignore, state stays in-memory for this session
  }
}
