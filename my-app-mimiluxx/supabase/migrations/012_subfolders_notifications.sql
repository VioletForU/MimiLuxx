-- Sub-folders inside personal folders, and in-app notifications.
-- Run AFTER 010_member_files.sql. Safe to re-run.

-- =========================================================== sub-folders ==
-- A member's personal folder can hold nested sub-folders (up to 5 levels).
-- Who can use them is exactly who can open that member's folder
-- (can_access_member_folder, from 010).

create table if not exists public.member_folders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  parent_id       uuid references public.member_folders(id) on delete cascade,  -- null = top level
  name            text not null check (char_length(btrim(name)) between 1 and 60),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- No two sibling folders with the same name (case-insensitive).
create unique index if not exists member_folders_unique_name
  on public.member_folders (
    organization_id, owner_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );
create index if not exists member_folders_parent_idx
  on public.member_folders (organization_id, owner_id, parent_id);

-- Parent must be in the same person's folder; max depth 5; max 200 per person.
create or replace function public.check_member_folder()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
  depth integer := 1;
  cur uuid;
  n integer;
begin
  select count(*) into n from public.member_folders
   where organization_id = new.organization_id and owner_id = new.owner_id;
  if n >= 200 then
    raise exception 'This personal folder already has the maximum of 200 sub-folders.';
  end if;

  if new.parent_id is not null then
    select organization_id, owner_id, parent_id into p
      from public.member_folders where id = new.parent_id;
    if not found or p.organization_id <> new.organization_id or p.owner_id <> new.owner_id then
      raise exception 'That parent folder was not found.';
    end if;
    cur := p.parent_id;
    while cur is not null loop
      depth := depth + 1;
      if depth >= 5 then
        raise exception 'Folders can only be nested 5 levels deep.';
      end if;
      select parent_id into cur from public.member_folders where id = cur;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists member_folder_check on public.member_folders;
create trigger member_folder_check before insert on public.member_folders
  for each row execute function public.check_member_folder();

alter table public.member_folders enable row level security;

drop policy if exists "member folders visible to folder access" on public.member_folders;
create policy "member folders visible to folder access" on public.member_folders
  for select to authenticated
  using (public.can_access_member_folder(organization_id, owner_id));

drop policy if exists "member folders added by folder access" on public.member_folders;
create policy "member folders added by folder access" on public.member_folders
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.can_access_member_folder(organization_id, owner_id)
    and exists (select 1 from public.organization_members m
                where m.organization_id = member_folders.organization_id
                  and m.user_id = member_folders.owner_id)
  );

drop policy if exists "member folders removed by folder access" on public.member_folders;
create policy "member folders removed by folder access" on public.member_folders
  for delete to authenticated
  using (public.can_access_member_folder(organization_id, owner_id));

-- Files can now sit inside a sub-folder (null = top level of the personal folder).
alter table public.member_files
  add column if not exists folder_id uuid references public.member_folders(id) on delete cascade;
create index if not exists member_files_subfolder_idx on public.member_files (folder_id);

-- Re-create the insert rule so a file can only go into a folder of the same person.
drop policy if exists "member files added by folder access" on public.member_files;
create policy "member files added by folder access" on public.member_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_access_member_folder(organization_id, owner_id)
    and exists (select 1 from public.organization_members m
                where m.organization_id = member_files.organization_id and m.user_id = member_files.owner_id)
    and path like organization_id::text || '/' || owner_id::text || '/%'
    and (folder_id is null or exists (
          select 1 from public.member_folders f
          where f.id = member_files.folder_id
            and f.organization_id = member_files.organization_id
            and f.owner_id = member_files.owner_id))
  );

-- ========================================================== notifications ==

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,  -- who it is for
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  dedupe_key  text,                                  -- lets a burst of uploads become one notification
  item_count  integer not null default 1,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- People see, mark read, and delete only their own. Nobody inserts from the browser:
-- notifications are created by database triggers.
drop policy if exists "own notifications readable" on public.notifications;
create policy "own notifications readable" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own notifications updatable" on public.notifications;
create policy "own notifications updatable" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own notifications deletable" on public.notifications;
create policy "own notifications deletable" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- The only column a person may change is read_at.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- When someone OTHER than the owner (a committee lead or higher) adds a file to a
-- member's folder, tell the owner. Respects the "Folder activity / In-app" switch in
-- Settings, and merges uploads from the same person into the same folder within
-- 10 minutes into one notification ("added 3 files").
create or replace function public.notify_folder_file_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean;
  v_slug text;
  v_committee uuid;
  v_name text;
  v_key text;
  v_link text;
begin
  if new.uploaded_by is null or new.uploaded_by = new.owner_id then
    return new;
  end if;

  select coalesce((notif_prefs ->> 'folder_files_workspace')::boolean, true)
    into v_enabled from public.profiles where id = new.owner_id;
  if v_enabled is false then
    return new;
  end if;

  select slug into v_slug from public.organizations where id = new.organization_id;
  select committee_id into v_committee from public.organization_members
   where organization_id = new.organization_id and user_id = new.owner_id;
  select coalesce(nullif(btrim(full_name), ''), nullif(btrim(username), ''), 'A committee lead')
    into v_name from public.profiles where id = new.uploaded_by;
  v_name := coalesce(v_name, 'A committee lead');

  if v_slug is not null and v_committee is not null then
    v_link := '/orgs/' || v_slug || '/folders/' || v_committee || '/' || new.owner_id
              || case when new.folder_id is not null then '?folder=' || new.folder_id else '' end;
  end if;

  v_key := 'file:' || new.owner_id || ':' || new.uploaded_by || ':' || coalesce(new.folder_id::text, 'root');

  update public.notifications
     set item_count = item_count + 1,
         body = v_name || ' added ' || (item_count + 1) || ' files to your folder.',
         created_at = now()
   where user_id = new.owner_id
     and dedupe_key = v_key
     and read_at is null
     and created_at > now() - interval '10 minutes';

  if not found then
    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    values (new.owner_id, 'folder_file_added', 'New file in your folder',
            v_name || ' added ' || new.file_name || ' to your folder.', v_link, v_key);
  end if;

  return new;
end $$;

drop trigger if exists member_file_notify on public.member_files;
create trigger member_file_notify after insert on public.member_files
  for each row execute function public.notify_folder_file_added();
