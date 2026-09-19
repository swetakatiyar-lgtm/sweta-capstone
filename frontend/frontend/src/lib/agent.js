// Career OS "Agent Mode" — the logic behind the permission-gated apply flow.
// Nothing here calls a real external service; see src/services/integrations/
// for where those would plug in later. This file only decides WHAT the agent
// would do and drafts the paper trail (application record + email summary).

// Manually-selectable outcomes in the tracker — `profile_incomplete` is a
// system-only repair state (see AppContext's startup repair pass) and is
// deliberately excluded here so a user can never hand-pick their way back
// into an impossible state.
export const APPLICATION_STATUSES = ['submitted', 'follow_up', 'interview', 'offer', 'rejected']

export const STATUS_LABELS = {
  submitted: 'Submitted',
  follow_up: 'Follow-up Sent',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  profile_incomplete: 'Needs Documents',
}

export const STATUS_COLORS = {
  submitted: '#8B7CF6',
  follow_up: '#D4A017',
  interview: '#4FA66B',
  offer: '#3F8F5A',
  rejected: '#D64545',
  profile_incomplete: '#D64545',
}

// The exact list shown in the approval modal — kept as data so the modal and
// the eventual real automation stay in sync about what "applying" means.
export function agentActions() {
  return [
    'Submit your resume',
    'Attach your portfolio',
    'Use your saved profile information',
    'Record the application',
    'Track follow-ups',
  ]
}

// The simulated step-by-step execution shown after approval. `run` is a stub
// for what a real integration would do at that step (see integrations/).
export function agentExecutionSteps() {
  return [
    { id: 'connect', label: 'Connecting…' },
    { id: 'fill', label: 'Filling application…' },
    { id: 'resume', label: 'Uploading resume…' },
    { id: 'portfolio', label: 'Attaching portfolio…' },
    { id: 'submit', label: 'Submitting…' },
    { id: 'save', label: 'Saving application…' },
  ]
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// Builds the record stored in AppContext.applications. Kept separate from
// the context so it's independently testable and so a future real ATS
// integration (Greenhouse/Lever/etc.) can replace `applicationLink` and the
// simulated flag without touching component code.
export function createApplicationRecord(
  opportunity,
  profile,
  { savedBeforeApplying = false, tailoredResumeId = null } = {},
) {
  const now = new Date().toISOString()
  return {
    id: `app_${opportunity.id}_${Date.now()}`,
    opportunityId: opportunity.id,
    company: opportunity.company,
    role: opportunity.role,
    appliedDate: now,
    status: 'submitted',
    // Real, user-confirmed history — a new entry is only ever appended when
    // the user explicitly confirms a transition (see updateApplicationStatus).
    statusHistory: [{ status: 'submitted', at: now }],
    savedBeforeApplying,
    // Which generated tailored-resume record (if any) the user chose to use
    // for this application — see AppContext's `tailoredResumes` and
    // services/resumeGenerator.js. Null means the master resume was used.
    tailoredResumeId,
    nextFollowUp: addDays(now, 5),
    interviewDate: null,
    applicationLink: opportunity.applyUrl ?? opportunity.applicationLink ?? null,
    notes: '',
    simulated: true, // this application was submitted by the in-app prototype, not a real ATS
    emailDraft: buildApplicationEmail(opportunity, profile, now),
  }
}

// A ready-to-send email summary. Real sending would post this through
// src/services/integrations/gmail.js — for now it's just generated and
// displayed, per the "generate the draft, structure for later" instruction.
export function buildApplicationEmail(opportunity, profile, appliedAtIso = new Date().toISOString()) {
  const appliedAt = new Date(appliedAtIso)
  const followUp = new Date(addDays(appliedAtIso, 5))

  return {
    subject: `Career OS — Application Submitted: ${opportunity.company}`,
    body: [
      `Hi ${profile.name},`,
      '',
      `Career OS submitted your application. Here's the summary:`,
      '',
      `Company: ${opportunity.company}`,
      `Role: ${opportunity.role}`,
      `Applied: ${appliedAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
      `Documents used: Resume, Portfolio${opportunity.requiredSkills ? ', Cover Letter' : ''}`,
      `Follow-up date: ${followUp.toLocaleDateString([], { dateStyle: 'medium' })}`,
      `Reference: ${opportunity.id}-${appliedAt.getTime()}`,
      '',
      "Career OS will remind you when it's time to follow up.",
    ].join('\n'),
  }
}

// Generates the prep prompt sent to Chat when the user schedules an
// interview — the "Interview Workspace" is just Chat's rich renderer given a
// well-structured request, reusing work already built rather than a new UI.
export function buildInterviewPrepPrompt(application) {
  return [
    `I have an interview for the ${application.role} role at ${application.company}.`,
    'Prepare a full interview workspace with headings for:',
    '1. Company research (what they do, recent news, culture)',
    '2. Likely interview questions for this role',
    '3. STAR-format sample answers using my real background',
    '4. A UX case study practice prompt relevant to this company',
    '5. Two quick Figma exercises to warm up on',
  ].join('\n')
}
