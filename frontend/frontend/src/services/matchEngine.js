// Job-Specific Resume Agent — evidence-based Application Fit engine.
//
// Deliberately deterministic and synchronous, same design principle as
// lib/match.js (Scout's quick relevance score), lib/trust.js and
// lib/readiness.js: given the same job + profile + documents, this always
// returns the same score. No AI call decides the score or invents
// evidence — every matched requirement is backed by a real substring found
// in the user's own uploaded document text or their stated Career Profile
// skills. This is intentionally a SEPARATE, deeper analysis from
// lib/match.js's card-level score (which stays untouched for Scout), not a
// replacement for it.

import { extractSkillsFromText } from '../lib/skills'
import { allDetectedSkills } from './documents'

function normalize(text) {
  return String(text || '').trim().toLowerCase()
}

// Real requirement extraction — reuses the same deterministic skill scan
// already used to build `job.requiredSkills` in services/jobs.js, applied
// again here so a caller can pass any job-shaped object and always get the
// same list, e.g. a job pulled from Chat/Applications where the cached
// `requiredSkills` field might be stale.
export function extractJobRequirements(job) {
  const fromText = extractSkillsFromText(`${job.title ?? job.role ?? ''} ${job.description ?? ''}`)
  const fromField = job.requiredSkills ?? []
  const merged = [...new Set([...fromField, ...fromText])]
  return merged
}

// Finds a real sentence in `text` that mentions `skill` — this is the
// "evidence" shown to the user, quoted verbatim from their own document,
// never generated or paraphrased.
function findEvidenceSentence(text, skill) {
  if (!text) return null
  const sentences = text.split(/(?<=[.!?])\s+/)
  const needle = normalize(skill)
  const hit = sentences.find((s) => normalize(s).includes(needle))
  if (!hit) return null
  const trimmed = hit.trim()
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed
}

/**
 * computeApplicationFit(job, { profile, documents })
 *
 * Real, evidence-based comparison of a job's requirements against the
 * user's actual Career Profile skills and actual uploaded/analyzed
 * documents (resume, portfolio, case study — via services/documents.js's
 * allDetectedSkills, which only ever reflects real extracted text).
 *
 * Returns:
 *   {
 *     requirements: string[],       // real requirements detected in the job
 *     matched: { skill, evidence, source }[],
 *     missing: string[],
 *     matchScore: number | null,    // null when there's nothing to compare
 *     summary: string,              // honest, real-numbers sentence — no AI
 *   }
 */
export function computeApplicationFit(job, { profile, documents = [] } = {}) {
  const requirements = extractJobRequirements(job)

  if (requirements.length === 0) {
    return {
      requirements: [],
      matched: [],
      missing: [],
      matchScore: null,
      summary: "This listing's description didn't mention specific skills Career OS could check against — showing the general match score instead.",
    }
  }

  const profileSkills = profile?.skills ?? []
  const docSkills = allDetectedSkills(documents)
  const resumeDoc = documents.find((d) => d.category === 'Resume')
  const portfolioDoc = documents.find((d) => d.category === 'Portfolio')
  const caseStudyDoc = documents.find((d) => d.category === 'Case Study')

  const matched = []
  const missing = []

  for (const req of requirements) {
    const inProfile = profileSkills.some((s) => normalize(s) === normalize(req))
    const inDocs = docSkills.some((s) => normalize(s) === normalize(req))

    if (!inProfile && !inDocs) {
      missing.push(req)
      continue
    }

    // Prefer real quoted evidence from an actual document; fall back to
    // the Career Profile only when no document text mentions it.
    const evidenceDoc = [resumeDoc, portfolioDoc, caseStudyDoc].find((d) =>
      d?.extractedText && normalize(d.extractedText).includes(normalize(req)),
    )
    const evidence = evidenceDoc ? findEvidenceSentence(evidenceDoc.extractedText, req) : null

    matched.push({
      skill: req,
      evidence: evidence ?? `Listed in your Career Profile skills.`,
      source: evidence ? evidenceDoc.name : 'Career Profile',
    })
  }

  const matchScore = Math.round((matched.length / requirements.length) * 100)

  const summary =
    missing.length === 0
      ? `You have real evidence for all ${requirements.length} requirement${requirements.length === 1 ? '' : 's'} Career OS detected in this listing.`
      : `You have real evidence for ${matched.length} of ${requirements.length} requirements Career OS detected — ${missing.join(', ')} ${missing.length === 1 ? "isn't" : "aren't"} currently supported by your resume, portfolio, case study, or Career Profile.`

  return { requirements, matched, missing, matchScore, summary }
}
