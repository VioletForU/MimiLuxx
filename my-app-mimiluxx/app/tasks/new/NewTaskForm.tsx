"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { getTaskPriority } from "@/lib/priority";

const STATUSES = [
  { value: "todo", label: "To do", dot: "bg-[#8F9499]" },
  { value: "in_progress", label: "In progress", dot: "bg-[#f25c05]" },
  { value: "done", label: "Done", dot: "bg-[#2f9e44]" },
] as const;

const QUICK_DATES = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In a week", days: 7 },
] as const;

const PRIORITY_BADGE: Record<string, string> = {
  Overdue: "bg-red-100 text-red-700",
  "Due Today": "bg-orange-100 text-orange-700",
  "Due Soon": "bg-yellow-100 text-yellow-700",
  Upcoming: "bg-blue-100 text-blue-700",
  "No Deadline": "bg-gray-100 text-gray-600",
};

const pad = (n: number) => String(n).padStart(2, "0");

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDue(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function NewTaskForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("todo");
  const [dueDate, setDueDate] = useState("");
  const [titleError, setTitleError] = useState("");
  const [serverError, setServerError] = useState("");
  const [createdTitle, setCreatedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const priority = getTaskPriority(dueDate || null);
  const statusInfo = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setCreatedTitle("");

    if (!title.trim()) {
      setTitleError("Give your task a title.");
      titleRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          due_date: dueDate,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setServerError(result.error || "Something went wrong. Please try again.");
        return;
      }

      setCreatedTitle(title.trim());
      setTitle("");
      setDescription("");
      setStatus("todo");
      setDueDate("");
      titleRef.current?.focus();
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSubmit} noValidate className="panel flex flex-col gap-6">
        {createdTitle && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-8 border-[#2f9e44] bg-[#FAFAFA] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#111]">Task created</p>
              <p className="truncate text-xs text-[#555]">&ldquo;{createdTitle}&rdquo; was added to your list.</p>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-[#E5252A] no-underline hover:underline">
              View on dashboard →
            </Link>
          </div>
        )}

        {serverError && (
          <div role="alert" className="rounded-2xl border-l-8 border-[#E5252A] bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-extrabold text-[#111]">Could not create the task</p>
            <p className="text-xs text-[#555]">{serverError}</p>
          </div>
        )}

        <div>
          <label htmlFor="task-title" className="label">
            Title <span className="text-[#E5252A]">*</span>
          </label>
          <input
            id="task-title"
            ref={titleRef}
            className="field"
            placeholder="e.g. Finalize the event budget"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "task-title-error" : undefined}
            disabled={loading}
            autoFocus
          />
          {titleError && (
            <p id="task-title-error" role="alert" className="mt-1.5 text-xs font-bold text-[#C41E1E]">
              {titleError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="task-description" className="label">
            Description <span className="font-medium normal-case tracking-normal text-[#7E8288]">(optional)</span>
          </label>
          <textarea
            id="task-description"
            className="field resize-y"
            rows={4}
            placeholder="Add any details, links, or context your team will need."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <fieldset>
          <legend className="label">Status</legend>
          <div className="grid grid-cols-3 gap-3">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink/20 px-3 py-3 text-[13px] font-bold transition hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
              >
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                  disabled={loading}
                  className="sr-only"
                />
                <span className={`size-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="task-due" className="label">
            Due date <span className="font-medium normal-case tracking-normal text-[#7E8288]">(optional)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="task-due"
              type="date"
              className="field w-auto min-w-[180px]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
            {QUICK_DATES.map((q) => {
              const value = inDays(q.days);
              return (
                <button
                  key={q.label}
                  type="button"
                  className="chip"
                  aria-pressed={dueDate === value}
                  onClick={() => setDueDate(dueDate === value ? "" : value)}
                  disabled={loading}
                >
                  {q.label}
                </button>
              );
            })}
            {dueDate && (
              <button type="button" className="btn-quiet btn !h-9 !px-3" onClick={() => setDueDate("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:justify-end">
          <Link href="/dashboard" className="btn btn-outline no-underline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              "Create task"
            )}
          </button>
        </div>
      </form>

      {/* Live preview */}
      <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7E8288]">Live preview</p>
          <div className="relative overflow-hidden rounded-[18px] bg-[#111111] shadow-[0_10px_20px_-4px_rgba(0,0,0,0.18)]">
            <div className="absolute right-0 top-0 h-3.5 w-[52%] rounded-bl-[10px] bg-[#E5252A]" />
            <div className="px-5 pb-5 pt-9">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[priority.label]}`}
              >
                {priority.label}
              </span>
              <h2
                className={`mt-3 line-clamp-2 break-words text-lg font-bold leading-snug ${
                  title.trim() ? "text-white" : "text-[#666666]"
                }`}
              >
                {title.trim() || "Your task title"}
              </h2>
              {description.trim() && (
                <p className="mt-1.5 line-clamp-3 break-words text-xs leading-relaxed text-[#A0A0A0]">
                  {description.trim()}
                </p>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                <div>
                  <dt className="text-[#888888]">Status</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-bold text-white">
                    <span className={`size-2 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
                    {statusInfo.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#888888]">Due</dt>
                  <dd className="mt-1 font-bold text-white">{dueDate ? formatDue(dueDate) : "No due date"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F5F5F7] px-4 py-3.5">
          <p className="text-sm font-extrabold text-[#111]">Ranked by deadline</p>
          <p className="mt-1 text-xs leading-relaxed text-[#555]">
            The closer the due date, the higher this task sits on your dashboard. Overdue tasks always come first.
          </p>
        </div>
      </aside>
    </div>
  );
}
