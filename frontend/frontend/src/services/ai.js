// Career OS's AI service — talks to Groq's OpenAI-compatible Chat Completions
// API. No SDK: a single fetch() call keeps this dependency-free and easy to
// swap providers later (only this file would need to change).

import { categoryStatus } from "../lib/readiness";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Single place to change the model later.
export const MODEL = import.meta.env.VITE_GROQ_MODEL || "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are Career OS, an AI career assistant for students.

Your responsibilities:
- Help students discover internships and opportunities
- Explain internships and job descriptions in plain language
- Review resumes
- Suggest portfolio improvements
- Prepare interview answers
- Verify companies and opportunities
- Give concise, practical, natural advice — never sound like a generic chatbot.

When asked whether an opportunity is safe/legitimate/a scam, base your answer strictly on the
"Verification status" and "Verification summary" lines given below for that opportunity — never
invent a verdict. If no verification data is present for the opportunity being asked about, say
you don't have a verification result for it yet rather than guessing.`;

// Turns the stored user profile into a compact instruction block that gets
// prepended to every request as a system message. This never renders in the
// chat UI — it's the "memory" that makes replies personalized without the
// user repeating themselves every message.
export function buildProfileContext(profile) {
  if (!profile) return "";

  const lines = [
    profile.name && `Name: ${profile.name}`,
    profile.role && `Current status: ${profile.role}`,
    profile.education && `Education: ${profile.education}`,
    profile.skills?.length && `Skills: ${profile.skills.join(", ")}`,
    profile.preferredRoles?.length
      ? `Preferred internship roles: ${profile.preferredRoles.join(", ")}`
      : profile.preferredRole && `Preferred internship role: ${profile.preferredRole}`,
    profile.preferredLocations?.length &&
      `Preferred locations: ${profile.preferredLocations.join(", ")}`,
    typeof profile.minStipend === "number" &&
      `Minimum stipend: ₹${profile.minStipend.toLocaleString("en-IN")}/month`,
    profile.workMode && `Preferred work mode: ${profile.workMode}`,
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `Known profile of the student you are talking to (use this to personalize your answer — for example recommend roles/locations/stipends that match it — but do not just repeat it back verbatim unless asked):\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}

// If the user navigated here from a specific opportunity (Scout, Opportunity
// Detail, Ready Kit all set this via context), include it so
// "write a cover letter" or "prep me for the interview" needs no re-explaining.
export function buildOpportunityContext(opportunity) {
  if (!opportunity) return "";

  const lines = [
    `Company: ${opportunity.company}`,
    `Role: ${opportunity.role}`,
    opportunity.requiredSkills?.length && `Required skills: ${opportunity.requiredSkills.join(", ")}`,
    opportunity.location && `Location: ${opportunity.location}`,
    opportunity.stipend && `Stipend: ${opportunity.stipend}`,
    opportunity.deadlineDays != null && `Deadline: in ${opportunity.deadlineDays} days`,
    opportunity.trust && `Verification status: ${opportunity.trust}${opportunity.trustScore != null ? ` (trust score ${opportunity.trustScore}/100)` : ""}`,
    opportunity.trustSummary && `Verification summary: ${opportunity.trustSummary}`,
  ].filter(Boolean);

  return `The student currently has this specific opportunity open in Career OS — assume questions like "write a cover letter" or "prep me for the interview" are about THIS role unless they say otherwise:\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}

// Agent Mode's memory of what it has already done — this is what lets Chat
// answer "have I applied to Google?" or "prep me for the interview" without
// the user repeating the application history.
export function buildApplicationHistoryContext(applications, tailoredResumes = []) {
  if (!applications?.length) return "";

  const lines = applications.map((a) => {
    const applied = new Date(a.appliedDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const parts = [`${a.company} (${a.role}): status "${a.status}", applied ${applied}`];
    if (a.nextFollowUp) parts.push(`next follow-up ${new Date(a.nextFollowUp).toLocaleDateString([], { dateStyle: "medium" })}`);
    if (a.interviewDate) parts.push(`interview ${new Date(a.interviewDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`);
    if (a.tailoredResumeId) {
      const tailored = tailoredResumes.find((r) => r.id === a.tailoredResumeId);
      parts.push(tailored ? `used a tailored resume generated for ${tailored.company} (${tailored.role})` : "used a tailored resume");
    } else {
      parts.push("used the master resume");
    }
    return parts.join(", ");
  });

  return `The student's real application history, submitted only after they approved each one in Career OS's agent flow (use this to answer questions like "have I applied to X" or "what's my next follow-up" precisely — never say you don't know if it's listed here):\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(messages, { jsonMode = false } = {}) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.6,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      // response wasn't JSON — fall through with status only
    }
    const err = new Error(body?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.code = body?.error?.code;
    throw err;
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("EMPTY_RESPONSE: Groq returned no text.");
  }
  return text;
}

// If Chat has a document open (via "Improve with Career OS" from Document
// Intelligence), include its extracted text so questions about it need no
// re-explaining or re-uploading.
export function buildDocumentContext(document) {
  if (!document) return "";

  const lines = [
    `Name: ${document.name}`,
    `Category: ${document.category}`,
    document.aiAnalysis?.summary && `Prior AI analysis: ${document.aiAnalysis.summary}`,
  ].filter(Boolean);

  const excerpt = document.extractedText ? document.extractedText.slice(0, 6000) : "";

  return [
    `The student currently has this document open in Career OS — answer questions about "it", "this document", or "this case study" using its real content below:`,
    lines.map((l) => `- ${l}`).join("\n"),
    excerpt && `Document content:\n"""\n${excerpt}\n"""`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// The one real source of "is your resume/portfolio ready" for the AI —
// derived live from actually-uploaded, actually-indexed documents (same
// function Dashboard/Scout/Ready Kit use), never a self-reported flag the
// student could set without a real file behind it.
export function buildDocumentStatusContext(documents) {
  if (!documents) return "";
  const categories = ["Resume", "Portfolio", "Case Study", "Cover Letter"];
  const lines = categories.map((c) => `${c}: ${categoryStatus(documents, c)}`);
  return `Real document status (from Document Intelligence, not self-reported):\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}

/**
 * askAI(prompt, options)
 * - prompt: the latest user message (string)
 * - options.profile: the stored user profile object (auto-injected as context)
 * - options.history: prior turns in this session, [{ role: 'user'|'assistant', text }],
 *   used so follow-ups like "only remote ones" are understood in context.
 */
export async function askAI(
  prompt,
  { profile, history = [], opportunity, applications = [], document, documents, tailoredResumes = [] } = {},
) {
  const profileContext = buildProfileContext(profile);
  const opportunityContext = buildOpportunityContext(opportunity);
  const applicationHistoryContext = buildApplicationHistoryContext(applications, tailoredResumes);
  const documentContext = buildDocumentContext(document);
  const documentStatusContext = buildDocumentStatusContext(documents);
  const systemContent = [
    SYSTEM_PROMPT,
    profileContext,
    opportunityContext,
    applicationHistoryContext,
    documentContext,
    documentStatusContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    { role: "system", content: systemContent },
    ...history.map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.text,
    })),
    { role: "user", content: prompt },
  ];

  return callGroqWithErrorHandling(messages);
}

