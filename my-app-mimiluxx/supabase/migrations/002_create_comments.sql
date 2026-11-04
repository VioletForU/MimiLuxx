create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('task', 'flag')),
  target_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create index comments_target_idx
  on public.comments (target_type, target_id);

create policy "Authenticated users can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "Users can add their own comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);