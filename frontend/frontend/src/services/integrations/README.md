# Integration placeholders

Career OS's "Agent Mode" currently *simulates* every external action — no
real network call leaves the browser when an application is "submitted".
Each file in this folder is the seam where a real integration would plug in
later, matching the shape the agent flow (`src/lib/agent.js`) already
expects.

Every placeholder throws `NOT_IMPLEMENTED` rather than silently pretending
to succeed, so it's obvious at call time if something starts depending on
one of these before it's wired up for real.

- `gmail.js` — send the generated application-summary email
  (`buildApplicationEmail` in `lib/agent.js`) via the Gmail API.
- `googleCalendar.js` — create calendar events for follow-ups and
  interviews instead of only storing dates in `AppContext`.
- `linkedin.js` — pull real internship listings instead of the mock
  `defaultOpportunities` array.
- `indeed.js` — same, for Indeed's job search API.
- `greenhouse.js` / `lever.js` — submit the actual application through an
  employer's ATS instead of `createApplicationRecord` marking it
  `simulated: true`.

To wire one up: implement the function, remove the `NOT_IMPLEMENTED` throw,
and call it from `src/lib/agent.js` or the page that currently only updates
`AppContext` (e.g. `Applications.jsx`'s "Add Interview" would call
`googleCalendar.createEvent` after `setApplicationField`).
