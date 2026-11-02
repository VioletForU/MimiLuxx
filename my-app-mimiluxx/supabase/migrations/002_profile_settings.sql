-- MimiLuxx: Settings page support. Run once in Supabase > SQL Editor.

alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists member_id     text,
  add column if not exists bio           text,
  add column if not exists avatar_url    text,
  add column if not exists language      text not null default 'en',
  add column if not exists time_zone     text,
  add column if not exists default_view  text not null default 'dashboard',
  add column if not exists notif_prefs   jsonb not null default '{}'::jsonb;

-- Public bucket for profile pictures (max 2 MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Everyone can see avatars; users can only write inside their own folder (<user id>/...)
drop policy if exists "avatars read"   on storage.objects;
drop policy if exists "avatars insert" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
drop policy if exists "avatars delete" on storage.objects;

create policy "avatars read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- OPTIONAL but recommended: stop members from editing their own "role".
-- Only run if your app never updates profiles.role from the browser as a normal user
-- (your admin page may do this: test it after). Uncomment to apply.
-- revoke update on public.profiles from authenticated;
-- grant update (full_name, username, contact_email, member_id, bio, avatar_url,
--               language, time_zone, default_view, notif_prefs)
--   on public.profiles to authenticated;
