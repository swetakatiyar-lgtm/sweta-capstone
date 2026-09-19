// Real document retrieval — the thing that lets Chat answer "which document
// mentions Figma?" by actually searching indexed text, not guessing. Pure
// and synchronous: it only reads the metadata array AppContext already
// holds (name, category, extractedText, aiAnalysis), no network call.

function snippetAround(text, query, radius = 90) {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, radius * 2).trim()
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

/**
 * searchDocuments(documents, query) — case-insensitive search across each
 * document's name, category, extracted text, and AI analysis summary.
 * @returns {{ document: object, matchedIn: string[], snippet: string }[]}
 */
export function searchDocuments(documents, query) {
  const clean = query.trim().toLowerCase()
  if (!clean) return []

  return documents
    .map((doc) => {
      const matchedIn = []
      let snippet = ''

      if (doc.name.toLowerCase().includes(clean)) matchedIn.push('filename')
      if (doc.category.toLowerCase().includes(clean)) matchedIn.push('category')
      if (doc.extractedText?.toLowerCase().includes(clean)) {
        matchedIn.push('content')
        snippet = snippetAround(doc.extractedText, clean)
      }
      if (doc.aiAnalysis?.detectedSkills?.some((s) => s.toLowerCase().includes(clean))) {
        matchedIn.push('detected skills')
      }
      if (doc.aiAnalysis?.summary?.toLowerCase().includes(clean)) {
        matchedIn.push('AI analysis')
        if (!snippet) snippet = snippetAround(doc.aiAnalysis.summary, clean)
      }

      return matchedIn.length ? { document: doc, matchedIn, snippet } : null
    })
    .filter(Boolean)
}

export function findDocumentsWithSkill(documents, skill) {
  const clean = skill.toLowerCase()
  return documents.filter((d) => d.aiAnalysis?.detectedSkills?.some((s) => s.toLowerCase() === clean))
}

// All skills Career OS has actually detected across every analyzed document
// — used by Scout to cross-reference required skills against real uploaded
// evidence instead of only the profile's self-reported skill list.
export function allDetectedSkills(documents) {
  const skills = new Set()
  documents.forEach((d) => d.aiAnalysis?.detectedSkills?.forEach((s) => skills.add(s)))
  return [...skills]
}
