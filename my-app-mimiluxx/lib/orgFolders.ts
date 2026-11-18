import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminCommittee, OrgMember } from "@/lib/types/admin";
import type { OrgAccess } from "@/lib/orgAccess";

/**
 * Loads everything the folder pages share: the organization, who is looking at it,
 * its committees and its roster. Sends people away if they have no business here.
 */
export async function loadOrgContext(slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) notFound();

  const [{ data: membership }, { data: profile }, committeesRes, rosterRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, committee_id")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("committees")
      .select("id, organization_id, name, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_org_members", { p_org: org.id }),
  ]);

  const isAdmin = profile?.role === "Admin";
  // Only people in the organization (or an Admin) may look inside it.
  if (!membership && !isAdmin) redirect("/unauthorized");

  const access: OrgAccess = {
    userId: user.id,
    isAdmin,
    role: (membership?.role as string | undefined) ?? null,
    committeeId: (membership?.committee_id as string | null | undefined) ?? null,
  };

  return {
    supabase,
    org: org as { id: string; name: string; slug: string },
    access,
    committees: (committeesRes.data ?? []) as AdminCommittee[],
    members: (rosterRes.data ?? []) as OrgMember[],
    loadError: committeesRes.error?.message ?? rosterRes.error?.message ?? null,
  };
}

export function displayName(m: Pick<OrgMember, "full_name" | "username" | "email">): string {
  return m.full_name || m.username || m.email || "Unnamed member";
}
