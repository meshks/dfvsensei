# Product Requirements — ProofLoop (working title)

> **Naming note:** "ProofLoop" is a placeholder used throughout the planning docs so entities have a stable name. It is not final — awaiting the real name from the product owner. Do not confuse this product with, or model its content on, the commercial "Precoil" product referenced in this environment's `precoil-emt` skill (precoil.com/library). Precoil uses the same public-domain DVF / Extract-Map-Test vocabulary popularised by *Testing Business Ideas* (Bland & Osterwalder, Wiley 2019), which is fair to build on conceptually, but its specific experiment library text, scoring copy, and product structure are a competitor's proprietary content and must not be copied, scraped, or imitated.
>
> **Experiment library source note (confirmed with product owner):** the library is "based on the business testing book" — meaning it uses the same well-known, generic experiment taxonomy that book popularised (Customer Interview, Landing Page Test, Concierge Test, Wizard of Oz, Smoke Test, Pre-order, Letter of Intent, A/B Test, Crowdfunding, Prototype Test, and similar Lean-Startup-standard names). Every procedure, summary, and rating in the shipped `demo` dataset is independently written for this project, not transcribed from *Testing Business Ideas*. The book's exact text, ratings iconography, and worksheet layout are Wiley/Osterwalder/Bland's copyrighted content and are never reproduced. If the product owner later secures reproduction rights to that exact material, it enters through the admin CSV/JSON import as licensed content — it does not become the app's default data.

## 1. Vision

> Turn business ideas into explicit assumptions, prioritised risks, appropriate experiments, credible evidence, learning, and commercialisation decisions.

Core loop: **Idea → Hypothesis → Experiment → Evidence → Learning → Decision → Next Experiment**

ProofLoop is an evidence and decision system, not an idea generator. Its job is to stop six specific confusions:

| Confusion | What ProofLoop enforces instead |
|---|---|
| Opinion vs. evidence | Every evidence item is typed and provenance is recorded |
| Activity vs. learning | Learning Cards are a required gate before a decision can be recorded |
| Prototype completion vs. validation | Feasibility evidence is scored separately from build status |
| Compliments vs. commitment | Willingness-to-pay assumptions require commitment-grade experiments (Section 4.3) |
| Technical readiness vs. market readiness | DVF categories are scored and shown independently, never blended into one number without breakdown |
| AI recommendation vs. final judgement | Every AI output is a suggestion the user must accept, edit, or reject; nothing AI-generated silently becomes canonical |

## 2. Users and roles (MVP scope)

MVP ships **Participant** only. Data model must not require redesign to add the other three roles later (see `DOMAIN_MODEL.md`).

- **Participant** — owns/co-owns a venture; full read-write on their venture's assumptions, experiments, evidence, learning cards, decisions.
- **Team Member** (post-MVP) — collaborates on a venture with scoped edit rights.
- **Facilitator/Mentor** (post-MVP) — reviews across ventures, comments, approves/returns experiment plans.
- **Administrator** (post-MVP) — manages experiment library, users, programmes, AI configuration.

## 3. Entry paths

Both are first-class, chosen at venture creation and changeable later without data loss:

- **Market-Led**: starts from an unmet customer problem. Proposition under test: *this customer problem can be solved with this proposed solution.*
- **IP-Led**: starts from existing technology/IP/prototype/research output. Proposition under test: *this existing technology can create value for this customer in this application.*

The entry path changes emphasis (which assumption types are seeded first, which onboarding questions appear) but both converge on the same DVF assumption model.

## 4. Domain principles (DVF)

### 4.1 Desirability
*Do customers want it enough to adopt, use, switch, or continue using it?* Segment, problem existence/frequency/intensity/consequence, alternatives, value proposition, adoption, channel, trust, retention.

### 4.2 Feasibility
*Can we build, deliver, operate, integrate, and scale it reliably?* Technical performance, data availability/quality, operations, resources, skills, partners, integration, compliance, reliability, delivery time, scalability.

### 4.3 Viability
*Can the business generate sufficient, sustainable economic value?* Willingness to pay, pricing, revenue model, purchase process, CAC, cost to serve, margin, repeat revenue, budget ownership, sales cycle.

