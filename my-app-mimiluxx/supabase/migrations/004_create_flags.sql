create table if not exists public.flags (
  id              uuid primary key default gen_random_uuid(),
  target_type     text not null check (target_type in ('announcement','task','proposal')),
  target_id       uuid not null,
  reason          text not null check (char_length(reason) between 1 and 500),
  raised_by       uuid not null references auth.users(id) on delete cascade,
  assigned_to     uuid references auth.users(id) on delete set null,
  status          text not null default 'open'
                    check (status in ('open','acknowledged','resolved')),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_by     uuid references auth.users(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists flags_target_idx
  on public.flags (target_type, target_id);

alter table public.flags enable row level security;

create policy "flags readable by signed-in users" on public.flags
  for select to authenticated using (true);

create policy "users can raise flags" on public.flags
  for insert to authenticated
  with check (raised_by = auth.uid());

create policy "assignee or admin can update flags" on public.flags
  for update to authenticated
  using (
    assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('President','Adviser'))
  )
  with check (
    assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('President','Adviser'))
  );