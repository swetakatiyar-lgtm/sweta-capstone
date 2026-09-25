Opportunity & Application Agent — Build Log

This file records the development history of the capstone project.

Logging Format

Each commit should have one entry using the following structure:

## YYYY-MM-DD — <short commit title>

Commit: <commit hash>

### Goal
What was the purpose of this commit?

### Changes
- Change 1
- Change 2
- Change 3

### AI Involvement
What AI/agent capability was added, changed, tested, or intentionally avoided?

### Testing
- What was tested?
- Result:
- Known issues:

### Evidence / Notes
Relevant screenshots, test cases, observations, design decisions, or links.

### Next Step
What should be done next?

Development Log

2026-09-15 — Project Initialized

Commit: TBD

Goal

Initialize the Opportunity & Application Agent capstone and define the MVP versus final product scope.

Changes

Created the project planning document.

Defined the core problem: opportunity authenticity + application readiness.

Defined MVP boundaries:

Single opportunity

Single source

Fixed document set

Basic deadline tracking

AI-assisted verification

Defined final goals:

Multi-source monitoring

PDF parsing

Draft generation

Full application tracking

Intelligent reminders

Defined the target AI-Involvement Level as Level 3 — AI-Assisted Agentic Workflow.

Established the principle that AI should recommend/explain while deterministic code should validate and track.

AI Involvement

AI is planned to handle:

Unstructured information interpretation

Opportunity information extraction

Verification reasoning

Red-flag identification

Document requirement extraction

Readiness recommendations

Deterministic code will handle:

Date calculations

URL/domain checks

Checklist state

Application status

Database persistence

Testing

Project requirements reviewed against the capstone objective.

No application functionality implemented yet.

Known Issues

Technology stack is not yet finalized.

Authentication requirements are not yet defined.

AI model/provider has not yet been selected.

Verification dataset still needs to be created.

Next Step

Set up the repository and implement the basic MVP backend/frontend structure.

Commit Template

Copy the following section for every future commit:

YYYY-MM-DD — <short commit title>

Commit: <commit hash>

Goal

<What problem does this commit solve?>

Changes






AI Involvement

<Describe what AI did in this commit, or explain why AI was not used.>

Testing

Test:

Expected:

Actual:

Result:

Evidence / Notes

<Add screenshots, examples, observations, design decisions, or important findings.>

Next Step

<What will be implemented next?>

Milestone Log

Milestone 0 — Planning

Status: In Progress

Objectives

Define project problem

Define target users

Separate MVP and final scope

Define AI-involvement level

Define initial architecture

Define success criteria

Create repository

Create initial test dataset

Milestone 1 — MVP Foundation

Status: Not Started

Objectives

Create backend

Create frontend

Set up database

Implement opportunity URL input

Implement source retrieval

Add basic error handling

Milestone 2 — Opportunity Extraction

Status: Not Started

Objectives

Extract opportunity title

Extract organization

Extract opportunity type

Extract deadline

Extract eligibility

Extract application URL

Extract required documents

Store structured opportunity data

Milestone 3 — Authenticity Verification

Status: Not Started

Objectives

Implement domain/source checks

Implement application-link checks

Add AI-assisted verification

Produce evidence-backed reasons

Implement risk categories

Display uncertainty clearly

Milestone 4 — Application Readiness

Status: Not Started

Objectives

Create document checklist

Add document status

Calculate readiness percentage

Add deadline countdown

Identify missing requirements

Recommend next action

Milestone 5 — Final Product

Status: Not Started

Objectives

Multi-source monitoring

PDF parsing

OCR support

Source comparison

Draft generation

Full application status tracking

Reminders

Follow-up tracking

Improved evaluation dataset

Important Development Principles

1. Evidence over confidence

The agent should show why it considers an opportunity trustworthy or risky.

Bad:

This is 95% authentic.

Better:

Likely Authentic

Evidence:
- Official organization domain
- Application link matches the organization
- Opportunity details are consistent with the official source

Remaining uncertainty:
- The agent cannot guarantee the legitimacy of the organization or application.

2. AI should not become the database

Structured application state should be stored deterministically.

