// Real Google Calendar integration — no OAuth/API key required. Google's
// public "render" endpoint opens the actual Google Calendar UI with the
// event pre-filled; the user still has to click Save there, which is the
// permission/confirmation step by construction — Career OS never creates
// the event on the user's calendar without them doing that click.

function toGoogleDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function buildGoogleCalendarUrl(application) {
  const start = new Date(application.interviewDate)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour default

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Interview — ${application.company} (${application.role})`,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: `Career OS interview for the ${application.role} role at ${application.company}.`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
