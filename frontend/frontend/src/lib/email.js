// Real Gmail/email-client integration — no send API or OAuth. A `mailto:`
// link opens the user's own configured email client with the draft
// pre-filled; they review and click Send themselves. Career OS never sends
// anything on its own — this is the permission step by construction.

export function buildMailtoLink({ to = '', subject = '', body = '' }) {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`
}

export function buildFollowUpEmail(application) {
  return {
    subject: `Following up — ${application.role} application at ${application.company}`,
    body: [
      `Hi,`,
      '',
      `I'm writing to follow up on my application for the ${application.role} role at ${application.company}, submitted on ${new Date(application.appliedDate).toLocaleDateString([], { dateStyle: 'medium' })}.`,
      `I remain very interested in the opportunity and would appreciate any update on the status of my application.`,
      '',
      `Thank you for your time and consideration.`,
      '',
      `Best regards,`,
    ].join('\n'),
  }
}

export function buildInterviewConfirmationEmail(application) {
  const when = application.interviewDate
    ? new Date(application.interviewDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
    : '[interview date]'
  return {
    subject: `Confirming interview — ${application.role} at ${application.company}`,
    body: [
      `Hi,`,
      '',
      `Thank you for the opportunity to interview for the ${application.role} role at ${application.company}. I'm writing to confirm our interview scheduled for ${when}.`,
      `Please let me know if there's anything I should prepare beforehand.`,
      '',
      `Looking forward to speaking with you.`,
      '',
      `Best regards,`,
    ].join('\n'),
  }
}
