-- Personal folders inside committees. Run AFTER 008_org_members.sql. Safe to re-run.
--
-- Who can open a member's personal folder (view, download, upload, delete):
--   * the member themselves
--   * the Committee Head of that member's committee
--   * organization leadership: President, Adviser, Vice President, Secretary
--   * an app Admin
-- Everyone else is refused by the database itself, not just hidden in the UI.
--
-- Files live in a PRIVATE bucket at   <organization id>/<member user id>/<uuid>-<file name>
-- and are opened with short-lived signed URLs.

-- ---------------------------------------------------------------- helpers --

create or replace function public.uuid_or_null(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- President, Adviser, Vice President, Secretary of this org, or an app Admin.
create or replace function public.is_org_leadership(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (select 1 from public.organization_members
                 where organization_id = p_org and user_id = auth.uid()
                   and role in ('President','Adviser','Vice President','Secretary'));
$$;

-- Can the signed-in person open p_owner's personal folder in p_org?
create or replace function public.can_access_member_folder(p_org uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_org is not null and p_owner is not null and (
    public.is_org_leadership(p_org)
    or (auth.uid() = p_owner and public.is_org_member(p_org))
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members owner
        on owner.organization_id = me.organization_id
       and owner.committee_id = me.committee_id
      where me.organization_id = p_org
        and me.user_id = auth.uid()
        and me.role = 'Committee Head'
        and me.committee_id is not null
        and owner.user_id = p_owner
    )
  );
$$;

grant execute on function public.is_org_leadership(uuid) to authenticated;
grant execute on function public.can_access_member_folder(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------- bucket --

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-files', 'member-files', false, 10485760,
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

drop policy if exists "member files read"   on storage.objects;
drop policy if exists "member files insert" on storage.objects;
drop policy if exists "member files delete" on storage.objects;

create policy "member files read" on storage.objects for select to authenticated
  using (bucket_id = 'member-files' and public.can_access_member_folder(
    public.uuid_or_null((storage.foldername(name))[1]),
    public.uuid_or_null((storage.foldername(name))[2])));

create policy "member files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-files' and public.can_access_member_folder(
    public.uuid_or_null((storage.foldername(name))[1]),
    public.uuid_or_null((storage.foldername(name))[2])));

create policy "member files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'member-files' and public.can_access_member_folder(
    public.uuid_or_null((storage.foldername(name))[1]),
    public.uuid_or_null((storage.foldername(name))[2])));

-- ------------------------------------------------------------------ table --

create table if not exists public.member_files (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,  -- whose folder it is in
  uploaded_by     uuid references auth.users(id) on delete set null,          -- the owner, or a lead
  path            text not null unique,
  file_name       text not null,
  mime_type       text,
  size_bytes      bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  created_at      timestamptz not null default now()
);

create index if not exists member_files_folder_idx
  on public.member_files (organization_id, owner_id, created_at desc);

alter table public.member_files enable row level security;

drop policy if exists "member files visible to folder access" on public.member_files;
create policy "member files visible to folder access" on public.member_files
  for select to authenticated
  using (public.can_access_member_folder(organization_id, owner_id));

drop policy if exists "member files added by folder access" on public.member_files;
create policy "member files added by folder access" on public.member_files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_access_member_folder(organization_id, owner_id)
    and exists (select 1 from public.organization_members m
                where m.organization_id = member_files.organization_id and m.user_id = member_files.owner_id)
    and path like organization_id::text || '/' || owner_id::text || '/%'
  );

drop policy if exists "member files removed by folder access" on public.member_files;
create policy "member files removed by folder access" on public.member_files
  for delete to authenticated
  using (public.can_access_member_folder(organization_id, owner_id));
