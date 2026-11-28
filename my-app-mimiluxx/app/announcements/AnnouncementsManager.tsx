"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANNOUNCEMENT_GONE,
  LIMITS,
  MAX_TARGET_COMMITTEES,
  isoToManilaLocal,
  manilaLocalToIso,
  committeeIdsOf,
  statusOf,
  targetLabel,
  validateAnnouncement,
  whenText,
  type Announcement,
  type AnnouncementField,
  type AnnouncementStatus,
} from "@/lib/announcements";
import type { ActionResult } from "@/lib/types/admin";
import type { PostTarget } from "@/lib/announcementAccess";
import { createAnnouncement, deleteAnnouncement, editAnnouncement, restoreAnnouncement, updateAnnouncement } from "./actions";
import ConfirmDialog, { type ConfirmRequest } from "./ConfirmDialog";

const FILTERS: { key: "all" | AnnouncementStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "disabled", label: "Disabled" },
  { key: "draft", label: "Drafts" },
  { key: "expired", label: "Expired" },
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
const FIELD_FOCUS_ID: Record<AnnouncementField, string> = {
  title: "a-title",
  body: "a-body",
  target: "a-org",
  priority: "a-prio-critical",
  dates: "a-start",
};

type FormState = {
  title: string;
  body: string;
  /** "app" (everyone, Admin only) or an organization id; "" until picked */
  target: string;
  /** inside an organization: the whole thing, or chosen committees */
  mode: "org" | "committees";
  committeeIds: string[];
  priority: "critical" | "high" | "normal";
  enabled: boolean;
  startsAt: string; // datetime-local value, Philippine time
  expiresAt: string;
};

/** A fresh form. With only one place to post (a Committee Head's own organization) it is already filled in. */
function emptyForm(targets: PostTarget[], isAdmin: boolean): FormState {
  const only = !isAdmin && targets.length === 1 ? targets[0] : null;
  return {
    title: "",
    body: "",
    target: only?.orgId ?? "",
    mode: only ? (only.canOrgWide ? "org" : "committees") : "org",
    committeeIds: only && !only.canOrgWide && only.committees.length === 1 ? [only.committees[0].id] : [],
    priority: "normal",
    enabled: true,
    startsAt: "",
    expiresAt: "",
  };
}

type Toast = { id: number; text: string; kind: "ok" | "error"; action?: { label: string; run: () => void } };

const inputCls = "w-full rounded-lg border border-ink/25 px-3 text-sm aria-[invalid=true]:border-red-600";
const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70";

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 flex items-center gap-1.5 text-xs font-bold text-red-700">
      <span aria-hidden="true">⚠</span>
      {msg}
    </p>
  );
}

