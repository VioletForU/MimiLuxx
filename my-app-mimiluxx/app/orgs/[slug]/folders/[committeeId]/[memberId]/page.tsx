import { notFound, redirect } from "next/navigation";
import PageFrame from "@/components/app_navigation/PageFrame";
import { displayName, loadOrgContext } from "@/lib/orgFolders";
import { canOpenCommittee, canOpenMemberFolder, isCommitteeLead } from "@/lib/orgAccess";
import type { MemberFile } from "@/lib/memberFiles";
import MemberFiles from "./MemberFiles";

type Params = { params: Promise<{ slug: string; committeeId: string; memberId: string }> };

export const metadata = { title: "Personal folder · MimiLuxx" };

/** Level 3: one member's personal folder, with their files and attachments. */
export default async function MemberFolderPage({ params }: Params) {
  const { slug, committeeId, memberId } = await params;
  const { supabase, org, access, committees, members } = await loadOrgContext(slug);

  const committee = committees.find((c) => c.id === committeeId);
  if (!committee) notFound();
  if (!canOpenCommittee(access, committee.id)) redirect(`/orgs/${org.slug}/folders`);

  const owner = members.find((m) => m.user_id === memberId && m.committee_id === committee.id);
  if (!owner) notFound();

  // Plain members can only open their own folder.
  if (!canOpenMemberFolder(access, owner.user_id, committee.id)) {
    redirect(`/orgs/${org.slug}/folders/${committee.id}`);
  }

  const { data, error } = await supabase
    .from("member_files")
    .select("id, organization_id, owner_id, uploaded_by, path, file_name, mime_type, size_bytes, created_at")
    .eq("organization_id", org.id)
    .eq("owner_id", owner.user_id)
    .order("created_at", { ascending: false });

  const names: Record<string, string> = {};
  for (const m of members) names[m.user_id] = displayName(m);

  const mine = owner.user_id === access.userId;

  return (
    <PageFrame
      active="orgs"
      eyebrow={`${org.name} · ${committee.name}`}
      title={mine ? "Your folder" : `${displayName(owner)}'s folder`}
      subtitle={
        mine
          ? "Your files and attachments. Committee leads and higher roles can view and add to this folder."
          : isCommitteeLead(access, committee.id)
            ? "You're viewing this folder as a committee lead. You can open, add and delete files here."
            : undefined
      }
      backHref={`/orgs/${org.slug}/folders/${committee.id}`}
      backLabel={`Back to ${committee.name}`}
    >
      <MemberFiles
        organizationId={org.id}
        ownerId={owner.user_id}
        currentUserId={access.userId}
        files={(data ?? []) as MemberFile[]}
        names={names}
        loadError={error?.message ?? null}
      />
    </PageFrame>
  );
}
