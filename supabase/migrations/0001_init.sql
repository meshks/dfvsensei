-- DFV Sensei -- Phase 1 MVP schema.
-- Implements the MVP-relevant tables from DOMAIN_MODEL.md §2 (IMPLEMENTATION_PLAN.md §1.1).
-- Organisation/programme/cohort/team-collaboration tables are deferred to Phase 2-3
-- per PRODUCT_REQUIREMENTS.md §6, but every table here already carries the FK columns
-- (owner_id, venture_id) those phases need, so this schema doesn't get reshaped later --
-- see ARCHITECTURE.md §3 (multi-tenancy readiness).

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- users (minimal Phase 1 stand-in; real auth arrives via Supabase Auth in Phase 2,
-- at which point this table's id becomes the auth.users id -- see ARCHITECTURE.md §5)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ventures
-- ---------------------------------------------------------------------------
create table ventures (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid null,
  programme_id uuid null,
  name text not null,
  short_description text not null default '',
  entry_path text not null check (entry_path in ('market_led', 'ip_led')),
  stage text not null default 'idea'
    check (stage in ('idea', 'discovery', 'validation', 'commercialisation')),
  geography text null,
  industry text null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
create trigger ventures_set_updated_at before update on ventures
  for each row execute function set_updated_at();
create index ventures_owner_id_idx on ventures(owner_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- idea_inputs
-- ---------------------------------------------------------------------------
create table idea_inputs (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  target_customer text null,
  user_buyer_payer_note text null,
  problem text null,
  solution_or_ip text null,
  outcome text null,
  current_alternatives text null,
  ai_generated_summary text null,
  user_edited_summary text null,
  is_current boolean not null default true,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index idea_inputs_venture_current_idx on idea_inputs(venture_id) where is_current;

-- ---------------------------------------------------------------------------
-- assumptions
-- ---------------------------------------------------------------------------
create table assumptions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  statement text not null,
  dfv_primary text not null check (dfv_primary in ('desirability', 'feasibility', 'viability')),
  dfv_secondary text[] not null default '{}',
  assumption_type text not null check (assumption_type in (
    'segment', 'problem', 'solution', 'channel', 'revenue', 'cost', 'resource',
    'activity', 'partner', 'data', 'regulation', 'adoption', 'other'
  )),
  actor text null,
  observable_behaviour text null,
  importance_score numeric(4, 2) null check (importance_score is null or importance_score between 0 and 10),
  evidence_strength_score numeric(4, 2) null check (evidence_strength_score is null or evidence_strength_score between 0 and 10),
  classification_confidence numeric(3, 2) null check (classification_confidence is null or classification_confidence between 0 and 1),
  rationale text null,
  evidence_claimed text null,
  source text not null check (source in ('ai_generated', 'user_generated', 'ai_generated_user_edited')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'testing', 'supported', 'contradicted', 'archived')),
  owner_id uuid not null references users(id),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);
create trigger assumptions_set_updated_at before update on assumptions
  for each row execute function set_updated_at();
create index assumptions_venture_status_idx on assumptions(venture_id, status) where deleted_at is null;
create index assumptions_venture_dfv_idx on assumptions(venture_id, dfv_primary) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- assumption_versions
-- ---------------------------------------------------------------------------
create table assumption_versions (
  id uuid primary key default gen_random_uuid(),
  assumption_id uuid not null references assumptions(id) on delete cascade,
  version_no integer not null,
  statement_snapshot text not null,
  changed_fields jsonb not null default '{}',
  change_reason text null,
  changed_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (assumption_id, version_no)
);

-- ---------------------------------------------------------------------------
-- assumption_scores
-- ---------------------------------------------------------------------------
create table assumption_scores (
  id uuid primary key default gen_random_uuid(),
  assumption_id uuid not null references assumptions(id) on delete cascade,
  computed_at timestamptz not null default now(),
  importance_score numeric(4, 2) not null check (importance_score between 0 and 10),
  evidence_strength_score numeric(4, 2) not null check (evidence_strength_score between 0 and 10),
  risk_priority numeric(6, 5) not null check (risk_priority between 0 and 1),
  quality_flags jsonb not null default '[]',
  model_version text null,
  prompt_version text null
);
create index assumption_scores_assumption_latest_idx
  on assumption_scores(assumption_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- assumption_relationships
-- ---------------------------------------------------------------------------
create table assumption_relationships (
  id uuid primary key default gen_random_uuid(),
  from_assumption_id uuid not null references assumptions(id) on delete cascade,
  to_assumption_id uuid not null references assumptions(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('duplicate_of', 'depends_on', 'contradicts', 'supports')),
  created_at timestamptz not null default now(),
  check (from_assumption_id <> to_assumption_id)
);

-- ---------------------------------------------------------------------------
-- assumption_map_snapshots
-- ---------------------------------------------------------------------------
create table assumption_map_snapshots (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  label text null,
  positions jsonb not null default '[]',
  is_current boolean not null default true,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index assumption_map_snapshots_current_idx
  on assumption_map_snapshots(venture_id) where is_current;

-- ---------------------------------------------------------------------------
-- experiment_library
-- ---------------------------------------------------------------------------
create table experiment_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_summary text not null,
  experiment_family text not null,
  discovery_or_validation text not null check (discovery_or_validation in ('discovery', 'validation')),
  applicable_dfv text[] not null default '{}',
  applicable_assumption_types text[] not null default '{}',
  evidence_strength text not null check (evidence_strength in ('light', 'medium', 'strong')),
  setup_time text not null check (setup_time in ('short', 'medium', 'long')),
  run_time text not null check (run_time in ('short', 'medium', 'long')),
  relative_cost text not null check (relative_cost in ('low', 'medium', 'high')),
  required_access text null,
  prerequisites text null,
  procedure text null,
  metrics text null,
  success_criteria text null,
  evidence_produced text null,
  limitations text null,
  ethical_privacy_risks text null,
  examples text null,
  related_experiment_ids uuid[] not null default '{}',
  escalation_experiment_id uuid null references experiment_library(id),
  source_note text null,
  status text not null default 'demo' check (status in ('demo', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger experiment_library_set_updated_at before update on experiment_library
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- experiments (venture-scoped instance of a library template)
-- ---------------------------------------------------------------------------
create table experiments (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  library_id uuid not null references experiment_library(id),
  assumption_id uuid not null references assumptions(id) on delete cascade,
  customised_procedure text null,
  status text not null default 'proposed'
    check (status in ('proposed', 'selected', 'discarded')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- experiment_recommendations
-- ---------------------------------------------------------------------------
create table experiment_recommendations (
  id uuid primary key default gen_random_uuid(),
  assumption_id uuid not null references assumptions(id) on delete cascade,
  library_id uuid not null references experiment_library(id),
  rank smallint not null check (rank between 1 and 5),
  score numeric(5, 4) not null check (score between 0 and 1),
  score_breakdown jsonb not null,
  what_it_can_prove text not null,
  what_it_cannot_prove text not null,
  model_version text null,
  prompt_version text null,
  created_at timestamptz not null default now()
);
create index experiment_recommendations_assumption_idx
  on experiment_recommendations(assumption_id, rank);

-- ---------------------------------------------------------------------------
-- test_cards
-- ---------------------------------------------------------------------------
create table test_cards (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  assumption_id uuid not null references assumptions(id) on delete cascade,
  experiment_id uuid not null references experiments(id) on delete cascade,
  decision_question text null,
  objective text null,
  target_participant_or_dataset text null,
  recruitment_or_access_method text null,
  sample_size text null,
  procedure text null,
  independent_measure text null,
  dependent_measure text null,
  key_metric text null,
  success_threshold text null,
  failure_threshold text null,
  inconclusive_range text null,
  evidence_expected text null,
  evidence_strength_level text null check (evidence_strength_level is null or evidence_strength_level in ('light', 'medium', 'strong')),
  timebox_start date null,
  timebox_end date null,
  budget text null,
  owner_id uuid not null references users(id),
  risks text null,
  ethical_privacy_considerations text null,
  data_storage_plan text null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'running', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enforced per DOMAIN_MODEL.md §2: a Test Card cannot leave `draft` without thresholds.
  constraint test_cards_thresholds_required_past_draft check (
    status = 'draft'
    or (success_threshold is not null and failure_threshold is not null and inconclusive_range is not null)
  )
);
create trigger test_cards_set_updated_at before update on test_cards
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- experiment_runs / experiment_tasks
-- ---------------------------------------------------------------------------
create table experiment_runs (
  id uuid primary key default gen_random_uuid(),
  test_card_id uuid not null references test_cards(id) on delete cascade,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'running', 'complete', 'aborted')),
  started_at timestamptz null,
  ended_at timestamptz null
);

create table experiment_tasks (
  id uuid primary key default gen_random_uuid(),
  experiment_run_id uuid not null references experiment_runs(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_date date null
);

-- ---------------------------------------------------------------------------
-- evidence_items / evidence_files
-- ---------------------------------------------------------------------------
create table evidence_items (
  id uuid primary key default gen_random_uuid(),
  test_card_id uuid not null references test_cards(id) on delete restrict,
  evidence_type text not null check (evidence_type in (
    'opinion', 'interview_insight', 'observed_behaviour', 'commitment', 'payment',
    'technical_benchmark', 'operational_proof', 'documentary_proof', 'financial_result', 'other'
  )),
  description text not null,
  metric_value text null,
  date_observed date null,
  owner_id uuid not null references users(id),
  confidence numeric(3, 2) null check (confidence is null or confidence between 0 and 1),
  contradicts_evidence_id uuid null references evidence_items(id),
  consent_record_ref text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);
create index evidence_items_test_card_idx on evidence_items(test_card_id, evidence_type)
  where deleted_at is null;

create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references evidence_items(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- learning_cards
-- ---------------------------------------------------------------------------
create table learning_cards (
  id uuid primary key default gen_random_uuid(),
  test_card_id uuid not null references test_cards(id) on delete restrict,
  believed text not null,
  expected text not null,
  happened text not null,
  metric_result text null,
  threshold_result text not null check (threshold_result in ('success', 'failure', 'inconclusive')),
  evidence_collected_summary text null,
  evidence_limitations text null,
  insight text not null,
  confidence numeric(3, 2) null check (confidence is null or confidence between 0 and 1),
  contradiction_note text null,
  next_experiment_note text null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- decisions
-- ---------------------------------------------------------------------------
create table decisions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  learning_card_id uuid not null references learning_cards(id) on delete restrict,
  assumption_id uuid not null references assumptions(id) on delete restrict,
  decision_type text not null check (decision_type in (
    'proceed', 'pivot', 'repeat', 'refine', 'pause', 'stop', 'escalate'
  )),
  what_changes text null,
  rationale text null,
  decided_by uuid not null references users(id),
  decided_at timestamptz not null default now()
);
create index decisions_venture_idx on decisions(venture_id, decided_at desc);

-- ---------------------------------------------------------------------------
-- ai_prompt_versions / ai_runs
-- ---------------------------------------------------------------------------
create table ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  operation_name text not null,
  version text not null,
  template_ref text not null,
  schema_ref text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (operation_name, version)
);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  operation_name text not null,
  prompt_version text null,
  venture_id uuid null references ventures(id) on delete set null,
  input_hash text null,
  output jsonb null,
  status text not null check (status in ('success', 'validation_failed', 'retried', 'error')),
  latency_ms integer null,
  model text null,
  token_cost_estimate numeric(10, 4) null,
  created_at timestamptz not null default now()
);
create index ai_runs_operation_idx on ai_runs(operation_name, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references users(id),
  venture_id uuid null references ventures(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb null,
  after jsonb null,
  created_at timestamptz not null default now()
);
create index audit_events_venture_idx on audit_events(venture_id, created_at desc);
