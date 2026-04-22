# GridX Implementation Status

This document tracks what has been implemented so far on top of the existing OpenNEM frontend, and what still needs to be built from the `GridX.md` plan.

## What Is Done

### Foundation / Current App Wiring
- Reused the existing Nuxt app as the starting point (no Next.js migration yet).
- Kept the live Open Electricity/OpenNEM data experience functional in local dev.
- Added local proxy support for data routes to avoid browser CORS issues in development.

### Auth UX (MVP)
- Added a simple landing page at `/` for GridX entry.
- Added `/login` page (email + password).
- Added `/signup` page with:
  - Email
  - Password
  - Display name
  - Account type selection (`user` vs `org_member`)
  - Organisation name input (for org flow)
- On successful login/signup, redirects to:
  - `/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed`

### Auth Backend Strategy (Updated)
- Switched from Supabase Auth (GoTrue) to custom table-based auth to avoid signup email rate-limit issues.
- Implemented client-side auth service against Supabase PostgREST tables:
  - `gridx_users`
  - `gridx_profiles`
  - `gridx_organisations`
- Added SQL migration script:
  - `sql/gridx_mvp_auth.sql`
- Passwords are stored as SHA-256 hashes for MVP (not plaintext).

### Quality / Runbook
- Lint issues from new auth pages were fixed.
- Docker restart + endpoint sanity checks were run after changes.

---

## What Still Needs To Be Done (From Original GridX Plan)

## 1) Architecture Migration
- Migrate from current Nuxt 2/Vue app to:
  - Next.js 14 App Router
  - TypeScript across frontend/backend
  - Single Vercel deployment model
- Rebuild page/layout/routing structure in Next.js.

## 2) Supabase Data Model Alignment
- Current implementation uses `gridx_*` tables.
- Planned model in `GridX.md` is:
  - `organisations`
  - `profiles` (linked to `auth.users`)
  - `mock_trades`
  - `desk_notes`
  - `activity_log`
- Need decision:
  - Keep custom table auth path, or
  - Move back to Supabase Auth + original schema contract.

## 3) Route Access Control
- Implement full route guards per plan:
  - Public: `/`, `/login`, `/signup`
  - Protected app routes
  - `org_member`-only trading routes
  - `admin`-only admin routes
- Add role-aware middleware/guards and redirects.

## 4) API Contracts (Not Yet Built)
- Build product API routes from plan:
  - `/api/market/overview`
  - `/api/market/regions/[region]/live`
  - `/api/market/regions/[region]/history`
  - `/api/market/regions/[region]/forecast/next-day`
  - `/api/market/regions/[region]/forecast/intraday`
  - `/api/market/regions/[region]/solar`
  - `/api/market/regions/[region]/weather`
  - `/api/market/stocks`
  - `/api/market/commodities`
  - `/api/market/commodities/[metal]/history`
  - `/api/market/news`
  - Org desk routes and admin/member routes

## 5) Adapter Layer
- Implement and verify adapters in planned order:
  1. EC2 live
  2. EC2 history
  3. Weather
  4. HF forecasts
  5. Solar
  6. Stocks
  7. Commodities
  8. News
- Add plan-specific reliability features:
  - HF cold-start timeout + in-memory cache fallback
  - `model_warming` responses
  - EC2 duplicate timestamp dedupe
  - EC2 to Open Electricity fallback on empty/non-200

## 6) Planned Product Pages
- `/overview`
- `/predictions`
- `/solar`
- `/markets`
- `/trading/[region]` (org only)
- `/admin` (org admin only)
- Build all required charts and polling behavior (Recharts in plan).

## 7) Org Features
- Trade create/history + unrealised P&L logic.
- Region desk notes.
- Activity feed.
- Admin member list, invite flow, role management.

## 8) Security / Session Hardening (Post-MVP but Important)
- Move away from client-side hashing/session storage to safer server-side auth handling.
- Add proper session cookies/JWT handling.
- Tighten RLS policies (current MVP policies are intentionally permissive).

---

## Recommended Next Step

Decide one of these paths before building more:
- **Path A (Fastest MVP continuation):** Stay in current Nuxt app + custom `gridx_*` auth and start implementing `/api/market/*` + `/overview` first.
- **Path B (Match original plan strictly):** Start Next.js 14 + TypeScript migration now, then rebuild auth/data layer and APIs there.

Given current progress and your goal to move quickly, Path A is fastest for near-term momentum.
