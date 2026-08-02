# Architecture — ProofLoop

## 1. Stack decision

Using the brief's preferred default as-is; no deviation justified at this stage.

| Concern | Choice | Why not the alternative |
|---|---|---|
| Framework | Next.js (App Router), TypeScript strict | Server components fit the "secrets never reach client" requirement for AI calls; one deploy target for UI+API. |
| UI | React, Tailwind, shadcn/ui (Radix primitives) | Accessible primitives out of the box (focus management, ARIA) — required by §9/§13 accessibility bar without hand-rolling. |
| Backend | Supabase (Postgres, Auth, Storage, RLS) | Matches the RLS-first data model in `DOMAIN_MODEL.md`; avoids a bespoke authz layer for a small team to maintain. |
| Validation | Zod | Shared schemas between AI structured-output validation and form validation — one source of truth per entity. |
| Forms | React Hook Form + Zod resolver | Complex multi-step forms (Test Card, wizard) need field-level control RHF gives cheaply. |
| Drag-and-drop | dnd-kit | Accessible (keyboard) DnD is a hard requirement for the 2×2 map; dnd-kit is the maintained accessible option. |
| Testing | Vitest, Testing Library, Playwright, axe-core | Matches brief §13 exactly. |
| Lint/format | ESLint, Prettier | Standard. |

Exact package versions are pinned at implementation time by checking current stable releases (not hard-coded in this doc) — see `IMPLEMENTATION_PLAN.md` Phase 1 setup step.

## 2. Layering

```
app/                      # Next.js App Router routes (UI only — no business logic)
  (marketing)/             # landing page
  ventures/[id]/...
  admin/...
components/                 # presentational + composed UI (shadcn-based)
domain/                      # pure domain logic, framework-agnostic
  assumptions/                 # quality-flag rules, DVF classification helpers
  scoring/                      # risk_priority, evidence_gap, recommendation weighting
  experiments/                   # recommendation post-filter guardrails (AI_BEHAVIOUR_SPEC §3.7)
application/                 # use-case orchestration (calls domain + infra, framework-agnostic)
  ventures/, assumptions/, test-cards/, evidence/, learning-cards/, decisions/
infrastructure/            # adapters — nothing above this layer imports a vendor SDK directly
  supabase/                   # repository implementations, RLS-aware client factories
  ai/                           # AiProvider implementation(s), prompt templates, schemas
  storage/                      # file upload adapter
lib/                        # cross-cutting: env validation, logging, feature flags
tests/
  unit/ integration/ e2e/ a11y/
supabase/
  migrations/ seed.sql
```

Rule: `app/` calls `application/`, `application/` calls `domain/` + `infrastructure/` interfaces, `infrastructure/` implements those interfaces. Domain code has zero imports from `infrastructure/` or `app/` — this is what keeps AI provider and DB swaps to an adapter change (brief §10 "no vendor lock-in in core domain logic").

## 3. Multi-tenancy readiness

Every table already FK's to `venture_id`/`organisation_id` (Phase 1 nullable/unused for org-level). Application-layer repository methods always take a `scopedTo` context object even before RLS is turned on, so adding real RLS in Phase 2 doesn't change call sites — only the underlying policy enforcement.

## 4. Feature flags

Simple `lib/flags.ts` reading from env/DB (`feature_flags` table, Phase 2+): `facilitatorReview`, `adminExperimentImport`, `pdfExport`, `teamCollaboration` — all `false` in Phase 1 so unfinished modules never appear in nav rather than being half-built in the UI.

## 5. Environment variables (Phase 1)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed to client bundle
ANTHROPIC_API_KEY=                 # server-only
AI_PROVIDER=anthropic              # switchable
NODE_ENV=
```
Validated at boot via a Zod-parsed env schema (`lib/env.ts`) — the app fails fast with a clear message rather than a runtime `undefined` deep in a request handler.

## 6. Error monitoring / analytics abstraction

Phase 1: a thin `lib/telemetry.ts` interface (`captureError`, `trackEvent`) with a console-only implementation — deferred to Sentry/PostHog (or equivalent) wiring in Phase 2 behind the same interface, so nothing above `lib/telemetry.ts` needs to change later.

## 7. Background-job readiness

Phase 1 has no queue (AI calls are synchronous request/response, acceptable for single-user demo latency). The `application/` layer's use-cases are written as pure async functions with no implicit request-context coupling, so Phase 2+ can move long-running operations (e.g. export generation, bulk AI extraction) behind a queue (Supabase Edge Functions or a worker) without rewriting use-case logic — only the trigger changes from "awaited in the API route" to "enqueued".
