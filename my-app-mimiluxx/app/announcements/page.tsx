import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import { sortAnnouncements, visibleTo, type Announcement } from "@/lib/announcements";
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

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = me?.role ?? "Member";
  const admin = isAdminRole(role);

  const { data, error } = await supabase.from("announcements").select("*");
  const all = sortAnnouncements((data ?? []) as Announcement[]);
  // Members only ever see published, enabled items meant for them; admins see everything.
  const list = admin ? all : all.filter((a) => !a.is_draft && a.enabled && visibleTo(a, role));

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
            {admin ? "Create important announcements and control who sees them, and until when." : "Important announcements from your officers."}
          </p>
        </div>
        {error && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            Could not load announcements: {error.message}. If the table is missing, run <code>supabase/migrations/003_integration_tables.sql</code>.
          </p>
        )}
        <AnnouncementsManager announcements={list} canManage={admin} nowIso={new Date().toISOString()} />
      </main>
    </div>
  );
}
