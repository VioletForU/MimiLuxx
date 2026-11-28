-- Announcements with a target audience, created by committee heads and higher.
-- Run AFTER 003, 007, 008 and 010. Safe to re-run.
--
-- Who may create an announcement, and for whom:
--   * app Admin ........... everyone in the app, any organization, any committees
--   * President / Adviser / Vice President / Secretary of an organization
--                           ........... that whole organization, or chosen committees in it
--   * Committee Head ...... only their OWN committee
--   * Member .............. cannot create announcements
--
-- Who can SEE one:
--   * scope 'app' ......... every signed-in user (only an Admin can create these)
--   * scope 'org' ......... members of that organization
--   * scope 'committees' .. members of the chosen committees (+ that org's leadership)
--   * drafts are visible only to their creator, the org's leadership and Admins.
-- The database enforces this itself, not just the screens.
--
-- Existing announcements keep working: they become scope 'app' (they were all
-- created by Admin/President/Adviser for everyone). The old free-text
-- "audience" column is left in place but is no longer used.

-- ---------------------------------------------------------------- columns --

alter table public.announcements
  add column if not exists scope text not null default 'app',
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.announcements drop constraint if exists announcements_scope_check;
alter table public.announcements
  add constraint announcements_scope_check check (
    (scope = 'app' and organization_id is null)
    or (scope in ('org', 'committees') and organization_id is not null)
  );

create index if not exists announcements_org_idx on public.announcements (organization_id);

-- Which committees a 'committees' announcement is for.
create table if not exists public.announcement_committees (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  committee_id    uuid not null references public.committees(id) on delete cascade,
  primary key (announcement_id, committee_id)
);
create index if not exists announcement_committees_committee_idx
  on public.announcement_committees (committee_id);

-- ---------------------------------------------------------------- helpers --

-- Committee Head (with a committee), Vice President, Secretary, President or
-- Adviser of p_org, or an app Admin.
create or replace function public.can_post_announcement(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (select 1 from public.organization_members
                 where organization_id = p_org and user_id = auth.uid()
                   and (role in ('President','Adviser','Vice President','Secretary')
                        or (role = 'Committee Head' and committee_id is not null)));
$$;
grant execute on function public.can_post_announcement(uuid) to authenticated;

-- May the signed-in person publish to this audience?
create or replace function public.can_target_announcement(p_scope text, p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_scope = 'app'        then public.is_app_admin()
    when p_scope = 'org'        then p_org is not null and public.is_org_leadership(p_org)
    when p_scope = 'committees' then p_org is not null and public.can_post_announcement(p_org)
    else false
  end;
$$;
grant execute on function public.can_target_announcement(text, uuid) to authenticated;

-- ------------------------------------------------------------------- RLS --

alter table public.announcements enable row level security;
alter table public.announcement_committees enable row level security;

drop policy if exists "announcements readable by signed-in users" on public.announcements;
drop policy if exists "announcements writable by admins" on public.announcements;
drop policy if exists "announcements readable by audience" on public.announcements;
drop policy if exists "announcements created by announcers" on public.announcements;
drop policy if exists "announcements updated by owners" on public.announcements;
drop policy if exists "announcements deleted by owners" on public.announcements;

create policy "announcements readable by audience" on public.announcements
  for select to authenticated
  using (
    public.is_app_admin()
    or created_by = auth.uid()
    or (scope <> 'app' and public.is_org_leadership(organization_id))
    or (
      not is_draft and (
        scope = 'app'
        or (scope = 'org' and public.is_org_member(organization_id))
        or (scope = 'committees' and exists (
              select 1
              from public.announcement_committees ac
              join public.organization_members m on m.committee_id = ac.committee_id
              where ac.announcement_id = announcements.id and m.user_id = auth.uid()))
      )
    )
  );

create policy "announcements created by announcers" on public.announcements
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_target_announcement(scope, organization_id));

create policy "announcements updated by owners" on public.announcements
  for update to authenticated
  using (
    public.is_app_admin()
    or (scope <> 'app' and (created_by = auth.uid() or public.is_org_leadership(organization_id)))
  )
  with check (public.can_target_announcement(scope, organization_id));

create policy "announcements deleted by owners" on public.announcements
  for delete to authenticated
  using (
    public.is_app_admin()
    or (scope <> 'app' and (created_by = auth.uid() or public.is_org_leadership(organization_id)))
  );

-- Which committees an announcement targets is not secret, so anyone signed in may
-- read the rows (this also keeps the announcements policy above free of loops).
drop policy if exists "announcement committees readable" on public.announcement_committees;
create policy "announcement committees readable" on public.announcement_committees
  for select to authenticated using (true);

-- Add a committee target: the committee must belong to the announcement's
-- organization, and a Committee Head can only pick their own committee.
drop policy if exists "announcement committees added by owners" on public.announcement_committees;
create policy "announcement committees added by owners" on public.announcement_committees
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.announcements a
      join public.committees c on c.organization_id = a.organization_id
      where a.id = announcement_committees.announcement_id
        and c.id = announcement_committees.committee_id
        and a.scope = 'committees'
        and (a.created_by = auth.uid() or public.is_org_leadership(a.organization_id))
        and (
          public.is_org_leadership(a.organization_id)
          or exists (select 1 from public.organization_members m
                     where m.organization_id = a.organization_id
                       and m.user_id = auth.uid()
                       and m.role = 'Committee Head'
                       and m.committee_id = c.id)
        )
    )
  );

drop policy if exists "announcement committees removed by owners" on public.announcement_committees;
create policy "announcement committees removed by owners" on public.announcement_committees
  for delete to authenticated
  using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_committees.announcement_id
        and (public.is_app_admin()
             or a.created_by = auth.uid()
             or (a.scope <> 'app' and public.is_org_leadership(a.organization_id)))
    )
  );
