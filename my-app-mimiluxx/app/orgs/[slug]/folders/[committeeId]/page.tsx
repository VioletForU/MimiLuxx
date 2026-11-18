import { notFound, redirect } from "next/navigation";
import PageFrame from "@/components/app_navigation/PageFrame";
import FolderCard from "@/components/folders/FolderCard";
import { displayName, loadOrgContext } from "@/lib/orgFolders";
import { canOpenCommittee, canOpenMemberFolder, isCommitteeLead } from "@/lib/orgAccess";

type Params = { params: Promise<{ slug: string; committeeId: string }> };

export const metadata = { title: "Committee folders · MimiLuxx" };

/** Level 2: the members of one committee, each with their own folder. */
export default async function CommitteeFoldersPage({ params }: Params) {
  const { slug, committeeId } = await params;
  const { org, access, committees, members } = await loadOrgContext(slug);

  const committee = committees.find((c) => c.id === committeeId);
  if (!committee) notFound();
  if (!canOpenCommittee(access, committee.id)) redirect(`/orgs/${org.slug}/folders`);

  const roster = members
    .filter((m) => m.committee_id === committee.id)
    // Your own folder first, then committee heads, then everyone else by name.
    .sort((a, b) => {
      const rank = (m: (typeof members)[number]) => (m.user_id === access.userId ? 0 : m.role === "Committee Head" ? 1 : 2);
      return rank(a) - rank(b) || displayName(a).localeCompare(displayName(b));
    });

  const leads = isCommitteeLead(access, committee.id);

  return (
    <PageFrame
      active="orgs"
      eyebrow={org.name}
      title={committee.name}
      subtitle={
        leads
          ? "You can open every member's folder in this committee."
          : "Everyone in the committee is listed, but you can only open your own folder. Committee leads can open all of them."
      }
      backHref={`/orgs/${org.slug}/folders`}
      backLabel={`Back to ${org.name}`}
    >
      {roster.length === 0 ? (
        <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
          No members in this committee yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {roster.map((m) => {
            const mine = m.user_id === access.userId;
            const open = canOpenMemberFolder(access, m.user_id, committee.id);
            return (
              <FolderCard
                key={m.id}
                name={mine ? `${displayName(m)} (you)` : displayName(m)}
                caption={m.role}
                href={open ? `/orgs/${org.slug}/folders/${committee.id}/${m.user_id}` : undefined}
                lockedReason="Only committee leads can open other members' folders."
                highlight={mine}
              />
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}
