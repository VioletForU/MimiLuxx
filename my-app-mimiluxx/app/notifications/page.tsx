import Link from "next/link";
import { redirect } from "next/navigation";
import PageFrame from "@/components/app_navigation/PageFrame";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/notifications";
import NotificationList from "./NotificationList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · MimiLuxx" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PageFrame
      active="notifications"
      title="Notifications"
      subtitle="Updates about your folders, like a committee lead adding a file for you."
    >
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load notifications: {error.message}. If this is a new setup, run 012_subfolders_notifications.sql in
          the Supabase SQL Editor.
        </p>
      ) : (
        <NotificationList notifications={(data ?? []) as AppNotification[]} />
      )}
      <p className="mt-6 text-sm text-neutral-500">
        Choose what you get in{" "}
        <Link href="/settings" className="font-semibold underline underline-offset-4">
          Settings
        </Link>
        .
      </p>
    </PageFrame>
  );
}
