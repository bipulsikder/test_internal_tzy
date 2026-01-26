# Truckinzy Internal Admin App – Architecture & Feature Guide

This document explains the internal (admin) Next.js app in this repo – how it is structured, how it talks to Supabase and the candidate-facing board-app, and the key domain flows we have built.

The goal is that a new engineer can get productive in a day, and can confidently extend any of the major flows without surprises.

---

## 1. High-Level System Overview

The platform is split into two main applications:

- **Internal Admin App (this repo root)**
  - Next.js 16 app used by Truckinzy team for:
    - Managing clients
    - Creating and editing logistics job openings
    - Reviewing candidates and matches
    - Sending invite links that land on the board-app
    - Monitoring analytics and AI matching
- **Candidate Board App (`board-app/`, separate repo for hosting)**
  - Next.js 14 app used by candidates:
    - Authentication + onboarding
    - Resume upload and parsing
    - Structured profile editing
    - Applying to jobs (including invite-based flows)

Shared backend:

- **Supabase** (Postgres + Auth + Edge Functions)
  - Single project backing both apps
  - RLS-protected tables for candidates, jobs, applications, job_invites, clients, etc.

Shared AI services:

- Google Gemini via `@google/generative-ai`
  - Job description generation
  - Requirement parsing for candidate matching

### 1.1 Architecture Sketch (Developer View)

```text
          ┌───────────────────────────┐
          │  Internal Admin App      │
          │  (Next.js 16)            │
          │  - Jobs, Clients,        │
          │    Pipeline, Invites     │
          └─────────────▲────────────┘
                        │
                        │ service-role Supabase client (supabaseAdmin)
                        │
          ┌─────────────┴────────────┐
          │       Supabase           │
          │  - Postgres (jobs,       │
          │    candidates,           │
          │    applications,         │
          │    job_invites, etc.)    │
          │  - Auth (board app)      │
          │  - Storage (resumes)     │
          └─────────────▲────────────┘
                        │
                        │ anon + service-role clients
                        │
          ┌─────────────┴────────────┐
          │  Candidate Board App     │
          │  (Next.js 14)            │
          │  - Auth, Onboarding,     │
          │    Profile, Jobs, Apply  │
          └──────────────────────────┘
```

---

## 2. Repo Layout (Internal App)

Key directories at repo root:

- `app/`
  - Next.js 16 app directory for internal UI and APIs
  - Important internal pages live under `app/(internal)/...`
- `components/`
  - Shared React components for internal UI
- `lib/`
  - Shared libraries: Supabase clients, AI helpers, resume parsing, mailer, etc.
- `supabase/`
  - Migrations and edge functions for the shared Supabase project

Important internal routes:

- `app/(internal)/jobs/page.tsx` – Jobs dashboard
- `app/(internal)/jobs/[id]/page.tsx` – Job details + pipeline + invites
- `app/(internal)/clients/page.tsx` – Client admin list
- `app/(internal)/clients/[id]/page.tsx` – Client detail page
- `app/(internal)/jd-generator/page.tsx` – Standalone AI JD tool (backed by same JD API)
- `app/(internal)/upload/page.tsx` – Legacy resume upload utilities (admin-side)

Key internal APIs:

- `app/api/jobs/route.ts` – Create/list jobs
- `app/api/jobs/[id]/route.ts` – Get/update/delete jobs
- `app/api/clients/*` – Client CRUD + AI-generated About
- `app/api/job-invites/route.ts` – Create/list job_invites (used from admin & board-app)
- `app/api/upload-resume/route.ts` – Admin resume upload flow (with blob reuse)

---

## 3. Data Model (Supabase)

### 3.1 Core Tables

- **candidates** – canonical candidate profile
  - Auth-linked via `auth_user_id` + `email`
  - Stores structured profile data, resume-derived fields, work availability etc.
- **jobs** – job openings created in the internal app
  - Fields include:
    - `title`, `department` (industry), `location`, `type`, `status`
    - `requirements` (text[]), `skills_required` (text[])
    - `experience`, `positions`, `amount` (compensation text)
    - `client_id`, `client_name`
    - **New**: `sub_category` – logistics sub-domain like "Car Carrier", "Reefer", etc.
    - `jd_generated` flag
- **clients** – hiring companies
  - `name`, `slug`, `website`, `company_type`, `location`, logo + contacts
  - **New**: `company_subtype` – more specific classification (e.g., "Car Carrier")
- **applications** – job applications submitted from board-app
  - `job_id`, `candidate_id`, `status` pipeline, `applied_at`, `notes`, `source`, `match_score`
- **job_matches** / **job_candidate_matches** – AI-driven candidate-job match scoring
  - Created when a job is created / re-aligned, used to pre-populate pipeline
- **job_invites** – invite links from internal app to board-app
  - `job_id`, `candidate_id` (nullable), `email`, `token`
  - `status` enum: `sent`, `opened`, `applied`, `rejected`, `expired`
  - Timestamps: `sent_at`, `opened_at`, `applied_at`, `rejected_at`, `responded_at`

