// Placeholder for a real LinkedIn job-search feed. See ./README.md.
// Shape matches an entry in data/mockData.js's defaultOpportunities so the
// rest of the app (Scout, matching, etc.) wouldn't need to change.

/**
 * @param {{ keywords: string, location?: string }} query
 * @returns {Promise<import('../../data/mockData').Opportunity[]>}
 */
export async function searchOpportunities(query) { // eslint-disable-line no-unused-vars
  throw new Error('NOT_IMPLEMENTED: LinkedIn integration is not connected yet.')
}
