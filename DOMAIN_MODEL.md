# Domain Model — ProofLoop

Postgres (Supabase). All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz` (trigger-maintained), `created_by uuid references users`. Soft delete (`deleted_at timestamptz null`) only on user-authored content that can be restored (ventures, assumptions, evidence_items); everything else hard-deletes or is versioned instead.

## 1. Entity list (from brief §11, all present)

`users, profiles, organisations, programmes, cohorts, ventures, venture_members, venture_versions, idea_inputs, customer_segments, assumptions, assumption_versions, assumption_scores, assumption_relationships, assumption_map_snapshots, experiments, experiment_library, experiment_recommendations, test_cards, experiment_runs, experiment_tasks, evidence_items, evidence_files, learning_cards, decisions, roadmap_items, comments, reviews, notifications, exports, ai_prompt_versions, ai_runs, audit_events`

Note: `experiments` = one running instance tied to a venture (instantiated from an `experiment_library` template); `experiment_library` = the reusable catalogue (Stage 8). This split lets a venture customise an experiment without mutating the shared library entry.

## 2. Core tables (MVP-relevant, field level)

### `ventures`
```
id, organisation_id (nullable, Phase 1: null), programme_id (nullable),
name, short_description, entry_path enum('market_led','ip_led'),
stage enum('idea','discovery','validation','commercialisation') default 'idea',
geography, industry, owner_id references users,
deleted_at
```

### `idea_inputs` (append-friendly, keeps history of the guided-template idea)
```
id, venture_id, target_customer, user_buyer_payer_note, problem, solution_or_ip,
outcome, current_alternatives, ai_generated_summary, user_edited_summary,
is_current boolean
```

### `assumptions`
```
id, venture_id, statement, dvf_primary enum('desirability','feasibility','viability'),
dvf_secondary text[] (subset of same enum),
assumption_type enum('segment','problem','solution','channel','revenue','cost',
  'resource','activity','partner','data','regulation','adoption','other'),
actor, observable_behaviour,
importance_score numeric(4,2) check (0..10),
evidence_strength_score numeric(4,2) check (0..10),
classification_confidence numeric(3,2) check (0..1),
rationale, evidence_claimed text,
source enum('ai_generated','user_generated','ai_generated_user_edited'),
status enum('draft','active','testing','supported','contradicted','archived'),
owner_id references users, deleted_at
```
Quality flags are **derived**, not stored columns — computed by the review operation and cached in `assumption_scores` (below) so history is auditable without mutating the assumption text.

### `assumption_versions`
```
id, assumption_id, version_no, statement_snapshot, changed_fields jsonb,
change_reason, changed_by, created_at
```
Every edit (including AI rewrite acceptance) appends a version row; `assumptions` always reflects the latest.

### `assumption_scores`
```
id, assumption_id, computed_at, importance_score, evidence_strength_score,
risk_priority numeric generated (see §3), quality_flags jsonb,
-- quality_flags shape: [{ "type": "vague_language"|"compound"|"non_testable"|
--   "missing_actor"|"missing_behaviour"|"feature_as_assumption"|
--   "unfounded_claim"|"category_mismatch"|"duplicate"|"dvf_gap",
--   "detail": string, "suggested_rewrite": string|null }]
model_version, prompt_version
```

### `assumption_relationships`
```
id, from_assumption_id, to_assumption_id,
relationship_type enum('duplicate_of','depends_on','contradicts','supports')
```

### `assumption_map_snapshots`
```
id, venture_id, label, positions jsonb
-- positions: [{ assumption_id, importance, evidence_strength, x_override, y_override,
--   notes, placement_rationale, is_ai_suggested, accepted_at }]
is_current boolean, created_by
```
Reload restores exact state by loading the `is_current` snapshot; every save creates a new immutable snapshot row (cheap — JSON payload, not per-assumption rows) so map history is inspectable.

### `experiment_library`
```
id, name, original_summary (independently written, never verbatim from a
  third-party source), experiment_family, discovery_or_validation enum,
  applicable_dvf text[], applicable_assumption_types text[],
  evidence_strength enum('light','medium','strong'),
  setup_time enum('short','medium','long'), run_time enum('short','medium','long'),
  relative_cost enum('low','medium','high'), required_access text,
  prerequisites text, procedure text, metrics text, success_criteria text,
  evidence_produced text, limitations text, ethical_privacy_risks text,
  examples text, related_experiment_ids uuid[], escalation_experiment_id uuid,
  source_note text, status enum('demo','active','archived') default 'demo'
```
`status='demo'` is the seed state for every Phase 1 record — surfaced in the UI as a "Demonstration record" badge per brief §8. Real data enters only through an admin CSV/JSON import (Phase 4) that flips status to `active` and requires `source_note` to be filled in (licensing accountability).

### `experiments` (venture-scoped instance)
```
id, venture_id, library_id references experiment_library, assumption_id,
customised_procedure text (nullable = inherits library procedure), status
```

### `experiment_recommendations` (persisted so "why this was ranked" is auditable)
```
id, assumption_id, library_id, rank (1-5),
score numeric, score_breakdown jsonb
-- { assumption_fit, evidence_strength, cost_speed, stage_appropriateness,
--   access_ethics_practicality } — weights 40/25/15/10/10 per brief §7 stage 7
what_it_can_prove text, what_it_cannot_prove text,
model_version, prompt_version, created_at
```

### `test_cards`
```
id, venture_id, assumption_id, experiment_id, decision_question,
objective, target_participant_or_dataset, recruitment_or_access_method,
sample_size, procedure, independent_measure, dependent_measure,
key_metric, success_threshold, failure_threshold, inconclusive_range,
evidence_expected, evidence_strength_level, timebox_start, timebox_end,
budget, owner_id, risks, ethical_privacy_considerations, data_storage_plan,
status enum('draft','ready','running','complete')
```
Success/failure/inconclusive thresholds are **required non-null before status can move past `draft`** — enforced at the application layer and mirrored as a DB check constraint.

### `experiment_runs` / `experiment_tasks`
```
experiment_runs: id, test_card_id, status enum('scheduled','running','complete','aborted'),
  started_at, ended_at
