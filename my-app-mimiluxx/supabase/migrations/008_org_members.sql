-- Per-organization membership, email invites, and an org president who
-- manages their own organization. Run AFTER 007_admin_role.sql. Safe to re-run.

-- ---------------------------------------------------------------- tables --

create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'Member'
                  check (role in ('President','Adviser','Vice President','Secretary','Committee Head','Member')),
  committee_id    uuid references public.committees(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- At most one president per organization.
create unique index if not exists organization_members_one_president
  on public.organization_members (organization_id) where role = 'President';
create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

create table if not exists public.organization_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'Member'
                  check (role in ('Adviser','Vice President','Secretary','Committee Head','Member')),
  committee_id    uuid references public.committees(id) on delete set null,
  invited_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '14 days',
  accepted_at     timestamptz
);

-- One open invite per email per organization.
create unique index if not exists organization_invites_open_email
  on public.organization_invites (organization_id, lower(email)) where accepted_at is null;

-- --------------------------------------------------------------- helpers --
-- SECURITY DEFINER so policies can ask these questions without recursing
-- into the tables' own policies.

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin');
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where organization_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_org_president(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where organization_id = p_org and user_id = auth.uid() and role = 'President');
$$;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_president(uuid) to authenticated;

-- ------------------------------------------------------------------- RLS --

alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

-- Members: you can see your own organizations' rosters.
drop policy if exists "members readable by org members" on public.organization_members;
create policy "members readable by org members" on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id) or public.is_app_admin());

-- A president manages everyone in their org except the president row, and can
-- never hand out the President role (only an Admin can).
drop policy if exists "president adds members" on public.organization_members;
create policy "president adds members" on public.organization_members
  for insert to authenticated
  with check (public.is_org_president(organization_id) and role <> 'President');

drop policy if exists "president edits members" on public.organization_members;
create policy "president edits members" on public.organization_members
  for update to authenticated
  using (public.is_org_president(organization_id) and role <> 'President')
  with check (public.is_org_president(organization_id) and role <> 'President');

drop policy if exists "president removes members" on public.organization_members;
create policy "president removes members" on public.organization_members
  for delete to authenticated
  using (public.is_org_president(organization_id) and role <> 'President');

drop policy if exists "admin manages members" on public.organization_members;
create policy "admin manages members" on public.organization_members
  for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- Invites: president of that org, or an Admin.
drop policy if exists "president manages invites" on public.organization_invites;
create policy "president manages invites" on public.organization_invites
  for all to authenticated
  using (public.is_org_president(organization_id) or public.is_app_admin())
  with check (public.is_org_president(organization_id) or public.is_app_admin());

-- Committees: a president can add and remove committees in their own org.
-- (Added next to your existing policies; permissive policies are OR-ed.)
drop policy if exists "president adds committees" on public.committees;
create policy "president adds committees" on public.committees
  for insert to authenticated
  with check (public.is_org_president(organization_id) or public.is_app_admin());

drop policy if exists "president removes committees" on public.committees;
create policy "president removes committees" on public.committees
  for delete to authenticated
  using (public.is_org_president(organization_id) or public.is_app_admin());

-- ------------------------------------------------------------- functions --

-- Roster with names (and emails, for the president/admin only).
create or replace function public.get_org_members(p_org uuid)
returns table (
  id uuid, user_id uuid, role text, committee_id uuid,
  full_name text, username text, email text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, m.role, m.committee_id,
         p.full_name, p.username,
         case when public.is_org_president(p_org) or public.is_app_admin()
              then u.email::text end,
         m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org
    and (public.is_org_member(p_org) or public.is_app_admin())
  order by (m.role = 'President') desc, p.full_name nulls last;
$$;
grant execute on function public.get_org_members(uuid) to authenticated;

-- Turns pending email invites into memberships the first time someone signs in.
create or replace function public.claim_my_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_count integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;

  with open_invites as (
    select * from public.organization_invites
    where lower(email) = v_email and accepted_at is null and expires_at > now()
  ), added as (
    insert into public.organization_members (organization_id, user_id, role, committee_id)
    select organization_id, auth.uid(), role, committee_id from open_invites
    on conflict (organization_id, user_id) do nothing
    returning 1
  )
  select count(*) into v_count from added;

  update public.organization_invites set accepted_at = now()
  where lower(email) = v_email and accepted_at is null and expires_at > now();

  return v_count;
end $$;
grant execute on function public.claim_my_invites() to authenticated;

-- Server-only helpers (called with the service key from the app).
create or replace function public.find_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- Makes p_user the president of p_org; a previous president becomes a Member.
create or replace function public.set_org_president(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.organization_members
     set role = 'Member'
   where organization_id = p_org and role = 'President' and user_id <> p_user;

  insert into public.organization_members (organization_id, user_id, role, committee_id)
  values (p_org, p_user, 'President', null)
  on conflict (organization_id, user_id)
  do update set role = 'President', committee_id = null;
end $$;
revoke all on function public.set_org_president(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_org_president(uuid, uuid) to service_role;

-- ---------------------------------------------------- existing orgs (once) --
-- Organizations created before this migration have no president. Make each
-- one's creator its president so nobody is locked out; change it afterwards
-- from the admin panel if that's wrong.
insert into public.organization_members (organization_id, user_id, role)
select o.id, o.created_by, 'President'
from public.organizations o
where o.created_by is not null
  and not exists (select 1 from public.organization_members m
                  where m.organization_id = o.id and m.role = 'President')
on conflict (organization_id, user_id) do nothing;