export default function AnnouncementsManager({
  announcements,
  canManage,
  isAdmin,
  targets,
  editableIds,
  orgNames,
  committeeNames,
  nowIso,
}: {
  announcements: Announcement[];
  canManage: boolean;
  isAdmin: boolean;
  /** Where this person may post, and what they can pick there. */
  targets: PostTarget[];
  /** Announcements this person may edit or delete. */
  editableIds: string[];
  orgNames: Record<string, string>;
  committeeNames: Record<string, string>;
  nowIso: string;
}) {
  // Status is computed from the clock, so a scheduled item turns Active (or Expired) without a reload.
  const serverNow = new Date(nowIso).getTime();
  const [clock, setClock] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = Math.max(clock, serverNow);

  const [filter, setFilter] = useState<"all" | AnnouncementStatus>("all");
  const [form, setForm] = useState<FormState>(() => emptyForm(targets, isAdmin));
  const editable = useMemo(() => new Set(editableIds), [editableIds]);
  const pickedOrg = targets.find((t) => t.orgId === form.target) ?? null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false); // after the first failed submit we validate live
  const [lastDraft, setLastDraft] = useState(false);
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState("");
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const toastSeq = useRef(0);

  const editingItem = editingId ? announcements.find((a) => a.id === editingId) : undefined;
  const editingPublished = !!editingItem && !editingItem.is_draft;

  /* ───── feedback helpers ───── */

  function say(text: string) {
    setLive("");
    setTimeout(() => setLive(text), 30);
  }
  function toast(text: string, opts: { kind?: "ok" | "error"; action?: Toast["action"]; timeout?: number } = {}) {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, kind: opts.kind ?? "ok", action: opts.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.timeout ?? 5000);
  }
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  /* ───── derived: counts, filtered list, live validation ───── */

  const withStatus = useMemo(() => announcements.map((a) => ({ a, st: statusOf(a, now) })), [announcements, now]);
  const counts = useMemo(() => {
    const c: Record<"all" | AnnouncementStatus, number> = { all: withStatus.length, active: 0, scheduled: 0, disabled: 0, draft: 0, expired: 0 };
    withStatus.forEach((x) => c[x.st]++);
    return c;
  }, [withStatus]);
  const shown = filter === "all" ? withStatus : withStatus.filter((x) => x.st === filter);

  const scopeOf = (): "app" | "org" | "committees" => (form.target === "app" ? "app" : form.mode);
  const values = () => ({
    title: form.title,
    body: form.body,
    scope: form.target ? scopeOf() : "",
    organizationId: form.target && form.target !== "app" ? form.target : null,
    committeeIds: form.committeeIds,
    priority: form.priority,
    startsAt: manilaLocalToIso(form.startsAt),
    expiresAt: manilaLocalToIso(form.expiresAt),
  });
  const errors = attempted ? validateAnnouncement(values(), { draft: lastDraft, checkFuture: !editingId, now }).errors : {};

  /* ───── form ───── */

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(targets, isAdmin));
    setAttempted(false);
    setFormError("");
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      target: a.scope === "app" ? "app" : a.organization_id ?? "",
      mode: a.scope === "committees" ? "committees" : "org",
      committeeIds: committeeIdsOf(a),
      priority: a.priority,
      enabled: a.enabled,
      startsAt: isoToManilaLocal(a.starts_at),
      expiresAt: isoToManilaLocal(a.expires_at),
    });
    setAttempted(false);
    setFormError("");
    const el = document.getElementById("a-title");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  async function submit(draft: boolean) {
    if (saving) return;
    setLastDraft(draft);
    setAttempted(true);
    setFormError("");

    const { errors: errs, clean } = validateAnnouncement(values(), { draft, checkFuture: !editingId, now: Date.now() });
    const bad = Object.keys(errs) as AnnouncementField[];
    if (bad.length) {
      document.getElementById(FIELD_FOCUS_ID[bad[0]])?.focus();
      say(`${bad.length} ${bad.length === 1 ? "problem" : "problems"} to fix: ${bad.map((k) => errs[k]).join(" ")}`);
      return;
    }

    const input = {
      title: clean.title,
      body: clean.body,
      scope: scopeOf(),
      organization_id: form.target === "app" ? null : form.target,
      committee_ids: scopeOf() === "committees" ? form.committeeIds : [],
      priority: form.priority,
      enabled: form.enabled,
      is_draft: draft,
      starts_at: clean.startsAt,
      expires_at: clean.expiresAt,
    };
    const editing = editingId;
    setSaving(draft ? "draft" : "publish");
    let r: ActionResult;
    try {
      r = editing ? await editAnnouncement(editing, input) : await createAnnouncement(input);
    } catch {
      r = { ok: false, error: "Something went wrong. Please try again." };
    }
    setSaving(null);

    if (r.ok) {
      const text = editing ? "Changes saved." : draft ? "Draft saved." : "Announcement published.";
      toast(text);
      say(text);
      resetForm();
      document.getElementById("a-title")?.focus();
    } else {
      setFormError(r.error);
      toast("Could not save. Your text is still in the form.", { kind: "error" });
      if (r.error === ANNOUNCEMENT_GONE) resetForm();
    }
  }

  /* ───── list actions ───── */

  async function mutate(id: string, job: () => Promise<ActionResult>, okText?: string): Promise<boolean> {
    if (busy.has(id)) return false;
    setBusy((b) => new Set(b).add(id));
    let ok = false;
    try {
      const r = await job();
      if (r.ok) {
        ok = true;
        if (okText) {
          toast(okText);
          say(okText);
        }
      } else {
        toast(r.error, { kind: "error" });
        if (r.error === ANNOUNCEMENT_GONE && editingId === id) resetForm();
      }
    } catch {
      toast("Something went wrong. Please try again.", { kind: "error" });
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(id);
        return n;
      });
    }
    return ok;
  }

  function publishDraft(a: Announcement) {
    // Publishing needs a complete message, so check first and send them to the form if it is not.
    const { errors: errs } = validateAnnouncement(
      {
        title: a.title,
        body: a.body,
        scope: a.scope,
        organizationId: a.organization_id,
        committeeIds: committeeIdsOf(a),
        priority: a.priority,
        startsAt: a.starts_at,
        expiresAt: a.expires_at,
      },
      { draft: false, checkFuture: false, now }
    );
    if (errs.title || errs.body) {
      toast("Add a message before publishing this draft.", { kind: "error" });
      startEdit(a);
      return;
    }
    void mutate(a.id, () => updateAnnouncement(a.id, { is_draft: false }), "Published.");
  }

  function askDelete(a: Announcement) {
    setConfirmReq({
      title: "Delete this announcement?",
      body: `“${a.title}” will be removed. You can undo right after.`,
      ok: "Delete",
      onOk: async () => {
        const ok = await mutate(a.id, () => deleteAnnouncement(a.id));
        if (!ok) return;
        if (editingId === a.id) resetForm();
        say("Deleted.");
        toast(`Deleted “${a.title}”.`, {
          timeout: 7000,
          action: {
            label: "Undo",
            run: async () => {
              const r = await restoreAnnouncement(a).catch(() => ({ ok: false as const, error: "Could not restore it." }));
              if (r.ok) say("Restored.");
              else toast(r.error || "Could not restore it.", { kind: "error" });
            },
          },
        });
      },
    });
  }

  /* ───── render ───── */

  const publishLabel = saving === "publish" ? "Saving…" : editingId ? "Save changes" : "Publish";
  const draftLabel = saving === "draft" ? "Saving…" : "Save draft";

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${canManage ? "lg:grid-cols-[24rem_minmax(0,1fr)]" : ""}`}>
      {canManage && (
        <section className="min-w-0 rounded-2xl border border-ink/15 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start" aria-labelledby="form-title">
          <h2 id="form-title" className="text-lg font-extrabold">{editingId ? "Edit announcement" : "New announcement"}</h2>
          <form
            noValidate
            className="mt-5 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
          >
            <div>
              <label htmlFor="a-title" className={labelCls}>Title</label>
              <input
                id="a-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={LIMITS.titleMax}
                placeholder="e.g. Server maintenance tonight"
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? "err-title" : undefined}
                className={`h-10 ${inputCls}`}
              />
              <FieldError id="err-title" msg={errors.title} />
              <p className="mt-1 text-right text-xs text-ink/50">{form.title.length}/{LIMITS.titleMax}</p>
            </div>
            <div>
              <label htmlFor="a-body" className={labelCls}>Message</label>
              <textarea
                id="a-body"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                maxLength={LIMITS.bodyMax}
                rows={5}
                placeholder="What do members need to know?"
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={errors.body ? "err-body" : undefined}
                className={`${inputCls} p-3`}
              />
              <FieldError id="err-body" msg={errors.body} />
              <p className="mt-1 text-right text-xs text-ink/50">{form.body.length}/{LIMITS.bodyMax}</p>
            </div>
            <fieldset className="grid gap-3" aria-describedby={errors.target ? "err-target" : undefined}>
              <legend className={labelCls}>Who should see it?</legend>
              <select
                id="a-org"
                aria-label="Audience"
                value={form.target}
                onChange={(e) => {
                  const next = targets.find((t) => t.orgId === e.target.value);
                  setForm((f) => ({
                    ...f,
                    target: e.target.value,
                    // switching organization clears the committee picks; a Committee Head gets their one committee back
                    mode: next ? (next.canOrgWide ? "org" : "committees") : f.mode,
                    committeeIds: next && !next.canOrgWide && next.committees.length === 1 ? [next.committees[0].id] : [],
                  }));
                }}
                aria-invalid={errors.target ? true : undefined}
                className={`h-10 ${inputCls} px-2`}
              >
                <option value="">Choose…</option>
                {isAdmin && <option value="app">Everyone in the app (Admin only)</option>}
                {targets.map((t) => (
                  <option key={t.orgId} value={t.orgId}>{t.orgName}</option>
                ))}
                {/* an organization this person may no longer post in, while editing an old item */}
                {editingItem?.organization_id && !targets.some((t) => t.orgId === editingItem.organization_id) && (
                  <option value={editingItem.organization_id}>{orgNames[editingItem.organization_id] ?? "Organization"}</option>
                )}
              </select>

              {form.target === "app" && (
                <p className="rounded-lg bg-yellow-50 p-3 text-xs font-bold text-yellow-900">
                  This goes to every registered user in every organization.
                </p>
              )}

              {form.target && form.target !== "app" && (
                <div className="grid gap-2">
                  {pickedOrg?.canOrgWide !== false && (
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Whole organization or committees">
                      {([["org", "Whole organization"], ["committees", "Specific committees"]] as const).map(([m, label]) => (
                        <label key={m} className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${form.mode === m ? "border-ink bg-ink text-white" : "border-ink/25"}`}>
                          <input type="radio" name="mode" value={m} checked={form.mode === m} onChange={() => set("mode", m)} className="sr-only" />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}

                  {form.mode === "committees" && (
                    <div className="grid gap-1.5 rounded-lg border border-ink/15 p-3" role="group" aria-label="Committees">
                      {(pickedOrg?.committees ?? []).length === 0 ? (
                        <p className="text-xs text-ink/60">No committees to pick in this organization.</p>
                      ) : (
                        <>
                          {(pickedOrg?.committees ?? []).map((c) => (
                            <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={form.committeeIds.includes(c.id)}
                                disabled={!form.committeeIds.includes(c.id) && form.committeeIds.length >= MAX_TARGET_COMMITTEES}
                                onChange={(e) => set("committeeIds", e.target.checked ? [...form.committeeIds, c.id] : form.committeeIds.filter((x) => x !== c.id))}
                              />
                              {c.name}
                            </label>
                          ))}
                          {pickedOrg && !pickedOrg.canOrgWide && (
                            <p className="text-xs text-ink/50">Committee Heads can announce to their own committee.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <FieldError id="err-target" msg={errors.target} />
            </fieldset>
            <fieldset aria-describedby={errors.priority ? "err-prio" : undefined}>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/70">Priority</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["critical", "high", "normal"] as const).map((p) => (
                  <label key={p} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold capitalize has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${form.priority === p ? "border-ink bg-ink text-white" : "border-ink/25"}`}>
                    <input id={`a-prio-${p}`} type="radio" name="priority" value={p} checked={form.priority === p} onChange={() => set("priority", p)} className="sr-only" />
                    {p}
                  </label>
                ))}
              </div>
              <FieldError id="err-prio" msg={errors.priority} />
            </fieldset>
            <fieldset className="grid gap-4 rounded-xl border border-ink/15 p-4">
              <legend className="px-1 text-sm font-extrabold">Feature flag</legend>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{form.enabled ? "Flag is on" : "Flag is off"}</p>
                  <p className="text-xs text-ink/60">Turn off to hide it without deleting.</p>
                </div>
                <button type="button" role="switch" aria-checked={form.enabled} aria-label="Flag" onClick={() => set("enabled", !form.enabled)} className={`relative h-6 w-11 rounded-full transition ${form.enabled ? "bg-brand" : "bg-neutral-300"}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${form.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="a-start" className={labelCls}>Shows from</label>
                  <input id="a-start" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} aria-invalid={errors.dates ? true : undefined} aria-describedby={errors.dates ? "err-dates" : undefined} className={`h-10 ${inputCls} px-2`} />
                </div>
                <div>
                  <label htmlFor="a-exp" className={labelCls}>Expires</label>
                  <input id="a-exp" type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} aria-invalid={errors.dates ? true : undefined} aria-describedby={errors.dates ? "err-dates" : undefined} className={`h-10 ${inputCls} px-2`} />
                </div>
              </div>
              <FieldError id="err-dates" msg={errors.dates} />
              <p className="text-xs text-ink/50">Times are Philippine time (UTC+8). Leave both empty to show right away with no end.</p>
            </fieldset>

            {formError && <p role="alert" className="text-sm font-bold text-red-700">{formError}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={!!saving} aria-busy={saving === "publish" || undefined} className="h-10 rounded-full bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-50">{publishLabel}</button>
              {!editingPublished && (
                <button type="button" disabled={!!saving} aria-busy={saving === "draft" || undefined} onClick={() => void submit(true)} className="h-10 rounded-full border border-ink px-5 text-sm font-extrabold hover:bg-neutral-100 disabled:opacity-40">{draftLabel}</button>
              )}
              {(editingId || form.title || form.body) && (
                <button type="button" disabled={!!saving} onClick={resetForm} className="h-10 rounded-full px-4 text-sm font-bold text-ink/70 hover:bg-neutral-100 disabled:opacity-40">{editingId ? "Cancel edit" : "Clear"}</button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="min-w-0" aria-labelledby="list-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-title" className="text-lg font-extrabold">
            Announcements <span className="ml-1 text-sm font-bold text-ink/50">{counts.all}</span>
          </h2>
          {canManage && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => {
                    setFilter(f.key);
                    const n = f.key === "all" ? counts.all : counts[f.key];
                    say(`${n} ${n === 1 ? "announcement" : "announcements"} shown.`);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === f.key ? "border-ink bg-ink text-white" : "border-ink/25 hover:bg-neutral-100"}`}
                >
                  {f.label} <span className="opacity-60">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/60">Sorted by: 1 Pinned · 2 Priority ↓ · 3 Newest</p>

        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl border border-ink/15 p-6 text-sm text-ink/60">
            {counts.all === 0 ? (canManage ? "No announcements yet. Fill in the form to create the first one." : "Nothing here.") : "Nothing matches this filter."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {shown.map(({ a, st }) => {
              const isBusy = busy.has(a.id);
              const isEditing = editingId === a.id;
              return (
                <li
                  key={a.id}
                  aria-busy={isBusy || undefined}
                  className={`rounded-2xl border border-l-8 bg-white p-4 shadow-sm transition ${PRIO_BORDER[a.priority]} ${isEditing ? "border-ink ring-2 ring-ink/20" : "border-ink/15"} ${isBusy ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">📌 Pinned</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${PRIO_BADGE[a.priority]}`}>{a.priority}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_BADGE[st]}`}>{st === "active" ? "Active flag" : st}</span>
                    <span className="text-xs text-ink/50">{targetLabel(a, orgNames, committeeNames)}</span>
                  </div>
                  <h3 className="mt-2 text-base font-extrabold">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">{a.body}</p>
                  <p className="mt-2 text-xs text-ink/50">{whenText(a, now)}</p>
                  {canManage && editable.has(a.id) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <button disabled={isBusy} onClick={() => startEdit(a)} aria-label={`Edit ${a.title}`} className="rounded-full border border-ink/25 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50">Edit</button>
                      <button disabled={isBusy} onClick={() => void mutate(a.id, () => updateAnnouncement(a.id, { pinned: !a.pinned }), a.pinned ? "Unpinned." : "Pinned to top.")} className="rounded-full border border-ink/25 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50">{a.pinned ? "Unpin" : "Pin"}</button>
                      {a.is_draft ? (
                        <button disabled={isBusy} onClick={() => publishDraft(a)} className="rounded-full bg-brand px-3 py-1.5 text-white disabled:opacity-50">Publish</button>
                      ) : (
                        <button disabled={isBusy} onClick={() => void mutate(a.id, () => updateAnnouncement(a.id, { enabled: !a.enabled }), a.enabled ? "Flag turned off." : "Flag turned on.")} className="rounded-full border border-ink/25 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50">{a.enabled ? "Turn flag off" : "Turn flag on"}</button>
                      )}
                      <button disabled={isBusy} onClick={() => askDelete(a)} className="rounded-full border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />

      {/* screen-reader announcements */}
      <p className="sr-only" role="status" aria-live="polite">{live}</p>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg ${t.kind === "error" ? "bg-red-700" : "bg-ink"}`}>
            <span className="min-w-0 flex-1">{t.text}</span>
            {t.action && (
              <button type="button" onClick={() => { dismiss(t.id); t.action!.run(); }} className="rounded-full border border-white/60 px-3 py-1 text-xs font-extrabold hover:bg-white/10">
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
