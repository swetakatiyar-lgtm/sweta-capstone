// The single source of truth for "what state is this job's application in".
// Every card (Scout, Opportunity Detail, Dashboard) must call
// `getApplicationStatus` instead of deriving a status from local flags —
// that's how "Applied" at 0% readiness happened before: the UI trusted the
// mere existence of an application record instead of re-checking whether
// the real, current documents still justify it.
import { categoryStatus } from './readiness'

export const APPLICATION_STATUS = {
  NOT_STARTED: 'not_started',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  READY: 'ready',
  AWAITING_PERMISSION: 'awaiting_permission',
  APPLYING: 'applying',
  SUBMITTED: 'submitted',
  FOLLOW_UP: 'follow_up',
  INTERVIEW: 'interview',
  REJECTED: 'rejected',
  OFFER: 'offer',
}

// Statuses that mean "a real application record exists and is valid" —
// these are the only ones allowed to show a green badge or a timeline.
const TRACKED_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.FOLLOW_UP,
  APPLICATION_STATUS.INTERVIEW,
  APPLICATION_STATUS.OFFER,
  APPLICATION_STATUS.REJECTED,
])

export function isTrackedStatus(status) {
  return TRACKED_STATUSES.has(status)
}

export function canShowTimeline(status) {
  return TRACKED_STATUSES.has(status)
}

/**
 * Resolves one job's real application status. A stored application record
 * only counts if its own status is one of the tracked outcomes — a record
 * that was auto-repaired to `profile_incomplete` (see AppContext's startup
 * repair pass) falls straight back through to the live, document-derived
 * state, exactly as if it had never been submitted.
 */
export function getApplicationStatus(jobId, { applications, documents }) {
  const record = applications.find((a) => a.opportunityId === jobId)
  if (record && isTrackedStatus(record.status)) {
    return record.status
  }

  const resumeReady = categoryStatus(documents, 'Resume') === 'ready'
  return resumeReady ? APPLICATION_STATUS.READY : APPLICATION_STATUS.PROFILE_INCOMPLETE
}
