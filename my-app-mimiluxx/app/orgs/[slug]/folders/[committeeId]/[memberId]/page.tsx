import { notFound, redirect } from "next/navigation";
import PageFrame from "@/components/app_navigation/PageFrame";
import { displayName, loadOrgContext } from "@/lib/orgFolders";
import { canOpenCommittee, canOpenMemberFolder, isCommitteeLead } from "@/lib/orgAccess";
import type { MemberFile, MemberFolder } from "@/lib/memberFiles";
import MemberFiles from "./MemberFiles";

type Params = {
  params: Promise<{ slug: string; committeeId: string; memberId: string }>;
  searchParams: Promise<{ folder?: string }>;
};

export const metadata = { title: "Personal folder · MimiLuxx" };

/** Level 3: one member's personal folder, with their files and attachments. */
export default async function MemberFolderPage({ params, searchParams }: Params) {
  const { slug, committeeId, memberId } = await params;
  const { folder: folderParam } = await searchParams;
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

  // All of this person's sub-folders (small), so the page can build the breadcrumb and children.
  const foldersRes = await supabase
    .from("member_folders")
    .select("id, organization_id, owner_id, parent_id, name, created_by, created_at")
    .eq("organization_id", org.id)
    .eq("owner_id", owner.user_id)
    .order("name", { ascending: true });
  const folders = (foldersRes.data ?? []) as MemberFolder[];

  // An unknown or stale ?folder= falls back to the top level instead of erroring.
  const current = folders.find((f) => f.id === folderParam) ?? null;

  let filesQuery = supabase
    .from("member_files")
    .select("id, organization_id, owner_id, uploaded_by, path, file_name, mime_type, size_bytes, created_at, folder_id")
    .eq("organization_id", org.id)
    .eq("owner_id", owner.user_id)
    .order("created_at", { ascending: false });
  filesQuery = current ? filesQuery.eq("folder_id", current.id) : filesQuery.is("folder_id", null);
  const { data, error } = await filesQuery;

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
        basePath={`/orgs/${org.slug}/folders/${committee.id}/${owner.user_id}`}
        rootLabel={mine ? "Your folder" : `${displayName(owner)}'s folder`}
        folders={folders}
        currentFolderId={current?.id ?? null}
        files={(data ?? []) as MemberFile[]}
        names={names}
        loadError={error?.message ?? foldersRes.error?.message ?? null}
      />
    </PageFrame>
  );
}
