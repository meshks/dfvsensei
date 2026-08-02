# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this repo is

DFV Sensei is an evidence-based venture-testing web app: Idea → Assumption → Experiment → Evidence → Learning → Decision. It is **not** a startup-idea generator and it is **not** a clone of the commercial "Precoil" product — see the licensing note at the top of `PRODUCT_REQUIREMENTS.md`. Read these seven docs before making non-trivial changes; they are the source of truth ahead of any code comment:

- `PRODUCT_REQUIREMENTS.md` — scope, users, acceptance criteria
- `USER_FLOWS.md` — screens and flows
- `DOMAIN_MODEL.md` — schema, entities, formulas, RLS approach
- `AI_BEHAVIOUR_SPEC.md` — every AI operation, its schema, its guardrails
- `ARCHITECTURE.md` — layering, stack, env vars
- `IMPLEMENTATION_PLAN.md` — phases and current status
- `TEST_STRATEGY.md` — what must be tested before a feature is "done"

## Non-negotiable rules (do not relax these without an explicit user decision)

1. **AI never silently becomes canonical data.** Every AI-generated field is written to a "suggested" shape and requires an explicit user accept/edit action before it's treated as user content. Check `AI_BEHAVIOUR_SPEC.md` §1 before adding any new AI-touching field.
2. **The DFV 2×2 map axes are fixed**: Y = importance (high at top), X = evidence (strong at left, weak at right). Never reorient this without updating every quadrant label, tooltip, and the `risk_priority` formula's mental model in lockstep.
3. **No single aggregate "venture score."** If you're tempted to add one, show its components instead — this was explicitly rejected in `PRODUCT_REQUIREMENTS.md` §7 (A5).
4. **The experiment-recommendation guardrails in `AI_BEHAVIOUR_SPEC.md` §3.7 are application-layer rules, not prompt instructions.** They live in `domain/experiments` as testable functions. Do not remove them or move the logic into the prompt only — the LLM can be wrong, the rule table is the actual safety net, and it has dedicated unit tests (`TEST_STRATEGY.md` §2).
5. **`experiment_library` records default to `status='demo'`** and must show a "Demonstration record" badge until an admin import flips them to `active` with a `source_note`. Never hand-write content that reads as if it came from a licensed third-party experiment catalogue.
6. **Every mutation to assumptions, map snapshots, Test Card thresholds, evidence, and decisions writes an `audit_events` row.** If you add a new mutation path to one of these entities, wire the audit write in the same PR.
7. **AI keys are server-side only.** Never reference `ANTHROPIC_API_KEY` (or any provider key) from client components or expose it via a public env var.

## Commands (once Phase 1 scaffold exists)

```
pnpm dev            # local dev server
pnpm lint           # eslint
pnpm format         # prettier
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest (unit + integration)
pnpm test:e2e       # playwright
pnpm build           # production build gate
supabase start       # local Postgres/Auth/Storage
supabase db reset    # apply migrations + seed.sql
```

Run format → lint → typecheck → unit → integration → e2e in that order before reporting any phase complete, and report pass/fail/incomplete explicitly — do not claim a feature works without a corresponding passing test (`TEST_STRATEGY.md` §7).

## Working conventions

- Domain logic (`domain/`) has zero imports from `infrastructure/` or `app/`. If you find yourself importing a Supabase client or the Anthropic SDK into `domain/`, stop — that logic belongs in `application/` or `infrastructure/`.
- New AI operations get their own prompt template, Zod schema, and entry in `AI_BEHAVIOUR_SPEC.md` §3 — do not fold a new capability into an existing oversized prompt.
- DFV colour system is fixed: Desirability = orange, Viability = green, Feasibility = blue. Red is reserved for high-risk warnings, failed thresholds, and destructive actions only.
- Feature-flag anything from Phase 3+ (`facilitatorReview`, `adminExperimentImport`, `pdfExport`, `teamCollaboration`) rather than shipping a half-built nav entry.

## Current status

Phase 0 (Discovery and Design) complete. Phase 1 (local vertical slice) not yet started — pending plan approval per `IMPLEMENTATION_PLAN.md`.