All tables use RLS; the internal app uses a **Supabase service role** client (`supabaseAdmin`) with cookie-based checks to enforce that only authenticated HR/admins can access admin endpoints.

---

## 4. Internal Feature Deep-Dive

### 4.1 Clients Management

**Files**

- [clients-dashboard.tsx](../components/clients-dashboard.tsx)
- [app/(internal)/clients/page.tsx](../app/(internal)/clients/page.tsx)
- [app/(internal)/clients/[id]/page.tsx](../app/(internal)/clients/%5Bid%5D/page.tsx)
- [app/api/clients/route.ts](../app/api/clients/route.ts)
- [app/api/clients/[id]/route.ts](../app/api/clients/%5Bid%5D/route.ts)
- [app/api/clients/generate-about/route.ts](../app/api/clients/generate-about/route.ts)

**Flow**

- HR sees a searchable list of clients in `ClientsDashboard`.
- "New Client" opens a dialog with:
  - Name, slug (auto-generated), company type, **sub category**, location
  - Website, primary contact (name/email/phone), additional contacts
  - Freeform "About" field with AI autofill
- On save:
  - POST `/api/clients` validates required fields, generates unique slug, and inserts into `clients` table.
  - PUT `/api/clients/:id` allows editing, slug re-normalization, contact updates.

**AI Company Summary**

- Button: **Search company** inside the About field.
- Endpoint: `POST /api/clients/generate-about`
  - Scrapes the company site and uses Gemini to produce a candidate-facing summary.
  - Stores `about`, `about_generated_at`, `about_source_url` on the client.

**Company Type + Sub Category**

- `company_type` is a high-level segment (Transportation & Fleet, Warehousing, etc.).
- `company_subtype` is a free text field with quick-pick chips depending on `company_type`:
  - e.g. for "Transportation & Fleet": Car Carrier, Dry Van, Reefer, Flatbed, Tanker, LTL, Intermodal, Last Mile, Hazmat.
- These are used when displaying clients next to jobs and can later be used for matching/analytics.

### 4.2 Job Creation & AI JD

**Files**

- [components/create-job-dialog.tsx](../components/create-job-dialog.tsx)
- [components/jobs-dashboard.tsx](../components/jobs-dashboard.tsx)
- [app/(internal)/jobs/page.tsx](../app/(internal)/jobs/page.tsx)
- [app/api/jobs/route.ts](../app/api/jobs/route.ts)
- [app/api/jobs/[id]/route.ts](../app/api/jobs/%5Bid%5D/route.ts)
- [lib/ai-utils.ts](../lib/ai-utils.ts)
- [app/api/generate-jd/route.ts](../app/api/generate-jd/route.ts)

**Create Job Dialog**

- Main UX: `CreateJobDialog` component, used for both create and edit.
- Captured fields:
  - Job title, industry
  - **Sub category** (Car Carrier, Reefer, Flatbed, etc.)
  - Location, employment type
  - Number of positions
  - Client (selected via a searchable Command dialog backed by `/api/clients`)
  - Compensation `amount` (free text)
  - "Skills required" as tags, stored into `jobs.skills_required[]`
  - Experience text
  - Job description (text area)

**Skills Suggestion System**

- Internal constants tie **sub_category** → recommended skills.
- UI shows two layers of suggestions:
  - **Suggested**: static list based on sub_category (Car Carrier, Reefer, etc.) + general logistics skills.
  - **Typeahead suggestions**: filters suggestions as user types.
- Clicking a pill adds it as a tag; tags are stored as newline-separated string in form state but sent as array on save.

**Persisting Jobs**

- On submit, `CreateJobDialog` posts to:
  - `POST /api/jobs` (create)
  - `PUT /api/jobs/:id` (update)
- The API layer maps `industry` → `jobs.department` and passes through `sub_category`, `skills_required` array, and other fields.
- After successful insert, the jobs API triggers a **lightweight matching job**:
  - Uses `parseSearchRequirement` + `intelligentCandidateSearch` to rank candidates.
  - Writes top matches into `job_matches` table with `relevance_score`, `score_breakdown`.
  - No heavy per-candidate AI summary at this stage to keep job creation fast.

**AI JD Generator (No Benefits)**

- Users can click **Generate with AI** above the description field.
- Flow:
  - Opens a small dialog to collect optional "must-have" requirements.
  - Calls `POST /api/generate-jd` with `customInputs` containing:
    - Job title, industry, sub_category, location, type
    - Experience level, skills_required, additional requirements
  - `generateJobDescriptionWithEmbeddings` in `lib/ai-utils.ts`:
    - Uses Gemini to build a structured JD JSON.
    - Uses candidate database insights (vector + text search) to bias content toward our existing candidate pool.
    - Returned structure intentionally excludes benefits from the prompt.
  - Dialog formats the JD into markdown-like text:
    - Description
    - `### Key Responsibilities`
    - `### Requirements`
    - `### Skills`

