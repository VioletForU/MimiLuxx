-- Updates check_org_creation_limit() for the Admin-picks-a-president flow.
-- Run AFTER 008_org_members.sql. Safe to re-run; the trigger itself
-- (enforce_org_limit) stays attached, only the function body changes.
--
-- Before: the creator's global role had to be President or Adviser.
-- Now:
--   * The Admin panel creates organizations from the server (no signed-in
--     user on the database call, so auth.uid() is null) with the chosen
--     president as created_by. That path skips the role check, because only
--     Admins can reach it.
--   * A signed-in person inserting directly is still checked, as before
--     (Admin is added to the allowed roles).
--   * The limit of 2 organizations per creator applies in both cases, so one
--     person can be appointed president of at most 2 organizations at creation.

create or replace function public.check_org_creation_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  user_role text;
  org_count integer;
begin
  -- one at a time per person, so two quick clicks cannot slip past the limit
  perform pg_advisory_xact_lock(hashtext(new.created_by::text));

  select role into user_role from public.profiles where id = new.created_by;

  if user_role is null then
    raise exception 'User profile not found.';
  end if;

  -- Direct client insert by a signed-in person: keep the old rule.
  if auth.uid() is not null and user_role not in ('Admin', 'President', 'Adviser') then
    raise exception 'Only an Admin, President or Adviser can create organizations.';
  end if;

  select count(*) into org_count from public.organizations where created_by = new.created_by;

  if org_count >= 2 then                                        -- change me: organizations each
    if auth.uid() is null then
      raise exception 'That person is already president of the maximum of 2 organizations.';
    end if;
    raise exception 'You have reached the maximum of 2 organizations.';
  end if;

  return new;
end;
$function$;
