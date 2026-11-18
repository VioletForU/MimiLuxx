"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/notifications";
import { card, darkButton, emptyText, errorText, linkDanger } from "@/app/admin/ui";

export default function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unread = notifications.filter((n) => !n.read_at).length;

  async function markRead(ids: string[]) {
    const { error: e } = await createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (e) throw new Error(e.message);
  }

  async function onOpen(n: AppNotification) {
    try {
      if (!n.read_at) await markRead([n.id]);
    } catch {
      /* opening the link matters more than the read mark */
    }
    if (n.link) router.push(n.link);
    else router.refresh();
  }

  async function onMarkAll() {
    setBusy("all");
    setError(null);
    try {
      await markRead(notifications.filter((n) => !n.read_at).map((n) => n.id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notifications.");
    }
    setBusy(null);
  }

  async function onDelete(n: AppNotification) {
    setBusy(n.id);
    setError(null);
    const { error: e } = await createClient().from("notifications").delete().eq("id", n.id);
    setBusy(null);
    if (e) return setError(e.message);
    router.refresh();
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-700">
          {unread > 0 ? `${unread} unread` : "You're all caught up"}
        </p>
        {unread > 0 && (
          <button type="button" disabled={busy === "all"} onClick={onMarkAll} className={darkButton}>
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className={`${emptyText} mt-4`}>No notifications yet.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                n.read_at ? "border-neutral-200 bg-white" : "border-[#E5252A]/40 bg-[#E5252A]/[0.05]"
              }`}
            >
              <button type="button" onClick={() => onOpen(n)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2 font-semibold text-neutral-900">
                  {!n.read_at && <span className="size-2 shrink-0 rounded-full bg-[#E5252A]" aria-label="Unread" />}
                  {n.title}
                </span>
                {n.body && <span className="mt-0.5 block text-neutral-700">{n.body}</span>}
                <span className="mt-1 block text-xs text-neutral-500">{new Date(n.created_at).toLocaleString()}</span>
              </button>
              <button type="button" disabled={busy === n.id} onClick={() => onDelete(n)} className={linkDanger}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
