import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient, { type SettingsProfile } from "@/components/settings/SettingsClient";
import { ROLES, type UserRole } from "@/lib/types/roles";

export const metadata = { title: "Settings · MimiLuxx" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  const role: UserRole = ROLES.includes(row?.role) ? row.role : "Member";

  const profile: SettingsProfile = {
    id: auth.user.id,
    email: auth.user.email ?? "",
    role,
    fullName: row?.full_name ?? "",
    contactEmail: row?.contact_email ?? "",
    memberId: row?.member_id ?? "",
    bio: row?.bio ?? "",
    avatarUrl: row?.avatar_url ?? "",
    language: row?.language ?? "en",
    timeZone: row?.time_zone ?? "",
    defaultView: row?.default_view === "tasks" ? "tasks" : "dashboard",
    notifPrefs: (row?.notif_prefs ?? {}) as Record<string, boolean>,
  };

  return (
    <>
      <main className="min-h-screen bg-white text-ink">
        <SettingsClient profile={profile} />
      </main>
    </>
  );
}
