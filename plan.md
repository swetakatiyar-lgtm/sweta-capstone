1. Project Overview

Opportunity & Application Agent is a student-focused AI agent that helps users determine whether an opportunity is trustworthy and whether they are ready to apply.

The agent targets opportunities such as:

Internships

Scholarships

Fellowships

Competitions

Hackathons

Student programs

Grants and similar applications

The core problem is that students often find opportunities through social media, forwarded messages, WhatsApp/Telegram groups, or third-party websites. They may struggle to determine whether an opportunity is authentic, identify the official source, understand eligibility, collect the required documents, and avoid missing deadlines.

The system will combine opportunity verification with application readiness tracking.

Core workflow

Opportunity URL / details
        ↓
Source & authenticity verification
        ↓
Opportunity information extraction
        ↓
Eligibility + deadline identification
        ↓
Required-document checklist
        ↓
Student readiness assessment
        ↓
Application tracking
        ↓
Deadline reminders / status updates

2. Problem Statement

Students encounter a large number of opportunities, but information is fragmented and trustworthiness is difficult to assess.

The agent should answer four practical questions:

Is this opportunity likely to be authentic?

What are the important application details?

What documents do I need?

Am I ready to apply before the deadline?

The MVP should solve these questions reliably for one opportunity rather than attempting to build a complete opportunity-search platform immediately.

3. Target Users

Primary users

College students looking for internships and scholarships

Students applying to competitions and fellowships

Students who frequently discover opportunities through unofficial channels

Secondary users

College clubs and placement cells

Student mentors

Career guidance organizations

4. Scope

4.1 MVP Scope

The MVP intentionally limits the system to a small, testable workflow.

Opportunity scope

One opportunity at a time

User provides an opportunity URL or structured opportunity details

One authoritative source

Focus on verifying whether the provided source appears legitimate

Verification

The agent checks:

Whether the source/domain appears official

Whether the opportunity information is internally consistent

Whether important details such as organization name, deadline, eligibility, and application link are present

Whether the application link belongs to the expected organization/domain

Whether obvious red flags are present

The output should be a verification assessment, not an absolute claim of authenticity.

Example:

Verification status: Likely Authentic

Confidence: High

Reasons:
✓ Opportunity is hosted on the organization's official domain
✓ Application link points to the same organization
✓ Deadline and eligibility information are clearly stated
✓ Organization identity is identifiable

Warnings:
! Always verify the final application page before submitting personal information

Information extraction

Extract a fixed set of fields:

Field

MVP

Opportunity name

✓

Organization

✓

Opportunity type

✓

Deadline

✓

Eligibility

✓

Application URL

✓

Location / mode

✓ if available

Required documents

✓

Important notes

✓

Document tracking

Use a fixed document set for the MVP.

Example:

Resume/CV

Government/student ID

Transcript/marksheet

Photograph

Statement of Purpose / essay

Certificate(s)

The user can mark each document as:

Not available

Available

Needs update

Deadline tracking

For the MVP:

Store application deadline

Calculate remaining time

Display urgency

Show whether the application is still open

Application readiness

The agent generates a simple readiness summary:

Application readiness: 75%

✓ Resume
✓ ID proof
✓ Transcript
✗ Statement of Purpose
✓ Photograph

Main blocker:
Statement of Purpose is missing.

5. Final Goal / Full Product Scope

The final version should evolve into a broader opportunity and application-management agent.

5.1 Multi-source opportunity monitoring

The system should support opportunities discovered from:

Official organization websites

University portals

Government portals

Scholarship platforms

Competition websites

Trusted opportunity databases

User-provided links

The agent should compare information across sources when possible.

Goal

Instead of:

One URL → One verification

the final system becomes:

Multiple sources
      ↓
Opportunity discovery
      ↓
Source comparison
      ↓
Authenticity assessment
      ↓
Opportunity database

5.2 PDF Parsing

Many real opportunities are distributed as PDFs.

The final agent should be able to extract:

Eligibility criteria

Important dates

Required documents

Fees

Selection process

Contact information

Application instructions

