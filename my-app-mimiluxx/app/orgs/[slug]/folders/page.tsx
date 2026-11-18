import Link from "next/link";
import PageFrame from "@/components/app_navigation/PageFrame";
import FolderCard from "@/components/folders/FolderCard";
import { loadOrgContext } from "@/lib/orgFolders";
import { canOpenCommittee } from "@/lib/orgAccess";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Organization folders · MimiLuxx" };

/** Level 1 of the folders: the committees of one organization. */
export default async function OrgFoldersPage({ params }: Params) {
  const { slug } = await params;
  const { org, access, committees, members, loadError } = await loadOrgContext(slug);

  const canManage = access.isAdmin || access.role === "President";

  return (
    <PageFrame
      active="orgs"
      eyebrow="Organization"
      title={org.name}
      subtitle="Open a committee to see its members' folders. Locked committees are ones you aren't part of."
    >
      {canManage && (
        <div className="mb-6">
          <Link
            href={`/orgs/${org.slug}/manage`}
            className="text-sm font-semibold underline underline-offset-4 hover:text-[#E5252A]"
          >
            Manage committees and members
          </Link>
        </div>
      )}

      {loadError && (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load everything: {loadError}
        </p>
      )}

      {committees.length === 0 ? (
        <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
          No committees yet.{canManage ? " Create the first one from the manage page." : " The president will add them."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {committees.map((c) => {
            const count = members.filter((m) => m.committee_id === c.id).length;
            const open = canOpenCommittee(access, c.id);
            const mine = access.committeeId === c.id;
            return (
              <FolderCard
                key={c.id}
                name={c.name}
                caption={`${count} member${count === 1 ? "" : "s"}${mine ? " · your committee" : ""}`}
                href={open ? `/orgs/${org.slug}/folders/${c.id}` : undefined}
                lockedReason="You can only open committees you belong to."
                highlight={mine}
              />
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}
