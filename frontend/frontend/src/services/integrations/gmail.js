// Placeholder for real Gmail sending. See ./README.md.
// Shape matches lib/agent.js's buildApplicationEmail() output so wiring this
// up later is a drop-in: sendApplicationEmail(buildApplicationEmail(...)).

/**
 * @param {{ to: string, subject: string, body: string }} message
 * @returns {Promise<{ id: string }>}
 */
export async function sendApplicationEmail(message) { // eslint-disable-line no-unused-vars
  throw new Error('NOT_IMPLEMENTED: Gmail integration is not connected yet.')
}
