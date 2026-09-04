-- SafeSpace: Supabase storage + admin access for assessment results.
-- Run this migration in the Supabase SQL Editor.
-- Admin access is controlled by the authenticated user's JWT metadata:
--   { "role": "admin" }
-- Do NOT put an admin email or password in the frontend.

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  age integer,
  age_group text check (age_group in ('under20', 'over20')),
  nationality text check (nationality in ('thai', 'foreigner')),
  answers jsonb not null default '[]'::jsonb,
  risk_level text check (risk_level in ('low', 'moderate', 'high', 'severe')),
  risk_score numeric,
  ai_summary text,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessment_responses_user_id_idx
  on public.assessment_responses(user_id);
create index if not exists assessment_responses_created_at_idx
  on public.assessment_responses(created_at desc);
create index if not exists assessment_responses_age_group_idx
  on public.assessment_responses(age_group);
create index if not exists assessment_responses_nationality_idx
  on public.assessment_responses(nationality);
create index if not exists assessment_responses_risk_level_idx
  on public.assessment_responses(risk_level);

alter table public.assessment_responses enable row level security;

-- Users may create and read only their own saved assessment.
drop policy if exists "Users can insert their own assessments" on public.assessment_responses;
create policy "Users can insert their own assessments"
on public.assessment_responses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read their own assessments" on public.assessment_responses;
create policy "Users can read their own assessments"
on public.assessment_responses
for select
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

-- Admins may update/delete stored records. Normal users cannot.
drop policy if exists "Admins can update assessments" on public.assessment_responses;
create policy "Admins can update assessments"
on public.assessment_responses
for update
to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

drop policy if exists "Admins can delete assessments" on public.assessment_responses;
create policy "Admins can delete assessments"
on public.assessment_responses
for delete
to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- Keep the table away from anonymous clients entirely.
revoke all on public.assessment_responses from anon;
grant select, insert on public.assessment_responses to authenticated;
grant update, delete on public.assessment_responses to authenticated;
