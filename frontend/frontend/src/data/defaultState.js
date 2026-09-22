// Default/empty state for a brand-new user — every field here is honestly
// blank/neutral until Onboarding or Settings sets a real value for THIS
// user. None of it is ever shown as-is: `onboarded: false` forces
// Onboarding to run first, which overwrites name/skills/preferredRole/
// preferredLocations/minStipend before the rest of the app ever renders.
export const defaultProfile = {
  name: '',
  email: '',
  role: '',
  education: '',
  skills: [],
  preferredRole: '',
  // Multi-select preferred roles from Onboarding (mirrors the Skills
  // multi-select pattern) — this array is the source of truth used by
  // Scout/Dashboard/Daily Brief search and lib/match.js scoring.
  // `preferredRole` (singular, set to the first selected role) is kept only
  // for the one remaining single-role UI in Settings.
  preferredRoles: [],
  preferredLocations: [],
  minStipend: 0,
  workMode: 'remote', // 'remote' | 'hybrid' | 'onsite'
  // Resume/portfolio status is never stored on the profile — it's always
  // derived live from real uploaded documents (see lib/readiness.js's
  // categoryStatus), so it can never drift from what's actually on file.
  onboarded: false,
}

export const defaultSettings = {
  theme: 'light',
  notifications: true,
  briefTime: '20:00',
}

// Real activity log — starts empty for a new user and fills up as
// AppContext's addActivity() records things that actually happened
// (uploads, saves, applications, verifications). Never seeded with
// events that didn't occur.
export const defaultActivity = []

// Opportunities used to be hardcoded here. They now come from
// services/jobs.js (live Adzuna API + session cache) — see Scout,
// OpportunityDetail, Dashboard and DailyBrief.

// Documents used to be hardcoded here. They now come from real uploads —
// metadata lives in AppContext, file bytes in services/storage.js
// (IndexedDB), extracted text via services/parser.js. See Documents.jsx.
export const defaultDocuments = []
