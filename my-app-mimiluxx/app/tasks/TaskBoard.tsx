"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CommentThread from "@/components/CommentThread";
import DeleteButton from "./DeleteButton";
import { DAY_MS, spanText } from "@/lib/time";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
};

type Tab = "pending" | "submitted" | "missed";
type Tone = "red" | "orange" | "yellow" | "green" | "done" | "missed";

const URGENCY_LABEL = { red: "Urgent", orange: "High", yellow: "Medium", green: "Low" } as const;
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
  { key: "missed", label: "Did Not Submit" },
];
const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Submitted (done)" },
];

/** A date-only due date counts until the end of that day. */
function dueAt(t: BoardTask): number | null {
  if (!t.due_date) return null;
  const s = t.due_date.length <= 10 ? `${t.due_date}T23:59:59` : t.due_date;
  const ms = new Date(s).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function statusOf(t: BoardTask, now: number): Tab {
  if (t.status === "done") return "submitted";
  const due = dueAt(t);
  return due !== null && due <= now ? "missed" : "pending";
}

function urgencyOf(t: BoardTask, now: number): keyof typeof URGENCY_LABEL {
  const due = dueAt(t);
  if (due === null) return "green";
  const ms = due - now;
  if (ms <= 2 * DAY_MS) return "red";
  if (ms <= 5 * DAY_MS) return "orange";
  if (ms <= 7 * DAY_MS) return "yellow";
  return "green";
}

function toneOf(t: BoardTask, now: number): Tone {
  const st = statusOf(t, now);
  return st === "submitted" ? "done" : st === "missed" ? "missed" : urgencyOf(t, now);
}

function chipText(t: BoardTask, now: number): string {
  const st = statusOf(t, now);
  if (st === "submitted") return "Submitted";
  const due = dueAt(t);
  if (due === null) return "No deadline";
  if (st === "missed") return `Overdue by ${spanText(now - due)}`;
  return `${URGENCY_LABEL[urgencyOf(t, now)]} · due in ${spanText(due - now)}`;
}

function fmtDue(t: BoardTask): string {
  const due = dueAt(t);
  if (due === null) return "No due date";
  return new Date(due).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function TaskBoard({
  tasks: initial,
  loadError,
  nowIso,
}: {
  tasks: BoardTask[];
  loadError: string | null;
  nowIso: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setTasks(initial);
  }
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date(nowIso).getTime());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, submitted: 0, missed: 0 };
    tasks.forEach((t) => (c[statusOf(t, now)] += 1));
    return c;
  }, [tasks, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => statusOf(t, now) === tab)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        const da = dueAt(a) ?? Infinity;
        const db = dueAt(b) ?? Infinity;
        return tab === "pending" ? da - db : db - da;
      });
  }, [tasks, tab, query, now]);

  const open = tasks.find((t) => t.id === openId) ?? null;

  async function setStatus(id: string, status: string) {
    setBusy(true);
    const before = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      setTasks(before);
      setToast("Could not update the task.");
      return;
    }
    setToast(status === "done" ? "Marked as submitted." : "Status updated.");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white pb-16 text-ink">
      <header className="flex select-none flex-col items-center pt-8">
        <h1 className="text-[clamp(30px,5vw,44px)] font-black leading-none tracking-tight">
          Mimi<span className="text-brand">Luxx</span>
        </h1>
        <p className="mt-1 text-[clamp(15px,2vw,20px)] font-semibold">Community</p>
      </header>

      <main className="mx-auto mt-6 w-[min(1120px,calc(100%-2rem))]">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="grid size-8 place-items-center rounded-md text-sm hover:bg-neutral-200" aria-label="Back to dashboard" title="Back to dashboard">
            ←
          </Link>
          <h2 className="text-xl font-extrabold">Task Management</h2>
          <span className="text-xs text-neutral-500">›</span>
          <span className="text-lg font-medium">My tasks</span>
          <Link href="/tasks/new" className="ml-auto rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85">
            + New Task
          </Link>
        </div>

        <label className="relative mb-3 block w-full sm:w-72">
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this folder"
            autoComplete="off"
            className="h-9 w-full rounded-full border border-ink bg-white pl-4 pr-9 text-[13px] outline-none transition-shadow focus:ring-4 focus:ring-brand/25"
          />
        </label>

        <div role="tablist" aria-label="Assignment status" className="mb-3 flex gap-6 border-b border-neutral-300">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="group relative inline-flex items-center gap-1.5 pb-2 pt-1.5 text-sm font-semibold text-neutral-400 transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:origin-left after:scale-x-0 after:rounded-t after:bg-brand after:transition-transform after:duration-300 hover:text-ink aria-selected:font-extrabold aria-selected:text-ink aria-selected:after:scale-x-100"
            >
              {t.label}
              <span className="rounded-full bg-neutral-200 px-1.5 py-px text-[11px] font-bold text-ink group-aria-selected:bg-ink group-aria-selected:text-white">
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {loadError && <p className="mb-3 text-sm text-red-700">Could not load tasks: {loadError}</p>}

        <section aria-live="polite" className="scroll-dark max-h-[max(18rem,calc(100vh-24rem))] overflow-y-auto py-2 pl-1 pr-4">
          {visible.length === 0 ? (
            <div className="grid place-items-center gap-2 py-16 text-neutral-500">
              <p>
                {query
                  ? "No tasks match your search."
                  : tab === "pending"
                    ? "Nothing pending — you&apos;re all caught up."
                    : tab === "submitted"
                      ? "Nothing submitted yet."
                      : "No missed tasks."}
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {visible.map((t) => {
                const tone = toneOf(t, now);
                return (
                  <li
                    key={t.id}
                    data-tone={tone}
                    tabIndex={0}
                    onClick={() => setOpenId(t.id)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenId(t.id)}
                    aria-label={`${t.title}, ${chipText(t, now)}`}
                    className="group relative flex cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand/25"
                  >
                    <span className="w-2 shrink-0 bg-[var(--tone)]" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">{t.title}</p>
                        <p className="truncate text-xs text-neutral-500">Due {fmtDue(t)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--tone)] px-3 py-1 text-xs font-bold text-[var(--tone-ink)]">
                        {chipText(t, now)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpenId(null)} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            data-tone={toneOf(open, now)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 bg-[var(--tone)] px-5 py-4 text-[var(--tone-ink)]">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">{chipText(open, now)}</p>
                <h3 id="task-modal-title" className="text-lg font-extrabold">{open.title}</h3>
              </div>
              <button type="button" onClick={() => setOpenId(null)} aria-label="Close" className="rounded-full px-2 text-xl leading-none hover:bg-white/20">×</button>
            </div>

            <div className="grid gap-4 p-5">
              <p className="text-sm"><strong>Deadline:</strong> {fmtDue(open)}</p>
              {open.description ? (
                <p className="whitespace-pre-wrap text-sm text-neutral-700">{open.description}</p>
              ) : (
                <p className="text-sm text-neutral-400">No description.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={open.status}
                  disabled={busy}
                  onChange={(e) => setStatus(open.id, e.target.value)}
                  className="rounded-md border border-neutral-300 p-2 text-sm"
                  aria-label="Task status"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {open.status === "done" ? (
                  <button type="button" disabled={busy} onClick={() => setStatus(open.id, "todo")} className="rounded-full border border-ink px-4 py-2 text-xs font-bold hover:bg-neutral-100 disabled:opacity-50">
                    Unsubmit
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setStatus(open.id, "done")} className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
                    Mark as submitted
                  </button>
                )}
                <Link href={`/tasks/${open.id}/edit`} className="text-sm underline">Edit</Link>
                <DeleteButton id={open.id} />
              </div>

              <CommentThread targetType="task" targetId={open.id} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
