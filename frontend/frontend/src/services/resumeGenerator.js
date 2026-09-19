// Job-Specific Resume Agent — tailoring engine.
//
// Reuses the existing Groq client (services/ai.js) — no second AI client.
// The master resume in Document Intelligence is never touched: this only
// ever reads its real extracted text and produces a NEW, separate content
// string stored in AppContext's `tailoredResumes`, never written back onto
// the original document record.

import { askAI } from "./ai";

const MAX_RESUME_CHARS = 10000;

function truncate(text) {
  return text.length > MAX_RESUME_CHARS ? `${text.slice(0, MAX_RESUME_CHARS)}…` : text;
}

function buildPrompt({ job, resumeText, matched, missing, jobAnalysis }) {
  const matchedLines = matched.length
    ? matched.map((m) => `- ${m.skill} — evidence in source resume/profile: "${m.evidence}"`).join("\n")
    : "- (none confirmed)";
  const missingLines = missing.length ? missing.map((m) => `- ${m}`).join("\n") : "- (none)";
  const responsibilitiesBlock =
    jobAnalysis?.available && jobAnalysis.responsibilities.length
      ? `\n\nThe job's real stated responsibilities (use to decide what to prioritize/emphasize — never to invent matching experience):\n${jobAnalysis.responsibilities.map((r) => `- ${r}`).join("\n")}`
      : "";

  return `You are tailoring a REAL student's resume for ONE specific job. You must use ONLY information that already exists in the source resume text below. This is a hard rule.

STRICTLY FORBIDDEN — never do any of these, even if it would "help":
- Do not invent skills, tools, employers, job titles, degrees, certifications, or dates that aren't in the source text.
- Do not invent or change metrics/numbers.
- Do not claim the candidate has a requirement listed as "missing" below.
- Do not add years of experience that aren't stated.

ALLOWED — you may:
- Reorder skills/sections to put the most relevant-to-this-job items first.
- Rewrite existing bullet points for clarity and impact, keeping every fact the same.
- Emphasize (not invent) achievements that are already in the source text and relevant to this job.
- Use terminology from the job description ONLY when it's a true restatement of something already in the source resume (e.g. "UI Design" -> "User Interface Design" is fine; adding a tool the candidate never mentioned is not).

Job: ${job.role ?? job.title} at ${job.company}

Confirmed matching requirements (with real evidence from the candidate's own resume/profile):
${matchedLines}

Requirements this candidate does NOT currently show evidence for — do not claim these:
${missingLines}
${responsibilitiesBlock}

Source resume text (the candidate's real, unedited resume):
"""
${truncate(resumeText)}
"""

Produce the tailored resume as clean markdown (use "##" section headings, "-" for bullet points). Do not include any commentary before or after the resume content — output only the resume itself.`;
}

function looksLikeResume(content) {
  return typeof content === "string" && content.trim().length > 150;
}

/**
 * generateTailoredResume({ job, profile, resumeDoc, fit })
 *
 * `resumeDoc` must be the real master Resume document ({ extractedText, ... }
 * from AppContext.documents) — this function never uploads, replaces, or
 * mutates it. `fit` is the result of matchEngine.js's computeApplicationFit.
 *
 * Returns the generated markdown string, or throws a descriptive error if
 * generation genuinely can't be completed (no master resume, or the model
 * fails twice) — it never falls back to fabricated resume content.
 */
export async function generateTailoredResume({ job, profile, resumeDoc, fit, jobAnalysis }) {
  if (!resumeDoc || !resumeDoc.extractedText) {
    throw new Error(
      "NO_MASTER_RESUME: Upload and index a resume in Document Intelligence before tailoring one for a specific job.",
    );
  }

  const prompt = buildPrompt({
    job,
    resumeText: resumeDoc.extractedText,
    matched: fit?.matched ?? [],
    missing: fit?.missing ?? [],
    jobAnalysis,
  });

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await askAI(prompt, { profile });
      if (looksLikeResume(content)) return content;
      lastError = new Error("INVALID_RESUME: Groq returned an empty or too-short resume.");
    } catch (err) {
      lastError = err;
      console.error(`Resume tailoring attempt ${attempt + 1} failed:`, err);
    }
  }

  throw lastError ?? new Error("GENERATION_FAILED: Could not generate a tailored resume right now.");
}