experiment_tasks: id, experiment_run_id, title, done boolean, due_date
```

### `evidence_items`
```
id, test_card_id, evidence_type enum('opinion','interview_insight',
  'observed_behaviour','commitment','payment','technical_benchmark',
  'operational_proof','documentary_proof','financial_result','other'),
  description, metric_value, date_observed, owner_id, confidence numeric(3,2),
  contradicts_evidence_id uuid nullable, consent_record_ref text nullable,
  deleted_at
```
`evidence_files`: `id, evidence_item_id, storage_path, mime_type, size_bytes, uploaded_by`. MIME/size validated server-side before a Supabase Storage signed URL is issued (§ Security).

### `learning_cards`
```
id, test_card_id, believed, expected, happened, metric_result,
threshold_result enum('success','failure','inconclusive'),
evidence_collected_summary, evidence_limitations, insight, confidence numeric(3,2),
contradiction_note, next_experiment_note
```

### `decisions`
```
id, venture_id, learning_card_id, assumption_id,
decision_type enum('proceed','pivot','repeat','refine','pause','stop','escalate'),
what_changes, rationale, decided_by, decided_at
```

### `ai_prompt_versions` / `ai_runs` (see `AI_BEHAVIOUR_SPEC.md` for the operation list)
```
ai_prompt_versions: id, operation_name, version, template_ref, schema_ref, is_active
ai_runs: id, operation_name, prompt_version, venture_id nullable, input_hash,
  output jsonb, status enum('success','validation_failed','retried','error'),
  latency_ms, model, token_cost_estimate, created_at
-- ai_runs.output never stores raw PII the input contained beyond what's
-- already persisted on the venture; see AI_BEHAVIOUR_SPEC §PII handling
```

### `audit_events`
```
id, actor_id, venture_id nullable, entity_type, entity_id, action,
before jsonb, after jsonb, created_at
```
Written for every mutation to `assumptions`, `assumption_map_snapshots`, `test_cards` thresholds, `evidence_items`, `decisions` — the fields the brief singles out as never-silently-changed (category, wording, score, threshold, decision).

## 3. Scoring formulas

```
normalised_importance      = importance_score / 10
normalised_evidence        = evidence_strength_score / 10
evidence_gap                = 1 − normalised_evidence
risk_priority                = normalised_importance × evidence_gap        # 0..1
```
Surfaced in the UI as *"a prioritisation aid, not an objective ranking"* per brief §Stage 4 — tooltip text is a hard requirement, not optional copy.

```
experiment_recommendation_score =
    0.40 × assumption_fit +
    0.25 × evidence_strength_required +
    0.15 × cost_and_speed +
    0.10 × stage_appropriateness +
    0.10 × access_ethics_practicality
```
Each sub-score 0..1, computed by the `experiment-recommendation` AI operation and stored in `score_breakdown` (never collapsed to a single opaque number in the UI without the breakdown visible on hover/expand).

## 4. Multi-tenancy & RLS approach

Phase 1: no real multi-tenancy — single seeded `users` row, RLS disabled in local dev via Supabase service role, but **every table already carries `organisation_id`/`owner_id`/`venture_id` FKs** so Phase 2 can add policies without a schema migration that touches existing data shapes.

Phase 2 RLS pattern (per table with a venture lineage):
```sql
create policy "venture members can read"
  on assumptions for select
  using (venture_id in (
    select venture_id from venture_members where user_id = auth.uid()
  ));
```
Write policies additionally check `venture_members.role in ('owner','editor')`. Admin tables (`experiment_library`) use a separate `is_admin(auth.uid())` policy function. All policies are captured as SQL migrations, never as application-only checks — RLS is the enforcement boundary, application checks are UX only.

## 5. Indexing notes

- `assumptions(venture_id, status)`, `assumptions(venture_id, dvf_primary)` — list/filter screens.
- `assumption_scores(assumption_id, computed_at desc)` — latest score lookup.
- `evidence_items(test_card_id, evidence_type)`.
- `audit_events(venture_id, created_at desc)`.
- `ai_runs(operation_name, created_at desc)` for cost/latency monitoring.

## 6. Referential integrity & deletion rules

- Deleting a venture is soft-delete only in Phase 1 (no hard cascade) — recoverable within a retention window (Section 12 of the brief, "account deletion" is a Phase 2+ concern requiring an actual purge job).
- `assumption_relationships`, `experiment_recommendations` reference assumptions with `on delete cascade` (they're derived data); `evidence_items`, `learning_cards`, `decisions` reference their parents with `on delete restrict` — you cannot delete a test card that already has recorded evidence without an explicit archive flow.
