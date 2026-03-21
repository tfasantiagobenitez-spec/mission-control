-- Migration: Advisory Council - decisions_log table
-- Created: 2026-03-21
-- Purpose: Persist AI council recommendations for learning and tracking

create table if not exists public.decisions_log (
    id uuid primary key default gen_random_uuid(),
    project text not null,
    recommendation text not null,
    council_run_id uuid,
    action_taken text,
    outcome text,
    created_at timestamptz not null default now()
);

-- Index for fast project-based queries
create index if not exists idx_decisions_log_project
    on public.decisions_log (project, created_at desc);

-- Index for finding decisions by council run
create index if not exists idx_decisions_log_run_id
    on public.decisions_log (council_run_id);

-- Index for decisions with outcomes (for learning loop queries)
create index if not exists idx_decisions_log_outcome
    on public.decisions_log (outcome)
    where outcome is not null;

-- Enable RLS
alter table public.decisions_log enable row level security;

-- Service role can read/write everything
create policy "service_role_all" on public.decisions_log
    for all
    using (true)
    with check (true);

comment on table public.decisions_log is
    'Stores AI Advisory Council recommendations and their real-world outcomes for learning.';
comment on column public.decisions_log.project is 'Project name this decision relates to';
comment on column public.decisions_log.recommendation is 'The exact recommendation text from the council';
comment on column public.decisions_log.council_run_id is 'UUID of the council run that generated this decision';
comment on column public.decisions_log.action_taken is 'What was actually done in response (filled in later)';
comment on column public.decisions_log.outcome is 'Result/outcome of the action (filled in later)';
