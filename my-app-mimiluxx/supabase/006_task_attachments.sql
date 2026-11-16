-- Run once in the Supabase SQL editor. Adds file attachments to tasks.
-- Files live in a PRIVATE bucket at   <user id>/<task id>/<uuid>-<file name>
-- and are opened with short-lived signed URLs (never stored permanent links).

-- 1) Bucket: private, 10 MB per file, only these types (enforced by Supabase, not just the browser)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-files', 'task-files', false, 10485760,
  array[
    'image/png','image/jpeg','image/webp','image/gif',
    'application/pdf','text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Storage policies: a user can only read / write / delete inside their own folder
drop policy if exists "task files read"   on storage.objects;
drop policy if exists "task files insert" on storage.objects;
drop policy if exists "task files delete" on storage.objects;

create policy "task files read" on storage.objects for select to authenticated
  using (bucket_id = 'task-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "task files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'task-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "task files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'task-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Which files belong to which task
create table if not exists public.task_attachments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  path       text not null unique,
  file_name  text not null,
  mime_type  text,
  size_bytes integer not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists task_attachments_task_id_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

drop policy if exists "attachments select own" on public.task_attachments;
drop policy if exists "attachments insert own" on public.task_attachments;
drop policy if exists "attachments delete own" on public.task_attachments;

create policy "attachments select own" on public.task_attachments
  for select to authenticated using (user_id = auth.uid());
-- you can only attach to a task you own
create policy "attachments insert own" on public.task_attachments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
create policy "attachments delete own" on public.task_attachments
  for delete to authenticated using (user_id = auth.uid());

-- 4) At most 10 files per task, enforced in the database too
create or replace function public.enforce_task_attachment_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.task_attachments where task_id = new.task_id) >= 10 then
    raise exception 'A task can have at most 10 attachments.';
  end if;
  return new;
end $$;

drop trigger if exists task_attachment_limit on public.task_attachments;
create trigger task_attachment_limit
  before insert on public.task_attachments
  for each row execute function public.enforce_task_attachment_limit();
