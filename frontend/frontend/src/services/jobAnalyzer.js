// Job-Specific Resume Agent — real job requirement analysis.
//
// Required skills already come from a deterministic scan (see
// lib/skills.js's extractSkillsFromText, reused via matchEngine.js) — that
// part never needs AI and is never re-implemented here. What genuinely
// needs the existing Groq integration is turning the job's real,
// unstructured description into a short structured breakdown (preferred
// skills vs. responsibilities vs. qualifications), since that can't be
// regex-matched reliably. Structured JSON output, validated, retried once,
// and never backfilled with invented requirements if the model fails.

import { askAIForJSON } from "./ai";
import { extractJobRequirements } from "./matchEngine";

const MAX_DESCRIPTION_CHARS = 6000;

function truncate(text) {
  return text.length > MAX_DESCRIPTION_CHARS ? `${text.slice(0, MAX_DESCRIPTION_CHARS)}…` : text;
}

function isValidAnalysis(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    Array.isArray(obj.preferredSkills) &&
    Array.isArray(obj.responsibilities) &&
    Array.isArray(obj.qualifications)
  );
}

function buildMessages(job) {
  return [
    {
      role: "system",
      content:
        "You extract structured requirements from a REAL job description. Only report what is explicitly stated in the text. Never invent a requirement, skill, or qualification that isn't there. Respond with ONLY a JSON object, no prose, matching exactly this shape: " +
        '{"preferredSkills": string[], "responsibilities": string[], "qualifications": string[]}. ' +
        "preferredSkills = skills mentioned as a plus/nice-to-have (not already obviously required). responsibilities = what the role actually does, as short phrases. qualifications = stated experience/education/eligibility requirements. Use empty arrays for anything not mentioned.",
    },
    {
      role: "user",
      content: `Job title: ${job.role ?? job.title ?? "Unknown role"}\nCompany: ${job.company ?? "Unknown"}\n\nDescription:\n"""\n${truncate(job.description ?? "")}\n"""`,
    },
  ];
}

/**
 * analyzeJobRequirements(job) — real analysis of a live Adzuna job's own
 * description. Returns:
 *   {
 *     requiredSkills: string[],      // deterministic, from matchEngine.js
 *     preferredSkills: string[],     // from the model, validated JSON
 *     responsibilities: string[],
 *     qualifications: string[],
 *     available: boolean,            // false if AI analysis couldn't be completed
 *   }
 * `available: false` is the honest "Analysis unavailable" state — the
 * function never fills those arrays with fabricated content on failure.
 */
// Keyed by real job id — re-opening the same Opportunity Detail page (or
// re-rendering it) must never re-call Groq for a job already analyzed in
// this session. Cleared implicitly on a full page reload, which is fine:
// a fresh session re-analyzing is still "not repeatedly analyzing the same
// job unnecessarily" within a single visit.
const analysisCache = new Map();

async function runAnalysis(job) {
  const requiredSkills = extractJobRequirements(job);

  if (!job.description || job.description.trim().length < 40) {
    return { requiredSkills, preferredSkills: [], responsibilities: [], qualifications: [], available: false };
  }

  const messages = buildMessages(job);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = await askAIForJSON(messages);
      if (isValidAnalysis(parsed)) {
        return {
          requiredSkills,
          preferredSkills: parsed.preferredSkills,
          responsibilities: parsed.responsibilities,
          qualifications: parsed.qualifications,
          available: true,
        };
      }
    } catch (err) {
      console.error(`Job analysis attempt ${attempt + 1} failed:`, err);
    }
  }

  // Both attempts failed or returned malformed JSON — honest fallback, not
  // a fabricated breakdown. The deterministic requiredSkills list (real,
  // regex-based) is still returned so the rest of Application Fit works.
  return { requiredSkills, preferredSkills: [], responsibilities: [], qualifications: [], available: false };
}

export async function analyzeJobRequirements(job) {
  if (analysisCache.has(job.id)) return analysisCache.get(job.id);
  const promise = runAnalysis(job);
  analysisCache.set(job.id, promise);
  try {
    const result = await promise;
    analysisCache.set(job.id, Promise.resolve(result));
    return result;
  } catch (err) {
    analysisCache.delete(job.id); // let a genuine failure be retried on next open
    throw err;
  }
}
