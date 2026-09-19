// Deterministic match-score model: how closely an opportunity lines up with the
// user's stored profile (skills, preferred role, locations, stipend, work mode).
// Pure and synchronous on purpose — this runs on every card in a list, so it
// can't depend on a network call to Gemini.

export function parseStipendToMonthlyINR(stipend) {
  const num = parseFloat(String(stipend).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(num)) return 0
  if (String(stipend).includes('$')) return num * 83
  return num
}

function normalize(text) {
  return String(text || '').trim().toLowerCase()
}

export function skillAlignment(opp, profile) {
  const required = opp.requiredSkills ?? []
  const owned = new Set((profile.skills ?? []).map(normalize))
  const matched = required.filter((s) => owned.has(normalize(s)))
  const missing = required.filter((s) => !owned.has(normalize(s)))
  const percent = required.length ? Math.round((matched.length / required.length) * 100) : 100
  return { matched, missing, percent }
}

function locationMatches(opp, profile) {
  if (profile.workMode && opp.workMode === profile.workMode) return true
  const locations = (profile.preferredLocations ?? []).map(normalize)
  if (locations.includes('remote') && opp.workMode === 'remote') return true
  return locations.some((loc) => loc !== 'remote' && normalize(opp.location).includes(loc))
}

export function computeMatch(opp, profile) {
  const { percent: skillPercent } = skillAlignment(opp, profile)
  let score = (opp.baseMatch ?? 70) * 0.35 + skillPercent * 0.45

  const roleWords = normalize(profile.preferredRole).split(/\s+/).filter(Boolean)
  const roleHit = roleWords.some((w) => normalize(opp.role).includes(w))
  score += roleHit ? 8 : -6

  score += locationMatches(opp, profile) ? 6 : -4

  // Real listings frequently don't disclose a stipend — don't penalize the
  // ones that simply didn't say, only reward/penalize when we actually know.
  if (opp.salary) {
    const meetsStipend = parseStipendToMonthlyINR(opp.salary) >= (profile.minStipend ?? 0)
    score += meetsStipend ? 6 : -10
  }

  return Math.max(0, Math.min(99, Math.round(score)))
}

export function matchReasons(opp, profile) {
  const reasons = []
  const { matched } = skillAlignment(opp, profile)

  matched.forEach((skill) => reasons.push(`${skill} matches`))

  const roleWords = normalize(profile.preferredRole).split(/\s+/).filter(Boolean)
  if (roleWords.some((w) => normalize(opp.role).includes(w))) {
    reasons.push(`Role matches your "${profile.preferredRole}" preference`)
  }

  if (locationMatches(opp, profile)) {
    reasons.push(
      opp.workMode === 'remote' ? 'Remote preference matches' : `Location matches (${opp.location})`,
    )
  }

  if (opp.salary && parseStipendToMonthlyINR(opp.salary) >= (profile.minStipend ?? 0)) {
    reasons.push('Stipend preference matches')
  }

  if (opp.trust === 'high' || opp.trust === 'verified') {
    reasons.push('Company verified')
  }

  if (reasons.length === 0) reasons.push('Broadly relevant to your profile')
  return reasons
}
