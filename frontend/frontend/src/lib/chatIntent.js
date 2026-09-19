// Lightweight, deterministic detector for "find me internships" style
// messages in Chat — lets Career OS call the real job service and show
// clickable cards instead of asking the LLM to invent company names.

const TRIGGER = /\b(find|search|show me|looking for|get me)\b/i
const JOB_WORD = /\b(intern(ship)?s?|jobs?|roles?|opportunit(y|ies)|openings?)\b/i

export function detectJobSearchIntent(text) {
  if (!TRIGGER.test(text) || !JOB_WORD.test(text)) return null

  const locationMatch = text.match(/\bin\s+([a-z\s]+?)(?:[.?!]|$)/i)
  const location = locationMatch ? locationMatch[1].trim() : ''

  let query = text
    .replace(TRIGGER, '')
    .replace(/\bin\s+[a-z\s]+$/i, '')
    .replace(/[.?!]+$/, '')
    .trim()

  if (!query) query = 'internship'

  return { query, location }
}

// "Which document mentions Figma?" / "which case study discusses user
// interviews?" — real document search (services/documents.js), not a guess.
const DOC_TRIGGER = /\b(which document|which file|which case study|which portfolio|which resume|search my documents|search documents)\b/i

export function detectDocumentQueryIntent(text) {
  if (!DOC_TRIGGER.test(text)) return null

  const aboutMatch = text.match(/\b(?:mentions?|discuss(?:es)?|about|contains?|for)\s+["']?([a-z0-9 /+-]+?)["']?(?:[.?!]|$)/i)
  const query = aboutMatch ? aboutMatch[1].trim() : text.replace(DOC_TRIGGER, '').replace(/[.?!]+$/, '').trim()

  return { query: query || text }
}