It should also preserve the source/page reference where practical so that users can verify extracted information.

5.3 Draft Generation

The agent should help prepare application materials based on the verified opportunity.

Potential outputs:

SOP draft

Motivation letter

Cover letter

Short-answer responses

Email draft

Competition/project description

Generated content should be presented as a draft requiring user review, not as automatically submitted content.

5.4 Full Application Tracking

The final system should maintain an application pipeline.

Example:

Discovered
   ↓
Verified
   ↓
Eligible
   ↓
Preparing
   ↓
Ready to Apply
   ↓
Applied
   ↓
Under Review
   ↓
Interview / Next Round
   ↓
Selected / Rejected

Each opportunity should have:

Status

Deadline

Required documents

Completion percentage

Notes

Application date

Follow-up date

Source URL

Verification history

5.5 Intelligent Reminders

The final system can identify upcoming actions such as:

Missing document

Approaching deadline

Required document needing an update

Draft not completed

Application started but not submitted

Follow-up required

6. AI-Involvement Level

Target: Level 3 — AI-Assisted Agentic Workflow

The project should use AI meaningfully, but deterministic checks should remain responsible for high-confidence facts.

Why Level 3?

A purely rule-based implementation would not demonstrate enough agentic/AI capability.

A fully autonomous system would introduce unnecessary risks because authenticity verification and application information can affect important student decisions.

Therefore, the target is an AI-assisted agentic workflow where AI handles interpretation and reasoning while deterministic components handle structured validation.

AI responsibilities

AI can:

Interpret unstructured opportunity descriptions

Extract information from webpages/PDFs

Summarize eligibility

Identify potential red flags

Compare information between sources

Explain verification reasoning

Convert requirements into a document checklist

Assess application readiness

Generate application drafts

Recommend the next action

Deterministic responsibilities

Traditional code should handle:

URL validation

Domain matching

Date calculations

Deadline countdowns

Checklist state

Application status

Required-field validation

Database persistence

Reminder scheduling

Important principle

AI should recommend and explain; deterministic systems should validate and track.

The system should never claim that an opportunity is definitely legitimate solely because an LLM says so.

7. Proposed Architecture

                    ┌──────────────────┐
                    │      Student     │
                    └────────┬─────────┘
                             │
                    URL / Opportunity
                             │
                             ▼
                 ┌──────────────────────┐
                 │   Agent Orchestrator │
                 └──────────┬───────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
 ┌────────────────┐ ┌────────────────┐ ┌─────────────────┐
 │ Source Checker │ │ Content Parser │ │ Deadline Parser │
 └───────┬────────┘ └───────┬────────┘ └────────┬────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            ▼
                  ┌──────────────────┐
                  │  AI Reasoning    │
                  │  & Verification  │
                  └────────┬─────────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
       Opportunity     Documents      Readiness
          Data          Checklist       Score
             │             │              │
             └─────────────┼──────────────┘
                           ▼
                  ┌──────────────────┐
                  │ Application DB   │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │ Student Dashboard│
                  └──────────────────┘

8. Suggested Technology Stack

Frontend

Choose one:

React + Vite

Next.js

Backend

Choose one:

Python + FastAPI

Node.js + Express

Python + FastAPI is preferred if the project will rely heavily on document processing and AI libraries.

AI layer

Potential components:

LLM API

Structured-output extraction

Retrieval/grounding where needed

Prompted reasoning with explicit evidence

Data storage

MVP:

SQLite

Final:

PostgreSQL

Document processing

Potential tools:

PDF text extraction

OCR for scanned documents

HTML parsing

Structured extraction

Authentication

For the MVP, authentication can be postponed unless required by the project.

9. Data Model

Opportunity

Opportunity
- id
- title
- organization
- type
- source_url
- application_url
- deadline
- eligibility
- location
- verification_status
- verification_confidence
- verification_reasons
- created_at
- updated_at

Document

Document
- id
- user_id
- document_type
- status
- file_reference
- last_updated
- expiry_date

Application

Application
- id
- opportunity_id
- status
- readiness_percentage
- application_date
- notes
- next_action

