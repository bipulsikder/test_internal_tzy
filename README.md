# Truckinzy Platform (Internal Admin App)

This repository contains the **internal admin application** for Truckinzy (ATS + operational dashboards) and the shared backend modules used by the internal app.

The candidate-facing app lives in a separate repo (`board-app`). In this workspace it may appear as a sibling folder for convenience, but treat it as an independent deployable.

## Start Here

- Product overview: [docs/product-overview.md](docs/product-overview.md)
- Internal architecture: [docs/internal-architecture.md](docs/internal-architecture.md)
- Board app architecture (reference): [board-app/docs/board-app-architecture.md](board-app/docs/board-app-architecture.md)


## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Supabase (Auth + Postgres + Storage)
- Zod (validation)
- Tailwind + Radix UI components
- Optional: Vercel Blob (file storage workflows)

## Repo Structure

```
app/
  (internal)/           # Internal routes (admin UI)
  api/                  # API routes (server-side)
  login/                # Login UI (internal)
components/             # UI + feature components
contexts/               # React contexts
hooks/                  # Canonical hooks (single source of truth)
lib/                    # Business logic and integrations (no React)
  constants/            # Shared constants (single source of truth)
  resume-parser.ts      # Resume parsing pipeline
  intelligent-search.ts # Search/matching logic
  supabase.ts           # Supabase clients and bucket setup
  supabase-*.ts         # Supabase services (storage, candidates)
docs/                   # Architecture and product docs
public/                 # Static assets
scripts/                # One-off scripts (migrations, utilities)
supabase/               # Edge functions + SQL migrations
```

## Codebase Conventions (For Future Developers)

### 1) Keep Routes Thin

- `app/api/**/route.ts` should be orchestration only: parse input, call a `lib/*` function, return a response.
- Any non-trivial logic belongs in `lib/` so it can be tested and reused.

### 2) One Source of Truth for Constants

- Put shared constants in `lib/constants/*`.
- Examples:
  - Storage bucket names and allowed mime types: [lib/constants/storage.ts](lib/constants/storage.ts)
  - Job form options and skill suggestions: [lib/constants/job-form.ts](lib/constants/job-form.ts)

This prevents drift (the same string literal defined in multiple places) and makes changes safe: update once, reflected everywhere.

### 3) Avoid Duplicate Helpers

- If a helper/hook is used in more than one file, it must live in `lib/` or `hooks/`.
- If a legacy import path exists, keep it working via re-export instead of copying code.
  - Example: `components/ui/use-toast.ts` re-exports the canonical `hooks/use-toast.ts`.

### 4) Types and Validation

- Prefer Zod schemas at API boundaries (route handlers) to validate and narrow types.
- Prefer shared domain types in `lib/types.ts`.

### 5) Data Fetching and Pagination

- Every list endpoint should support pagination and deterministic ordering.
- Avoid fetching large candidate payloads without selecting fields.

## Environment Variables

Minimum required variables (local `.env`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Optional (feature dependent):

- `GEMINI_API_KEY` (resume parsing / JD generation)
- `OPENROUTER_API_KEY` (if OpenRouter models are used)
- `NEXT_PUBLIC_BOARD_APP_BASE_URL` or `BOARD_APP_BASE_URL` (internal app links to board-app)

Never commit secrets.

## Local Development

```bash
npm install
npm run dev
```

Node requirement: `>=20.9.0` (see `engines.node` in `package.json`).

## Production Practices (Prevent Blank Screens)

- Always show fallback UI on network/parse errors.
- Log server failures with enough context to reproduce (route, candidate/job id, external call).
- Treat AI features as non-critical: if parsing/matching fails, allow manual workflows.
