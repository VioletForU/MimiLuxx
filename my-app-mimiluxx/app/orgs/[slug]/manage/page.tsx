import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageFrame from "@/components/app_navigation/PageFrame";
import type { AdminCommittee, OrgInvite, OrgMember } from "@/lib/types/admin";
import ManageOrg from "./ManageOrg";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Manage organization · MimiLuxx" };

export default async function ManageOrgPage({ params }: Params) {
  const { slug } = await params;
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

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  // Only this organization's president, or an Admin, may manage it.
  const isAdmin = profile?.role === "Admin";
  if (membership?.role !== "President" && !isAdmin) redirect("/unauthorized");

  const [committeesRes, membersRes, invitesRes] = await Promise.all([
    supabase
      .from("committees")
      .select("id, organization_id, name, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_org_members", { p_org: org.id }),
    supabase
      .from("organization_invites")
      .select("id, email, role, committee_id, created_at, expires_at")
      .eq("organization_id", org.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const loadError = committeesRes.error?.message ?? membersRes.error?.message ?? invitesRes.error?.message ?? null;

  return (
    <PageFrame
      active="orgs"
      eyebrow="Organization"
      title={org.name}
      subtitle="Create committees, invite people by email and set their roles in this organization."
      backHref="/orgs"
      backLabel="Back to organizations"
    >
      <ManageOrg
        organizationId={org.id}
        committees={(committeesRes.data ?? []) as AdminCommittee[]}
        members={(membersRes.data ?? []) as OrgMember[]}
        invites={(invitesRes.data ?? []) as OrgInvite[]}
        currentUserId={user.id}
        loadError={loadError}
      />
    </PageFrame>
  );
}