async function callGroqWithErrorHandling(messages, options = {}) {
  if (!API_KEY) {
    // Developer-facing — this should never reach a real user in production.
    throw new Error(
      "MISSING_API_KEY: VITE_GROQ_API_KEY is not set. Add it to your .env file and restart the dev server.",
    );
  }

  try {
    return await callGroq(messages, options);
  } catch (error) {
    console.error("Groq Error:", error);

    const status = error?.status;
    const message = String(error?.message ?? error);

    if (message.startsWith("MISSING_API_KEY")) {
      throw error;
    }

    if (status === 401 || status === 403) {
      throw new Error("INVALID_API_KEY: Your Groq API key was rejected. Check VITE_GROQ_API_KEY.");
    }

    if (status === 429) {
      // Rate limit — retry automatically once after 2 seconds before giving up.
      await sleep(2000);
      try {
        return await callGroq(messages, options);
      } catch (retryError) {
        console.error("Groq Error (after retry):", retryError);
        throw new Error("QUOTA_EXCEEDED: You've hit the Groq rate limit. Try again shortly.");
      }
    }

    if (status === 404) {
      throw new Error("MODEL_NOT_FOUND: The requested model is unavailable for this API key.");
    }

    if (status >= 500) {
      throw new Error("MODEL_OVERLOADED: Groq is experiencing high demand right now. Try again in a moment.");
    }

    if (
      error instanceof TypeError ||
      /network|fetch failed|Failed to fetch/i.test(message)
    ) {
      throw new Error("NETWORK_ERROR: Could not reach the Groq API. Check your internet connection.");
    }

    throw new Error(`AI_ERROR: ${message}`);
  }
}

