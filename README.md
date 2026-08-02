# DFV Sensei

An evidence-based venture-testing web app. It turns a business idea into explicit, prioritised assumptions, runs the right experiment against each one, and forces a real decision only once there's actual evidence and learning behind it — not just activity.

Core loop: **Idea → Assumption → Experiment → Evidence → Learning → Decision**

> DFV Sensei is an independent product built for this project. It uses the same public-domain Desirability / Feasibility / Viability (DFV) vocabulary popularised by *Testing Business Ideas* (Bland & Osterwalder, Wiley 2019), but its content, copy, and product structure are original — it is not a clone of, and does not reuse content from, any commercial product built on the same methodology. See the licensing note at the top of `PRODUCT_REQUIREMENTS.md`.

## What it does

- **Idea capture** — a guided template plus AI-assisted summary (edit-before-save, never auto-accepted).
- **Assumption extraction** — AI-drafted assumptions per DFV category, with deterministic quality checks (missing actor/behaviour, duplicates) before a user accepts them.
- **2×2 risk map** — importance (Y) vs. evidence strength (X), placed by drag, keyboard, or direct numeric entry, plus AI feedback on the placement.
- **Guarded experiment recommendations** — AI suggests experiments per assumption, but three hard-coded application-layer rules (not prompt instructions) veto unsafe suggestions, e.g. willingness-to-pay assumptions must get commitment-grade experiments, technical-performance assumptions can't be "tested" with a clickable prototype or a letter of intent.
- **Test Cards** — explicit success/failure thresholds are required before a test can move past draft.
- **Evidence log** — typed, sourced evidence entries per Test Card.
- **Learning Cards** — required before a decision can be recorded; AI can draft one from the evidence, but it's always editable first.
- **Decisions** — proceed / pivot / repeat / refine / pause / stop / escalate, gated on a completed Learning Card.
- **Dashboard** — reuses the same scoring functions as the risk map; DFV confidence is always shown as three separate numbers, never blended into one "venture score" (a single aggregate score was explicitly rejected — see `PRODUCT_REQUIREMENTS.md` §7).
- **Export** — the full venture graph (idea, assumptions, map snapshot, Test Cards, evidence, Learning Cards, decisions) as JSON.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zod · Postgres (via a thin `pg` layer, designed to swap in Supabase without touching application code) · Anthropic API for AI operations, with a mock provider as the default so nothing requires an API key to run · Vitest (unit + integration) · Playwright (e2e).

## Architecture

Layered, with a strict dependency direction:

```
domain/          pure business logic — scoring, quality rules, experiment guardrails. No framework, no I/O.
application/     use-cases and repository interfaces. Orchestrates domain logic against abstractions.
infrastructure/  Postgres repositories, the AI provider abstraction (mock + Anthropic). Implements application interfaces.
app/             Next.js routes and pages. The only layer allowed to import infrastructure directly.
```

`domain/` never imports from `infrastructure/` or `app/` — if that ever happens, it's a bug. See `ARCHITECTURE.md` for the full picture and `AI_BEHAVIOUR_SPEC.md` for how every individual AI operation is scoped, schema'd, and guarded.

## Status

**Phase 1 (local vertical slice) complete.** The full Idea → Decision → Export loop works end to end against a real Postgres database and is covered by unit, integration, and e2e tests (including a full walkthrough of the reference window-cleaning scenario in `tests/e2e/critical-path.spec.ts`). See `IMPLEMENTATION_PLAN.md` for phase-by-phase scope and what's still ahead (multi-user auth, facilitator review, PDF export, admin experiment-library import, and the rest of Phase 2+).

## Running it locally

```bash
cp .env.example .env.local   # then fill in DATABASE_URL etc.
pnpm install
pnpm db:migrate               # applies supabase/migrations/*.sql
pnpm db:seed                  # seeds the experiment library + a sample venture
pnpm dev
```

By default `AI_PROVIDER=mock`, so the app runs fully offline against fixture AI responses — no API key needed to try it. Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` (server-side only, never exposed to the client) to use the real model.

This was built against a plain local PostgreSQL 16 instance rather than the Supabase CLI (not available in the original build sandbox) — see "Local Postgres" in `CLAUDE.md` for the exact setup. Swapping in a real Supabase stack later needs no application code changes, since `infrastructure/supabase/db.ts` is the only place that constructs the connection.

### Commands

```
pnpm dev              # local dev server
pnpm lint             # eslint
pnpm format           # prettier --write
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest unit + integration
pnpm test:e2e         # playwright
pnpm build            # production build
```

## Documentation

Read these before making non-trivial changes — they're the source of truth ahead of any code comment:

- [`PRODUCT_REQUIREMENTS.md`](./PRODUCT_REQUIREMENTS.md) — scope, users, acceptance criteria
- [`USER_FLOWS.md`](./USER_FLOWS.md) — screens and flows
- [`DOMAIN_MODEL.md`](./DOMAIN_MODEL.md) — schema, entities, formulas, RLS approach
- [`AI_BEHAVIOUR_SPEC.md`](./AI_BEHAVIOUR_SPEC.md) — every AI operation, its schema, its guardrails
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layering, stack, env vars
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — phases and current status
- [`TEST_STRATEGY.md`](./TEST_STRATEGY.md) — what must be tested before a feature is "done"
- [`CLAUDE.md`](./CLAUDE.md) — conventions and non-negotiable rules for anyone (human or AI) working in this repo