### 4.3 Job Details, Pipeline & Invites

**Files**

- [components/job-details-page-client.tsx](../components/job-details-page-client.tsx)
- [components/job-details.tsx](../components/job-details.tsx)
- [components/assign-job-dialog.tsx](../components/assign-job-dialog.tsx)
- [app/(internal)/jobs/[id]/page.tsx](../app/(internal)/jobs/%5Bid%5D/page.tsx)
- [app/api/job-invites/route.ts](../app/api/job-invites/route.ts)
- [app/api/applications/route.ts](../app/api/applications/route.ts)

**Pipeline**

- Status columns: All, Applied, Shortlist, Screening, Interview, Offer, Hired, Rejected.
- Each `Application` card shows:
  - Candidate avatar, name, current role, match score badge
  - Source, applied date
  - Editable notes area with inline save
  - Status dropdown powered by `applications` API.

**Invite System (Admin Side)**

- `job_invites` table is the source of truth.
- Creation paths:
  1. **Assign to job** dialog (from candidate preview) – optional "Create invite link for this job" toggle.
  2. **Invites tab** inside `JobDetails` – inline email field "Invite candidates to apply".
- Both paths call `POST /api/job-invites`:
  - Generates a secure token via `crypto.randomBytes`.
  - Inserts into `job_invites` with status `sent` and timestamps.
  - Returns the invite record + derived `link` pointing at board-app: `${BOARD_APP_BASE_URL}/invite/${token}`.
  - Uses `lib/mailer.ts` + SMTP env vars to send an email from `INVITES_FROM` (Gmail-compatible via app password).

**Invite UX in Job Details**

- Dedicated **Invites** box in the status row.
- Invites tab shows:
  - Intro card explaining the flow (Sent → Opened → Applied) and inline email box + "Create invite" button.
  - For each invite:
    - Email + colored status badge
    - Sent / Opened / Applied / Rejected timestamp grid
    - Actions:
      - **Copy link** – uses `navigator.clipboard` and shows the URL.
      - **Open** – opens invite URL in a new tab.

---

## 5. Authentication & Security (Internal)

- The internal app does not use Supabase Auth for admin; instead it relies on:
  - A simple `auth` cookie and, in some cases, a custom `hr_user` cookie.
  - APIs check either `auth=true` in cookies or a Bearer token.
- All data access in APIs uses `supabaseAdmin` (service role) but is gated by these checks.
- For any new admin API, follow the patterns in:
  - `app/api/jobs/route.ts`
  - `app/api/clients/route.ts`

---

## 6. Resume Upload & Parsing (Admin Side)

Although the main resume upload experience is board-app, the internal app still contains an admin-only upload flow.

**Key files**

- [app/api/upload-resume/route.ts](../app/api/upload-resume/route.ts)
- [lib/resume-parser.ts](../lib/resume-parser.ts)
- [lib/vercel-blob-utils.ts](../lib/vercel-blob-utils.ts)

**Behavior**

- Check Vercel Blob storage before uploading; reuse existing files when possible.
- Parse resumes using PDF/Text/Docx parsers + Gemini where appropriate.
- Rich error structure for parsing failures (as described in the root README).

---

## 7. Environment Variables (Internal)

Environment for the internal app is primarily defined in `.env.local` (not committed). Critical vars:

- Supabase
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

- AI (Gemini)
  - `GEMINI_API_KEY`
  - optional: `GEMINI_MODEL` (defaults to `gemini-2.0-flash`)

- Board app integration
  - `BOARD_APP_BASE_URL` – base URL of candidate-facing board app
  - `NEXT_PUBLIC_BOARD_APP_BASE_URL` – same, but also exposed to the browser (used for links)

- Email / SMTP (for invites)
  - `SMTP_HOST` (default `smtp.gmail.com` if unset)
  - `SMTP_PORT` (usually `465`)
  - `SMTP_SECURE` (`true` or `false`)
  - `SMTP_USER` – SMTP username, e.g. `hr.truckinzy@gmail.com`
  - `SMTP_PASS` – app password or SMTP password
  - `INVITES_FROM` – display From header, e.g. `Truckinzy Hiring <hr.truckinzy@gmail.com>`

---

## 8. How to Extend Safely

When adding new features to the internal app:

1. **Reuse existing patterns**
   - Hooks & API usage in `clients-dashboard.tsx`, `create-job-dialog.tsx`, `job-details.tsx` provide good examples.
2. **Add columns via Supabase migrations**
   - Place new SQL files under `supabase/migrations/` and run them via the Trae Supabase integration.
3. **Keep the separation of concerns**
   - Internal app only generates links and uses service-role Supabase.
   - Candidate journeys (auth, onboarding, applying) always happen in board-app.
4. **Test with `npm run build`**
   - Both apps are strict about TypeScript and lint; treat warnings (especially React hooks) seriously.
