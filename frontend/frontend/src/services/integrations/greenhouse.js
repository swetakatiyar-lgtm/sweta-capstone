// Placeholder for real submission through an employer's Greenhouse ATS.
// See ./README.md. Once implemented, lib/agent.js's createApplicationRecord
// would set `simulated: false` and use this call's returned reference.

/**
 * @param {{ opportunity: object, profile: object }} payload
 * @returns {Promise<{ applicationLink: string, reference: string }>}
 */
export async function submitApplication(payload) { // eslint-disable-line no-unused-vars
  throw new Error('NOT_IMPLEMENTED: Greenhouse integration is not connected yet.')
}
