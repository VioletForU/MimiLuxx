-- Run once in the Supabase SQL editor. Supports the pages ported from /public:
--   /proposals/[id]  (rejection reason), /approvals/overdue (time limits), /announcements

alter table public.approval_stages
  add column if not exists rejection_reason text;

create table if not exists public.approval_time_limits (
  role         text primary key,
  enabled      boolean not null default true,
  amount       integer not null check (amount >= 1),
  unit         text not null check (unit in ('days','hours')),
  repeat_hours integer not null default 0 check (repeat_hours >= 0),
  updated_at   timestamptz not null default now()
);

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 80),
  body        text not null check (char_length(body) between 1 and 500),
  audience    text not null default 'All members',
  priority    text not null default 'normal' check (priority in ('critical','high','normal')),
  pinned      boolean not null default false,
  enabled     boolean not null default true,   -- the "feature flag"
  is_draft    boolean not null default false,
  starts_at   timestamptz,
  expires_at  timestamptz,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.approval_time_limits enable row level security;
alter table public.announcements        enable row level security;

create policy "limits readable by signed-in users" on public.approval_time_limits
  for select to authenticated using (true);
create policy "limits writable by admins" on public.approval_time_limits
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('President','Adviser')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('President','Adviser')));

create policy "announcements readable by signed-in users" on public.announcements
  for select to authenticated using (true);
create policy "announcements writable by admins" on public.announcements
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('President','Adviser')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('President','Adviser')));
