"use client";

import { useMemo, useState, useTransition } from "react";
import { statusOf, type Announcement, type AnnouncementStatus } from "@/lib/announcements";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "./actions";

const AUDIENCES = ["All members", "Committee Heads", "Presidents"];
const FILTERS: { key: "all" | AnnouncementStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "disabled", label: "Disabled" },
  { key: "draft", label: "Drafts" },
];
const PRIO_BADGE = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-neutral-100 text-neutral-700",
} as const;
const PRIO_BORDER = { critical: "border-l-brand", high: "border-l-orange-500", normal: "border-l-neutral-300" } as const;
const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  disabled: "bg-neutral-200 text-neutral-700",
  draft: "bg-yellow-100 text-yellow-800",
  expired: "bg-neutral-200 text-neutral-600",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

export default function AnnouncementsManager({
  announcements,
  canManage,
  nowIso,
}: {
  announcements: Announcement[];
  canManage: boolean;
  nowIso: string;
}) {
  const now = new Date(nowIso).getTime();
  const [filter, setFilter] = useState<"all" | AnnouncementStatus>("all");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [priority, setPriority] = useState<"critical" | "high" | "normal">("normal");
  const [enabled, setEnabled] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const shown = useMemo(
    () => announcements.filter((a) => filter === "all" || statusOf(a, now) === filter),
    [announcements, filter, now]
  );

  function submit(isDraft: boolean) {
    start(async () => {
      const r = await createAnnouncement({
        title,
        body,
        audience,
        priority,
        enabled,
        is_draft: isDraft,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (r.ok) {
        setMsg({ ok: true, text: isDraft ? "Draft saved." : "Announcement published." });
        setTitle(""); setBody(""); setPriority("normal"); setEnabled(true); setStartsAt(""); setExpiresAt("");
      } else setMsg({ ok: false, text: r.error });
    });
  }

  function run(p: Promise<{ ok: true } | { ok: false; error: string }>) {
    start(async () => {
      const r = await p;
      if (!r.ok) setMsg({ ok: false, text: r.error });
    });
  }

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${canManage ? "lg:grid-cols-[24rem_minmax(0,1fr)]" : ""}`}>
      {canManage && (
        <section className="min-w-0 rounded-2xl border border-ink/15 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start" aria-labelledby="form-title">
          <h2 id="form-title" className="text-lg font-extrabold">New announcement</h2>
          <form
            className="mt-5 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(false);
            }}
          >
            <div>
              <label htmlFor="a-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Title</label>
              <input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required placeholder="e.g. Server maintenance tonight" className="h-10 w-full rounded-lg border border-ink/25 px-3 text-sm" />
              <p className="mt-1 text-right text-xs text-ink/50">{title.length}/80</p>
            </div>
            <div>
              <label htmlFor="a-body" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Message</label>
              <textarea id="a-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} required rows={5} placeholder="What do members need to know?" className="w-full rounded-lg border border-ink/25 p-3 text-sm" />
              <p className="mt-1 text-right text-xs text-ink/50">{body.length}/500</p>
            </div>
            <div>
              <label htmlFor="a-aud" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Who should see it?</label>
              <select id="a-aud" value={audience} onChange={(e) => setAudience(e.target.value)} className="h-10 w-full rounded-lg border border-ink/25 px-2 text-sm">
                {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/70">Priority</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["critical", "high", "normal"] as const).map((p) => (
                  <label key={p} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold capitalize ${priority === p ? "border-ink bg-ink text-white" : "border-ink/25"}`}>
                    <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="sr-only" />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-4 rounded-xl border border-ink/15 p-4">
              <legend className="px-1 text-sm font-extrabold">Feature flag</legend>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{enabled ? "Flag is on" : "Flag is off"}</p>
                  <p className="text-xs text-ink/60">Turn off to hide it without deleting.</p>
                </div>
                <button type="button" role="switch" aria-checked={enabled} aria-label="Flag" onClick={() => setEnabled((v) => !v)} className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-brand" : "bg-neutral-300"}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="a-start" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Shows from</label>
                  <input id="a-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-10 w-full rounded-lg border border-ink/25 px-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="a-exp" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Expires</label>
                  <input id="a-exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-10 w-full rounded-lg border border-ink/25 px-2 text-sm" />
                </div>
              </div>
            </fieldset>

            {msg && <p role="status" className={`text-sm font-bold ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending} className="h-10 rounded-full bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-50">Publish</button>
              <button type="button" disabled={pending || !title.trim() || !body.trim()} onClick={() => submit(true)} className="h-10 rounded-full border border-ink px-5 text-sm font-extrabold hover:bg-neutral-100 disabled:opacity-40">Save draft</button>
            </div>
          </form>
        </section>
      )}

      <section className="min-w-0" aria-labelledby="list-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-title" className="text-lg font-extrabold">
            {canManage ? "All flagged items" : "Announcements"} <span className="ml-1 text-sm font-bold text-ink/50">{shown.length}</span>
          </h2>
          {canManage && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === f.key ? "border-ink bg-ink text-white" : "border-ink/25 hover:bg-neutral-100"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/60">Sorted by: 1 Pinned · 2 Priority ↓ · 3 Newest</p>

        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl border border-ink/15 p-6 text-sm text-ink/60">Nothing here.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {shown.map((a) => {
              const st = statusOf(a, now);
              return (
                <li key={a.id} className={`rounded-2xl border border-l-8 border-ink/15 bg-white p-4 shadow-sm ${PRIO_BORDER[a.priority]}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">📌 Pinned</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${PRIO_BADGE[a.priority]}`}>{a.priority}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_BADGE[st]}`}>{st === "active" ? "Active flag" : st}</span>
                    <span className="text-xs text-ink/50">{a.audience}</span>
                  </div>
                  <h3 className="mt-2 text-base font-extrabold">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">{a.body}</p>
                  {(a.starts_at || a.expires_at) && (
                    <p className="mt-2 text-xs text-ink/50" suppressHydrationWarning>
                      {a.starts_at && <>From {fmt(a.starts_at)} </>}
                      {a.expires_at && <>· Expires {fmt(a.expires_at)}</>}
                    </p>
                  )}
                  {canManage && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <button disabled={pending} onClick={() => run(updateAnnouncement(a.id, { pinned: !a.pinned }))} className="rounded-full border border-ink/25 px-3 py-1.5 hover:bg-neutral-100">{a.pinned ? "Unpin" : "Pin"}</button>
                      {a.is_draft ? (
                        <button disabled={pending} onClick={() => run(updateAnnouncement(a.id, { is_draft: false }))} className="rounded-full bg-brand px-3 py-1.5 text-white">Publish</button>
                      ) : (
                        <button disabled={pending} onClick={() => run(updateAnnouncement(a.id, { enabled: !a.enabled }))} className="rounded-full border border-ink/25 px-3 py-1.5 hover:bg-neutral-100">{a.enabled ? "Turn flag off" : "Turn flag on"}</button>
                      )}
                      <button disabled={pending} onClick={() => confirm("Delete this announcement?") && run(deleteAnnouncement(a.id))} className="rounded-full border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