Requirement

Requirement
- id
- opportunity_id
- requirement_type
- description
- required
- completion_status

10. MVP User Journey

Step 1 — Submit opportunity

Student enters:

Opportunity URL

Step 2 — Fetch source

System retrieves the provided page and identifies:

Organization

Opportunity title

Important dates

Eligibility

Application link

Required documents

Step 3 — Verify

The agent evaluates:

Domain/source

Organization consistency

Application link

Information completeness

Potential red flags

Step 4 — Create checklist

The agent converts requirements into a fixed application checklist.

Step 5 — Student updates documents

Student marks documents as available/missing/outdated.

Step 6 — Readiness assessment

System calculates:

Ready: 80%
Missing: SOP
Deadline: 12 days
Next action: Prepare SOP

11. Verification Methodology

The system should avoid a binary:

REAL / FAKE

Instead, use:

Likely Authentic
Needs Verification
High Risk

Evidence hierarchy

Prefer evidence in this order:

Official organization website

Official university/government portal

Official application portal

Trusted secondary source

Social media / forwarded content

Red flags

Potential indicators include:

Suspicious domain

Mismatch between organization and application domain

Requests for unusual payments

Inconsistent dates

Missing organization identity

Broken or unrelated application links

Unverifiable contact information

Claims that conflict with the official source

A red flag should trigger further verification rather than automatically proving fraud.

12. Success Metrics

MVP

The MVP is successful if a user can:

Submit an opportunity

Receive a structured opportunity summary

See a source/authenticity assessment

See verification evidence/reasons

View the deadline

See required documents

Track document readiness

Receive an overall application-readiness status

Final system

Additional success metrics:

Multi-source verification coverage

PDF extraction accuracy

Requirement extraction accuracy

Deadline extraction accuracy

Useful draft-generation rate

Percentage of applications completed on time

User correction rate for AI-extracted information

13. Evaluation Plan

Create a test set of real and intentionally suspicious opportunities.

Evaluate:

Extraction

Opportunity title accuracy

Deadline accuracy

Eligibility accuracy

Document requirement accuracy

Verification

Measure:

True positive rate

False positive rate

False negative rate

Quality of evidence presented

Agent quality

Evaluate whether the agent:

Chooses appropriate tools

Requests additional evidence when necessary

Avoids unsupported claims

Produces useful next actions

14. Development Milestones

Phase 0 — Planning

Define requirements

Finalize architecture

Define data model

Create repository

Create test dataset

Phase 1 — MVP Foundation

Backend setup

Frontend setup

Database setup

Opportunity input

URL/source retrieval

Phase 2 — Opportunity Extraction

Extract opportunity metadata

Extract deadline

Extract eligibility

Extract documents

Store structured result

Phase 3 — Verification

Domain/source checks

Application-link checks

AI-assisted verification

Evidence display

Risk classification

Phase 4 — Application Readiness

Document checklist

Document status

Readiness calculation

Deadline display

Next-action recommendation

Phase 5 — Final Features

Multi-source monitoring

PDF parsing

OCR

Draft generation

Full application pipeline

Notifications/reminders

15. MVP Definition of Done

The MVP is complete when:

A user can submit one opportunity URL.

The system retrieves the source.

Opportunity details are extracted into structured fields.

Deadline is identified.

Eligibility is summarized.

Required documents are converted into a checklist.

Source/domain authenticity checks are performed.

AI produces a verification assessment with reasons/evidence.

User can track the fixed document set.

System calculates application readiness.

User can see the next recommended action.

Basic error handling exists for inaccessible/invalid sources.

The system clearly communicates uncertainty.

No application is submitted automatically.

16. Final Vision

The final Opportunity & Application Agent should behave like a personal opportunity assistant:

Find → Verify → Understand → Prepare → Track → Apply

The key differentiator is not simply finding opportunities. It is helping students move from "I found this opportunity" to "I know it is worth pursuing, I know what I need, and I am ready to apply."

The capstone should therefore prioritize trust, evidence, explainability, and practical application readiness over maximum automation.
