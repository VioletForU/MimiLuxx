"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APPROVAL_CHAIN, ROLE_LABELS } from "@/lib/types/roles";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function stageNote(index: number, total: number) {
  if (index === 0) return "Reviews your proposal first";
  if (index === total - 1) return "Gives the final sign-off";
  return "Reviews next";
}

export default function NewProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setTitleError("Give your proposal a title.");
      titleRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit proposal. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard?tab=proposals");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handleSubmit} noValidate className="panel flex flex-col gap-6">
        {error && (
          <div role="alert" className="rounded-2xl border-l-8 border-[#E5252A] bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-extrabold text-[#111]">Could not submit the proposal</p>
            <p className="text-xs text-[#555]">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="proposal-title" className="label">
            Proposal title <span className="text-[#E5252A]">*</span>
          </label>
          <input
            id="proposal-title"
            ref={titleRef}
            className="field"
            placeholder="e.g. Annual leadership summit"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "proposal-title-error" : undefined}
            disabled={loading}
            autoFocus
          />
          {titleError && (
            <p id="proposal-title-error" role="alert" className="mt-1.5 text-xs font-bold text-[#C41E1E]">
              {titleError}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between">
            <label htmlFor="proposal-description" className="label">
              Description <span className="font-medium normal-case tracking-normal text-[#7E8288]">(optional)</span>
            </label>
            <span className="mb-1.5 text-xs text-[#7E8288]" aria-live="off">
              {description.length} characters
            </span>
          </div>
          <textarea
            id="proposal-description"
            className="field resize-y"
            rows={9}
            placeholder="What are you proposing, why does it matter, and what do you need approved (budget, date, venue, people)?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
          <p className="mt-1.5 text-xs text-[#7E8288]">
            Approvers read this when deciding, so include the details they would otherwise ask about.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:justify-end">
          <Link href="/dashboard?tab=proposals" className="btn btn-outline no-underline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Spinner /> Submitting…
              </>
            ) : (
              "Submit proposal"
            )}
          </button>
        </div>
      </form>

      {/* Approval route */}
      <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7E8288]">Approval route</p>
          <div className="relative overflow-hidden rounded-[18px] bg-[#111111] shadow-[0_10px_20px_-4px_rgba(0,0,0,0.18)]">
            <div className="absolute right-0 top-0 h-3.5 w-[52%] rounded-bl-[10px] bg-[#E5252A]" />
            <div className="px-5 pb-6 pt-9">
              <p className="text-sm font-bold text-white">
                {APPROVAL_CHAIN.length} sign-off{APPROVAL_CHAIN.length === 1 ? "" : "s"} required
              </p>
              <ol className="mt-5 grid gap-5">
                {APPROVAL_CHAIN.map((stage, i) => (
                  <li key={stage.stage_order} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${
                        i === 0
                          ? "border-[#E5252A] bg-[#E5252A] text-white"
                          : "border-white/25 text-white/60"
                      }`}
                    >
                      {stage.stage_order}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-extrabold text-white">{ROLE_LABELS[stage.approver_role]}</p>
                      <p className="mt-0.5 text-xs text-[#A0A0A0]">{stageNote(i, APPROVAL_CHAIN.length)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F5F5F7] px-4 py-3.5">
          <p className="text-sm font-extrabold text-[#111]">What happens next</p>
          <p className="mt-1 text-xs leading-relaxed text-[#555]">
            Once submitted, the first approver can review it. You can follow each stage from the proposal page.
          </p>
        </div>
      </aside>
    </div>
  );
}