/**
 * askAIForJSON(messages) — the one place in the app that asks Groq for
 * strict JSON, for callers (like services/jobAnalyzer.js) that need a
 * structured object rather than markdown. Parses and returns the object;
 * throws INVALID_JSON on malformed output so the caller's own retry logic
 * (never a fabricated fallback) can decide what to do.
 */
export async function askAIForJSON(messages) {
  const text = await callGroqWithErrorHandling(messages, { jsonMode: true });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON: Groq did not return valid JSON.");
  }
}

// ---------------------------------------------------------------------------
// Document Intelligence — real analysis of an uploaded file's extracted text.
// Each function sends the ACTUAL extracted text to Groq and asks for a
// markdown response, reusing Chat's existing ResponseRenderer (tables become
// cards, headings get icons) instead of parsing brittle JSON out of an LLM.
// ---------------------------------------------------------------------------

const MAX_DOCUMENT_CHARS = 12000; // keep prompts reasonably sized

function truncate(text) {
  return text.length > MAX_DOCUMENT_CHARS ? `${text.slice(0, MAX_DOCUMENT_CHARS)}…` : text;
}

export async function analyzeResume(text, profile) {
  const prompt = `You are analyzing a real, uploaded resume for a student. Read the resume text below and produce a markdown report with these exact sections, in this order:

## ATS Score
State a score out of 100 as a single bold number, then one sentence explaining it.

## Detected Skills
A markdown table with columns Skill | Where mentioned — list only skills you actually found in the text.

## Missing Keywords
A markdown table with columns Keyword | Why it matters — keywords commonly expected for this kind of role that are NOT in the resume. Base "expected" on the resume's own target role/field, not an unrelated field.

## Experience Summary
2-3 sentences summarizing actual work/project experience found in the text.

## Education Summary
1-2 sentences summarizing actual education found in the text.

## Improvement Suggestions
A numbered list of 3-5 concrete, specific improvements based on what's actually in (or missing from) this resume.

Only report what is actually present in the text below — never invent experience, skills, or education that aren't there.

Resume text:
"""
${truncate(text)}
"""`;

  return askAI(prompt, { profile });
}

export async function analyzePortfolio(text, profile) {
  const prompt = `You are analyzing a real, uploaded design portfolio for a student. Read the text below (extracted from the portfolio file) and produce a markdown report with these exact sections:

## Portfolio Overview
State the approximate project/case-study count you can identify, in one sentence.

## Storytelling & Process
2-3 sentences on how well the portfolio explains problem, process, and outcome for its projects, based on what's actually written.

## Visual Hierarchy & UX Process
A markdown table with columns Area | Assessment (rows: Visual Hierarchy, UX Process Clarity, Case Study Depth).

## Missing Sections
A bullet list of sections commonly expected in a strong design portfolio that this one appears to be missing (e.g. metrics, user research, iteration).

## Improvement Suggestions
A numbered list of 3-5 concrete improvements.

Only report what is actually present in the text below — never invent projects that aren't there.

Portfolio text:
"""
${truncate(text)}
"""`;

  return askAI(prompt, { profile });
}

export async function reviewCaseStudy(text, profile) {
  const prompt = `You are reviewing a real, uploaded UX case study for a student. Read the text below and produce a markdown report:

## AI Review
A bullet list of 3-5 specific, actionable pieces of feedback (e.g. missing usability testing, no measurable outcomes, weak research storytelling) based on what is and isn't in the text.

## Strengths
A short bullet list of what the case study already does well.

Only base this on the actual text below — never invent details that aren't there.

Case study text:
"""
${truncate(text)}
"""`;

  return askAI(prompt, { profile });
}
