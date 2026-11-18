import Link from "next/link";
import { redirect } from "next/navigation";
import PageFrame from "@/components/app_navigation/PageFrame";
import FolderSearch from "@/components/folders/FolderSearch";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/orgFolders";
import { canOpenCommittee, canOpenMemberFolder, type OrgAccess } from "@/lib/orgAccess";
import type { OrgMember } from "@/lib/types/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search · MimiLuxx" };

type Props = { searchParams: Promise<{ q?: string; org?: string }> };

type Hit = { key: string; title: string; context: string; href: string };

const LIMIT = 25;

/** Escape the characters that act as wildcards in a LIKE pattern. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function Group({ title, hits }: { title: string; hits: Hit[] }) {
  if (hits.length === 0) return null;
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
        {title} <span className="text-sm font-semibold text-neutral-500">({hits.length})</span>
      </h2>
      <ul className="mt-4 space-y-2">
        {hits.map((h) => (
          <li key={h.key}>
            <Link
              href={h.href}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm transition hover:border-[#E5252A]"
            >
              <span className="font-semibold text-neutral-900">{h.title}</span>
              <span className="text-xs text-neutral-500">{h.context}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Searches the folders you can open: committees, people, sub-folders and files. */
export default async function SearchPage({ searchParams }: Props) {
  const { q = "", org: orgSlug } = await searchParams;
  const term = q.trim().slice(0, 60);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const frame = (children: React.ReactNode) => (
    <PageFrame active="home" title="Search" subtitle="Committees, people, folders and files you have access to.">
      <div className="mb-6">
        <FolderSearch defaultValue={term} orgSlug={orgSlug} />
      </div>
      {children}
    </PageFrame>
  );

  if (term.length < 2) {
    return frame(<p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">Type at least 2 characters to search.</p>);
  }

  // Which organizations can this person search, and what is their standing in each?
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("organization_members").select("organization_id, role, committee_id").eq("user_id", user.id),
  ]);
  const isAdmin = profile?.role === "Admin";

  let orgsQuery = supabase.from("organizations").select("id, name, slug");
  if (!isAdmin) {
    const ids = (memberships ?? []).map((m) => m.organization_id as string);
    orgsQuery = orgsQuery.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (orgSlug) orgsQuery = orgsQuery.eq("slug", orgSlug);
  const { data: orgRows } = await orgsQuery;
  const orgs = (orgRows ?? []) as { id: string; name: string; slug: string }[];
  const orgIds = orgs.map((o) => o.id);

  if (orgIds.length === 0) {
    return frame(<p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">You aren&apos;t in an organization to search yet.</p>);
  }

  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const accessFor = (orgId: string): OrgAccess => {
    const m = (memberships ?? []).find((x) => x.organization_id === orgId);
    return {
      userId: user.id,
      isAdmin,
      role: (m?.role as string | undefined) ?? null,
      committeeId: (m?.committee_id as string | null | undefined) ?? null,
    };
  };

  const pattern = likePattern(term);
  const needle = term.toLowerCase();

  // Everything below is read as the signed-in person, so the database only returns
  // what they are allowed to see; the access checks just decide where links point.
  const [committeesRes, foldersRes, filesRes, ...rosters] = await Promise.all([
    supabase.from("committees").select("id, organization_id, name").in("organization_id", orgIds).ilike("name", pattern).limit(LIMIT),
    supabase.from("member_folders").select("id, organization_id, owner_id, name").in("organization_id", orgIds).ilike("name", pattern).limit(LIMIT),
    supabase.from("member_files").select("id, organization_id, owner_id, folder_id, file_name").in("organization_id", orgIds).ilike("file_name", pattern).limit(LIMIT),
    ...orgIds.map((id) => supabase.rpc("get_org_members", { p_org: id })),
  ]);

  const rosterByOrg = new Map<string, OrgMember[]>();
  orgIds.forEach((id, i) => rosterByOrg.set(id, (rosters[i].data ?? []) as OrgMember[]));
  const allCommittees = await supabase.from("committees").select("id, organization_id, name").in("organization_id", orgIds);
  const committeeName = new Map((allCommittees.data ?? []).map((c) => [c.id as string, c.name as string]));

  const ownerOf = (orgId: string, ownerId: string) => rosterByOrg.get(orgId)?.find((m) => m.user_id === ownerId);
  const folderLink = (orgId: string, ownerId: string, folderId: string | null) => {
    const o = ownerOf(orgId, ownerId);
    const slug = orgById.get(orgId)?.slug;
    if (!o || !o.committee_id || !slug) return null;
    if (!canOpenMemberFolder(accessFor(orgId), ownerId, o.committee_id)) return null;
    return `/orgs/${slug}/folders/${o.committee_id}/${ownerId}${folderId ? `?folder=${folderId}` : ""}`;
  };

  const committeeHits: Hit[] = [];
  for (const c of committeesRes.data ?? []) {
    const orgId = c.organization_id as string;
    if (!canOpenCommittee(accessFor(orgId), c.id as string)) continue;
    committeeHits.push({
      key: c.id as string,
      title: c.name as string,
      context: `Committee · ${orgById.get(orgId)?.name}`,
      href: `/orgs/${orgById.get(orgId)?.slug}/folders/${c.id}`,
    });
  }

  const peopleHits: Hit[] = [];
  for (const [orgId, roster] of rosterByOrg) {
    for (const m of roster) {
      if (!displayName(m).toLowerCase().includes(needle) || !m.committee_id) continue;
      const href = folderLink(orgId, m.user_id, null);
      if (!href) continue;
      peopleHits.push({
        key: `${orgId}:${m.user_id}`,
        title: m.user_id === user.id ? `${displayName(m)} (you)` : displayName(m),
        context: `${m.role} · ${committeeName.get(m.committee_id) ?? "Committee"} · ${orgById.get(orgId)?.name}`,
        href,
      });
    }
  }

  const folderHits: Hit[] = [];
  for (const f of foldersRes.data ?? []) {
    const orgId = f.organization_id as string;
    const href = folderLink(orgId, f.owner_id as string, f.id as string);
    if (!href) continue;
    const owner = ownerOf(orgId, f.owner_id as string);
    folderHits.push({
      key: f.id as string,
      title: f.name as string,
      context: `In ${owner ? displayName(owner) : "a member"}'s folder · ${orgById.get(orgId)?.name}`,
      href,
    });
  }

  const fileHits: Hit[] = [];
  for (const f of filesRes.data ?? []) {
    const orgId = f.organization_id as string;
    const href = folderLink(orgId, f.owner_id as string, (f.folder_id as string | null) ?? null);
    if (!href) continue;
    const owner = ownerOf(orgId, f.owner_id as string);
    fileHits.push({
      key: f.id as string,
      title: f.file_name as string,
      context: `File in ${owner ? displayName(owner) : "a member"}'s folder · ${orgById.get(orgId)?.name}`,
      href,
    });
  }

  const total = committeeHits.length + peopleHits.length + folderHits.length + fileHits.length;

  return frame(
    total === 0 ? (
      <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
        Nothing matched &ldquo;{term}&rdquo;. You can only find things in folders you have access to.
      </p>
    ) : (
      <div className="space-y-5">
        <Group title="Committees" hits={committeeHits} />
        <Group title="People" hits={peopleHits} />
        <Group title="Folders" hits={folderHits} />
        <Group title="Files" hits={fileHits} />
      </div>
    )
  );
}
