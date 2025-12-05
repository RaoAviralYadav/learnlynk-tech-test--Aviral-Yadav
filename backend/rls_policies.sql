-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
create or replace function get_jwt_claim(claim text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> claim,
    null
  );
$$;
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO: write a policy so:
-- counselors see leads they own OR leads assigned to their teams
-- admins see all leads in their tenant
create policy "leads_select_policy"
on public.leads
for select
using (
  (
    -- Admin can see all leads in their tenant
    (get_jwt_claim('role') = 'admin' 
     and tenant_id::text = get_jwt_claim('tenant_id'))
    or
    -- Counselor can see leads they own
    (get_jwt_claim('role') = 'counselor' 
     and owner_id::text = get_jwt_claim('user_id')
     and tenant_id::text = get_jwt_claim('tenant_id'))
    or
    -- Counselor can see leads assigned to any of their teams
    (get_jwt_claim('role') = 'counselor'
     and tenant_id::text = get_jwt_claim('tenant_id')
     and exists (
       select 1 
       from public.lead_teams lt
       join public.user_teams ut on ut.team_id = lt.team_id
       where lt.lead_id = leads.id
       and ut.user_id::text = get_jwt_claim('user_id')
     ))
  )
);

-- INSERT policy: counselors and admins can insert leads for their tenant
create policy "leads_insert_policy"
on public.leads
for insert
with check (
  
  (get_jwt_claim('role') in ('counselor', 'admin'))
  and
  (tenant_id::text = get_jwt_claim('tenant_id'))
);