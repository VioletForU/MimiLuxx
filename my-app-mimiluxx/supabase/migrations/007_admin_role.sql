-- Adds an "Admin" role to profiles.role and lets it do everything
-- President / Adviser can do in row-level security.
-- Run in the Supabase SQL editor. Safe to re-run.

-- 1) Allow 'Admin' as a value of profiles.role.
--    Handles both setups: a CHECK constraint on the column, or a Postgres enum.
do $$
declare
  c record;
  t text;
begin
  -- CHECK constraint(s) that mention "role" on profiles
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;

  -- Enum type, if the column uses one
  select format_type(a.atttypid, null) into t
  from pg_attribute a
  where a.attrelid = 'public.profiles'::regclass and a.attname = 'role'
    and a.atttypid in (select oid from pg_type where typtype = 'e');

  if t is not null then
    execute format('alter type %s add value if not exists %L', t, 'Admin');
  else
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('Admin','President','Adviser','Vice President','Secretary','Committee Head','Member'));
  end if;
end $$;

-- 2) Admin-aware policies (replace the ones that only listed President/Adviser).
drop policy if exists "limits writable by admins" on public.approval_time_limits;
create policy "limits writable by admins" on public.approval_time_limits
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin','President','Adviser')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin','President','Adviser')));

drop policy if exists "announcements writable by admins" on public.announcements;
create policy "announcements writable by admins" on public.announcements
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin','President','Adviser')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin','President','Adviser')));

drop policy if exists "assignee or admin can update flags" on public.flags;
create policy "assignee or admin can update flags" on public.flags
  for update to authenticated
  using (
    assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('Admin','President','Adviser'))
  )
  with check (
    assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('Admin','President','Adviser'))
  );

drop policy if exists "flags visible to relevant members" on public.flags;
create policy "flags visible to relevant members" on public.flags
  for select to authenticated
  using (
    raised_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('Admin','President','Adviser'))
  );

-- 3) To make yourself the first Admin (replace the email):
-- update public.profiles set role = 'Admin'
-- where id = (select id from auth.users where email = 'you@example.com');
