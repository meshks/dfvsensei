# User Flows — ProofLoop

## 1. Screen inventory

| Screen | Route (proposed) | MVP? |
|---|---|---|
| Landing page | `/` | Yes (minimal) |
| Authentication | `/login`, `/signup` | Stubbed in Phase 1 (single seeded user), real in Phase 2 |
| Venture dashboard | `/ventures` | Yes |
| Create-venture wizard | `/ventures/new` | Yes |
| Venture overview | `/ventures/[id]` | Yes |
| Assumption list | `/ventures/[id]/assumptions` | Yes |
| Assumption-quality review | `/ventures/[id]/assumptions/review` | Yes |
| 2×2 risk map | `/ventures/[id]/map` | Yes |
| AI map feedback panel | inline drawer on `/map` | Yes |
| Assumption detail | `/ventures/[id]/assumptions/[assumptionId]` | Yes |
| Recommended experiments | `/ventures/[id]/assumptions/[assumptionId]/experiments` | Yes |
| Experiment detail | `/experiments/[experimentId]` | Yes |
| Test Card editor | `/ventures/[id]/test-cards/[testCardId]/edit` | Yes |
| Run-experiment workspace | `/ventures/[id]/test-cards/[testCardId]/run` | Yes |
| Evidence log | `/ventures/[id]/test-cards/[testCardId]/evidence` | Yes |
| Learning Card | `/ventures/[id]/test-cards/[testCardId]/learning-card` | Yes |
| Roadmap | `/ventures/[id]/roadmap` | Stub (list view only) |
| Facilitator review | `/ventures/[id]/review` | Deferred — Phase 3 |
| Admin experiment library | `/admin/experiments` | Deferred — Phase 4 (Phase 1 seeds via script, no UI) |
| Settings | `/settings` | Minimal (profile only) |
| Export preview | `/ventures/[id]/export` | Yes (JSON/CSV only in Phase 1) |

## 2. Onboarding flow

```
Landing → (Sign in / continue as demo user)
  → Create-venture wizard
      Step 1: Name + short description
      Step 2: Entry path choice (Market-Led / IP-Led) — explains the proposition each tests
      Step 3: Idea capture using guided template:
              "We help [specific customer] who struggle with [important problem]
               by providing [solution], so they can achieve [measurable outcome]."
              Free text + structured fields (target customer, user/buyer/payer,
              problem, solution/IP, outcome, alternatives, geography, industry, stage)
      Step 4: Review AI-suggested summary → user edits before saving (never silently saved as-is)
  → Venture overview (empty assumption state, CTA: "Extract assumptions")
```

Switching entry path later: available from venture overview → Settings tab; re-running Stage 2 extraction is offered but existing assumptions are never deleted automatically.

## 3. Extract → Review → Map loop

```
Venture overview
  → "Extract assumptions" (AI) → Assumption list (all AI-tagged, status=draft)
  → Assumption-quality review
      - flags shown per assumption (vague / compound / non-testable / missing actor,
        missing behaviour / feature-as-assumption / unfounded claim / category mismatch /
        duplicate / DVF gap)
      - user accepts flag+rewrite, edits manually, or dismisses flag with note
  → 2×2 risk map
      - axes fixed: Y = importance (low→high, bottom→top), X = evidence (strong→weak, left→right)
      - quadrant labels always visible: "Test First" (top-right), "Monitor" (top-left),
        "Explore Later" (bottom-right), "Supported" (bottom-left)
      - drag-and-drop (dnd-kit) with keyboard-equivalent arrow-key movement + numeric
        importance/evidence inputs as an always-available non-drag alternative
      - AI auto-placement available as a one-click "suggest positions" action; suggested
        positions render with a distinct visual treatment until the user accepts them
      - filter by DVF, colour-coded (Desirability=orange, Viability=green, Feasibility=blue)
  → "Get AI feedback" → feedback drawer (highest-risk assumptions, inconsistent placements,
      category errors, DVF gaps, weak wording, strong-vs-weak evidence commentary) —
      each point links back to the specific assumption card; accept/reject per suggestion
  → Save map snapshot (versioned; reload restores exact positions)
```

## 4. Decision → experiment → evidence → learning loop

```
Assumption detail (any assumption, typically top-right quadrant)
  → "Select as decision-critical" → prompt: "What decision will this experiment help you make?"
      user records the decision question + optional justification if not top-ranked
  → Recommended experiments (top 5, ranked, each with fit/evidence/cost/time/stage/ethics
      breakdown and "what this can/cannot prove")
  → Pick experiment → Test Card editor (pre-filled from assumption + experiment template;
      every field editable; success/failure/inconclusive thresholds required before leaving
      draft status)
  → Run-experiment workspace
      - status tracker (Draft → Scheduled → Running → Complete)
      - task checklist, participant/data log, notes
  → Evidence log
      - add evidence item: type (opinion / interview insight / observed behaviour /
        commitment / payment / technical benchmark / operational proof / documentary
        proof / financial result / other), date, owner, confidence, files/links,
        contradiction flag
  → Learning Card (required before decision can be recorded)
      believed → expected → happened → metric result → threshold result →
      evidence collected/limitations → insight → confidence → contradiction
  → Decision (proceed / pivot / repeat / refine / pause / stop / escalate) + what changes
      in the venture + next experiment (optional link to a new assumption/experiment)
  → Decision appears in Venture overview → History timeline
```

## 5. Dashboard & export

```
Venture overview → Dashboard tab
  - DVF confidence (three separate bars/values, never blended into one score)
  - unresolved high-risk assumptions (top-right quadrant, sorted by risk_priority)
  - experiment backlog / active experiments
  - learning velocity (experiments completed / time)
  - decision history (chronological)
  - roadmap stub (flat list of next experiments, no Gantt in Phase 1)

Export preview
  - venture JSON (full graph: assumptions, map snapshot, experiments, test cards,
    evidence, learning cards, decisions)
  - CSV per entity (assumptions.csv, evidence.csv, decisions.csv)
  - PDF/print layouts: Phase 4
```

## 6. Empty, loading, and AI states (cross-cutting UX rules)

- **Empty states**: every list screen has an explicit empty state with one primary CTA (never a blank table).
- **Loading states**: skeleton loaders for AI operations with elapsed-time indicator past 3s; AI calls are never silently retried without user visibility.
- **AI attribution**: any AI-generated field carries a persistent "AI suggested" badge until a human edits or explicitly accepts it; accepted-but-unedited content is marked "AI suggested · accepted", never silently converted to "user-authored".
- **Uncertainty**: AI feedback panels always show a confidence indicator and never use bare imperative language ("do X"); phrasing is evidence-based ("this suggests…", "based on the assumptions above…").
- **Accessibility**: every drag-and-drop interaction has a keyboard + form-field equivalent (2×2 map, experiment reordering); focus order follows visual order; colour is never the only signal (DVF categories also carry text labels/icons).