Every assumption has exactly one **primary** DVF category (for reporting/matrix placement) and zero or more **secondary tags** (for cross-cutting visibility). The system explains the primary classification rather than forcing false certainty — classification includes a confidence score and rationale.

## 5. Core user journey (13 stages)

| # | Stage | MVP (Phase 1 vertical slice)? |
|---|---|---|
| 1 | Create Venture | Yes |
| 2 | Extract Assumptions (AI) | Yes |
| 3 | Review Assumption Quality (AI) | Yes |
| 4 | Prioritise on 2×2 Map | Yes |
| 5 | AI Map Review | Yes |
| 6 | Select Decision-Critical Assumption | Yes |
| 7 | Recommend Experiments (AI) | Yes |
| 8 | Experiment Library | Yes (demo dataset only, admin import stubbed) |
| 9 | Design the Experiment (Test Card) | Yes |
| 10 | Run and Record Evidence | Yes |
| 11 | Learning Card | Yes |
| 12 | Evidence Dashboard and Roadmap | Partial — dashboard yes, roadmap/facilitator feedback stubbed |
| 13 | Export | Partial — JSON/CSV yes; PDF/print layouts deferred to Phase 4 |

Stages 1–11 plus a minimal Stage 12 dashboard and Stage 13 JSON export constitute the acceptance bar for the first vertical slice (Section 8).

## 6. Out of scope for v1 (explicitly deferred)

- Team collaboration, comments, facilitator review workflows (Phase 3)
- Programme/cohort administration, experiment-library CSV/JSON admin import UI (Phase 4)
- PDF export, printable assumption map, four-month roadmap generator (Phase 4)
- Multi-provider AI failover, cost dashboards (Phase 5)
- Real authoritative 44-experiment dataset — blocked on licensing source, see open questions
- SSO/enterprise auth, billing

## 7. Labelled assumptions (non-blocking decisions made by default)

- **A1** — App will use Supabase (Postgres + Auth + Storage) as the default backend; swappable behind a repository layer (`ARCHITECTURE.md`).
- **A2** — AI provider defaults to an Anthropic Claude model via a server-side provider abstraction; not hard-wired to a single model name in domain code.
- **A3** — Phase 1 runs against a local/dev Postgres (Supabase CLI or Docker) with auth stubbed to a single seeded user, since multi-user auth is not required to prove the evidence loop.
- **A4** — The experiment library ships with ~16 clearly labelled `DEMO` experiments spanning the generic Lean-Startup experiment taxonomy (see licensing note above), hand-written and original, until an administrator imports a licensed dataset via CSV/JSON.
- **A5** — Single aggregate "venture score" is explicitly rejected per the brief; dashboard shows DVF-scoped confidence with visible components instead.
- **A6** — Currency/locale, language: English only, no i18n scaffolding in v1 beyond string externalisation hygiene.

## 8. Acceptance criteria — first vertical slice

A user can, end-to-end, without data loss and passing lint/typecheck/tests/build:

1. Create a venture (either entry path).
2. Enter and edit an idea description (with the guided template).
3. Generate DVF-structured assumptions via AI.
4. Edit/merge/split/delete assumptions; quality flags shown and actionable.
5. Place assumptions on the importance×evidence 2×2 map (drag, keyboard, and numeric-score paths).
6. Reload the venture and see the same map state.
7. Receive non-generic AI map feedback referencing specific assumptions.
8. Select one assumption as decision-critical, with rationale.
9. Receive 5 ranked, assumption-specific experiment recommendations with explained scoring.
10. Create/edit a Test Card with metric, success/failure/inconclusive thresholds.
11. Record at least one typed evidence item against the Test Card.
12. Complete a Learning Card (belief → expectation → outcome → decision).
13. Record a decision (proceed/pivot/repeat/refine/pause/stop/escalate) and see it in venture history.
14. Export the venture (assumptions, map, experiments, evidence, learning, decisions) as JSON.
15. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass; a Playwright e2e run covers steps 1–13 using the window-cleaning fixture case from `IMPLEMENTATION_PLAN.md`.
