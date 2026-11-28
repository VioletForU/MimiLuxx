import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sortAnnouncements, type Announcement } from "@/lib/announcements";
import { getAnnouncerContext } from "@/lib/announcementAccess";
import AnnouncementsManager from "./AnnouncementsManager";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Not logged in</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  const ctx = await getAnnouncerContext(supabase, user.id);

  // The database only returns announcements this person is meant to see (014_announcement_scopes.sql).
  const [{ data, error }, { data: orgRows }, { data: committeeRows }] = await Promise.all([
    supabase.from("announcements").select("*, announcement_committees(committee_id)"),
    supabase.from("organizations").select("id, name"),
    supabase.from("committees").select("id, name"),
  ]);
  const all = sortAnnouncements((data ?? []) as Announcement[]);

  // Who may edit what: Admins everything, org leadership their org's, everyone else only their own.
  const editableIds = all
    .filter((a) => ctx.isAdmin || (a.scope !== "app" && (a.created_by === user.id || (!!a.organization_id && ctx.leadOrgIds.includes(a.organization_id)))))
    .map((a) => a.id);
  const editable = new Set(editableIds);
  // Drafts and switched-off items are only shown to the people who can edit them.
  const list = all.filter((a) => editable.has(a.id) || (!a.is_draft && a.enabled));

  const orgNames = Object.fromEntries((orgRows ?? []).map((o) => [o.id as string, o.name as string]));
  const committeeNames = Object.fromEntries((committeeRows ?? []).map((c) => [c.id as string, c.name as string]));

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-extrabold">Mimi<span className="text-brand">Luxx</span></Link>
          <nav aria-label="Main" className="hidden gap-6 text-sm font-bold sm:flex">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/tasks">All Tasks</Link>
            <Link href="/announcements" className="text-brand">Announcements</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Flagged announcements</h1>
          <p className="mt-1 text-sm text-ink/60">
            {ctx.isAdmin
              ? "Announce to everyone in the app, a whole organization, or chosen committees, and control until when."
              : ctx.canPost
                ? "Announce to your organization or committees, and control until when."
                : "Important announcements from your officers."}
          </p>
        </div>
        {error && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            Could not load announcements: {error.message}. If the table is missing, run <code>supabase/migrations/003_integration_tables.sql</code> and <code>014_announcement_scopes.sql</code>.
          </p>
        )}
        <AnnouncementsManager
          announcements={list}
          canManage={ctx.canPost}
          isAdmin={ctx.isAdmin}
          targets={ctx.targets}
          editableIds={editableIds}
          orgNames={orgNames}
          committeeNames={committeeNames}
          nowIso={new Date().toISOString()}
        />
      </main>
    </div>
  );
}
