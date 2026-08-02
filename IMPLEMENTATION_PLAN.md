# Implementation Plan — DFV Sensei

## Phase 0 — Discovery and Design (this phase)
Deliverables: this document set, repository assessment, blocking questions. **No application code yet** — per the brief, implementation starts only after the plan is approved.

## Phase 1 — Local Vertical Slice (Participant only)

Goal: acceptance criteria in `PRODUCT_REQUIREMENTS.md` §8, provable end-to-end against the window-cleaning fixture case below, running locally against Supabase CLI (local Postgres) with a single seeded user (no real auth UI yet).

### 1.1 Project scaffold
- `pnpm create next-app` (App Router, TS strict, Tailwind), shadcn/ui init, ESLint/Prettier config, Vitest + Testing Library + Playwright config.
- `supabase/migrations/0001_init.sql` implementing the MVP-relevant tables from `DOMAIN_MODEL.md` §2.
- `lib/env.ts` env validation; `.env.example`.

### 1.2 Domain + application layer
- `domain/scoring`: `riskPriority()`, `evidenceGap()`, `recommendationScore()` — pure functions, unit tested first (TDD-appropriate here since the formulas are fully specified).
- `domain/assumptions`: quality-flag rule helpers (the deterministic ones — duplicate detection, missing-actor detection — the AI operation supplies the rest).
- `domain/experiments`: the hard-coded recommendation guardrail rules (AI_BEHAVIOUR_SPEC §3.7).
- `application/*`: use-cases per entity (create venture, extract assumptions, save map snapshot, generate recommendations, create/update test card, add evidence, complete learning card, record decision, export venture).

### 1.3 Infrastructure
- `infrastructure/supabase`: repository implementations for each entity used in Phase 1.
- `infrastructure/ai`: `AnthropicProvider implements AiProvider`; prompt templates + Zod schemas for the 11 Phase-1-relevant operations in `AI_BEHAVIOUR_SPEC.md` (facilitator-feedback schema stubbed only).
- Seed script: 19 demo `experiment_library` records (status='demo'), original summaries against the generic *Testing Business Ideas*-style taxonomy (Customer Interview, Landing Page Test, Concierge Test, Wizard of Oz, Smoke Test, Pre-order, Letter of Intent, A/B Test, Crowdfunding, Prototype Test, and others), covering discovery-through-validation and all three DFV categories so the window-cleaning fixture has real, commitment-grade and light-discovery candidates to rank between.

### 1.4 UI — build in this order (each step demoable)
1. Venture dashboard (empty state) + create-venture wizard.
2. Idea capture + AI idea-clarification review.
3. Assumption extraction + list + quality review.
4. 2×2 map (drag, keyboard, numeric fallback) + save/reload snapshot.
5. AI map feedback drawer.
6. Decision-critical assumption selection + experiment recommendations.
7. Test Card editor.
8. Run-experiment workspace + evidence log (with file upload to Supabase Storage).
9. Learning Card + decision recording.
10. Venture history timeline + minimal dashboard tab.
11. JSON/CSV export.

### 1.5 Fixture: window-cleaning regression case
Used as seed data for manual QA and as the Playwright e2e fixture:
- Idea: AI-powered glass-cleanliness inspection tool for window-cleaning companies.
- Must assert the recommendation engine does **not**:
  - rank an interview-only experiment above a commitment-grade one for the viability assumption ("window-cleaning companies will pay for AI-generated cleanliness evidence");
  - rank a clickable-prototype-class experiment top for the feasibility assumption ("the AI can assess glass cleanliness accurately and consistently");
  - treat a letter-of-intent-class experiment as proof of technical performance.
- These three assertions are the guardrail unit tests referenced in `AI_BEHAVIOUR_SPEC.md` §3.7 and the e2e regression test in `TEST_STRATEGY.md`.

### 1.6 Exit checks (every phase, per brief §1.9)
Run and report pass/fail/incomplete for: format, lint, typecheck, unit tests, integration tests, e2e tests. No feature is reported "done" without this.

## Phase 2 — Production Backend
- Real Supabase Auth (email/password minimum), `venture_members`, RLS policies per `DOMAIN_MODEL.md` §4.
- `audit_events` wired to all mutation paths listed in `DOMAIN_MODEL.md` §2.
- `ai_runs` logging live, rate limiting on AI routes (per-user + global), production error handling/telemetry (Sentry-equivalent behind `lib/telemetry.ts`).
- Account deletion / data export (privacy requirement, brief §12).

## Phase 3 — Collaboration
- `venture_members` roles beyond owner, comments, facilitator review screen, approve/return on Test Cards, programme/cohort views scoped to `organisations`/`programmes`/`cohorts` tables (already modelled).

## Phase 4 — Administration and Reporting
- Admin experiment-library UI: CSV/JSON import, edit, archive; this is where a licensed 44-experiment dataset gets loaded once the source is confirmed (see Phase 0 blocking question).
- Templates, cohort analytics, PDF/printable exports, four-month roadmap generator, configurable scoring/evidence rules (making the 40/25/15/10/10 weights admin-editable rather than hard-coded).

## Phase 5 — Hardening
- Security review (threat model, brief §12), privacy review, accessibility audit (axe + manual screen-reader pass), performance profiling, load testing, backup/recovery drill, deployment docs, monitoring dashboards.

## File list — Phase 0 (this response)
```
PRODUCT_REQUIREMENTS.md
USER_FLOWS.md
DOMAIN_MODEL.md
AI_BEHAVIOUR_SPEC.md
ARCHITECTURE.md
IMPLEMENTATION_PLAN.md
TEST_STRATEGY.md
CLAUDE.md
```
No application code, config, or dependencies are added in Phase 0. Phase 1's first commit (after approval) will add the scaffold listed in §1.1 above.
