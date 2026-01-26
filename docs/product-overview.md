# Truckinzy Platform – Product Overview (Non‑Technical)

This document explains the Truckinzy platform in simple language so that non‑technical people (founders, operations, sales, recruiters) can understand what it does and how the pieces fit together.

It also acts as the top‑level “map” that points to deeper technical docs for engineers.

---

## 1. What Truckinzy Is

Truckinzy is a hiring platform built specifically for **logistics and trucking**.

It has two main parts:

1. **Internal Team App (Admin)**
   - Used by Truckinzy’s team (or recruiters) to:
     - Manage client companies
     - Create job openings
     - See candidate profiles and matches for each job
     - Send tracked invite links to candidates
     - Monitor pipelines and analytics

2. **Candidate App (Board App)**
   - Used by drivers, dispatchers, operations and warehouse candidates to:
     - Sign up and log in
     - Upload a resume once and get an auto‑filled profile
     - Keep a structured profile (skills, experience, projects)
     - See Truckinzy jobs and apply quickly
     - Accept invite links from recruiters and track their status

Both apps talk to the same secure database (Supabase) and share the same job and candidate data.

### 1.1 Simple System Map

You can think of the system like this:

```text
   Internal Admin App (recruiters)
          │
          │  create clients + jobs, send invites
          ▼
       Supabase (DB + Auth + Storage)
          ▲
          │  candidate profiles, applications, invites
          │
   Candidate Board App (drivers / ops)
```

---

## 2. Key User Types and Goals

### 2.1 Truckinzy Internal Team / Recruiters

Goals:

- Understand clients and their roles (Car Carrier, 3PL, etc.)
- Quickly create job postings that match logistics reality
- See “who looks good” for each job without manually screening hundreds of resumes
- Reach candidates via invite links and track whether they opened and applied
- Keep a clean view of the pipeline by stage (Applied, Shortlist, Interview, Offer…)

### 2.2 Candidates

Goals:

- Avoid re‑typing the same info again and again
- Get credit for experience even if resume formatting is messy
- See relevant trucking/logistics jobs, not generic software roles
- Apply quickly and keep track of what they’ve applied to
- Respond to personal invite links in a few taps

---

## 3. End‑to‑End Flows (Story Form)

### 3.1 Client + Job Creation (Internal App)

1. **Create Client**
   - Recruiter clicks **Clients → New Client**.
   - Enters:
     - Client name
     - Company type (e.g. Transportation & Fleet)
     - Sub‑category (e.g. Car Carrier, Reefer, 3PL Warehouse)
     - Website
     - Primary contact details
   - Can click **Search company** to auto‑generate a candidate‑friendly description based on the website.

2. **Create Job**
   - From **Jobs → New Job**, recruiter fills in:
     - Job title (e.g. Traffic Manager, Night Dispatch Lead)
     - Industry + Sub‑category (e.g. Transportation & Fleet → Car Carrier)
     - Location, employment type, salary/fee range
     - Client (chosen from the client list)
     - Skills required (chosen from suggested tags)
     - Experience and description
   - Can click **Generate with AI** to get a very relevant job description based on:
     - Title, sub‑category, location, type, skills
     - Actual candidates in the database with similar experience
   - Saves the job, which also triggers an internal “matching” step – the system scores existing candidates for this job.

Outcome: the job is visible in both the internal app (for recruiters) and the board app (for candidates).

**Flow diagram**

```text
Recruiter → Internal App → "New Client" → Save client
          → "New Job" (select client + details) → Save job
          → AI matching runs → candidates ranked for this job
          → Job appears on Candidate Board
```

### 3.2 Candidate Journey (Board App)

1. **Sign up**
   - Candidate opens the board app URL (e.g. `test-board-app.vercel.app`).
   - Creates an account using email+password or Google.
   - Confirmation link from Supabase now redirects back to the live board app (not localhost).

2. **Onboarding**
   - Step 1: Upload resume.
     - System reads PDF/DOCX, extracts name, email, phone, experience, skills.
   - Step 2: Review profile.
     - Candidate sees the parsed data and can edit it (job titles, companies, skills, etc.).

3. **Dashboard**
   - Shows “My Work” and profile.
   - Profile page lets candidates edit:
     - Personal info
     - Work history
     - Skills and tools
     - Projects (with title, description, links)
     - Work availability (job types, hours, timezone, preferred location)

