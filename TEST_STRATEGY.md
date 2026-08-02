# Test Strategy — DFV Sensei

## 1. Pyramid

Unit (fast, most numerous) → Integration (DB/AI/auth boundaries) → E2E (critical flows, fewest) → Accessibility (cross-cutting, run against key screens). No feature is reported complete without its layer's tests passing — per the brief, "never claim a feature works unless it has been tested."

## 2. Unit tests (Vitest)

- **DFV classification rules** — `domain/assumptions`: given ambiguous statements, must not default to viability (regression test directly encoding the brief's "avoid automatically selecting viability" rule).
- **Risk-priority calculation** — `riskPriority()`/`evidenceGap()`: boundary cases (0, 10, midpoints), monotonicity (higher importance + lower evidence ⇒ higher priority).
- **Evidence-gap calculation** — covered above.
- **Recommendation scoring** — weighted sum correctness (40/25/15/10/10), and the three hard guardrail rules from `AI_BEHAVIOUR_SPEC.md` §3.7 as explicit fixtures:
  1. willingness-to-pay assumption + candidate set containing both an interview experiment and a paid-pilot experiment ⇒ paid-pilot must outrank interview in the top result.
  2. technical-performance assumption + candidate set containing a clickable-prototype-class and a benchmark-class experiment ⇒ benchmark must outrank prototype in the top result.
  3. letter-of-intent-class experiment must never appear as top-ranked for a technical-performance assumption.
- **Threshold logic** — Test Card cannot leave `draft` status without success/failure/inconclusive thresholds populated.
- **Decision rules** — decision type enum transitions valid; `next_experiment_note` required when decision is not `stop`/`pause`.
- **Permissions** — repository-layer scoping helpers reject cross-venture access even before RLS exists (defence in depth, Phase 1).
- **Schema validation** — every Zod schema in `AI_BEHAVIOUR_SPEC.md` §3 has a valid-input pass test and a malformed-input rejection test.
- **Export formatting** — JSON export round-trips (export then re-parse equals source aggregate); CSV column integrity per entity.

## 3. Integration tests (Vitest + local Supabase / test containers)

- Database operations: repository CRUD for each Phase-1 entity against a real local Postgres (via Supabase CLI), including cascade/restrict delete behaviour from `DOMAIN_MODEL.md` §6.
- Authentication: seeded-user session flow (Phase 1); real Supabase Auth flow (Phase 2).
- File uploads: MIME/size validation rejects oversized/mismatched files before a signed URL is issued.
- AI structured outputs: each operation tested against a mocked `AiProvider` returning (a) valid JSON, (b) malformed JSON to confirm the one-retry-then-typed-error path, (c) a schema-violating-but-parseable response.
- Prompt versioning: switching `ai_prompt_versions.is_active` changes which template a call uses without a code deploy.
- Audit logging: every mutation path listed in `DOMAIN_MODEL.md` §2 produces exactly one `audit_events` row with correct before/after.
- Row-level security (Phase 2): policy tests using two seeded users confirming cross-venture reads/writes are denied.

## 4. End-to-end tests (Playwright)

**Known Phase 1 gap:** e2e specs currently run against the shared local dev database with no per-run reset (unlike integration tests, which truncate in `beforeEach` against a dedicated test database). `tests/e2e/create-venture.spec.ts` was written to tolerate this (locators scoped to the created item, not page-wide text), but this is a workaround, not the target state -- Phase 2 should give e2e runs their own seeded-then-reset database, the same way integration tests already work, once a CI environment is wired up.

Single critical-path spec covering brief §13 steps 1–13, using the window-cleaning fixture (`IMPLEMENTATION_PLAN.md` §1.5) as the seed idea:

1. Create venture (Market-Led, since the fixture starts from a customer problem).
2. Enter idea via guided template.
3. Generate assumptions.
4. Edit one assumption, accept one quality-flag rewrite.
5. Place assumptions on the 2×2 map (drag one, keyboard-move one, numeric-input one — covers all three interaction modes in one pass).
6. Reload the page mid-flow, confirm the map state persisted.
7. Request AI map feedback, confirm it cites specific assumption text (not generic copy).
8. Select the viability assumption as decision-critical with a written decision question.
9. Confirm the top experiment recommendation is commitment-grade, not interview-only (regression assertion tied to the guardrail).
10. Create a Test Card, confirm it cannot be marked `ready` without thresholds filled.
11. Record one evidence item with a file upload.
12. Complete a Learning Card.
13. Record a `pivot` decision, confirm it appears in venture history.
14. Export JSON, confirm it contains all created entities.

This spec is the regression test for the window-cleaning case and runs in CI on every PR touching `domain/experiments` or `infrastructure/ai`.

## 5. Accessibility tests

Automated: `axe-core` via `@axe-core/playwright` against every screen in `USER_FLOWS.md` §1 marked MVP — zero serious/critical violations gate the build.

Manual/scripted checks (documented, run before each phase sign-off, not fully automatable):
- Keyboard-only completion of the 2×2 map placement (no mouse).
- Focus order matches visual order on the create-venture wizard and Test Card editor (multi-step forms are the highest-risk focus-trap surface).
- Colour contrast: DFV orange/green/blue against both light and dark backgrounds meet WCAG AA; red reserved for destructive/failure states only, never as the sole signal (paired with icon + text per `USER_FLOWS.md` §6).
- Screen-reader names: drag handles on the map announce role + current position; the numeric-input fallback is reachable and labelled.
- Reduced motion: map suggestion animations and skeleton loaders respect `prefers-reduced-motion`.
- Error announcements: form validation errors (e.g. missing threshold) are announced via `aria-live`, not just visually flagged.

## 6. CI gates

Every PR: format check → lint → typecheck → unit → integration → build. E2E + a11y suites run on PRs touching UI or the AI/experiment guardrail paths, and always on `main`. No merge on red.

## 7. Reporting discipline

After every implementation phase, report explicitly: what passed, what failed, what remains untested/incomplete. A feature is never described as "done" or "working" without a corresponding passing test at the appropriate layer — UI features additionally require a manual or Playwright pass in a real browser, not just type/lint success, per the brief's UI-testing requirement.
