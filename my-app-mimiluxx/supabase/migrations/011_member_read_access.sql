-- Lets people READ the organization and committees they belong to.
-- Run AFTER 008 and 010. Safe to re-run.
--
-- Why: the dashboard, the Orgs page and the folder pages look up the
-- organization (and its committees) as the signed-in person. If your existing
-- row-level security on those two tables only lets creators or certain roles
-- read them, a plain member sees "no organizations" even though they ARE a
-- member. These policies are added next to your existing ones (permissive
-- policies are OR-ed), so nobody loses access they already have.

drop policy if exists "organizations readable by their members" on public.organizations;
create policy "organizations readable by their members" on public.organizations
  for select to authenticated
  using (public.is_org_member(id) or public.is_app_admin());

drop policy if exists "committees readable by their members" on public.committees;
create policy "committees readable by their members" on public.committees
  for select to authenticated
  using (public.is_org_member(organization_id) or public.is_app_admin());
