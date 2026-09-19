// Canonical skill vocabulary used both by onboarding's chip picker and by
// live job normalization (services/jobs.js) to derive `requiredSkills` from
// a raw job description — real listings don't come with a tagged skill
// list, so we detect mentions of known skills in the description text.

export const KNOWN_SKILLS = [
  'Figma',
  'Sketch',
  'Adobe XD',
  'UI Design',
  'UX Research',
  'Wireframing',
  'Prototyping',
  'Visual Design',
  'Typography',
  'User Testing',
  'Usability Testing',
  'Design Systems',
  'Interaction Design',
  'HTML',
  'CSS',
  'JavaScript',
  'React',
  'Python',
  'SQL',
  'Excel',
  'Data Analysis',
  'Content Writing',
  'SEO',
  'Social Media',
  'Marketing',
  'Communication',
  'Illustration',
  'Branding',
  'Motion Design',
  'Video Editing',
]

// Scans free-text (usually a job description) for mentions of known skills.
// Deliberately simple/deterministic — no NLP dependency, so it runs
// synchronously on every card the way lib/match.js expects.
export function extractSkillsFromText(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  return KNOWN_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()))
}