4. **Finding Jobs**
   - Candidates browse the jobs page, filter by type/location, and see cards for each job.

5. **Applying**
   - From a job card or detail page, candidate triggers the **Apply** flow.
   - If not logged in, they pass through a simple auth step.
   - Then they review profile details and finally submit the application.
   - The application moves them into the job’s pipeline in the internal app.

**Flow diagram**

```text
Candidate → Board App → Sign up / Log in
          → Onboarding (Upload resume → Review profile)
          → Browse jobs → Open job → Apply flow
          → Application stored in Supabase
          → Recruiter sees candidate in job pipeline
```

### 3.3 Invite‑Based Flow (End‑to‑End)

1. Recruiter opens a **Job Details** page in internal app.
2. On the **Invites** tab, they type an email and click **Create invite**.
   - The system:
     - Creates a `job_invites` record with a unique token.
     - Sends an email via Gmail SMTP (hr.truckinzy account) with the invite link.
3. Candidate receives an email like: _“You’ve been invited to apply for Traffic Manager at Inter State Oil Carrier.”_
4. Candidate clicks the link (e.g. `https://board-app/invite/<token>`):
   - Board app records that the invite was **opened**.
   - Redirects to `Job Apply` flow, with the invite token attached.
5. If candidate submits the application:
   - System creates an application and sets invite status to **applied**.
6. Internal app updates its Invites tab to show timeline:
   - Sent date, Opened date, Applied date, etc.

**Flow diagram**

```text
Recruiter → Internal App → Job Details → Invites tab
          → Enter email → Create invite
          → Supabase stores invite + token, email sent

Candidate → Clicks invite link in email
          → Board App /invite/:token marks "opened"
          → Redirect to Job Apply page
          → Submit application → invite marked "applied"
          → Recruiter sees updated status in Internal App
```

This gives a full “story” from recruiter sending an invite to candidate applying.

---

## 4. Product Requirements Summary (PRD‑Style)

This is not a formal PRD, but a concise list of requirements the current implementation satisfies.

### 4.1 Internal Admin App

**Must‑have features**

- Create and manage clients with:
  - Company type (segment)
  - Sub‑category (e.g. Car Carrier)
  - Website and contact details
- Generate company description from website using AI.
- Create and edit jobs with:
  - Title, location, employment type, compensation
  - Industry and sub‑category
  - Suggested skills (based on sub‑category) with tag UI
  - AI‑generated Job Description **without** benefits section
- Pipeline view per job:
  - Stages: Applied, Shortlist, Screening, Interview, Offer, Hired, Rejected
  - For each candidate: match score, notes, and status updates
- Invite management:
  - Create invite links for any job (from job or from candidate)
  - Send invite emails via Gmail SMTP
  - Track status: sent, opened, applied, rejected

**Nice‑to‑have / extensibility**

- Analytics dashboards
- Client‑specific reports (fills, time‑to‑hire, etc.)

### 4.2 Candidate Board App

**Must‑have features**

- Authentication:
  - Email/password signup with email verification
  - Google login
  - Redirects always return to the hosted board app domain
- Onboarding:
  - Resume upload with parsing
  - Structured profile completion step
- Profile management:
  - Editable work history, skills, projects, and summary
  - Work availability with job types, hours, timezone, preferred location
  - Public profile page (shareable link)
- Jobs:
  - Browse jobs with relevant logistics roles
  - Apply via multi‑step wizard
  - Applications persist into shared database
- Invites:
  - Accept invites via email links
  - View invites in dashboard (status + apply / reject)

**Nice‑to‑have / extensibility**

- Candidate‑facing analytics (views, shortlist rate, etc.)
- Messaging or status updates from recruiters

---

## 5. Where to Go Next (For Different Audiences)

### For Non‑Technical Stakeholders

- Read this **Product Overview** end‑to‑end.
- Then skim:
  - `docs/internal-architecture.md` – focus on section titles and the flow diagrams in your head.
  - `board-app/docs/board-app-architecture.md` – skim the first 3 sections.

### For New Engineers

1. Read this document to get a story of the product.
2. Then read, more deeply:
   - `docs/internal-architecture.md`
   - `board-app/docs/board-app-architecture.md`
3. Finally, follow the READMEs in each repo for setup and local development.