AI may interpret information, but the application tracker should maintain explicit fields and states.

3. Never silently invent missing information

If the source does not provide a deadline, eligibility requirement, or document requirement, mark it as:

Not found

rather than guessing.

4. Preserve source evidence

Whenever practical, extracted information should retain its source URL and supporting context so that users can verify important claims.

5. No automatic application submission

The agent may prepare and assist with an application, but the student should remain responsible for reviewing and submitting it.

6. Track AI limitations

Each AI feature should be evaluated for:

Accuracy

Hallucination risk

Missing information

Incorrect interpretation

Uncertainty communication

This log should document important failures as well as successful implementations.

Suggested Commit Sequence

chore: initialize project

feat: add opportunity input

feat: add source retrieval

feat: extract opportunity metadata

feat: extract deadline and eligibility

feat: add document checklist

feat: add source verification

feat: add ai verification reasoning

feat: add readiness score

feat: add application status tracking

feat: add pdf parsing

feat: add multi-source verification

feat: add application draft generation

feat: add reminders

test: evaluate extraction and verification

docs: finalize capst

---

# Claude Code Usage Log — Career OS

## Claude Code Usage (via `ccusage@latest daily --since 20260911`)

Report generated on 2026-09-25. Reflects all Claude Code (and Codex, where present) usage detected on this machine/account for the date range below — `ccusage` has no per-project filter, so these totals are not scoped exclusively to Career OS.

### Day-wise summary (reference table)

| Date | Input | Output | Cache Create | Cache Read | Total Tokens | Cost (USD) |
|---|---|---|---|---|---|---|
| 2026-09-17 | 974 | 167,123 | 416,860 | 30,607,351 | 31,192,308 | $9.46 |
| 2026-09-18 | 1,628 | 528,490 | 1,551,575 | 382,227,149 | 384,308,842 | $87.94 |
| 2026-09-19 | 1,224 | 317,233 | 2,514,305 | 384,119,794 | 386,952,556 | $90.06 |
| 2026-09-22 | 152 | 29,731 | 260,147 | 8,531,602 | 8,821,632 | $2.85 |
| 2026-09-25 | 12 | 3,844 | 136,261 | 872,141 | 1,012,258 | $0.76 |
| **Total** | **3,990** | **1,046,421** | **4,879,148** | **806,358,037** | **812,287,596** | **$191.06** |

No rows exist for 09-11–09-16, 09-20, 09-21, 09-23, or 09-24 — no recorded sessions on those days.

### Per-agent breakdown (raw `ccusage` output)

| Date | Agent | Models | Input | Output | Cache Create | Cache Read | Total Tokens | Cost (USD) |
|---|---|---|---|---|---|---|---|---|
| 2026-09-17 | - Claude | - sonnet-5 | 478 | 166,865 | 416,860 | 30,607,351 | 31,191,554 | $9.46 |
| 2026-09-17 | - Codex | - gpt-5 | 496 | 258 | 0 | 0 | 754 | $0.00 |
| 2026-09-18 | - Claude | - sonnet-5 | 1,628 | 528,490 | 1,551,575 | 382,227,149 | 384,308,842 | $87.94 |
| 2026-09-19 | - Claude | - sonnet-5 | 1,224 | 317,233 | 2,514,305 | 384,119,794 | 386,952,556 | $90.06 |
| 2026-09-22 | - Claude | - sonnet-5 | 152 | 29,731 | 260,147 | 8,531,602 | 8,821,632 | $2.85 |
| 2026-09-25 | - Claude | - sonnet-5 | 12 | 3,844 | 136,261 | 872,141 | 1,012,258 | $0.76 |

### Summary

- Total input tokens: 3,990
- Total output tokens: 1,046,421
- Total cache create tokens: 4,879,148
- Total cache read tokens: 806,358,037
- Total tokens: 812,287,596
- Total cost: $191.06
- Active days: 5 (09-17, 09-18, 09-19, 09-22, 09-25)
- Highest-token day: 2026-09-19 (386,952,556 tokens, $90.06)
- Lowest-token day: 2026-09-17 (31,192,308 tokens, $9.46)
